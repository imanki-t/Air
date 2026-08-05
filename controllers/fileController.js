// controllers/fileController.js
const fileService = require('../services/fileService');

module.exports = {
  uploadFile: fileService.uploadFile,
  getFiles: fileService.getFiles,
  deleteFile: fileService.deleteFile,
  updateFileIcon: fileService.updateFileIcon,
  renameFile: fileService.renameFile,
  getIconStream: fileService.getIconStream,
  downloadFile: fileService.downloadFile,
  previewFile: fileService.previewFile, // NEW: Add preview endpoint
  streamFile: fileService.streamFile, // Stream media file with direct Range headers
  getVideoStreamUrl: fileService.getVideoStreamUrl, // Signed stream URL for video/audio
  cleanupIncompleteUpload: fileService.cleanupIncompleteUpload,
  generateShareLink: fileService.generateShareLink,
  accessSharedFile: fileService.accessSharedFile,
  uploadAndShareZip: fileService.uploadAndShareZip,
  scheduleCleanup: fileService.scheduleCleanup, // Add the cleanup scheduler function
};
