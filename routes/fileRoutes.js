// backend/routes/fileRoutes.js - COMPLETE VERSION WITH ALL FEATURES
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const controller = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimitMiddleware');
const DriveMapping = require('../models/DriveMapping');
const { initDriveClient } = require('../config/drive');

const { drive } = initDriveClient();

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Upload route
router.post('/upload', authenticate, upload.single('file'), (req, res, next) => {
  if (req.file) {
    req.file.stream = Readable.from(req.file.buffer);
  }
  next();
}, controller.uploadFile);

// Get all files (with optional folder filter)
router.get('/', authenticate, controller.getFiles);

// Get starred files
router.get('/starred', authenticate, async (req, res) => {
  try {
    const files = await DriveMapping.find({
      userId: req.userId,
      'metadata.isStarred': true,
      $or: [
        { 'metadata.isTrashed': { $exists: false } },
        { 'metadata.isTrashed': false }
      ]
    })
    .sort({ createdAt: -1 })
    .lean();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      length: file.metadata.size,
      chunkSize: 261120,
      uploadDate: file.metadata.uploadDate,
      filename: file.metadata.filename,
      contentType: file.metadata.contentType,
      metadata: file.metadata,
      driveId: file.driveId,
      folderId: file.folderId
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error getting starred files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get recent files
router.get('/recent', authenticate, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const files = await DriveMapping.find({
      userId: req.userId,
      $or: [
        { 'metadata.isTrashed': { $exists: false } },
        { 'metadata.isTrashed': false }
      ]
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      length: file.metadata.size,
      chunkSize: 261120,
      uploadDate: file.metadata.uploadDate,
      filename: file.metadata.filename,
      contentType: file.metadata.contentType,
      metadata: file.metadata,
      driveId: file.driveId,
      folderId: file.folderId
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error getting recent files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get trash files
router.get('/trash', authenticate, async (req, res) => {
  try {
    const files = await DriveMapping.find({
      userId: req.userId,
      'metadata.isTrashed': true
    })
    .sort({ 'metadata.trashedAt': -1 })
    .lean();

    const formattedFiles = files.map(file => ({
      _id: file._id,
      length: file.metadata.size,
      chunkSize: 261120,
      uploadDate: file.metadata.uploadDate,
      filename: file.metadata.filename,
      contentType: file.metadata.contentType,
      metadata: file.metadata,
      driveId: file.driveId,
      folderId: file.folderId
    }));

    res.json(formattedFiles);
  } catch (error) {
    console.error('Error getting trash files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download file
router.get('/download/:id', authenticate, controller.downloadFile);

// Preview file
router.get('/preview/:id', authenticate, controller.previewFile);

// Star/Unstar file
router.put('/:id/star', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    fileMapping.metadata.isStarred = !fileMapping.metadata.isStarred;
    await fileMapping.save();

    res.json({ 
      message: 'File starred status updated',
      isStarred: fileMapping.metadata.isStarred
    });
  } catch (error) {
    console.error('Star file error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Move to trash
router.put('/:id/trash', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    fileMapping.metadata.isTrashed = true;
    fileMapping.metadata.trashedAt = new Date();
    await fileMapping.save();

    res.json({ message: 'File moved to trash' });
  } catch (error) {
    console.error('Move to trash error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Restore from trash
router.put('/:id/restore', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId,
      'metadata.isTrashed': true
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    fileMapping.metadata.isTrashed = false;
    fileMapping.metadata.trashedAt = undefined;
    await fileMapping.save();

    res.json({ message: 'File restored from trash' });
  } catch (error) {
    console.error('Restore from trash error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Permanently delete file
router.delete('/:id/permanent', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId,
      'metadata.isTrashed': true
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found in trash' });
    }

    const driveId = fileMapping.driveId;
    const folderId = fileMapping.folderId;

    // Delete from Google Drive
    try {
      await drive.files.delete({ fileId: driveId });
    } catch (driveError) {
      if (driveError.code !== 404) {
        console.error('Drive deletion error:', driveError);
      }
    }

    // Delete from database
    await DriveMapping.deleteOne({ _id: req.params.id });

    // Update folder stats if needed
    if (folderId) {
      const Folder = require('../models/Folder');
      const folder = await Folder.findById(folderId);
      if (folder) {
        await folder.updateStats();
      }
    }

    res.json({ message: 'File permanently deleted' });
  } catch (error) {
    console.error('Permanent delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Empty trash
router.delete('/trash/empty', authenticate, async (req, res) => {
  try {
    const files = await DriveMapping.find({
      userId: req.userId,
      'metadata.isTrashed': true
    });

    let deletedCount = 0;
    for (const file of files) {
      try {
        await drive.files.delete({ fileId: file.driveId });
      } catch (driveError) {
        if (driveError.code !== 404) {
          console.error('Drive deletion error:', driveError);
        }
      }
      await DriveMapping.deleteOne({ _id: file._id });
      deletedCount++;
    }

    res.json({ 
      message: 'Trash emptied successfully',
      count: deletedCount
    });
  } catch (error) {
    console.error('Empty trash error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete file (move to trash)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Move to trash instead of permanent delete
    fileMapping.metadata.isTrashed = true;
    fileMapping.metadata.trashedAt = new Date();
    await fileMapping.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
    }

    res.json({ message: 'File moved to trash' });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SHARE ROUTES
// ==========================================

// Get all shared links for current user
router.get('/shared-links', authenticate, async (req, res) => {
  try {
    const files = await DriveMapping.find({
      userId: req.userId,
      'metadata.shareId': { $exists: true, $ne: null }
    })
    .sort({ 'metadata.shareExpires': 1 }) // Sort by expiration date
    .lean();

    // Filter out voided links and format response
    const activeLinks = files.filter(file => 
      !file.metadata.shareVoided &&
      (!file.metadata.shareExpires || new Date(file.metadata.shareExpires) > new Date())
    );

    res.json(activeLinks);
  } catch (error) {
    console.error('Get shared links error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate share link
router.post('/share/:id', authenticate, controller.generateShareLink);

// Delete/revoke a share link
router.delete('/share/:id', authenticate, async (req, res) => {
  try {
    const fileMapping = await DriveMapping.findOne({
      _id: req.params.id,
      userId: req.userId
    });

    if (!fileMapping) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Void the share link
    await DriveMapping.updateOne(
      { _id: req.params.id },
      { 
        $set: { 'metadata.shareVoided': true },
        $unset: { 
          'metadata.shareId': '',
          'metadata.shareExpires': ''
        }
      }
    );

    // Try to revoke Google Drive permissions
    try {
      const permissions = await drive.permissions.list({
        fileId: fileMapping.driveId,
        fields: 'permissions(id, type)'
      });

      const anyonePermission = permissions.data.permissions.find(
        p => p.type === 'anyone'
      );

      if (anyonePermission) {
        await drive.permissions.delete({
          fileId: fileMapping.driveId,
          permissionId: anyonePermission.id
        });
      }
    } catch (driveError) {
      console.error('Drive permission revocation error:', driveError);
      // Continue even if Drive permission deletion fails
    }

    res.json({ message: 'Share link deleted successfully' });
  } catch (error) {
    console.error('Delete share link error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Access shared file
router.get('/share/:shareId', apiLimiter, controller.accessSharedFile);

// Share-zip route
router.post('/share-zip', authenticate, upload.single('zipFile'), (req, res, next) => {
  if (req.file) {
    req.file.stream = Readable.from(req.file.buffer);
  } else {
    return res.status(400).send('No zip file attached.');
  }
  next();
}, controller.uploadAndShareZip);

// Cleanup incomplete upload
router.delete('/cleanup/:fileId', authenticate, controller.cleanupIncompleteUpload);

// Revoke all expired share links (can be called manually or via cron)
router.post('/cleanup-expired-shares', authenticate, async (req, res) => {
  try {
    const now = new Date();
    
    const expiredFiles = await DriveMapping.find({
      userId: req.userId,
      'metadata.shareExpires': { $lt: now },
      'metadata.shareId': { $exists: true }
    });

    let count = 0;
    for (const file of expiredFiles) {
      try {
        // Void the share
        await DriveMapping.updateOne(
          { _id: file._id },
          { 
            $set: { 'metadata.shareVoided': true },
            $unset: { 
              'metadata.shareId': '',
              'metadata.shareExpires': ''
            }
          }
        );

        // Try to revoke Drive permissions
        const permissions = await drive.permissions.list({
          fileId: file.driveId,
          fields: 'permissions(id, type)'
        });

        const anyonePermission = permissions.data.permissions.find(
          p => p.type === 'anyone'
        );

        if (anyonePermission) {
          await drive.permissions.delete({
            fileId: file.driveId,
            permissionId: anyonePermission.id
          });
        }

        count++;
      } catch (error) {
        console.error(`Error cleaning up share for ${file._id}:`, error);
      }
    }

    res.json({ 
      message: `Cleaned up ${count} expired share links`,
      count 
    });
  } catch (error) {
    console.error('Cleanup expired shares error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Manual cleanup route (General DB cleanup)
router.post('/cleanup-expired-links', authenticate, async (req, res) => {
  try {
    const count = await controller.scheduleCleanup();
    res.json({ message: `Cleaned up ${count} expired or voided share links` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Batch operations
router.post('/batch/delete', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }

    const files = await DriveMapping.find({
      _id: { $in: ids },
      userId: req.userId
    });

    for (const file of files) {
      file.metadata.isTrashed = true;
      file.metadata.trashedAt = new Date();
      await file.save();
    }

    res.json({ 
      message: 'Files moved to trash',
      count: files.length
    });
  } catch (error) {
    console.error('Batch delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch/star', authenticate, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'No file IDs provided' });
    }

    await DriveMapping.updateMany(
      { 
        _id: { $in: ids },
        userId: req.userId
      },
      { $set: { 'metadata.isStarred': true } }
    );

    res.json({ 
      message: 'Files starred',
      count: ids.length
    });
  } catch (error) {
    console.error('Batch star error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
