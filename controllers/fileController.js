// controllers/fileController.js
const fileService = require('../services/fileService');

module.exports = {
  uploadFile: fileService.uploadFile,
  getFiles: fileService.getFiles,
  deleteFile: fileService.deleteFile,
  downloadFile: fileService.downloadFile,
  generateShareLink: fileService.generateShareLink,
  accessSharedFile: fileService.accessSharedFile,
};
