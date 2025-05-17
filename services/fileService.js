// services/fileService.js

const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType');

const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

// --- Upload file ---
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

// --- Get all files ---
const getFiles = async (req, res) => {
  const files = await db.collection('uploads.files')
    .find({})
    .sort({ uploadDate: -1 })
    .toArray();
  res.json(files);
};

// --- Delete a file (updated with socket emit) ---
const deleteFile = async (req, res) => {
  try {
    await bucket.delete(new ObjectId(req.params.id));

    // Emit socket event to all clients
    const io = req.app.get('io');
    if (io) {
      io.emit('refreshFileList');
    }

    res.json({ message: 'File deleted' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- Download file ---
const downloadFile = async (req, res) => {
  const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(req.params.id) });
  if (!file) return res.status(404).json({ error: 'File not found' });

  res.set('Content-Type', file.contentType);
  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

// --- Generate shareable link ---
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

// --- Access shared file via link ---
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

// --- Cleanup incomplete upload (stub) ---
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    console.log(`Cleanup request received for file ID: ${fileId}`);
    // Add cleanup logic if needed
    res.json({ message: 'Cleanup request processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Upload and share ZIP ---
const uploadAndShareZip = (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No zip file uploaded.' });
  }

  const { originalname, stream } = req.file;
  const mimetype = 'application/zip';
  const type = 'document';

  const uploadDate = new Date();
  const metadata = {
    filename: originalname || `shared_archive_${Date.now()}.zip`,
    type,
    isSharedZip: true,
    uploadedAt: uploadDate,
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
    .on('finish', async () => {
      try {
        const uploadedFileDoc = await db.collection('uploads.files').findOne({
          'metadata.filename': metadata.filename,
          'metadata.uploadedAt': metadata.uploadedAt
        });

        if (!uploadedFileDoc) {
          console.error("Error: Could not find uploaded zip file in DB after finish.");
          return res.status(500).json({ error: 'Failed to retrieve uploaded file details for sharing.' });
        }

        const shareId = uuidv4();

        await db.collection('uploads.files').updateOne(
          { _id: uploadedFileDoc._id },
          { $set: { 'metadata.shareId': shareId } }
        );

        const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
        res.status(201).json({ url: shareURL });

      } catch (processError) {
        console.error("Error processing zip after upload:", processError);
        res.status(500).json({ error: `Failed to generate share link: ${processError.message}` });
      }
    });
};

module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
  downloadFile,
  generateShareLink,
  accessSharedFile,
  cleanupIncompleteUpload,
  uploadAndShareZip,
};
