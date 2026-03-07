// routes/fileRoutes.js
const express = require('express'); 
const router = express.Router(); 
const multer = require('multer'); 
const { Readable } = require('stream'); 
const controller = require('../controllers/fileController'); 
const { uploadLimiter, downloadLimiter, apiLimiter, shareLimiter } = require('../middleware/rateLimitMiddleware');

// Multer config
const storage = multer.memoryStorage(); 
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB hard cap
});

const zipUpload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB cap for share-zips
});

// Upload
router.post('/upload', uploadLimiter, upload.single('file'), (req, res, next) => { 
  if (req.file) req.file.stream = Readable.from(req.file.buffer);
  next(); 
}, controller.uploadFile); 

// Share-zip upload
router.post('/share-zip', uploadLimiter, zipUpload.single('zipFile'), (req, res, next) => {
  if (req.file) {
    req.file.stream = Readable.from(req.file.buffer);
  } else {
    return res.status(400).send('No zip file attached.');
  }
  next();
}, controller.uploadAndShareZip);

// List files
router.get('/', apiLimiter, controller.getFiles); 

// Download
router.get('/download/:id', downloadLimiter, controller.downloadFile); 

// Preview/Thumbnail (24-hour browser caching so this is rarely hit)
router.get('/preview/:id', downloadLimiter, controller.previewFile);

// Cleanup incomplete upload
router.delete('/cleanup/:fileId', apiLimiter, controller.cleanupIncompleteUpload); 

// Delete file
router.delete('/:id', apiLimiter, controller.deleteFile); 

// Generate share link
router.post('/share/:id', apiLimiter, controller.generateShareLink); 

// Access shared file (IP-based limiter since no auth)
router.get('/share/:shareId', shareLimiter, controller.accessSharedFile); 

// Manual cleanup — protected by JWT (authMiddleware already wraps /api/files)
router.post('/cleanup-expired-links', apiLimiter, async (req, res) => {
  try {
    const count = await controller.scheduleCleanup();
    res.json({ message: `Cleaned up ${count} expired or voided share links` });
  } catch (error) {
    console.error('Cleanup expired links error:', error);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
});

module.exports = router;
