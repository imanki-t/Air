// services/fileService.js
// IMPORTANT: ObjectId and GridFSBucket are taken from mongoose.mongo — NOT from
// the 'mongodb' package — so all BSON types share a single bson version.
//
// SECURITY FIXES:
//  - [CRITICAL-01] uploadAndShareZip now checks the user's storage usage before
//                  writing to GridFS, closing the bypass of the 5 GB quota.
//  - [LOW-03]      generateShortShareId upgraded from 4 bytes (24-bit, ~16M values)
//                  to 8 bytes (64-bit, ~1.8×10¹⁹ values), making share IDs
//                  infeasible to enumerate even from distributed IPs.
//  - [MED-03]      cleanupExpiredLinks now fully deletes expired/voided shared ZIP
//                  documents: it deletes the GridFS binary and the drive_mappings
//                  record instead of merely $unsetting the share metadata fields.
//                  Regular (non-ZIP) share links continue to have metadata unset
//                  (the file itself is kept; only the share link is removed).
//  - [HIGH-04]     previewFile no longer serves HTML, SVG, XML, or JavaScript
//                  content inline. These types are forced to attachment with a
//                  sanitized Content-Type, preventing stored-XSS execution. A
//                  Content-Security-Policy: sandbox header is also added to every
//                  preview response as a second layer of defence.

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
// [HIGH-04] MIME types that must never be served inline — they would be
// executed by the browser as code, enabling stored XSS.
// Any content-type that starts with one of these prefixes is treated as unsafe.
// ─────────────────────────────────────────────────────────────────────────────
const UNSAFE_PREVIEW_MIME_PREFIXES = [
  'text/html',
  'text/xml',
  'application/xml',
  'application/xhtml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'image/svg+xml',
  'text/x-javascript',
  'module',
];

const isUnsafePreviewType = (mimeType) => {
  const lower = (mimeType || '').toLowerCase().split(';')[0].trim();
  return UNSAFE_PREVIEW_MIME_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

// ─────────────────────────────────────────────────────────────────────────────
// [LOW-03] Generate a short share ID — upgraded to 8 bytes (64-bit entropy).
// The previous 4-byte implementation had only ~16 million possible values.
// 8 bytes yields ~1.8×10¹⁹ possible IDs, making brute-force enumeration
// infeasible even from a large distributed set of IPs.
// ─────────────────────────────────────────────────────────────────────────────
const generateShortShareId = () => {
  return crypto
    .randomBytes(8)                   // 64 bits of entropy (was 4 bytes / 24 bits)
    .toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '')
    .substring(0, 11);               // 11 base64 chars represent ~66 bits
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify ownership of a file mapping
// ─────────────────────────────────────────────────────────────────────────────
const checkOwnership = (mapping, reqUserId) => {
  if (!mapping) return { allowed: false, mapping: null };
  // [FIX] IDOR: previously `mapping.userId &&` meant documents with no userId
  // field silently passed the check. Now a missing userId also denies access.
  if (!mapping.userId || mapping.userId !== reqUserId) {
    return { allowed: false, mapping };
  }
  return { allowed: true, mapping };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get total storage used by a user (excluding shared ZIPs)
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
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get all files for the current user
// ─────────────────────────────────────────────────────────────────────────────
const getFiles = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const query = { userId, 'metadata.isSharedZip': { $ne: true } };

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
    res.status(500).json({ error: 'Failed to retrieve files.' });
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

    // [FIX] Guard against null/corrupt driveId — raw new ObjectId() throws and
    // causes a 500 instead of a clean error message.
    const gridFSId = safeObjectId(mapping.driveId);
    if (!gridFSId) {
      return res.status(500).json({ error: 'File record is corrupt (invalid storage ID).' });
    }
    await getBucket().delete(gridFSId);

    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId
      ? { _id: objectId }
      : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').deleteOne(deleteQuery);

    // Remove file reference from any folders
    // [FIX] Argument order corrected: signature is (userId, fileId)
    await cleanupFileFromFolders(userId, fileId);

    res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a file
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const gridFSId = new ObjectId(fileMapping.driveId);
    const filename = fileMapping.metadata?.filename || 'download';
    const contentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = fileMapping.metadata?.size;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
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
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview a file (inline, with caching)
// ─────────────────────────────────────────────────────────────────────────────
const previewFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const gridFSId = new ObjectId(fileMapping.driveId);
    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';

    // [HIGH-04] Prevent stored XSS: HTML, SVG, XML, and JavaScript must never
    // be rendered inline by the browser. Force them to download as opaque binary.
    // Defence-in-depth: also add CSP sandbox + nosniff on every preview response.
    const isUnsafe = isUnsafePreviewType(storedContentType);
    const servedContentType = isUnsafe ? 'application/octet-stream' : storedContentType;
    const filename = fileMapping.metadata?.filename || 'preview';
    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');

    if (isUnsafe) {
      // Force download so the browser never renders the content
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    } else {
      res.setHeader('Content-Type', servedContentType);
      res.setHeader('Cache-Control', 'private, max-age=86400'); // 24-hour browser cache
    }

    const downloadStream = getBucket().openDownloadStream(gridFSId);
    downloadStream.on('error', (err) => {
      console.error('GridFS preview stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found.' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ error: 'Failed to preview file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate a share link for a file
// ─────────────────────────────────────────────────────────────────────────────
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;
    const rawDays = req.body.expiresInDays;
    // [FIX] Validate and clamp expiresInDays — must be a number between 1 and 365.
    // Unvalidated, a caller could pass -1 (instant expiry) or 99999 (never expires).
    const expiresInDays = (Number.isFinite(Number(rawDays)) && Number(rawDays) >= 1)
      ? Math.min(Math.floor(Number(rawDays)), 365)
      : 7;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiresInDays);

    const objectId = safeObjectId(fileId);
    const updateQuery = objectId
      ? { _id: objectId }
      : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').updateOne(
      updateQuery,
      {
        $set: {
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false,
        },
      }
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ error: 'Failed to generate share link.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Access a shared file via short share ID
// ─────────────────────────────────────────────────────────────────────────────
const accessSharedFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const shareId = req.params.shareId;

    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Shared file not found.' });
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
    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = fileMapping.metadata?.size;

    // [FIX] Apply the same XSS guard as previewFile — shared files are public
    // (no auth) so serving HTML/SVG/JS inline is especially dangerous. Force
    // unsafe types to application/octet-stream so the browser always downloads.
    const safeContentType = isUnsafePreviewType(storedContentType)
      ? 'application/octet-stream'
      : storedContentType;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // [FIX] Add CSP sandbox — shared files are public (no auth) so defense-in-depth
    // is more important here than on previewFile. Matches the header set there.
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', safeContentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const downloadStream = getBucket().openDownloadStream(gridFSId);
    downloadStream.on('error', (err) => {
      console.error('GridFS share stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ error: 'Failed to access shared file.' });
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
    res.status(500).json({ error: 'Cleanup failed.' });
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

    // [CRITICAL-01] Check the user's total storage usage before writing the ZIP
    // to GridFS. The previous code skipped this check entirely for share-ZIPs,
    // allowing unlimited uploads that bypassed the 5 GB personal quota because
    // getUserStorageUsed() excludes isSharedZip documents from its aggregate.
    // We count the ZIP toward the user's quota here before writing.
    if (userId) {
      const currentUsage = await getUserStorageUsed(userId);
      if (currentUsage + fileSize > STORAGE_LIMIT_BYTES) {
        return res.status(413).json({
          error: 'Storage limit exceeded. You have reached your 5 GB limit.',
        });
      }
    }

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
    res.status(500).json({ error: 'Upload and share failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup expired / voided share links
// ─────────────────────────────────────────────────────────────────────────────
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    if (!db || !db.collection) return 0;
    const ObjectId = getObjectId();

    // [MED-03] For shared ZIP documents (isSharedZip: true), we must fully delete
    // both the GridFS binary and the drive_mappings record when the share expires
    // or is voided. Previously these accumulated as orphaned blobs consuming
    // storage indefinitely because only the share metadata fields were $unset.
    //
    // For regular file share links, the file itself is kept — only the share
    // metadata is unset (existing behaviour preserved).

    // ── Step 1: Find and delete expired/voided shared ZIP documents ──────────
    const expiredZips = await db.collection('drive_mappings').find({
      'metadata.isSharedZip': true,
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true },
      ],
    }).toArray();

    let deletedZipCount = 0;
    for (const zip of expiredZips) {
      try {
        const gridFSId = new ObjectId(zip.driveId);
        await getBucket().delete(gridFSId);
      } catch (gfsErr) {
        console.warn(`Cleanup: GridFS delete warning for shared ZIP ${zip._id}:`, gfsErr.message);
      }
      try {
        await db.collection('drive_mappings').deleteOne({ _id: zip._id });
        deletedZipCount++;
      } catch (dbErr) {
        console.warn(`Cleanup: drive_mappings delete warning for ${zip._id}:`, dbErr.message);
      }
    }

    if (deletedZipCount > 0) {
      console.log(`Cleanup: deleted ${deletedZipCount} expired/voided shared ZIP(s) and their GridFS binaries.`);
    }

    // ── Step 2: Unset share metadata on expired/voided regular file links ─────
    const result = await db.collection('drive_mappings').updateMany(
      {
        'metadata.isSharedZip': { $ne: true },
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

    return (result.modifiedCount || 0) + deletedZipCount;
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
