// routes/fileRoutes.js with rate limiting only on share link GET routes
const express = require('express'); 
const router = express.Router(); 
const multer = require('multer'); 
const { Readable } = require('stream'); 
const controller = require('../controllers/fileController'); 
const { apiLimiter } = require('../middleware/rateLimitMiddleware');

// Multer config
const storage = multer.memoryStorage(); 
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB hard cap — rejects before buffering whole file
});

const zipUpload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 * 1024 }, // 2 GB cap for share-zips
});

// Upload route (NO rate limiting)
router.post('/upload', upload.single('file'), (req, res, next) => { 
  if (req.file) {
      req.file.stream = Readable.from(req.file.buffer);
  }
  next(); 
}, controller.uploadFile); 

// Share-zip route (NO rate limiting)
router.post('/share-zip', zipUpload.single('zipFile'), (req, res, next) => {
    if (req.file) {
        req.file.stream = Readable.from(req.file.buffer);
    } else {
       return res.status(400).send('No zip file attached.');
    }
    next();
}, controller.uploadAndShareZip);

// Get files route (NO rate limiting)
router.get('/', controller.getFiles); 

// Download file route (NO rate limiting)
router.get('/download/:id', controller.downloadFile); 

// Preview/Thumbnail file route (NO rate limiting, with 24-hour caching)
router.get('/preview/:id', controller.previewFile);

// Cleanup route (NO rate limiting)
router.delete('/cleanup/:fileId', controller.cleanupIncompleteUpload); 

// Delete file route (NO rate limiting)
router.delete('/:id', controller.deleteFile); 

// Generate share link route (NO rate limiting)
router.post('/share/:id', controller.generateShareLink); 

// Share link access route with rate limiting (this is the only route with rate limiting)
router.get('/share/:shareId', apiLimiter, controller.accessSharedFile); 

// Manual cleanup route (NO rate limiting)
router.post('/cleanup-expired-links', async (req, res) => {
    try {
        const count = await controller.scheduleCleanup();
        res.json({ message: `Cleaned up ${count} expired or voided share links` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
