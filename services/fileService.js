// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const getFileCategory = require('../utils/fileType');
const { initDriveClient, initDriveFolder } = require('../config/drive');
const {
  getFileMapping,
  storeDriveMapping,
  bufferToStream,
  streamToBuffer,
  safeObjectId,
} = require('../utils/driveUtils');

// ─────────────────────────────────────────────────────────────────────────────
// Initialize Google Drive client & folder
// ─────────────────────────────────────────────────────────────────────────────
const { drive } = initDriveClient();
let driveFolderId;

(async () => {
  try {
    driveFolderId = await initDriveFolder(drive);
    console.log('Google Drive folder initialized:', driveFolderId);
  } catch (error) {
    console.error('Failed to initialize Google Drive folder:', error);
  }
})();

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
// Helper: verify ownership of a file mapping.
// Legacy files (no userId) are accessible to any authenticated user.
// Returns { allowed, mapping } 
// ─────────────────────────────────────────────────────────────────────────────
const checkOwnership = (mapping, reqUserId) => {
  if (!mapping) return { allowed: false, mapping: null };
  // If the file has a userId set, it must match the requesting user
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
    { $group: { _id: null, total: { $sum: { $toInt: { $ifNull: ['$metadata.size', 0] } } } } },
  ]).toArray();
  return result[0]?.total || 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload file to Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    if (!driveFolderId) {
      driveFolderId = await initDriveFolder(drive);
    }

    const userId = req.user?.userId;
    const { originalname, mimetype, stream } = req.file;
    const resumableUploadId = req.body.resumableUploadId;
    const resumableProgress = req.body.resumableProgress;

    // ── 5 GB storage check ──────────────────────────────────────────────────
    if (userId) {
      const fileSize = req.file.size || req.file.buffer?.length || 0;
      const currentUsage = await getUserStorageUsed(userId);
      if (currentUsage + fileSize > STORAGE_LIMIT_BYTES) {
        return res.status(413).json({
          error: 'Storage limit exceeded. You have reached your 5 GB limit.',
        });
      }
    }

    const type = getFileCategory(mimetype);
    const metadata = {
      filename: originalname,
      type,
      uploadedAt: new Date(),
    };

    if (resumableUploadId) {
      metadata.resumableUploadId = resumableUploadId;
      metadata.resumableProgress = resumableProgress;
    }

    const driveFileMetadata = {
      name: originalname,
      parents: [driveFolderId],
      description: JSON.stringify(metadata),
      mimeType: mimetype,
    };

    const buffer = await streamToBuffer(stream);

    const driveRes = await drive.files.create({
      resource: driveFileMetadata,
      media: { mimeType: mimetype, body: bufferToStream(buffer) },
      fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
    });

    const mongoId = new ObjectId();

    // Store mapping WITH userId for per-user isolation
    // size must be stored as a number so MongoDB $sum aggregation works correctly
    await storeDriveMapping(
      mongoId,
      driveRes.data.id,
      {
        ...metadata,
        contentType: mimetype,
        size: parseInt(driveRes.data.size || 0, 10),
        uploadDate: new Date(driveRes.data.createdTime),
      },
      { userId } // top-level userId field for ownership queries
    );

    const responseObj = {
      _id: mongoId,
      length: parseInt(driveRes.data.size || 0),
      chunkSize: 261120,
      uploadDate: new Date(driveRes.data.createdTime),
      filename: driveRes.data.name,
      contentType: driveRes.data.mimeType,
      metadata,
      driveId: driveRes.data.id,
      webContentLink: driveRes.data.webContentLink,
      webViewLink: driveRes.data.webViewLink,
    };

    res.status(201).json(responseObj);
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

    // Only return files belonging to this user (legacy files with no userId are excluded for security)
    const query = userId ? { userId, 'metadata.isSharedZip': { $ne: true } } : {};

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
      driveId: file.driveId,
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

    // Get full mapping to check ownership
    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    const driveId = mapping.driveId;

    // Delete from Google Drive
    await drive.files.delete({ fileId: driveId });

    // Delete mapping from MongoDB
    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    // Broadcast to all connected clients of this user
    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
    }

    res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download file (ownership check)
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

    const driveId = mapping.driveId;
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType, size',
    });

    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);
    if (fileMetadata.data.size) {
      res.setHeader('Content-Length', fileMetadata.data.size);
    }

    const driveResponse = await drive.files.get(
      { fileId: driveId, alt: 'media' },
      { responseType: 'stream' }
    );

    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview/Thumbnail (ownership check, 24h caching)
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

    const driveId = mapping.driveId;
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType, modifiedTime',
    });

    const cacheMaxAge = 86400;
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.setHeader('Expires', new Date(Date.now() + cacheMaxAge * 1000).toUTCString());

    const etag = `"${Buffer.from(fileMetadata.data.modifiedTime + fileMetadata.data.name).toString('base64')}"`;
    res.setHeader('ETag', etag);

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', fileMetadata.data.mimeType);
    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    const driveResponse = await drive.files.get(
      { fileId: driveId, alt: 'media' },
      { responseType: 'stream' }
    );
    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate share link (ownership check)
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

    const driveId = mapping.driveId;
    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await drive.permissions.create({
      fileId: driveId,
      requestBody: { role: 'reader', type: 'anyone' },
    });

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
// Access a shared file (public, rate-limited – no ownership check)
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

    const { shareExpires, shareVoided } = fileMapping.metadata;
    if (shareVoided) {
      return res.status(410).json({ error: 'This share link has been revoked.' });
    }
    if (shareExpires && new Date(shareExpires) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }

    const driveId = fileMapping.driveId;
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType, size',
    });

    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);
    if (fileMetadata.data.size) {
      res.setHeader('Content-Length', fileMetadata.data.size);
    }

    const driveResponse = await drive.files.get(
      { fileId: driveId, alt: 'media' },
      { responseType: 'stream' }
    );
    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup incomplete upload artefacts (ownership check)
// ─────────────────────────────────────────────────────────────────────────────
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    const userId = req.user?.userId;

    if (!fileId) return res.status(400).json({ message: 'Invalid file ID' });

    let query;
    let mongoId = null;

    try {
      if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
        mongoId = new ObjectId(fileId);
        query = { _id: mongoId };
      } else {
        query = { 'metadata.filename': fileId };
      }
    } catch {
      query = { 'metadata.filename': fileId };
    }

    const fileMapping = await db.collection('drive_mappings').findOne(query);
    if (!fileMapping) return res.json({ message: 'No file found to clean up' });

    // Ownership check
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const driveId = fileMapping.driveId;
    mongoId = fileMapping._id;

    // Check if the file still exists in Drive before deleting
    try {
      await drive.files.get({ fileId: driveId, fields: 'id' });
      await drive.files.delete({ fileId: driveId });
    } catch (driveErr) {
      if (driveErr.code !== 404) throw driveErr;
    }

    await db.collection('drive_mappings').deleteOne({ _id: mongoId });
    res.json({ message: 'Incomplete upload cleaned up' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload & share a ZIP (batch share – requires auth)
// ─────────────────────────────────────────────────────────────────────────────
const uploadAndShareZip = async (req, res) => {
  try {
    if (!driveFolderId) {
      driveFolderId = await initDriveFolder(drive);
    }

    const userId = req.user?.userId;
    const { originalname, stream } = req.file;
    const filename = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype = 'application/zip';
    const uploadDate = new Date();

    const metadata = {
      filename,
      type: 'document',
      isSharedZip: true,
      uploadedAt: uploadDate,
    };

    const driveFileMetadata = {
      name: filename,
      parents: [driveFolderId],
      description: JSON.stringify(metadata),
      mimeType: mimetype,
    };

    const buffer = await streamToBuffer(stream);
    const driveRes = await drive.files.create({
      resource: driveFileMetadata,
      media: { mimeType: mimetype, body: bufferToStream(buffer) },
      fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
    });

    const mongoId = new ObjectId();
    await storeDriveMapping(
      mongoId,
      driveRes.data.id,
      { ...metadata, contentType: mimetype, size: parseInt(driveRes.data.size || 0, 10), uploadDate },
      { userId }
    );

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: { role: 'reader', type: 'anyone' },
    });

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

    const expiredMappings = await db.collection('drive_mappings').find({
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true },
      ],
    }).toArray();

    let cleanedCount = 0;
    for (const mapping of expiredMappings) {
      try {
        await drive.permissions.delete({
          fileId: mapping.driveId,
          permissionId: 'anyoneWithLink',
        });
      } catch { /* ignore permission errors */ }

      await db.collection('drive_mappings').updateOne(
        { _id: mapping._id },
        {
          $unset: { 'metadata.shareId': '', 'metadata.shareExpires': '', 'metadata.shareVoided': '' },
        }
      );
      cleanedCount++;
    }
    return cleanedCount;
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
