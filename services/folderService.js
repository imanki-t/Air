// services/folderService.js
// Full folder management service for Airstream
// Handles: create, read, update, delete folders + file assignment
// IMPORTANT: ObjectId is taken from mongoose.mongo — NOT from the 'mongodb'
// package — so all BSON types share a single bson version and avoid the
// "Unsupported BSON version" error.

const mongoose = require('mongoose');

const getDb = () => mongoose.connection.db;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get ObjectId from mongoose's bundled driver (avoids BSON conflicts)
// ─────────────────────────────────────────────────────────────────────────────
const getObjectId = () => mongoose.mongo.ObjectId;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: safely convert string to ObjectId
// ─────────────────────────────────────────────────────────────────────────────
const safeObjectId = (id) => {
  const ObjectId = getObjectId();
  try {
    if (ObjectId.isValid(id) && String(new ObjectId(id)) === id) {
      return new ObjectId(id);
    }
  } catch (_) {}
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/folders  — return all folders for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
const getFolders = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    const folders = await db
      .collection('user_folders')
      .find({ userId })
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(folders);
  } catch (err) {
    console.error('getFolders error:', err);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/folders  — create a new folder { name, color }
// ─────────────────────────────────────────────────────────────────────────────
const createFolder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const { name, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Folder name is required.' });
    }

    // Validate color format (hex color)
    const validColor = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : '#6366f1';

    const ObjectId = getObjectId();
    const db = getDb();
    const now = new Date();

    const folder = {
      _id: new ObjectId(),
      userId,
      name: name.trim().substring(0, 80),
      color: validColor,
      fileIds: [],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection('user_folders').insertOne(folder);
    res.status(201).json(folder);
  } catch (err) {
    console.error('createFolder error:', err);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/folders/:id  — update folder name and/or color
// ─────────────────────────────────────────────────────────────────────────────
const updateFolder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const folderId = safeObjectId(req.params.id);
    if (!folderId) return res.status(400).json({ error: 'Invalid folder ID.' });

    const { name, color, lastViewed } = req.body;
    if (!name && !color && !lastViewed) {
      return res.status(400).json({ error: 'Provide name, color, and/or lastViewed to update.' });
    }

    const db = getDb();
    const updates = { updatedAt: new Date() };

    if (name && name.trim()) {
      updates.name = name.trim().substring(0, 80);
    }
    if (color && /^#[0-9A-Fa-f]{6}$/.test(color)) {
      updates.color = color;
    }
    if (lastViewed) {
      // [FIX] Validate before storing — new Date('garbage') silently creates an
      // Invalid Date which writes a null-like value into MongoDB.
      const parsedDate = new Date(lastViewed);
      if (!isNaN(parsedDate.getTime())) {
        updates.lastViewed = parsedDate;
      }
    }

    const result = await db.collection('user_folders').findOneAndUpdate(
      { _id: folderId, userId },
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    res.json(result);
  } catch (err) {
    console.error('updateFolder error:', err);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/folders/:id  — delete a folder (files are NOT deleted)
// ─────────────────────────────────────────────────────────────────────────────
const deleteFolder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const folderId = safeObjectId(req.params.id);
    if (!folderId) return res.status(400).json({ error: 'Invalid folder ID.' });

    const db = getDb();
    const result = await db.collection('user_folders').deleteOne({ _id: folderId, userId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    res.json({ message: 'Folder deleted successfully. Your files are unaffected.' });
  } catch (err) {
    console.error('deleteFolder error:', err);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/folders/:id/files  — add file IDs to a folder { fileIds: string[] }
// fileIds are stored as strings (matching drive_mappings _id.toString()) for
// consistent querying across the app (LOW-06).
// ─────────────────────────────────────────────────────────────────────────────
const addFilesToFolder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const folderId = safeObjectId(req.params.id);
    if (!folderId) return res.status(400).json({ error: 'Invalid folder ID.' });

    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'fileIds must be a non-empty array.' });
    }

    // [FIX] Cap array size to prevent unbounded $in queries against the DB
    if (fileIds.length > 500) {
      return res.status(400).json({ error: 'Too many file IDs in a single request (max 500).' });
    }

    // Normalise to trimmed strings; validate each is a valid ObjectId string
    const ObjectId = getObjectId();
    const cleanFileIds = fileIds
      .filter((id) => typeof id === 'string' && ObjectId.isValid(id.trim()))
      .map((id) => id.trim());

    if (cleanFileIds.length === 0) {
      return res.status(400).json({ error: 'No valid file IDs provided.' });
    }

    const db = getDb();

    // [FIX] Ownership check: verify every fileId belongs to this user before
    // adding it to their folder. Without this, any valid ObjectId string could
    // be stuffed into a folder regardless of who owns the file.
    const ownedFiles = await db.collection('drive_mappings').find({
      _id: { $in: cleanFileIds.map((id) => new ObjectId(id)) },
      userId,
    }, { projection: { _id: 1 } }).toArray();

    const ownedIds = new Set(ownedFiles.map((f) => f._id.toString()));
    const verifiedFileIds = cleanFileIds.filter((id) => ownedIds.has(id));

    if (verifiedFileIds.length === 0) {
      return res.status(403).json({ error: 'None of the provided file IDs belong to you.' });
    }

    const result = await db.collection('user_folders').findOneAndUpdate(
      { _id: folderId, userId },
      {
        $addToSet: { fileIds: { $each: verifiedFileIds } },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    res.json(result);
  } catch (err) {
    console.error('addFilesToFolder error:', err);
    res.status(500).json({ error: 'Failed to add files to folder.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/folders/:id/files/:fileId  — remove a single file from a folder
// ─────────────────────────────────────────────────────────────────────────────
const removeFileFromFolder = async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const folderId = safeObjectId(req.params.id);
    if (!folderId) return res.status(400).json({ error: 'Invalid folder ID.' });

    const { fileId } = req.params;
    if (!fileId) return res.status(400).json({ error: 'File ID is required.' });

    const db = getDb();
    const result = await db.collection('user_folders').findOneAndUpdate(
      { _id: folderId, userId },
      {
        $pull: { fileIds: fileId },
        $set: { updatedAt: new Date() },
      },
      { returnDocument: 'after' }
    );

    if (!result) {
      return res.status(404).json({ error: 'Folder not found or access denied.' });
    }

    res.json(result);
  } catch (err) {
    console.error('removeFileFromFolder error:', err);
    res.status(500).json({ error: 'An internal error occurred.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/folders/cleanup  — remove deleted file IDs from all user's folders
// This is called internally after a file is deleted, to keep folders clean.
// Matches by string ID (normalised form stored in fileIds).
// ─────────────────────────────────────────────────────────────────────────────
const cleanupFileFromFolders = async (userId, fileId) => {
  try {
    if (!userId || !fileId) return;
    const db = getDb();
    const fileIdStr = fileId.toString();
    await db.collection('user_folders').updateMany(
      { userId, fileIds: fileIdStr },
      {
        $pull: { fileIds: fileIdStr },
        $set: { updatedAt: new Date() },
      }
    );
  } catch (err) {
    console.error('cleanupFileFromFolders error (non-fatal):', err.message);
  }
};

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  addFilesToFolder,
  removeFileFromFolder,
  cleanupFileFromFolders,
};
