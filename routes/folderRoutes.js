// routes/folderRoutes.js
// Express router for all folder-related API endpoints

const express = require('express');
const router = express.Router();

const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  addFilesToFolder,
  removeFileFromFolder,
} = require('../services/folderService');

// GET    /api/folders              — list all folders for current user
router.get('/', getFolders);

// POST   /api/folders              — create a new folder { name, color }
router.post('/', createFolder);

// PATCH  /api/folders/:id          — rename or recolor a folder { name?, color? }
router.patch('/:id', updateFolder);

// DELETE /api/folders/:id          — delete a folder (files unaffected)
router.delete('/:id', deleteFolder);

// POST   /api/folders/:id/files    — add files to folder { fileIds: string[] }
router.post('/:id/files', addFilesToFolder);

// DELETE /api/folders/:id/files/:fileId — remove one file from folder
router.delete('/:id/files/:fileId', removeFileFromFolder);

module.exports = router;
