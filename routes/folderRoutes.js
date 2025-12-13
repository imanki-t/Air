// routes/folderRoutes.js
const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folderController');
const { authenticate, requireEmailVerification } = require('../middleware/auth');

// All folder routes require authentication and email verification
router.use(authenticate);
router.use(requireEmailVerification);

// Folder routes
router.get('/', folderController.getFolders);
router.get('/tree', folderController.getFolderTree);
router.get('/:id', folderController.getFolder);
router.get('/:id/stats', folderController.getFolderStats);
router.post('/', folderController.createFolder);
router.put('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
