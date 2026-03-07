// services/fileService.js
// All file storage is now Google Drive — GridFS has been removed.
//
// Key changes vs GridFS version:
//  - driveId in drive_mappings is a Google Drive file-ID string, not a MongoDB ObjectId.
//  - Storage limit is checked against Drive quota (via getDriveStorageQuota) instead of
//    a hard-coded 5 GB cap.  The user's personal Drive space is the limit.
//  - uploadFile, downloadFile, previewFile, deleteFile, accessSharedFile, uploadAndShareZip,
//    cleanupIncompleteUpload, cleanupExpiredLinks all use driveService.
//
// Security fixes retained from GridFS version:
//  - [HIGH-04] isUnsafePreviewType: HTML/SVG/XML/JS forced to attachment.
//  - [CRITICAL-01] Storage quota check before every upload (now real Drive quota).
//  - [MED-03] Expired/voided shared ZIPs: Drive file deleted + mapping removed.
//  - [LOW-03] 8-byte (64-bit) share IDs.

const mongoose = require('mongoose');
const crypto   = require('crypto');

const getFileCategory = require('../utils/fileType');
const {
  getFileMapping,
  storeDriveMapping,
  safeObjectId,
} = require('../utils/driveUtils');
const { cleanupFileFromFolders } = require('./folderService');
const {
  uploadFileToDrive,
  downloadFileStreamFromDrive,
  downloadFileBufferFromDrive,
  deleteFileFromDrive,
  getDriveStorageQuota,
} = require('./driveService');

const getObjectId = () => mongoose.mongo.ObjectId;
const db = mongoose.connection;

// ─────────────────────────────────────────────────────────────────────────────
// [HIGH-04] MIME types that must never be served inline by the browser.
// Serving these inline would enable stored XSS.
// ─────────────────────────────────────────────────────────────────────────────
const UNSAFE_PREVIEW_TYPES = new Set([
  'text/html',
  'application/xhtml+xml',
  'image/svg+xml',
  'text/xml',
  'application/xml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'text/x-javascript',
  'text/ecmascript',
  'application/ecmascript',
]);

const isUnsafePreviewType = (contentType) => {
  if (!contentType) return false;
  const base = contentType.split(';')[0].trim().toLowerCase();
  return UNSAFE_PREVIEW_TYPES.has(base);
};

// ─────────────────────────────────────────────────────────────────────────────
// [LOW-03] 8-byte (64-bit) share IDs — infeasible to enumerate
// ─────────────────────────────────────────────────────────────────────────────
const generateShortShareId = () => crypto.randomBytes(8).toString('hex');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: sum file sizes stored in drive_mappings for a user (app usage)
// ─────────────────────────────────────────────────────────────────────────────
const getUserStorageUsed = async (userId) => {
  const result = await db.collection('drive_mappings').aggregate([
    { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: { $toLong: { $ifNull: ['$metadata.size', 0] } } },
      },
    },
  ]).toArray();
  return result[0]?.total || 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convert stream → Buffer
// ─────────────────────────────────────────────────────────────────────────────
const toBuffer = async (streamOrBuffer) => {
  if (Buffer.isBuffer(streamOrBuffer)) return streamOrBuffer;
  return new Promise((resolve, reject) => {
    const chunks = [];
    streamOrBuffer.on('data',  (c) => chunks.push(c));
    streamOrBuffer.on('end',   ()  => resolve(Buffer.concat(chunks)));
    streamOrBuffer.on('error', reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Ownership check helper
// ─────────────────────────────────────────────────────────────────────────────
const checkOwnership = (mapping, reqUserId) => {
  if (!mapping) return { allowed: false, mapping };
  if (!mapping.userId || mapping.userId !== reqUserId) {
    return { allowed: false, mapping };
  }
  return { allowed: true, mapping };
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload file → Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    const ObjectId  = getObjectId();
    const userId    = req.user?.userId;
    const { originalname, mimetype, buffer, stream, size } = req.file;

    // ── Check Drive quota before uploading ──────────────────────────────────
    if (userId) {
      const fileSize = size || buffer?.length || 0;
      try {
        const quota = await getDriveStorageQuota(userId);
        const available = quota.limit - quota.usage;
        if (available > 0 && fileSize > available) {
          return res.status(413).json({
            error: `Not enough Google Drive storage. You have ${(available / (1024 ** 3)).toFixed(2)} GB available.`,
          });
        }
      } catch (quotaErr) {
        // If quota check fails (e.g. token issue), fall through — Drive API will
        // reject the upload itself if there really is no space.
        console.warn('Quota pre-check failed (non-fatal):', quotaErr.message);
      }
    }

    const type       = getFileCategory(mimetype);
    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize   = fileBuffer.length;
    const uploadDate = new Date();

    // Sanitize filename — multer originalname is user-controlled
    const sanitizedName = (originalname || '')
      .replace(/[/\\]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[\x00-\x1f\x7f]/g, '_')
      .trim() || `upload_${Date.now()}`;

    // Upload to Google Drive
    const driveFileId = await uploadFileToDrive(userId, sanitizedName, mimetype, fileBuffer);

    const mongoId  = new ObjectId();
    const metadata = {
      filename:    sanitizedName,
      type,
      contentType: mimetype,
      size:        fileSize,
      uploadDate,
      uploadedAt:  uploadDate,
      driveFileId: driveFileId, // redundant backup of driveId at metadata level
    };

    // driveId is now a Drive file ID string, not a MongoDB ObjectId
    await storeDriveMapping(mongoId, driveFileId, metadata, { userId });

    res.status(201).json({
      _id:         mongoId,
      length:      fileSize,
      chunkSize:   261120,
      uploadDate,
      filename:    sanitizedName,
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

    const files = await db.collection('drive_mappings')
      .find({ userId, 'metadata.isSharedZip': { $ne: true } })
      .sort({ createdAt: -1 })
      .toArray();

    const formattedFiles = files.map((file) => ({
      _id:         file._id,
      length:      file.metadata?.size ? parseInt(file.metadata.size) : 0,
      chunkSize:   261120,
      uploadDate:  file.metadata?.uploadDate || file.createdAt,
      filename:    file.metadata?.filename,
      contentType: file.metadata?.contentType,
      metadata:    file.metadata,
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({ error: 'Failed to retrieve files.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a file — ownership check then Drive delete
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

    if (!mapping.driveId) {
      return res.status(500).json({ error: 'File record is corrupt (missing storage ID).' });
    }

    // Delete from Google Drive (non-fatal if 404)
    await deleteFileFromDrive(userId, mapping.driveId);

    const objectId    = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    // Remove file reference from any folders
    await cleanupFileFromFolders(userId, fileId);

    res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a file — streams from Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    if (!fileMapping.driveId) {
      return res.status(500).json({ error: 'File record is corrupt (missing storage ID).' });
    }

    const filename    = fileMapping.metadata?.filename    || 'download';
    const contentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize    = fileMapping.metadata?.size;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', contentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const driveStream = await downloadFileStreamFromDrive(userId, fileMapping.driveId);
    driveStream.on('error', (err) => {
      console.error('Drive download stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    driveStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview a file — streams inline (with XSS guard), 24h browser cache
// [HIGH-04] HTML/SVG/XML/JS are forced to attachment so they can't execute.
// ─────────────────────────────────────────────────────────────────────────────
const previewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    if (!fileMapping.driveId) {
      return res.status(500).json({ error: 'File record is corrupt (missing storage ID).' });
    }

    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const isUnsafe          = isUnsafePreviewType(storedContentType);
    const servedContentType = isUnsafe ? 'application/octet-stream' : storedContentType;
    const filename          = fileMapping.metadata?.filename || 'preview';
    const safeFilename      = encodeURIComponent(filename).replace(/['()]/g, escape);

    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');

    if (isUnsafe) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    } else {
      res.setHeader('Content-Type', servedContentType);
      res.setHeader('Cache-Control', 'private, max-age=86400'); // 24-hour browser cache
    }

    const driveStream = await downloadFileStreamFromDrive(userId, fileMapping.driveId);
    driveStream.on('error', (err) => {
      console.error('Drive preview stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found.' });
    });
    driveStream.pipe(res);
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
    const fileId  = req.params.id;
    const userId  = req.user?.userId;
    const rawDays = req.body.expiresInDays;
    const expiresInDays = (Number.isFinite(Number(rawDays)) && Number(rawDays) >= 1)
      ? Math.min(Math.floor(Number(rawDays)), 365)
      : 7;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    const shareId       = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiresInDays);

    const objectId    = safeObjectId(fileId);
    const updateQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').updateOne(
      updateQuery,
      {
        $set: {
          'metadata.shareId':      shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided':  false,
        },
      },
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ error: 'Failed to generate share link.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Access a shared file — public route (no auth), uses owner's Drive credentials
// [HIGH-04] XSS guard applied; [FIX] CSP sandbox added
// ─────────────────────────────────────────────────────────────────────────────
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;

    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
    });

    if (!fileMapping) return res.status(404).json({ error: 'Shared file not found.' });

    const { shareExpires, shareVoided } = fileMapping.metadata;
    if (shareVoided) return res.status(410).json({ error: 'This share link has been revoked.' });
    if (shareExpires && new Date(shareExpires) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }

    if (!fileMapping.driveId) {
      return res.status(500).json({ error: 'Shared file record is corrupt.' });
    }

    const ownerUserId     = fileMapping.userId;
    const filename        = fileMapping.metadata?.filename || 'download';
    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize        = fileMapping.metadata?.size;

    // [HIGH-04] Force unsafe types to download — shared files are public so
    // defense-in-depth is especially important here.
    const safeContentType = isUnsafePreviewType(storedContentType)
      ? 'application/octet-stream'
      : storedContentType;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', safeContentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    // Server-side: fetch from the owner's Drive and proxy to the requester
    const driveStream = await downloadFileStreamFromDrive(ownerUserId, fileMapping.driveId);
    driveStream.on('error', (err) => {
      console.error('Drive share stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    driveStream.pipe(res);
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ error: 'Failed to access shared file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload a ZIP for batch-share — stores in Drive, returns a share URL
// [CRITICAL-01] Drive quota checked before upload
// ─────────────────────────────────────────────────────────────────────────────
const uploadAndShareZip = async (req, res) => {
  try {
    const ObjectId   = getObjectId();
    const userId     = req.user?.userId;
    const { originalname, buffer, stream } = req.file;
    const filename   = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype   = 'application/zip';
    const uploadDate = new Date();

    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize   = fileBuffer.length;

    // [CRITICAL-01] Check Drive quota before uploading the ZIP
    if (userId) {
      try {
        const quota     = await getDriveStorageQuota(userId);
        const available = quota.limit - quota.usage;
        if (available > 0 && fileSize > available) {
          return res.status(413).json({
            error: `Not enough Google Drive storage. You have ${(available / (1024 ** 3)).toFixed(2)} GB available.`,
          });
        }
      } catch (quotaErr) {
        console.warn('Quota pre-check failed for share-zip (non-fatal):', quotaErr.message);
      }
    }

    const driveFileId = await uploadFileToDrive(userId, filename, mimetype, fileBuffer);

    const mongoId  = new ObjectId();
    const metadata = {
      filename,
      type:        'document',
      contentType: mimetype,
      size:        fileSize,
      uploadDate,
      uploadedAt:  uploadDate,
      isSharedZip: true,
      driveFileId: driveFileId,
    };

    await storeDriveMapping(mongoId, driveFileId, metadata, { userId });

    const shareId        = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      {
        $set: {
          'metadata.shareId':      shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided':  false,
        },
      },
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.status(201).json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Error uploading and sharing zip:', error);
    res.status(500).json({ error: 'Upload and share failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup incomplete upload artefacts
// ─────────────────────────────────────────────────────────────────────────────
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const fileId   = req.params.fileId;
    const userId   = req.user?.userId;

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
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    // Delete from Drive (non-fatal)
    try {
      if (fileMapping.driveId) {
        await deleteFileFromDrive(userId, fileMapping.driveId);
      }
    } catch (driveErr) {
      console.warn('Drive cleanup warning (non-fatal):', driveErr.message);
    }

    await db.collection('drive_mappings').deleteOne({ _id: fileMapping._id });
    res.json({ message: 'Incomplete upload cleaned up' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup expired / voided share links
// [MED-03] Shared ZIPs: Drive file deleted + drive_mappings record removed.
//          Regular share links: only share metadata unset (file itself kept).
// ─────────────────────────────────────────────────────────────────────────────
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    if (!db || !db.collection) return 0;

    // Step 1: Find and delete expired/voided shared ZIP documents
    const expiredZips = await db.collection('drive_mappings').find({
      'metadata.isSharedZip': true,
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true },
      ],
    }).toArray();

    let deletedZipCount = 0;
    for (const zip of expiredZips) {
      // Delete the actual Drive file using the file owner's credentials
      try {
        if (zip.driveId && zip.userId) {
          await deleteFileFromDrive(zip.userId, zip.driveId);
        }
      } catch (driveErr) {
        console.warn(`Cleanup: Drive delete warning for shared ZIP ${zip._id}:`, driveErr.message);
      }
      try {
        await db.collection('drive_mappings').deleteOne({ _id: zip._id });
        deletedZipCount++;
      } catch (dbErr) {
        console.warn(`Cleanup: drive_mappings delete warning for ${zip._id}:`, dbErr.message);
      }
    }

    if (deletedZipCount > 0) {
      console.log(`Cleanup: deleted ${deletedZipCount} expired/voided shared ZIP(s) and their Drive files.`);
    }

    // Step 2: Unset share metadata on expired/voided regular file links (keep the files)
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
          'metadata.shareId':      '',
          'metadata.shareExpires': '',
          'metadata.shareVoided':  '',
        },
      },
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
      console.log('MongoDB connection not ready. Skipping cleanup.');
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
  downloadFile,
  previewFile,
  deleteFile,
  generateShareLink,
  accessSharedFile,
  uploadAndShareZip,
  cleanupIncompleteUpload,
  scheduleCleanup,
  getUserStorageUsed,
};
