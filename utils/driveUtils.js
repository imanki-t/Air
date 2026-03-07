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

    // [FIX] Fallback: only try ObjectId lookup if the first query was a filename
    // lookup (i.e. the ObjectId strict-equality check failed). Previously this
    // fired even when the first query already used _id, causing an identical
    // redundant DB roundtrip on every miss.
    if (!file && !(ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) && ObjectId.isValid(fileId)) {
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
      // [FIX] extraFields spread first so caller-supplied fields (e.g. userId) can't
      // accidentally overwrite the core _id, driveId, metadata, or createdAt fields.
      ...extraFields,
      // [FIX] Always coerce userId to a string so it matches exportRecord.userId
      // (which comes from decoded.userId = user._id.toString()). Without this,
      // userId could be stored as a BSON ObjectId, causing the export query to
      // return zero documents and producing a manifest-only ZIP.
      ...(extraFields.userId && { userId: String(extraFields.userId) }),
      _id: validMongoId,
      driveId,
      metadata,
      createdAt: new Date(),
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
