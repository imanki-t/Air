// controllers/folderController.js
const Folder = require('../models/Folder');
const mongoose = require('mongoose');

/**
 * Get all folders for current user
 */
const getFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.userId })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ folders });
  } catch (error) {
    console.error('Get folders error:', error);
    res.status(500).json({ error: 'Failed to fetch folders' });
  }
};

/**
 * Get folder tree (hierarchical structure)
 */
const getFolderTree = async (req, res) => {
  try {
    const tree = await Folder.getFolderTree(req.userId);
    res.json({ tree });
  } catch (error) {
    console.error('Get folder tree error:', error);
    res.status(500).json({ error: 'Failed to fetch folder tree' });
  }
};

/**
 * Get single folder by ID
 */
const getFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findOne({
      _id: id,
      user: req.userId
    }).lean();

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    res.json({ folder });
  } catch (error) {
    console.error('Get folder error:', error);
    res.status(500).json({ error: 'Failed to fetch folder' });
  }
};

/**
 * Create new folder
 */
const createFolder = async (req, res) => {
  try {
    const { name, parent, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Folder name is required' });
    }

    // Check if folder with same name exists in same parent
    const existingFolder = await Folder.findOne({
      user: req.userId,
      parent: parent || null,
      name
    });

    if (existingFolder) {
      return res.status(400).json({ 
        error: 'A folder with this name already exists in this location' 
      });
    }

    // If parent specified, verify it exists and belongs to user
    if (parent) {
      const parentFolder = await Folder.findOne({
        _id: parent,
        user: req.userId
      });

      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }
    }

    const folder = new Folder({
      name,
      user: req.userId,
      parent: parent || null,
      color: color || '#3b82f6'
    });

    await folder.save();

    res.status(201).json({
      message: 'Folder created successfully',
      folder
    });

  } catch (error) {
    console.error('Create folder error:', error);
    res.status(500).json({ error: 'Failed to create folder' });
  }
};

/**
 * Update folder
 */
const updateFolder = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, parent } = req.body;

    const folder = await Folder.findOne({
      _id: id,
      user: req.userId
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Prevent updating default folders' names
    if (folder.isDefault && name && name !== folder.name) {
      return res.status(400).json({ 
        error: 'Cannot rename default folders' 
      });
    }

    // Check if moving to a child folder (would create circular reference)
    if (parent && parent !== folder.parent?.toString()) {
      const isChild = await isChildFolder(folder._id, parent);
      if (isChild) {
        return res.status(400).json({ 
          error: 'Cannot move folder to its own child folder' 
        });
      }

      // Verify parent exists and belongs to user
      const parentFolder = await Folder.findOne({
        _id: parent,
        user: req.userId
      });

      if (!parentFolder) {
        return res.status(404).json({ error: 'Parent folder not found' });
      }

      folder.parent = parent;
    }

    // Check for duplicate name in new location
    if (name && name !== folder.name) {
      const existingFolder = await Folder.findOne({
        user: req.userId,
        parent: parent || folder.parent || null,
        name,
        _id: { $ne: folder._id }
      });

      if (existingFolder) {
        return res.status(400).json({ 
          error: 'A folder with this name already exists in this location' 
        });
      }

      folder.name = name;
    }

    if (color) {
      folder.color = color;
    }

    await folder.save();

    res.json({
      message: 'Folder updated successfully',
      folder
    });

  } catch (error) {
    console.error('Update folder error:', error);
    res.status(500).json({ error: 'Failed to update folder' });
  }
};

/**
 * Delete folder
 */
const deleteFolder = async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findOne({
      _id: id,
      user: req.userId
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Prevent deleting default folders
    if (folder.isDefault) {
      return res.status(400).json({ 
        error: 'Cannot delete default folders' 
      });
    }

    // Check if folder has files
    const DriveMapping = mongoose.model('DriveMapping');
    const fileCount = await DriveMapping.countDocuments({
      userId: req.userId,
      folderId: id
    });

    if (fileCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete folder with files. Please move or delete the files first.',
        fileCount
      });
    }

    // Check if folder has subfolders
    const subfolderCount = await Folder.countDocuments({
      user: req.userId,
      parent: id
    });

    if (subfolderCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete folder with subfolders. Please delete subfolders first.',
        subfolderCount
      });
    }

    await folder.deleteOne();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('folderDeleted', { folderId: id });
    }

    res.json({ 
      message: 'Folder deleted successfully' 
    });

  } catch (error) {
    console.error('Delete folder error:', error);
    res.status(500).json({ error: 'Failed to delete folder' });
  }
};

/**
 * Get folder statistics
 */
const getFolderStats = async (req, res) => {
  try {
    const { id } = req.params;

    const folder = await Folder.findOne({
      _id: id,
      user: req.userId
    });

    if (!folder) {
      return res.status(404).json({ error: 'Folder not found' });
    }

    // Update and get stats
    await folder.updateStats();

    res.json({
      stats: {
        fileCount: folder.fileCount,
        totalSize: folder.totalSize
      }
    });

  } catch (error) {
    console.error('Get folder stats error:', error);
    res.status(500).json({ error: 'Failed to fetch folder statistics' });
  }
};

/**
 * Helper function to check if a folder is a child of another
 */
async function isChildFolder(folderId, potentialParentId) {
  if (folderId.toString() === potentialParentId.toString()) {
    return true;
  }

  const folder = await Folder.findById(potentialParentId);
  
  if (!folder || !folder.parent) {
    return false;
  }

  return isChildFolder(folderId, folder.parent);
}

module.exports = {
  getFolders,
  getFolderTree,
  getFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderStats
};
