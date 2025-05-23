// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const getFileCategory = require('../utils/fileType');
const { initDriveClient, initDriveFolder } = require('../config/drive');
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

    // Generate MongoDB ObjectId for compatibility with existing code
    const mongoId = new ObjectId();
    
    // Store mapping between MongoDB ObjectId and Google Drive file ID
    await storeDriveMapping(mongoId, driveRes.data.id, {
      ...metadata,
      contentType: mimetype,
      size: driveRes.data.size,
      uploadDate: new Date(driveRes.data.createdTime)
    });

    // Format response similar to GridFS for frontend compatibility
    const responseObj = {
      _id: mongoId,
      length: parseInt(driveRes.data.size || 0),
      chunkSize: 261120,
      uploadDate: new Date(driveRes.data.createdTime),
      filename: driveRes.data.name,
      contentType: driveRes.data.mimeType,
      metadata: metadata,
      driveId: driveRes.data.id,
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
    // Retrieve all file mappings from MongoDB
    const files = await db.collection('drive_mappings')
      .find({})
      .sort({ createdAt: -1 })
      .toArray();

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
    const driveId = await getDriveIdMapping(fileId);

    // Delete file from Google Drive
    await drive.files.delete({
      fileId: driveId
    });

    // Delete mapping from MongoDB using safe ObjectId conversion
    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    // Emit socket event to all clients
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
    const driveId = await getDriveIdMapping(fileId);

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

// --- Helper function to cleanup expired or voided share links ---
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    
    // Ensure the MongoDB connection is established
    if (!db || !db.collection) {
      console.log('MongoDB connection not ready yet. Skipping cleanup.');
      return 0;
    }
    
    // Find all links that are expired (more than 30 days old) or voided
    // Using async/await pattern with cursor to ensure compatibility
    const collection = db.collection('drive_mappings');
    const cursor = collection.find({
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true }
      ]
    });
    
    // Convert cursor to array safely
    const expiredOrVoidedLinks = await cursor.toArray().catch(err => {
      console.error('Error converting cursor to array:', err);
      return [];
    });
    
    // Remove the share information from these files
    for (const link of expiredOrVoidedLinks) {
      await collection.updateOne(
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
    
    return expiredOrVoidedLinks.length;
  } catch (error) {
    console.error('Error cleaning up expired links:', error);
    return 0;
  }
};

// --- Generate shareable link ---
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const driveId = await getDriveIdMapping(fileId);

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

    // Get the web link from Google Drive
    const file = await drive.files.get({
      fileId: driveId,
      fields: 'webContentLink, webViewLink'
    });

    // Use safeObjectId to handle potential invalid ObjectIds
    const objectId = safeObjectId(fileId);
    const updateQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };

    // Calculate expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Find existing share IDs for this file and mark them as voided
    const existingFile = await db.collection('drive_mappings').findOne(updateQuery);
    if (existingFile && existingFile.metadata && existingFile.metadata.shareId) {
      // Mark the previous share ID as voided
      await db.collection('drive_mappings').updateOne(
        updateQuery,
        { $set: { 'metadata.shareVoided': true } }
      );
      
      // Clean up the voided link immediately
      await cleanupExpiredLinks();
    }

    // Store the new share ID and expiration date in MongoDB
    await db.collection('drive_mappings').updateOne(
      updateQuery,
      { 
        $set: { 
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false
        } 
      }
    );

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
    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
      'metadata.shareExpires': { $gt: now },
      'metadata.shareVoided': { $ne: true }
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Link not found or has expired' });
    }

    const driveId = fileMapping.driveId;

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
    
    // First check if we're dealing with a MongoDB ObjectId or a filename
    let query;
    let mongoId = null;
    
    try {
      // Check if it's a valid MongoDB ObjectId format
      if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
        // It's a valid ObjectId with correct format
        mongoId = new ObjectId(fileId);
        query = { _id: mongoId };
        console.log(`Valid ObjectId format: ${fileId}`);
      } else {
        // Not a valid ObjectId format, treat as filename
        console.log(`Not a valid ObjectId format: ${fileId}, will check if it's a filename`);
        query = { 'metadata.filename': fileId };
      }
    } catch (objectIdError) {
      // Fallback to using filename in case of any error
      console.log(`Error with ObjectId: ${objectIdError.message}, will check if it's a filename`);
      query = { 'metadata.filename': fileId };
    }
    
    // Check if the file exists in our mapping using the determined query
    const fileMapping = await db.collection('drive_mappings').findOne(query);
    
    if (!fileMapping) {
      console.log(`No file mapping found for: ${fileId}`);
      // If no mapping exists, we don't need to do any cleanup on Drive
      return res.json({ message: 'No file found to clean up' });
    }
    
    const driveId = fileMapping.driveId;
    mongoId = fileMapping._id; // Ensure we have the MongoDB ObjectId
    
    console.log(`Found mapping: MongoDB ID ${mongoId}, Drive ID ${driveId}`);
    
    // First check if the file exists on Google Drive
    try {
      await drive.files.get({
        fileId: driveId,
        fields: 'id'
      });
      
      // If we get here, the file exists, so delete it from Drive
      await drive.files.delete({
        fileId: driveId
      });
      
      console.log(`Deleted incomplete file with Drive ID: ${driveId}`);
    } catch (driveError) {
      // If the file doesn't exist on Drive, just log it
      if (driveError.code === 404) {
        console.log(`File with Drive ID ${driveId} already doesn't exist on Google Drive`);
      } else {
        // Some other Google Drive error
        console.error(`Error accessing Drive file ${driveId}:`, driveError);
      }
      // Continue with cleanup regardless of Drive errors
    }
    
    // Delete mapping from MongoDB
    await db.collection('drive_mappings').deleteOne({ _id: mongoId });
    
    console.log(`Deleted incomplete file mapping with MongoDB ID: ${mongoId}`);
    
    // Notify clients about the change
    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
    }
    
    res.json({ message: 'Incomplete upload cleaned up successfully' });
  } catch (error) {
    console.error('Cleanup error:', error);
    // Even if there's an error, return a success response to keep frontend happy
    // Just log the error on the server side
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

    // Generate MongoDB ObjectId for compatibility with existing code
    const mongoId = new ObjectId();
    
    // Store mapping between MongoDB ObjectId and Google Drive file ID
    await storeDriveMapping(mongoId, driveRes.data.id, {
      ...metadata,
      contentType: mimetype,
      size: driveRes.data.size,
      uploadDate: uploadDate
    });

    // Generate a unique short share ID
    const shareId = generateShortShareId();

    // Calculate expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Update the file permissions in Google Drive
    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Store the share ID and expiration date in MongoDB
    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      { 
        $set: { 
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false
        } 
      }
    );

    // Create a shorter share URL using simplified path
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
    // Ensure database is connected before attempting cleanup
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      console.log('MongoDB connection not ready. Delaying cleanup...');
      return 0;
    }
    
    // Clean up expired links
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
  generateShareLink,
  accessSharedFile,
  cleanupIncompleteUpload,
  uploadAndShareZip,
  scheduleCleanup // Export the cleanup scheduler function
};
