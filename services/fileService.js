// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const getFileCategory = require('../utils/fileType');
const { initDriveClient, initDriveFolder } = require('../config/drive');
const DriveMapping = require('../models/DriveMapping');
const Folder = require('../models/Folder');
const { 
  getDriveIdMapping, 
  storeDriveMapping, 
  bufferToStream, 
  streamToBuffer,
  safeObjectId
} = require('../utils/driveUtils');

// Initialize Google Drive client
const { drive, auth } = initDriveClient();
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

const generateShortShareId = () => {
  const buffer = crypto.randomBytes(4);
  return buffer.toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '')
    .substring(0, 6);
};

// Upload file - now with user authentication
const uploadFile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!driveFolderId) {
      driveFolderId = await initDriveFolder(drive);
    }

    const { originalname, mimetype, stream } = req.file;
    const resumableUploadId = req.body.resumableUploadId;
    const resumableProgress = req.body.resumableProgress;
    const folderId = req.body.folderId || null;

    // If folder specified, verify it belongs to user
    if (folderId) {
      const folder = await Folder.findOne({
        _id: folderId,
        user: req.userId
      });

      if (!folder) {
        return res.status(404).json({ error: 'Folder not found' });
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
      media: {
        mimeType: mimetype,
        body: bufferToStream(buffer)
      },
      fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
    });

    const mongoId = new ObjectId();
    
    // Create drive mapping with user ID
    await DriveMapping.create({
      _id: mongoId,
      driveId: driveRes.data.id,
      userId: req.userId,
      folderId: folderId,
      metadata: {
        ...metadata,
        contentType: mimetype,
        size: parseInt(driveRes.data.size || 0),
        uploadDate: new Date(driveRes.data.createdTime)
      }
    });

    // Update folder stats if file uploaded to folder
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (folder) {
        await folder.updateStats();
      }
    }

    const responseObj = {
      _id: mongoId,
      length: parseInt(driveRes.data.size || 0),
      chunkSize: 261120,
      uploadDate: new Date(driveRes.data.createdTime),
      filename: driveRes.data.name,
      contentType: driveRes.data.mimeType,
      metadata: metadata,
      driveId: driveRes.data.id,
      folderId: folderId,
      webContentLink: driveRes.data.webContentLink,
      webViewLink: driveRes.data.webViewLink
    };

    res.status(201).json(responseObj);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Get files - filtered by user
const getFiles = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { folderId } = req.query;
    const query = { userId: req.userId };

    if (folderId) {
      if (folderId === 'root') {
        query.folderId = null;
      } else {
        query.folderId = folderId;
      }
    }

    const files = await DriveMapping.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      length: file.metadata.size,
      chunkSize: 261120,
      uploadDate: file.metadata.uploadDate,
      filename: file.metadata.filename,
      contentType: file.metadata.contentType,
      metadata: file.metadata,
      driveId: file.driveId,
      folderId: file.folderId
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({ error: error.message });
  }
};

// Delete file - with user verification
const deleteFile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fileId = req.params.id;
    
    // Find file and verify ownership
    const fileMapping = await DriveMapping.findOne({
      _id: fileId,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    const driveId = fileMapping.driveId;
    const folderId = fileMapping.folderId;

    // Delete from Google Drive
    try {
      await drive.files.delete({ fileId: driveId });
    } catch (driveError) {
      if (driveError.code !== 404) {
        console.error('Drive deletion error:', driveError);
      }
    }

    // Delete from database
    await DriveMapping.deleteOne({ _id: fileId });

    // Update folder stats
    if (folderId) {
      const folder = await Folder.findById(folderId);
      if (folder) {
        await folder.updateStats();
      }
    }

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

// Download file - with user verification
const downloadFile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fileId = req.params.id;
    
    // Verify file ownership
    const fileMapping = await DriveMapping.findOne({
      _id: fileId,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    const driveId = fileMapping.driveId;

    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType'
    });

    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);

    const driveResponse = await drive.files.get({
      fileId: driveId,
      alt: 'media'
    }, { responseType: 'stream' });

    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Preview file - with user verification
const previewFile = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fileId = req.params.id;
    
    const fileMapping = await DriveMapping.findOne({
      _id: fileId,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    const driveId = fileMapping.driveId;

    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType, modifiedTime'
    });

    const cacheMaxAge = 86400;
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.setHeader('Expires', new Date(Date.now() + cacheMaxAge * 1000).toUTCString());
    
    const etag = `"${Buffer.from(fileMetadata.data.modifiedTime + fileMetadata.data.name).toString('base64')}"`;
    res.setHeader('ETag', etag);
    
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      return res.status(304).end();
    }

    res.setHeader('Content-Type', fileMetadata.data.mimeType);
    
    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    const driveResponse = await drive.files.get({
      fileId: driveId,
      alt: 'media'
    }, { responseType: 'stream' });

    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cleanup expired links
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    
    if (!db || !db.collection) {
      console.log('MongoDB connection not ready yet. Skipping cleanup.');
      return 0;
    }
    
    const expiredLinks = await DriveMapping.find({
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true }
      ]
    });
    
    for (const link of expiredLinks) {
      await DriveMapping.updateOne(
        { _id: link._id },
        { 
          $unset: { 
            'metadata.shareId': "",
            'metadata.shareExpires': "",
            'metadata.shareVoided': ""
          }
        }
      );
      
      console.log(`Cleaned up expired/voided share link for file: ${link._id}`);
    }
    
    return expiredLinks.length;
  } catch (error) {
    console.error('Error cleaning up expired links:', error);
    return 0;
  }
};

// Generate share link - with user verification
const generateShareLink = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const fileId = req.params.id;
    
    const fileMapping = await DriveMapping.findOne({
      _id: fileId,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    const driveId = fileMapping.driveId;
    const shareId = generateShortShareId();

    await drive.permissions.create({
      fileId: driveId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const file = await drive.files.get({
      fileId: driveId,
      fields: 'webContentLink, webViewLink'
    });

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Mark old share links as voided
    if (fileMapping.metadata.shareId) {
      await DriveMapping.updateOne(
        { _id: fileId },
        { $set: { 'metadata.shareVoided': true } }
      );
      await cleanupExpiredLinks();
    }

    await DriveMapping.updateOne(
      { _id: fileId },
      { 
        $set: { 
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false
        } 
      }
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    
    res.json({ 
      url: shareURL,
      expires: expirationDate
    });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Access shared file - public endpoint
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;
    
    await cleanupExpiredLinks();
    
    const now = new Date();
    const fileMapping = await DriveMapping.findOne({
      'metadata.shareId': shareId,
      'metadata.shareExpires': { $gt: now },
      'metadata.shareVoided': { $ne: true }
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Link not found or has expired' });
    }

    const driveId = fileMapping.driveId;

    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType'
    });

    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);

    const driveResponse = await drive.files.get({
      fileId: driveId,
      alt: 'media'
    }, { responseType: 'stream' });

    driveResponse.data.pipe(res);
  } catch (error) {
    console.error('Share access error:', error);
    res.status(500).json({ error: error.message });
  }
};

// Cleanup incomplete upload
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    
    if (!fileId || fileId === 'undefined') {
      return res.status(400).json({ message: 'Invalid file ID' });
    }
    
    const fileMapping = await DriveMapping.findOne({
      _id: fileId,
      userId: req.userId
    });
    
    if (!fileMapping) {
      return res.json({ message: 'No file found to clean up' });
    }
    
    const driveId = fileMapping.driveId;
    
    try {
      await drive.files.delete({ fileId: driveId });
    } catch (driveError) {
      if (driveError.code !== 404) {
        console.error('Drive cleanup error:', driveError);
      }
    }
    
    await DriveMapping.deleteOne({ _id: fileId });
    
    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
    }
    
    res.json({ message: 'Incomplete upload cleaned up successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(200).json({ message: 'Cleanup process completed' });
  }
};

// Upload and share ZIP
const uploadAndShareZip = async (req, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No zip file uploaded.' });
    }

    if (!driveFolderId) {
      driveFolderId = await initDriveFolder(drive);
    }

    const { originalname, stream } = req.file;
    const filename = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype = 'application/zip';
    const type = 'document';
    const uploadDate = new Date();

    const metadata = {
      filename,
      type,
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
      media: {
        mimeType: mimetype,
        body: bufferToStream(buffer)
      },
      fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
    });

    const mongoId = new ObjectId();
    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await DriveMapping.create({
      _id: mongoId,
      driveId: driveRes.data.id,
      userId: req.userId,
      metadata: {
        ...metadata,
        contentType: mimetype,
        size: parseInt(driveRes.data.size || 0),
        uploadDate: uploadDate,
        shareId: shareId,
        shareExpires: expirationDate,
        shareVoided: false
      }
    });

    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    
    res.status(201).json({ 
      url: shareURL,
      expires: expirationDate
    });
  } catch (error) {
    console.error('Error uploading and sharing zip:', error);
    res.status(500).json({ error: error.message });
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
  scheduleCleanup
};
