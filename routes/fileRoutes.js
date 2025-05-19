// routes/fileRoutes.js with backend-only security
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const controller = require('../controllers/fileController');
const originAuthMiddleware = require('../middleware/originAuth');

// Multer config with additional security
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB file size limit
  },
  fileFilter: (req, file, cb) => {
    // Basic file type validation - expand as needed
    if (file.mimetype.startsWith('image/') || 
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('audio/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/zip' ||
        file.mimetype.includes('spreadsheet') ||
        file.mimetype.includes('document') ||
        file.mimetype.includes('presentation')) {
      cb(null, true);
    } else {
      cb(null, true); // Still accepting all files, but you could restrict unwanted types
    }
  }
});

// Special route for shared files - publicly accessible but only with valid shareId
router.get('/share/:shareId', controller.accessSharedFile);

// Apply origin auth middleware to all other routes
router.use(originAuthMiddleware);

// Protected routes that now check origin
router.post('/upload', upload.single('file'), (req, res, next) => {
  if (req.file) {
    req.file.stream = Readable.from(req.file.buffer);
  }
  next();
}, controller.uploadFile);

router.post('/share-zip', upload.single('zipFile'), (req, res, next) => {
  if (req.file) {
    req.file.stream = Readable.from(req.file.buffer);
  } else {
    return res.status(400).send('No zip file attached.');
  }
  next();
}, controller.uploadAndShareZip);

router.get('/', controller.getFiles);
router.get('/download/:id', controller.downloadFile);
router.delete('/cleanup/:fileId', controller.cleanupIncompleteUpload);
router.delete('/:id', controller.deleteFile);
router.post('/share/:id', controller.generateShareLink);

module.exports = router;
