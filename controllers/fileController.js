// controllers/fileController.js
const fileService = require('../services/fileService');

module.exports = {
  uploadFile: fileService.uploadFile,
  getFiles: fileService.getFiles,
  deleteFile: fileService.deleteFile,
  downloadFile: fileService.downloadFile,
  cleanupIncompleteUpload: fileService.cleanupIncompleteUpload,
  generateShareLink: fileService.generateShareLink,
  accessSharedFile: fileService.accessSharedFile,
  uploadAndShareZip: fileService.uploadAndShareZip,
  scheduleCleanup: fileService.scheduleCleanup,
  getThumbnail: fileService.getThumbnail, // Add the new thumbnail function
};
