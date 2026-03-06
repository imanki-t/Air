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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
      updates.lastViewed = new Date(lastViewed);
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/folders/:id/files  — add file IDs to a folder { fileIds: string[] }
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

    // Sanitize fileIds — only strings
    const cleanFileIds = fileIds
      .filter((id) => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim());

    if (cleanFileIds.length === 0) {
      return res.status(400).json({ error: 'No valid file IDs provided.' });
    }

    const db = getDb();
    const result = await db.collection('user_folders').findOneAndUpdate(
      { _id: folderId, userId },
      {
        $addToSet: { fileIds: { $each: cleanFileIds } },
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/folders/cleanup  — remove deleted file IDs from all user's folders
// This is called internally after a file is deleted, to keep folders clean
// ─────────────────────────────────────────────────────────────────────────────
const cleanupFileFromFolders = async (userId, fileId) => {
  try {
    if (!userId || !fileId) return;
    const db = getDb();
    await db.collection('user_folders').updateMany(
      { userId, fileIds: fileId },
      {
        $pull: { fileIds: fileId },
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
