// routes/fileRoutes.js
const express = require('express'); 
const router = express.Router(); 
const multer = require('multer');
const os = require('os');
const fs = require('fs');
const controller = require('../controllers/fileController'); 
const { uploadLimiter, downloadLimiter, apiLimiter, shareLimiter } = require('../middleware/rateLimitMiddleware');

// [FIX] Use diskStorage instead of memoryStorage for uploads.
// memoryStorage() holds the entire file in RAM — a single 5 GB upload would
// exhaust Node's heap and crash the process. diskStorage() writes to a temp
// file so RAM usage stays flat regardless of file size.
// fileService.uploadFile reads req.file.stream, so we open a ReadStream from
// the temp path instead of building one from req.file.buffer.
const diskStorage = multer.diskStorage({ destination: os.tmpdir() });

const upload = multer({
  storage: diskStorage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB hard cap
});

const zipUpload = multer({
  storage: diskStorage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB cap for share-zips
});

// Helper: open a ReadStream from the temp file path and clean it up after the
// response finishes so the temp file is never left on disk.
const attachStreamAndCleanup = (req, res, next) => {
  if (!req.file) return next();
  req.file.stream = fs.createReadStream(req.file.path);
  res.on('finish', () => fs.unlink(req.file.path, () => {}));
  res.on('close',  () => fs.unlink(req.file.path, () => {}));
  next();
};

// Upload
router.post('/upload', uploadLimiter, upload.single('file'), attachStreamAndCleanup, controller.uploadFile); 

// Share-zip upload
router.post('/share-zip', uploadLimiter, zipUpload.single('zipFile'), (req, res, next) => {
  if (!req.file) return res.status(400).send('No zip file attached.');
  next();
}, attachStreamAndCleanup, controller.uploadAndShareZip);

// List files
router.get('/', apiLimiter, controller.getFiles); 

// Download
router.get('/download/:id', downloadLimiter, controller.downloadFile); 

// Preview/Thumbnail (24-hour browser caching so this is rarely hit)
router.get('/preview/:id', downloadLimiter, controller.previewFile);

// Direct stream URL for video/audio — returns a short-lived Google CDN URL.
// Auth is enforced by authMiddleware wrapping all /api/files routes.
// Ownership is verified inside getVideoStreamUrl before the token is issued.
router.get('/stream-url/:id', downloadLimiter, controller.getVideoStreamUrl);

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
