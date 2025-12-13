// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const getFileCategory = require('../utils/fileType');
const { initDriveClient, initDriveFolder } = require('../config/drive');
const { 
  bufferToStream, 
  streamToBuffer,
} = require('../utils/driveUtils');
const File = require('../models/File');

// Initialize Google Drive client
const { drive, auth } = initDriveClient();
let driveFolderId;

// Get the root folder ID
(async () => {
  try {
    driveFolderId = await initDriveFolder(drive);
    console.log('Google Drive folder initialized:', driveFolderId);
  } catch (error) {
    console.error('Failed to initialize Google Drive folder:', error);
  }
})();

const db = mongoose.connection;

// Generate a short share ID (6 characters)
const generateShortShareId = () => {
  // Generate a random buffer and convert to a base64 string
  const buffer = crypto.randomBytes(4); // 4 bytes = 32 bits
  // Convert to base64 (which is ~4/3 the size, so ~5.33 chars)
  // and take the first 6 characters
  return buffer.toString('base64')
    .replace(/\+/g, '0')  // Replace + with 0
    .replace(/\//g, '1')  // Replace / with 1
    .replace(/=/g, '')    // Remove padding
    .substring(0, 6);     // Take only first 6 chars
};

// --- Upload file to Google Drive ---
const uploadFile = async (req, res) => {
  try {
    if (!driveFolderId) {
      driveFolderId = await initDriveFolder(drive);
    }

    const { originalname, mimetype, stream } = req.file;
    const resumableUploadId = req.body.resumableUploadId;
    const resumableProgress = req.body.resumableProgress;

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

    // Create a file in Google Drive
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

    // Save using Mongoose Model with owner
    const newFile = await File.create({
        driveId: driveRes.data.id,
        metadata: {
            ...metadata,
            filename: driveRes.data.name, // Ensure consistency
            contentType: mimetype,
            size: driveRes.data.size,
            uploadDate: new Date(driveRes.data.createdTime)
        },
        owner: req.user ? req.user._id : null
    });

    // Format response similar to GridFS for frontend compatibility
    const responseObj = {
      _id: newFile._id,
      length: parseInt(driveRes.data.size || 0),
      chunkSize: 261120,
      uploadDate: newFile.metadata.uploadDate,
      filename: newFile.metadata.filename,
      contentType: newFile.metadata.contentType,
      metadata: newFile.metadata,
      driveId: newFile.driveId,
      webContentLink: driveRes.data.webContentLink,
      webViewLink: driveRes.data.webViewLink
    };

    res.status(201).json(responseObj);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Get all files ---
const getFiles = async (req, res) => {
  try {
    // Retrieve files owned by user
    const query = {};
    if (req.user) {
        query.owner = req.user._id;
    } else {
        // If not authenticated (should be protected by middleware though), return nothing or only public?
        // Middleware protects this route, so req.user should exist.
        // For backward compatibility or admin, maybe allow all? No, let's stick to ownership.
        // However, if there are existing files without owner, they will be invisible.
        // Let's assume user only sees their own files.
        return res.status(401).json({ error: "Unauthorized" });
    }

    const files = await File.find(query).sort({ createdAt: -1 });

    // Format response to match GridFS structure
    const formattedFiles = files.map(file => ({
      _id: file._id,
      length: file.metadata.size,
      chunkSize: 261120,
      uploadDate: file.metadata.uploadDate,
      filename: file.metadata.filename,
      contentType: file.metadata.contentType,
      metadata: file.metadata,
      driveId: file.driveId
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Delete a file ---
const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;

    // Find file and check ownership
    const file = await File.findById(fileId);
    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner && req.user && !file.owner.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    const driveId = file.driveId;

    // Delete file from Google Drive
    try {
        await drive.files.delete({
            fileId: driveId
        });
    } catch(err) {
        console.warn("Drive file deletion failed (maybe already deleted):", err.message);
    }

    // Delete mapping from MongoDB
    await File.deleteOne({ _id: file._id });

    // Emit socket event to all clients (Consider scoping this to user rooms if implementing real-time updates per user)
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

// --- Download file ---
const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Verify ownership if needed, or if public/shared.
    // Usually download via /api/files/download/:id requires auth.
    if (file.owner && req.user && !file.owner.equals(req.user._id)) {
         return res.status(403).json({ error: 'Not authorized to download this file' });
    }

    const driveId = file.driveId;

    // Get file metadata from Google Drive
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType'
    });

    // Safely encode the filename to avoid invalid characters in HTTP headers
    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    
    // Set content disposition header for download with properly encoded filename
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);

    // Stream file from Google Drive
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

// --- NEW: Preview/Thumbnail file with caching ---
const previewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    // Ownership check
    if (file.owner && req.user && !file.owner.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not authorized to view this file' });
    }

    const driveId = file.driveId;

    // Get file metadata from Google Drive
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType, modifiedTime'
    });

    // Set caching headers for 24 hours (86400 seconds)
    const cacheMaxAge = 86400; // 24 hours in seconds
    res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge}`);
    res.setHeader('Expires', new Date(Date.now() + cacheMaxAge * 1000).toUTCString());
    
    // Set ETag for cache validation using file modification time and name
    const etag = `"${Buffer.from(fileMetadata.data.modifiedTime + fileMetadata.data.name).toString('base64')}"`;
    res.setHeader('ETag', etag);
    
    // Check if client has cached version
    const clientETag = req.headers['if-none-match'];
    if (clientETag === etag) {
      return res.status(304).end(); // Not Modified
    }

    // Set content type for inline display (preview)
    res.setHeader('Content-Type', fileMetadata.data.mimeType);
    
    // Set content disposition to inline for preview (not download)
    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    res.setHeader('Content-Disposition', `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    
    // Add CORS headers for cross-origin requests if needed
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL || '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Stream file from Google Drive
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

// --- Helper function to cleanup expired or voided share links ---
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    
    // Find files with expired or voided links
    const expiredOrVoidedFiles = await File.find({
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true }
      ]
    });
    
    for (const file of expiredOrVoidedFiles) {
        file.metadata.shareId = undefined;
        file.metadata.shareExpires = undefined;
        file.metadata.shareVoided = undefined;
        await file.save();
        console.log(`Cleaned up expired/voided share link for file: ${file._id}`);
    }
    
    return expiredOrVoidedFiles.length;
  } catch (error) {
    console.error('Error cleaning up expired links:', error);
    return 0;
  }
};

// --- Generate shareable link ---
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await File.findById(fileId);

    if (!file) {
        return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner && req.user && !file.owner.equals(req.user._id)) {
        return res.status(403).json({ error: 'Not authorized to share this file' });
    }

    const driveId = file.driveId;

    // Generate a short (6 character) unique ID for the share link
    const shareId = generateShortShareId();

    // Update the file permissions in Google Drive
    await drive.permissions.create({
      fileId: driveId,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Calculate expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // If existing share, mark as voided (logic slightly simplified as we just overwrite)
    if (file.metadata.shareId) {
        file.metadata.shareVoided = true;
        // In previous logic it was immediately cleaning up old ones?
        // Let's just update to new one.
    }

    file.metadata.shareId = shareId;
    file.metadata.shareExpires = expirationDate;
    file.metadata.shareVoided = false;
    await file.save();

    // Create a shorter share URL using simplified path
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

// --- Access shared file via link ---
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;
    
    // First, clean up any expired links
    await cleanupExpiredLinks();
    
    // Find the file with the given share ID that is not expired or voided
    const now = new Date();
    const file = await File.findOne({
      'metadata.shareId': shareId,
      'metadata.shareExpires': { $gt: now },
      'metadata.shareVoided': { $ne: true }
    });

    if (!file) {
      return res.status(404).json({ error: 'Link not found or has expired' });
    }

    const driveId = file.driveId;

    // Get file metadata from Google Drive
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType'
    });

    // Safely encode the filename to avoid invalid characters in HTTP headers
    const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
    
    // Set content disposition header for download with properly encoded filename
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', fileMetadata.data.mimeType);

    // Stream file from Google Drive
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

// --- Cleanup incomplete upload ---
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    console.log(`Cleanup request received for file ID: ${fileId}`);
    
    if (!fileId || fileId === 'undefined') {
      return res.status(400).json({ message: 'Invalid file ID' });
    }
    
    let file = null;
    
    try {
      if (ObjectId.isValid(fileId)) {
        file = await File.findById(fileId);
      } else {
        file = await File.findOne({ 'metadata.filename': fileId });
      }
    } catch (err) {
       console.log("Error finding file for cleanup", err);
    }
    
    if (!file) {
      return res.json({ message: 'No file found to clean up' });
    }

    // Ownership check? Maybe. But if upload was incomplete/failed, user might not be fully linked.
    // If it's a cleanup request from frontend, it probably comes with user session.
    // But this route is often called when user cancels upload.
    if (file.owner && req.user && !file.owner.equals(req.user._id)) {
         return res.status(403).json({ error: 'Not authorized' });
    }

    const driveId = file.driveId;
    
    // Delete from Drive
    try {
      await drive.files.delete({ fileId: driveId });
    } catch (driveError) {
       console.log(`Drive file delete error or already gone: ${driveError.message}`);
    }
    
    // Delete from DB
    await File.deleteOne({ _id: file._id });
    
    console.log(`Deleted incomplete file mapping with MongoDB ID: ${file._id}`);
    
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

// --- Upload and share ZIP ---
const uploadAndShareZip = async (req, res) => {
  try {
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

    // Create a zip file in Google Drive
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

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Save using Mongoose Model
    await File.create({
        driveId: driveRes.data.id,
        metadata: {
            ...metadata,
            contentType: mimetype,
            size: driveRes.data.size,
            uploadDate: uploadDate,
            shareId: shareId,
            shareExpires: expirationDate,
            shareVoided: false
        },
        // Zip upload share usually implies public or anonymous?
        // If authenticated, we link it.
        owner: req.user ? req.user._id : null
    });

    // Update the file permissions in Google Drive
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

// Expose the cleanupExpiredLinks function publicly
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
