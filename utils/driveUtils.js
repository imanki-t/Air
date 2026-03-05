// utils/driveUtils.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// Get full file mapping document from drive_mappings collection
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

    // Fallback: try ObjectId lookup if string query returned nothing
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
// Store a new mapping document in drive_mappings.
// The "driveId" field now holds a GridFS ObjectId string.
// extraFields (e.g. { userId }) are spread at the top level.
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
      driveId,          // stores the GridFS file ObjectId as a string
      metadata,
      createdAt: new Date(),
      ...extraFields,
    });

    return validMongoId;
  } catch (error) {
    console.error('Error storing mapping:', error);
    throw error;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Safely convert a string to ObjectId — returns null if invalid
// ─────────────────────────────────────────────────────────────────────────────
const safeObjectId = (id) => {
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      return new ObjectId(id);
    }
    return null;
  } catch {
    return null;
  }
};

module.exports = {
  getFileMapping,
  storeDriveMapping,
  safeObjectId,
};
