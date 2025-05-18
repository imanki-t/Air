// utils/driveUtils.js
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const StreamBuffers = require('stream-buffers');

// Map MongoDB ObjectId to Google Drive file ID
const getDriveIdMapping = async (fileId) => {
  const db = mongoose.connection;
  try {
    const file = await db.collection('drive_mappings').findOne({ _id: new ObjectId(fileId) });
    if (!file) {
      throw new Error('File mapping not found');
    }
    return file.driveId;
  } catch (error) {
    console.error('Error getting Drive ID mapping:', error);
    throw error;
  }
};

// Store mapping between MongoDB ObjectId and Google Drive file ID
const storeDriveMapping = async (mongoId, driveId, metadata) => {
  const db = mongoose.connection;
  try {
    await db.collection('drive_mappings').insertOne({
      _id: mongoId,
      driveId: driveId,
      metadata: metadata,
      createdAt: new Date()
    });
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

module.exports = {
  getDriveIdMapping,
  storeDriveMapping,
  bufferToStream,
  streamToBuffer
};
