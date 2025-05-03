// routes/fileRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { Readable } = require('stream');
const controller = require('../controllers/fileController');
const { protect } = require('../middleware/authMiddleware'); // Import protect middleware

// Multer config
const storage = multer.memoryStorage();
const upload = multer({ storage: storage }); // Set limits if needed: limits: { fileSize: ... }

// Existing upload route - PROTECTED
router.post('/upload', protect, upload.single('file'), (req, res, next) => {
  if (req.file) {
      req.file.stream = Readable.from(req.file.buffer); // convert buffer to stream
  }
  next();
}, controller.uploadFile);

// +++ NEW ROUTE: /share-zip - PROTECTED +++
router.post('/share-zip', protect, upload.single('zipFile'), (req, res, next) => {
    if (req.file) {
        req.file.stream = Readable.from(req.file.buffer);
    } else {
       return res.status(400).send('No zip file attached.');
    }
    next();
}, controller.uploadAndShareZip);
// +++ END NEW ROUTE +++

// Existing routes - PROTECTED
router.get('/', protect, controller.getFiles); // PROTECTED
router.get('/download/:id', protect, controller.downloadFile); // PROTECTED
// Note: Accessing shared files via shareId does NOT need protection
router.get('/share/:shareId', controller.accessSharedFile); // NOT PROTECTED by design

router.delete('/cleanup/:fileId', protect, controller.cleanupIncompleteUpload); // PROTECTED
router.delete('/:id', protect, controller.deleteFile); // PROTECTED
router.post('/share/:id', protect, controller.generateShareLink); // PROTECTED

module.exports = router;
