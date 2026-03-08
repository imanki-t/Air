// controllers/fileController.js
const fileService = require('../services/fileService');

module.exports = {
  uploadFile: fileService.uploadFile,
  getFiles: fileService.getFiles,
  deleteFile: fileService.deleteFile,
  downloadFile: fileService.downloadFile,
  previewFile: fileService.previewFile, // NEW: Add preview endpoint
  getVideoStreamUrl: fileService.getVideoStreamUrl, // Direct CDN stream URL for video/audio
  cleanupIncompleteUpload: fileService.cleanupIncompleteUpload,
  generateShareLink: fileService.generateShareLink,
  accessSharedFile: fileService.accessSharedFile,
  uploadAndShareZip: fileService.uploadAndShareZip,
  scheduleCleanup: fileService.scheduleCleanup, // Add the cleanup scheduler function
};
