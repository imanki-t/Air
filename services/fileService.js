// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { Upload } = require('@aws-sdk/lib-storage');

const getFileCategory = require('../utils/fileType');
const { initR2Client } = require('../config/r2');
const {
  getFileMapping,
  storeDriveMapping,
  safeObjectId,
} = require('../utils/driveUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Initialize R2 client
// ─────────────────────────────────────────────────────────────────────────────
const r2 = initR2Client();
const BUCKET = process.env.R2_BUCKET_NAME;

if (!BUCKET) {
  console.error('R2_BUCKET_NAME is not set in .env');
}

const db = mongoose.connection;

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// ─────────────────────────────────────────────────────────────────────────────
// Generate a short share ID (6 chars)
// ─────────────────────────────────────────────────────────────────────────────
const generateShortShareId = () => {
  return crypto
    .randomBytes(4)
    .toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '')
    .substring(0, 6);
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify ownership of a file mapping
// ─────────────────────────────────────────────────────────────────────────────
const checkOwnership = (mapping, reqUserId) => {
  if (!mapping) return { allowed: false, mapping: null };
  if (mapping.userId && mapping.userId !== reqUserId) {
    return { allowed: false, mapping };
  }
  return { allowed: true, mapping };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get total storage used by a user
// ─────────────────────────────────────────────────────────────────────────────
const getUserStorageUsed = async (userId) => {
  const result = await db.collection('drive_mappings').aggregate([
    { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: { $toInt: { $ifNull: ['$metadata.size', 0] } } },
      },
    },
  ]).toArray();
  return result[0]?.total || 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convert a Node.js stream to a Buffer
// ─────────────────────────────────────────────────────────────────────────────
const toBuffer = async (streamOrBuffer) => {
  if (Buffer.isBuffer(streamOrBuffer)) return streamOrBuffer;
  return new Promise((resolve, reject) => {
    const chunks = [];
    streamOrBuffer.on('data', (chunk) => chunks.push(chunk));
    streamOrBuffer.on('end', () => resolve(Buffer.concat(chunks)));
    streamOrBuffer.on('error', reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload file to R2
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { originalname, mimetype, buffer, stream, size } = req.file;

    // ── 5 GB storage check ──────────────────────────────────────────────────
    if (userId) {
      const fileSize = size || buffer?.length || 0;
      const currentUsage = await getUserStorageUsed(userId);
      if (currentUsage + fileSize > STORAGE_LIMIT_BYTES) {
        return res.status(413).json({
          error: 'Storage limit exceeded. You have reached your 5 GB limit.',
        });
      }
    }

    const type = getFileCategory(mimetype);

    // Unique R2 object key — prefixed with mongo ID so names never collide
    const mongoId = new ObjectId();
    const r2Key = `files/${mongoId.toString()}/${originalname}`;

    // multer memoryStorage gives us req.file.buffer directly
    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;

    // Use the Upload helper which handles multipart for large files automatically
    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: mimetype,
        ContentDisposition: `inline; filename="${encodeURIComponent(originalname)}"`,
        Metadata: {
          originalname: encodeURIComponent(originalname),
          type,
          userId: userId || '',
          uploadedAt: new Date().toISOString(),
        },
      },
    });

    await upload.done();

    const uploadDate = new Date();

    const metadata = {
      filename: originalname,
      type,
      contentType: mimetype,
      size: fileSize,
      uploadDate,
      uploadedAt: uploadDate,
      r2Key,
    };

    // Re-use the same drive_mappings collection — driveId column now stores the R2 key
    await storeDriveMapping(mongoId, r2Key, metadata, { userId });

    res.status(201).json({
      _id: mongoId,
      length: fileSize,
      chunkSize: 261120,
      uploadDate,
      filename: originalname,
      contentType: mimetype,
      metadata,
      r2Key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get all files for the current user
// ─────────────────────────────────────────────────────────────────────────────
const getFiles = async (req, res) => {
  try {
    const userId = req.user?.userId;

    const query = userId
      ? { userId, 'metadata.isSharedZip': { $ne: true } }
      : {};

    const files = await db.collection('drive_mappings')
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    const formattedFiles = files.map((file) => ({
      _id: file._id,
      length: file.metadata?.size ? parseInt(file.metadata.size) : 0,
      chunkSize: 261120,
      uploadDate: file.metadata?.uploadDate || file.createdAt,
      filename: file.metadata?.filename,
      contentType: file.metadata?.contentType,
      metadata: file.metadata,
      r2Key: file.driveId,
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a file (ownership check)
// ─────────────────────────────────────────────────────────────────────────────
const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const r2Key = mapping.driveId;

    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));

    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    const io = req.app.get('io');
    if (io) io.emit('refreshFileList');

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download file — streams from R2 through the backend to the client
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const r2Key = mapping.driveId;
    const filename = mapping.metadata?.filename || 'download';
    const contentType = mapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = mapping.metadata?.size;

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
    const r2Response = await r2.send(command);

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', contentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    r2Response.Body.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview / Thumbnail — inline with 24h caching
// ─────────────────────────────────────────────────────────────────────────────
const previewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const r2Key = mapping.driveId;
    const filename = mapping.metadata?.filename || 'file';
    const contentType = mapping.metadata?.contentType || 'application/octet-stream';

    const etag = `"${Buffer.from(r2Key + filename).toString('base64')}"`;
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    const cacheMaxAge = 86400;
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.setHeader('Expires', new Date(Date.now() + cacheMaxAge * 1000).toUTCString());
    res.setHeader('Content-Type', contentType);

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
    const r2Response = await r2.send(command);
    r2Response.Body.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate share link
// Creates a 30-day R2 presigned URL and stores a short shareId in MongoDB.
// The public /s/:shareId route redirects to the presigned URL — so the
// file downloads straight from Cloudflare's edge, zero bandwidth on your server.
// ─────────────────────────────────────────────────────────────────────────────
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const r2Key = mapping.driveId;
    const shareId = generateShortShareId();
    const expiresInSeconds = 30 * 24 * 60 * 60; // 30 days
    const expirationDate = new Date(Date.now() + expiresInSeconds * 1000);

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(mapping.metadata?.filename || 'download')}"`,
    });

    const presignedUrl = await getSignedUrl(r2, command, {
      expiresIn: expiresInSeconds,
    });

    const objectId = safeObjectId(fileId);
    const query = objectId ? { _id: objectId } : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').updateOne(query, {
      $set: {
        'metadata.shareId': shareId,
        'metadata.shareExpires': expirationDate,
        'metadata.shareVoided': false,
        'metadata.presignedUrl': presignedUrl,
      },
    });

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Share link error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Access a shared file — redirects to the R2 presigned URL
// ─────────────────────────────────────────────────────────────────────────────
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;

    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Shared file not found or link has expired.' });
    }

    const { shareExpires, shareVoided, presignedUrl } = fileMapping.metadata;

    if (shareVoided) {
      return res.status(410).json({ error: 'This share link has been revoked.' });
    }
    if (shareExpires && new Date(shareExpires) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }
    if (!presignedUrl) {
      return res.status(500).json({ error: 'Share URL missing. Please regenerate the link.' });
    }

    // 302 redirect — browser downloads directly from Cloudflare edge
    res.redirect(302, presignedUrl);
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup incomplete upload artefacts
// ─────────────────────────────────────────────────────────────────────────────
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user?.userId;

    if (!fileId) return res.status(400).json({ message: 'Invalid file ID' });

    let query;
    try {
      if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
        query = { _id: new ObjectId(fileId) };
      } else {
        query = { 'metadata.filename': fileId };
      }
    } catch {
      query = { 'metadata.filename': fileId };
    }

    const fileMapping = await db.collection('drive_mappings').findOne(query);
    if (!fileMapping) return res.json({ message: 'No file found to clean up' });

    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const r2Key = fileMapping.driveId;

    try {
      await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: r2Key }));
    } catch (r2Err) {
      if (r2Err.name !== 'NoSuchKey') throw r2Err;
    }

    await db.collection('drive_mappings').deleteOne({ _id: fileMapping._id });
    res.json({ message: 'Incomplete upload cleaned up' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload & share a ZIP (batch share)
// ─────────────────────────────────────────────────────────────────────────────
const uploadAndShareZip = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { originalname, buffer, stream } = req.file;
    const filename = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype = 'application/zip';
    const uploadDate = new Date();

    const mongoId = new ObjectId();
    const r2Key = `zips/${mongoId.toString()}/${filename}`;

    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;

    const upload = new Upload({
      client: r2,
      params: {
        Bucket: BUCKET,
        Key: r2Key,
        Body: fileBuffer,
        ContentType: mimetype,
        Metadata: {
          originalname: encodeURIComponent(filename),
          type: 'document',
          userId: userId || '',
          isSharedZip: 'true',
          uploadedAt: uploadDate.toISOString(),
        },
      },
    });

    await upload.done();

    const metadata = {
      filename,
      type: 'document',
      contentType: mimetype,
      size: fileSize,
      uploadDate,
      uploadedAt: uploadDate,
      isSharedZip: true,
      r2Key,
    };

    await storeDriveMapping(mongoId, r2Key, metadata, { userId });

    const shareId = generateShortShareId();
    const expiresInSeconds = 30 * 24 * 60 * 60;
    const expirationDate = new Date(Date.now() + expiresInSeconds * 1000);

    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(filename)}"`,
    });

    const presignedUrl = await getSignedUrl(r2, command, {
      expiresIn: expiresInSeconds,
    });

    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      {
        $set: {
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false,
          'metadata.presignedUrl': presignedUrl,
        },
      }
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.status(201).json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Error uploading and sharing zip:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup expired / voided share links
// Presigned URLs expire on Cloudflare's side automatically — we just clean
// the metadata fields in MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    if (!db || !db.collection) return 0;

    const result = await db.collection('drive_mappings').updateMany(
      {
        $or: [
          { 'metadata.shareExpires': { $lt: now } },
          { 'metadata.shareVoided': true },
        ],
      },
      {
        $unset: {
          'metadata.shareId': '',
          'metadata.shareExpires': '',
          'metadata.shareVoided': '',
          'metadata.presignedUrl': '',
        },
      }
    );

    return result.modifiedCount || 0;
  } catch (error) {
    console.error('Cleanup expired links error:', error);
    return 0;
  }
};

const scheduleCleanup = async () => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      console.log('MongoDB connection not ready. Delaying cleanup...');
      return 0;
    }
    return await cleanupExpiredLinks();
  } catch (error) {
    console.error('Schedule cleanup error:', error);
    return 0;
  }
};

module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
  downloadFile,
  previewFile,
  generateShareLink,
  accessSharedFile,
  cleanupIncompleteUpload,
  uploadAndShareZip,
  scheduleCleanup,
};
