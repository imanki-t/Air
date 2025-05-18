// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType');
const { initDriveClient, initDriveFolder } = require('../config/drive');
const { getDriveIdMapping, storeDriveMapping, bufferToStream, streamToBuffer } = require('../utils/driveUtils');

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

    // Delete mapping from MongoDB
    await db.collection('drive_mappings').deleteOne({ _id: new ObjectId(fileId) });

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

    // Set content disposition header for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);
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

// --- Generate shareable link ---
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const driveId = await getDriveIdMapping(fileId);

    // Generate a unique ID for the share link
    const shareId = uuidv4();

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

    // Store the share ID in MongoDB
    await db.collection('drive_mappings').updateOne(
      { _id: new ObjectId(fileId) },
      { $set: { 'metadata.shareId': shareId } }
    );

    // Create a custom share URL using our API
    const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
    
    res.json({ url: shareURL });
  } catch (error) {
    console.error('Share error:', error);
    res.status(500).json({ error: error.message });
  }
};

// --- Access shared file via link ---
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;
    
    // Find the file with the given share ID
    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'Link not found' });
    }

    const driveId = fileMapping.driveId;

    // Get file metadata from Google Drive
    const fileMetadata = await drive.files.get({
      fileId: driveId,
      fields: 'name, mimeType'
    });

    // Set content disposition header for download
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.data.name}"`);
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
    
    // Check if the file exists in our mapping
    const fileMapping = await db.collection('drive_mappings').findOne({ 
      _id: new ObjectId(fileId) 
    });
    
    if (!fileMapping) {
      // If no mapping exists, we don't need to do any cleanup on Drive
      return res.json({ message: 'No file found to clean up' });
    }
    
    const driveId = fileMapping.driveId;
    
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
    await db.collection('drive_mappings').deleteOne({ 
      _id: new ObjectId(fileId) 
    });
    
    console.log(`Deleted incomplete file mapping with MongoDB ID: ${fileId}`);
    
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

    // Generate a unique share ID
    const shareId = uuidv4();

    // Update the file permissions in Google Drive
    await drive.permissions.create({
      fileId: driveRes.data.id,
      requestBody: {
        role: 'reader',
        type: 'anyone'
      }
    });

    // Store the share ID in MongoDB
    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      { $set: { 'metadata.shareId': shareId } }
    );

    // Create a custom share URL using our API
    const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
    
    res.status(201).json({ url: shareURL });
  } catch (error) {
    console.error('Error uploading and sharing zip:', error);
    res.status(500).json({ error: error.message });
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
};
