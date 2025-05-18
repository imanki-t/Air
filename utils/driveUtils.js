// utils/driveUtils.js
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const StreamBuffers = require('stream-buffers');

// Map MongoDB ObjectId to Google Drive file ID
const getDriveIdMapping = async (fileId) => {
  const db = mongoose.connection;
  try {
    // Check if it's a valid ObjectId first
    let query;
    
    if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
      // Valid ObjectId format
      query = { _id: new ObjectId(fileId) };
    } else {
      // Try to find by filename
      query = { 'metadata.filename': fileId };
    }
    
    const file = await db.collection('drive_mappings').findOne(query);
    
    if (!file) {
      // Try one more approach - if it's a string representation of ObjectId
      // but doesn't pass the equality check
      if (ObjectId.isValid(fileId)) {
        const alternativeFile = await db.collection('drive_mappings').findOne({ 
          _id: new ObjectId(fileId)
        });
        
        if (alternativeFile) {
          return alternativeFile.driveId;
        }
      }
      
      throw new Error(`File mapping not found for: ${fileId}`);
    }
    
    return file.driveId;
  } catch (error) {
    console.error(`Error getting Drive ID mapping for ${fileId}:`, error);
    throw error;
  }
};

// Store mapping between MongoDB ObjectId and Google Drive file ID
const storeDriveMapping = async (mongoId, driveId, metadata) => {
  const db = mongoose.connection;
  try {
    // Ensure mongoId is a valid ObjectId
    let validMongoId = mongoId;
    
    if (!(mongoId instanceof ObjectId)) {
      if (ObjectId.isValid(mongoId)) {
        validMongoId = new ObjectId(mongoId);
      } else {
        // Generate a new ObjectId if the provided one isn't valid
        validMongoId = new ObjectId();
        console.warn(`Invalid ObjectId provided (${mongoId}), generated new one: ${validMongoId}`);
      }
    }
    
    await db.collection('drive_mappings').insertOne({
      _id: validMongoId,
      driveId: driveId,
      metadata: metadata,
      createdAt: new Date()
    });
    
    return validMongoId; // Return the (potentially new) ObjectId
  } catch (error) {
    console.error('Error storing Drive ID mapping:', error);
    throw error;
  }
};

// Convert buffer to readable stream
const bufferToStream = (buffer) => {
  return Readable.from(buffer);
};

// Convert stream to buffer
const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const writeStream = new StreamBuffers.WritableStreamBuffer();
    
    stream.pipe(writeStream);
    
    stream.on('error', reject);
    
    writeStream.on('finish', () => {
      resolve(writeStream.getContents());
    });
  });
};

// Helper function to safely check and convert to ObjectId
const safeObjectId = (id) => {
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      return new ObjectId(id);
    }
    return null;
  } catch (error) {
    console.error(`Error converting to ObjectId: ${id}`, error);
    return null;
  }
};

module.exports = {
  getDriveIdMapping,
  storeDriveMapping,
  bufferToStream,
  streamToBuffer,
  safeObjectId
};
