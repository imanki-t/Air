// fileService.js

const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType'); // 

const db = mongoose.connection; // 
const bucket = new GridFSBucket(db, { bucketName: 'uploads' }); // 

// --- Existing uploadFile function ---
const uploadFile = (req, res) => { // 
  const { originalname, mimetype, stream } = req.file; // 
  const resumableUploadId = req.body.resumableUploadId; // 
  const resumableProgress = req.body.resumableProgress; // 

  const type = getFileCategory(mimetype); // 
  const metadata = { // 
    filename: originalname, // 
    type, // 
    uploadedAt: new Date(), // 
  };
  if (resumableUploadId) { // 
    metadata.resumableUploadId = resumableUploadId; // 
    metadata.resumableProgress = resumableProgress; // 
  }

  const uploadStream = bucket.openUploadStream(originalname, { // 
    contentType: mimetype, // 
    metadata, // 
  });

  stream.pipe(uploadStream) // 
    .on('error', (err) => res.status(500).json({ error: err.message })) // 
    .on('finish', (file) => res.status(201).json(file)); // 
};

// --- Existing getFiles function ---
const getFiles = async (req, res) => { // 
  const files = await db.collection('uploads.files') // 
    .find({}) // 
    .sort({ uploadDate: -1 }) // 
    .toArray(); // 
  res.json(files); // 
};

// --- Existing deleteFile function ---
const deleteFile = async (req, res) => { // 
  try {
    await bucket.delete(new ObjectId(req.params.id)); // 
    res.json({ message: 'File deleted' }); // 
  } catch (err) {
    res.status(500).json({ error: err.message }); // 
  }
};

// --- Existing downloadFile function ---
const downloadFile = async (req, res) => { // 
  const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(req.params.id) }); // 
  if (!file) return res.status(404).json({ error: 'File not found' }); // 

  res.set('Content-Type', file.contentType); // 
  const downloadStream = bucket.openDownloadStream(file._id); // 
  downloadStream.pipe(res); // 
};

// --- Existing generateShareLink function ---
const generateShareLink = async (req, res) => { // 
  const id = req.params.id; // 
  const shareId = uuidv4(); // 

  await db.collection('uploads.files').updateOne( // 
    { _id: new ObjectId(id) }, // 
    { $set: { 'metadata.shareId': shareId } } // 
  );

  const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`; // 
  res.json({ url: shareURL }); // 
};

// --- Existing accessSharedFile function ---
const accessSharedFile = async (req, res) => { // 
  const shareId = req.params.shareId; // 
  const file = await db.collection('uploads.files').findOne({ // 
    'metadata.shareId': shareId, // 
  });

  if (!file) return res.status(404).json({ error: 'Link not found' }); // 

  res.set('Content-Type', file.contentType); // 
  const downloadStream = bucket.openDownloadStream(file._id); // 
  downloadStream.pipe(res); // 
};

// --- Existing cleanupIncompleteUpload function ---
const cleanupIncompleteUpload = async (req, res) => { // 
  try {
    const fileId = req.params.fileId; // 
    console.log(`Cleanup request received for file ID: ${fileId}`); // 
    // Add actual cleanup logic here if needed, e.g., bucket.delete()
    res.json({ message: 'Cleanup request processed' }); // 
  } catch (err) {
    res.status(500).json({ error: err.message }); // 
  }
};

// +++ NEW FUNCTION: uploadAndShareZip +++
const uploadAndShareZip = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No zip file uploaded.' });
  }

  const { originalname, stream } = req.file;
  // Assuming the frontend sends a zip file
  const mimetype = 'application/zip';
  const type = 'document'; // Or 'other', depending on how you want to categorize ZIPs 

  const metadata = {
    filename: originalname || `shared_archive_${Date.now()}.zip`, // Use provided name or generate one
    type,
    isSharedZip: true, // Add a flag to identify these special uploads if needed
    uploadedAt: new Date(),
  };

  const uploadStream = bucket.openUploadStream(metadata.filename, { // Use metadata.filename here
    contentType: mimetype,
    metadata,
  });

  stream.pipe(uploadStream)
    .on('error', (err) => {
      console.error("Error uploading zip:", err);
      res.status(500).json({ error: `Failed to upload zip: ${err.message}` });
    })
    .on('finish', async (file) => { // Mark this callback as async
      try {
        // File is uploaded, now generate share link
        const shareId = uuidv4(); // 

        // Update the just uploaded file with the shareId
        await db.collection('uploads.files').updateOne( // 
          { _id: file._id }, // Use the ID from the 'finish' event
          { $set: { 'metadata.shareId': shareId } } // 
        );

        // Construct the share URL
        const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`; // 

        // Send the URL back to the frontend
        res.status(201).json({ url: shareURL, _id: file._id.toString() });

      } catch (updateError) {
        console.error("Error generating share link for zip:", updateError);
        // Attempt to delete the uploaded file if link generation failed
        try { await bucket.delete(file._id); } catch (delErr) { console.error("Failed to cleanup zip after error:", delErr); }
        res.status(500).json({ error: `Failed to generate share link: ${updateError.message}` });
      }
    });
};
// +++ END NEW FUNCTION +++

module.exports = { // 
  uploadFile, // 
  getFiles, // 
  deleteFile, // 
  downloadFile, // 
  generateShareLink, // 
  accessSharedFile, // 
  cleanupIncompleteUpload, // 
  uploadAndShareZip, // +++ Add the new function here +++
};
