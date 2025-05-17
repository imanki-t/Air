// fileService.js

const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType');

const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

// --- Existing uploadFile function ---
const uploadFile = (req, res) => {
  const { originalname, mimetype, stream } = req.file;
  const resumableUploadId = req.body.resumableUploadId;
  const resumableProgress = req.body.resumableProgress;

  const type = getFileCategory(mimetype);
  const metadata = {
    filename: originalname,
    type,
    uploadedAt: new Date(),
  };
  if (resumableUploadId) {
    metadata.resumableUploadId = resumableUploadId;
    metadata.resumableProgress = resumableProgress;
  }

  const uploadStream = bucket.openUploadStream(originalname, {
    contentType: mimetype,
    metadata,
  });

  stream.pipe(uploadStream)
    .on('error', (err) => res.status(500).json({ error: err.message }))
    .on('finish', (file) => res.status(201).json(file));
};

// --- Existing getFiles function ---
const getFiles = async (req, res) => {
  const files = await db.collection('uploads.files')
    .find({})
    .sort({ uploadDate: -1 })
    .toArray();
  res.json(files);
};

// --- Existing deleteFile function ---
const deleteFile = async (req, res) => {
  try {
    await bucket.delete(new ObjectId(req.params.id));
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Existing downloadFile function ---
const downloadFile = async (req, res) => {
  const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(req.params.id) });
  if (!file) return res.status(404).json({ error: 'File not found' });

  res.set('Content-Type', file.contentType);
  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

// --- Existing generateShareLink function ---
const generateShareLink = async (req, res) => {
  const id = req.params.id;
  const shareId = uuidv4();

  await db.collection('uploads.files').updateOne(
    { _id: new ObjectId(id) },
    { $set: { 'metadata.shareId': shareId } }
  );

  const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
  res.json({ url: shareURL });
};

// --- Existing accessSharedFile function ---
const accessSharedFile = async (req, res) => {
  const shareId = req.params.shareId;
  const file = await db.collection('uploads.files').findOne({
    'metadata.shareId': shareId,
  });

  if (!file) return res.status(404).json({ error: 'Link not found' });

  res.set('Content-Type', file.contentType);
  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

// --- Existing cleanupIncompleteUpload function ---
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    console.log(`Cleanup request received for file ID: ${fileId}`);
    // Add actual cleanup logic here if needed, e.g., bucket.delete()
    res.json({ message: 'Cleanup request processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// +++ MODIFIED FUNCTION: uploadAndShareZip +++
const uploadAndShareZip = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No zip file uploaded.' });
  }

  const { originalname, stream } = req.file;
  const mimetype = 'application/zip';
  const type = 'document'; // Or 'other', depending on how you want to categorize ZIPs

  // Store the exact upload date in metadata for later retrieval
  const uploadDate = new Date();
  const metadata = {
    filename: originalname || `shared_archive_${Date.now()}.zip`, // Use provided name or generate one
    type,
    isSharedZip: true, // Add a flag to identify these special uploads if needed
    uploadedAt: uploadDate, // Use the stored date
  };

  const uploadStream = bucket.openUploadStream(metadata.filename, {
    contentType: mimetype,
    metadata,
  });

  stream.pipe(uploadStream)
    .on('error', (err) => {
      console.error("Error uploading zip:", err);
      res.status(500).json({ error: `Failed to upload zip: ${err.message}` });
    })
    .on('finish', async () => { // Removed 'file' parameter as it seems unreliable
      try {
        // File is uploaded, now try to find it in the DB to get its _id.
        // We'll search using the filename and the exact upload date from metadata.
        // This is a workaround assuming filename + upload date is unique enough
        // immediately after upload.
        const uploadedFileDoc = await db.collection('uploads.files').findOne({
            'metadata.filename': metadata.filename,
            'metadata.uploadedAt': metadata.uploadedAt // Use the exact date from metadata
        });

        if (!uploadedFileDoc) {
            console.error("Error: Could not find uploaded zip file in DB after finish.");
            // If we can't find the file, we can't generate a link.
            // This might indicate a deeper issue or a timing problem.
            // More robust error handling/cleanup might be needed here.
            return res.status(500).json({ error: 'Failed to retrieve uploaded file details for sharing.' });
        }

        // Now that we have the file document with _id, generate share link
        const shareId = uuidv4();

        // Update the file document with the shareId using the retrieved _id
        await db.collection('uploads.files').updateOne(
          { _id: uploadedFileDoc._id }, // Use the _id from the fetched document
          { $set: { 'metadata.shareId': shareId } }
        );

        // Construct the share URL
        const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;

        // Send the URL back to the frontend
        res.status(201).json({ url: shareURL });

      } catch (processError) { // Catch errors in the fetching or updating process
        console.error("Error processing zip after upload:", processError);
        // An error occurred after upload but before link generation.
        // Attempting cleanup (deleting the zip) here is difficult without the _id.
        // You might need a separate process to clean up orphaned zip files.
        res.status(500).json({ error: `Failed to generate share link: ${processError.message}` });
      }
    });
};
// +++ END MODIFIED FUNCTION +++


module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
  downloadFile,
  generateShareLink,
  accessSharedFile,
  cleanupIncompleteUpload,
  uploadAndShareZip, // Ensure the new function is exported
};

