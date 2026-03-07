// services/fileService.js
// IMPORTANT: ObjectId and GridFSBucket are taken from mongoose.mongo — NOT from
// the 'mongodb' package — so all BSON types share a single bson version.
const mongoose = require('mongoose');
const crypto = require('crypto');
const { Readable } = require('stream');

const getFileCategory = require('../utils/fileType');
const {
  getFileMapping,
  storeDriveMapping,
  safeObjectId,
} = require('../utils/driveUtils');
const { cleanupFileFromFolders } = require('./folderService');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers to grab the correct BSON classes from mongoose's bundled driver
// ─────────────────────────────────────────────────────────────────────────────
const getObjectId = () => mongoose.mongo.ObjectId;
const getGridFSBucket = () => mongoose.mongo.GridFSBucket;

// ─────────────────────────────────────────────────────────────────────────────
// GridFS bucket — lazily initialised after mongoose connects
// ─────────────────────────────────────────────────────────────────────────────
let bucket;

const getBucket = () => {
  if (!bucket) {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB is not connected yet.');
    }
    const GridFSBucket = getGridFSBucket();
    bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
  }
  return bucket;
};

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
// Helper: convert buffer or stream → Buffer
// ─────────────────────────────────────────────────────────────────────────────
const toBuffer = async (streamOrBuffer) => {
  if (Buffer.isBuffer(streamOrBuffer)) return streamOrBuffer;
  return new Promise((resolve, reject) => {
    const chunks = [];
    streamOrBuffer.on('data', (c) => chunks.push(c));
    streamOrBuffer.on('end', () => resolve(Buffer.concat(chunks)));
    streamOrBuffer.on('error', reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: write a buffer into GridFS — returns the GridFS file ObjectId
// ─────────────────────────────────────────────────────────────────────────────
const writeToGridFS = (fileBuffer, filename, contentType, metadata = {}) => {
  return new Promise((resolve, reject) => {
    const uploadStream = getBucket().openUploadStream(filename, {
      contentType,
      metadata,
    });

    const readable = Readable.from(fileBuffer);
    readable.pipe(uploadStream);

    uploadStream.on('finish', () => resolve(uploadStream.id));
    uploadStream.on('error', reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload file
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
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
    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;
    const uploadDate = new Date();

    const gridFSId = await writeToGridFS(fileBuffer, originalname, mimetype, {
      userId,
      type,
      uploadedAt: uploadDate,
    });

    const mongoId = new ObjectId();
    const metadata = {
      filename: originalname,
      type,
      contentType: mimetype,
      size: fileSize,
      uploadDate,
      uploadedAt: uploadDate,
      gridFSId: gridFSId.toString(),
    };

    await storeDriveMapping(mongoId, gridFSId.toString(), metadata, { userId });

    res.status(201).json({
      _id: mongoId,
      length: fileSize,
      chunkSize: 261120,
      uploadDate,
      filename: originalname,
      contentType: mimetype,
      metadata,
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
    const ObjectId = getObjectId();
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const gridFSId = new ObjectId(mapping.driveId);
    await getBucket().delete(gridFSId);

    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    // Remove this file's ID from any folders it belonged to
    await cleanupFileFromFolders(userId, fileId);

    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
      io.emit('refreshFolderList');
    }

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download file — streams from GridFS to the client
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const gridFSId = new ObjectId(mapping.driveId);
    const filename = mapping.metadata?.filename || 'download';
    const contentType = mapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = mapping.metadata?.size;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', contentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const downloadStream = getBucket().openDownloadStream(gridFSId);
    downloadStream.on('error', (err) => {
      console.error('GridFS download stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    downloadStream.pipe(res);
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
    const ObjectId = getObjectId();
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const gridFSId = new ObjectId(mapping.driveId);
    const filename = mapping.metadata?.filename || 'file';
    const contentType = mapping.metadata?.contentType || 'application/octet-stream';

    const etag = `"${Buffer.from(gridFSId.toString() + filename).toString('base64')}"`;
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

    const downloadStream = getBucket().openDownloadStream(gridFSId);
    downloadStream.on('error', (err) => {
      console.error('GridFS preview stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate share link
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

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    const objectId = safeObjectId(fileId);
    const query = objectId ? { _id: objectId } : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').updateOne(query, {
      $set: {
        'metadata.shareId': shareId,
        'metadata.shareExpires': expirationDate,
        'metadata.shareVoided': false,
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
// Access a shared file — streams from GridFS (no auth required)
// ─────────────────────────────────────────────────────────────────────────────
const accessSharedFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const shareId = req.params.shareId;

    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Shared file not found or link has expired.' });
    }

    const { shareExpires, shareVoided } = fileMapping.metadata;

    if (shareVoided) {
      return res.status(410).json({ error: 'This share link has been revoked.' });
    }
    if (shareExpires && new Date(shareExpires) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }

    const gridFSId = new ObjectId(fileMapping.driveId);
    const filename = fileMapping.metadata?.filename || 'download';
    const contentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = fileMapping.metadata?.size;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', contentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const downloadStream = getBucket().openDownloadStream(gridFSId);
    downloadStream.on('error', (err) => {
      console.error('GridFS share stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    downloadStream.pipe(res);
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
    const ObjectId = getObjectId();
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

    try {
      const gridFSId = new ObjectId(fileMapping.driveId);
      await getBucket().delete(gridFSId);
    } catch (gfsErr) {
      console.warn('GridFS cleanup warning (non-fatal):', gfsErr.message);
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
    const ObjectId = getObjectId();
    const userId = req.user?.userId;
    const { originalname, buffer, stream } = req.file;
    const filename = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype = 'application/zip';
    const uploadDate = new Date();

    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;

    const gridFSId = await writeToGridFS(fileBuffer, filename, mimetype, {
      userId,
      type: 'document',
      isSharedZip: true,
      uploadedAt: uploadDate,
    });

    const mongoId = new ObjectId();
    const metadata = {
      filename,
      type: 'document',
      contentType: mimetype,
      size: fileSize,
      uploadDate,
      uploadedAt: uploadDate,
      isSharedZip: true,
      gridFSId: gridFSId.toString(),
    };

    await storeDriveMapping(mongoId, gridFSId.toString(), metadata, { userId });

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      {
        $set: {
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false,
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
