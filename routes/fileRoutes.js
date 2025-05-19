// routes/fileRoutes.js
const express = require('express'); 
const router = express.Router(); 
const multer = require('multer'); 
const { Readable } = require('stream'); 
const controller = require('../controllers/fileController'); 

// Multer config
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage }); // Set limits if needed: limits: { fileSize: ... }

// Existing upload route
router.post('/upload', upload.single('file'), (req, res, next) => { 
  if (req.file) {
      req.file.stream = Readable.from(req.file.buffer); // convert buffer to stream 
  }
  next(); 
}, controller.uploadFile); 

// /share-zip route
router.post('/share-zip', upload.single('zipFile'), (req, res, next) => {
    // Convert buffer to stream, similar to the /upload route
    if (req.file) {
        req.file.stream = Readable.from(req.file.buffer);
    } else {
       // Handle case where no file is received, although multer might handle this
       return res.status(400).send('No zip file attached.');
    }
    next();
}, controller.uploadAndShareZip);

// Existing routes
router.get('/', controller.getFiles); 
router.get('/download/:id', controller.downloadFile); 
router.delete('/cleanup/:fileId', controller.cleanupIncompleteUpload); 
router.delete('/:id', controller.deleteFile); 
router.post('/share/:id', controller.generateShareLink); 
router.get('/share/:shareId', controller.accessSharedFile); 

// Add route to manually trigger cleanup of expired links (optional, for admin/testing purposes)
router.post('/cleanup-expired-links', async (req, res) => {
    try {
        const count = await controller.scheduleCleanup();
        res.json({ message: `Cleaned up ${count} expired or voided share links` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
