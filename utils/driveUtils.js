// utils/driveUtils.js
const { Readable } = require('stream');
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const StreamBuffers = require('stream-buffers');

// ─────────────────────────────────────────────────────────────────────────────
// Map MongoDB ObjectId → Google Drive file ID
// ─────────────────────────────────────────────────────────────────────────────
const getDriveIdMapping = async (fileId) => {
  const db = mongoose.connection;
  try {
    let query;

    if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
      query = { _id: new ObjectId(fileId) };
    } else {
      query = { 'metadata.filename': fileId };
    }

    const file = await db.collection('drive_mappings').findOne(query);

    if (!file) {
      if (ObjectId.isValid(fileId)) {
        const alt = await db.collection('drive_mappings').findOne({ _id: new ObjectId(fileId) });
        if (alt) return alt.driveId;
      }
      throw new Error(`File mapping not found for: ${fileId}`);
    }

    return file.driveId;
  } catch (error) {
    console.error(`Error getting Drive ID mapping for ${fileId}:`, error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Get full file mapping document (includes userId for ownership checks)
// ─────────────────────────────────────────────────────────────────────────────
const getFileMapping = async (fileId) => {
  const db = mongoose.connection;
  try {
    let query;

    if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
      query = { _id: new ObjectId(fileId) };
    } else {
      query = { 'metadata.filename': fileId };
    }

    const file = await db.collection('drive_mappings').findOne(query);
    if (!file && ObjectId.isValid(fileId)) {
      return db.collection('drive_mappings').findOne({ _id: new ObjectId(fileId) });
    }
    return file;
  } catch (error) {
    console.error(`Error getting file mapping for ${fileId}:`, error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Store mapping between MongoDB ObjectId and Google Drive file ID
// Accepts optional extraFields (e.g. { userId }) to store at top level
// ─────────────────────────────────────────────────────────────────────────────
const storeDriveMapping = async (mongoId, driveId, metadata, extraFields = {}) => {
  const db = mongoose.connection;
  try {
    let validMongoId = mongoId;

    if (!(mongoId instanceof ObjectId)) {
      if (ObjectId.isValid(mongoId)) {
        validMongoId = new ObjectId(mongoId);
      } else {
        validMongoId = new ObjectId();
        console.warn(`Invalid ObjectId provided (${mongoId}), generated new one: ${validMongoId}`);
      }
    }

    await db.collection('drive_mappings').insertOne({
      _id: validMongoId,
      driveId,
      metadata,
      createdAt: new Date(),
      ...extraFields, // spread userId and any other top-level fields
    });

    return validMongoId;
  } catch (error) {
    console.error('Error storing Drive ID mapping:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Buffer ↔ Stream helpers
// ─────────────────────────────────────────────────────────────────────────────
const bufferToStream = (buffer) => Readable.from(buffer);

const streamToBuffer = async (stream) =>
  new Promise((resolve, reject) => {
    const writeStream = new StreamBuffers.WritableStreamBuffer();
    stream.pipe(writeStream);
    stream.on('error', reject);
    writeStream.on('finish', () => resolve(writeStream.getContents()));
  });

// ─────────────────────────────────────────────────────────────────────────────
// Safely convert a string to ObjectId (returns null if invalid)
// ─────────────────────────────────────────────────────────────────────────────
const safeObjectId = (id) => {
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      return new ObjectId(id);
    }
    return null;
  } catch (error) {
    return null;
  }
};

module.exports = {
  getDriveIdMapping,
  getFileMapping,
  storeDriveMapping,
  bufferToStream,
  streamToBuffer,
  safeObjectId,
};
