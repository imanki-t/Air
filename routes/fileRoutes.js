// routes/fileRoutes.js
const express = require('express'); // 
const router = express.Router(); // 
const multer = require('multer'); // 
const { Readable } = require('stream'); // 
const controller = require('../controllers/fileController'); // 

// Multer config
const storage = multer.memoryStorage(); // 
const upload = multer({ storage: storage }); // // Set limits if needed: limits: { fileSize: ... }

// Existing upload route
router.post('/upload', upload.single('file'), (req, res, next) => { // 
  if (req.file) {
      req.file.stream = Readable.from(req.file.buffer); // convert buffer to stream 
  }
  next(); // 
}, controller.uploadFile); // 

// +++ NEW ROUTE: /share-zip +++
// Uses multer middleware to handle 'zipFile' field from frontend FormData
router.post('/share-zip', upload.single('zipFile'), (req, res, next) => {
    // Convert buffer to stream, similar to the /upload route
    if (req.file) {
        req.file.stream = Readable.from(req.file.buffer);
    } else {
       // Handle case where no file is received, although multer might handle this
       return res.status(400).send('No zip file attached.');
    }
    next();
}, controller.uploadAndShareZip); // Point to the new controller function
// +++ END NEW ROUTE +++

// Existing routes
router.get('/', controller.getFiles); // 
router.get('/download/:id', controller.downloadFile); // 
router.delete('/cleanup/:fileId', controller.cleanupIncompleteUpload); // 
router.delete('/:id', controller.deleteFile); // 
router.post('/share/:id', controller.generateShareLink); // 
router.get('/share/:shareId', controller.accessSharedFile); // 

module.exports = router; // 

