// routes/fileRoutes.js with rate limiting and complete security
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const controller = require('../controllers/fileController');
const originAuthMiddleware = require('../middleware/originAuth');
const rateLimiters = require('../middleware/rateLimiter');

// Multer config with security settings
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  }
});

// Apply rate limiting to shared files endpoint
router.get('/share/:shareId', rateLimiters.shared, controller.accessSharedFile);

// All other routes are restricted to frontend origin and rate limited
router.use(originAuthMiddleware);

// Apply rate limiting based on route type
router.get('/', rateLimiters.api, controller.getFiles);
router.get('/download/:id', rateLimiters.download, controller.downloadFile);

// File upload endpoint with rate limiting
router.post('/upload', 
  rateLimiters.upload,
  upload.single('file'), 
  (req, res, next) => {
    if (req.file) {
      req.file.stream = Readable.from(req.file.buffer);
    }
    next();
  }, 
  controller.uploadFile
);

// Share ZIP endpoint with rate limiting
router.post('/share-zip', 
  rateLimiters.upload,
  upload.single('zipFile'), 
  (req, res, next) => {
    if (req.file) {
      req.file.stream = Readable.from(req.file.buffer);
    } else {
      return res.status(400).send('No zip file attached.');
    }
    next();
  }, 
  controller.uploadAndShareZip
);

// Other file operations with rate limiting
router.delete('/cleanup/:fileId', rateLimiters.upload, controller.cleanupIncompleteUpload);
router.delete('/:id', rateLimiters.upload, controller.deleteFile);
router.post('/share/:id', rateLimiters.upload, controller.generateShareLink);

module.exports = router;
