// utils/driveUtils.js
// IMPORTANT: We import ObjectId from mongoose.mongo (not from the 'mongodb'
// package directly) so that all BSON types come from the single copy of bson
// that mongoose bundles. Mixing 'mongodb' + 'mongoose' causes BSON version conflicts.
const mongoose = require('mongoose');

const getObjectId = () => mongoose.mongo.ObjectId;

// ─────────────────────────────────────────────────────────────────────────────
// Get full file mapping document from drive_mappings collection
// ─────────────────────────────────────────────────────────────────────────────
const getFileMapping = async (fileId) => {
  const ObjectId = getObjectId();
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
// driveId now holds a GridFS ObjectId string.
// extraFields (e.g. { userId }) are spread at the top level.
// ─────────────────────────────────────────────────────────────────────────────
const storeDriveMapping = async (mongoId, driveId, metadata, extraFields = {}) => {
  const ObjectId = getObjectId();
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
  const ObjectId = getObjectId();
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
