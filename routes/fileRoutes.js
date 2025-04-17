// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const controller = require('../controllers/fileController');

// Multer config for large file stream
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post('/upload', upload.single('file'), (req, res, next) => {
  req.file.stream = Readable.from(req.file.buffer); // convert buffer to stream
  next();
}, controller.uploadFile);

router.get('/', controller.getFiles);
router.get('/download/:id', controller.downloadFile);
router.delete('/cleanup/:fileId', controller.cleanupIncompleteUpload);
router.delete('/:id', controller.deleteFile);
router.post('/share/:id', controller.generateShareLink);
router.get('/share/:shareId', controller.accessSharedFile);

module.exports = router;
