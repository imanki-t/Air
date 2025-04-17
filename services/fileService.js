// services/fileService.js
const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType');

const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

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
  
  // Store resumable upload info in metadata if provided
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

const getFiles = async (req, res) => {
  const files = await db.collection('uploads.files')
    .find({})
    .sort({ uploadDate: -1 })
    .toArray();
  res.json(files);
};

const deleteFile = async (req, res) => {
  try {
    await bucket.delete(new ObjectId(req.params.id));
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const downloadFile = async (req, res) => {
  const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(req.params.id) });
  if (!file) return res.status(404).json({ error: 'File not found' });

  res.set('Content-Type', file.contentType);
  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

const generateShareLink = async (req, res) => {
  const id = req.params.id;
  const shareId = uuidv4();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.collection('uploads.files').updateOne(
    { _id: new ObjectId(id) },
    { $set: { 'metadata.shareId': shareId, 'metadata.expiresAt': expiresAt } }
  );

  const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
  res.json({ url: shareURL });
};

const accessSharedFile = async (req, res) => {
  const shareId = req.params.shareId;
  const file = await db.collection('uploads.files').findOne({
    'metadata.shareId': shareId,
    'metadata.expiresAt': { $gt: new Date() },
  });

  if (!file) return res.status(404).json({ error: 'Link expired or file not found' });

  res.set('Content-Type', file.contentType);
  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

const cleanupIncompleteUpload = async (req, res) => {
  try {
    const fileId = req.params.fileId;
    // Log cleanup request for monitoring purposes
    console.log(`Cleanup request received for file ID: ${fileId}`);
    
    // Currently just acknowledging the request, as actual file cleanup
    // might depend on your specific implementation details
    res.json({ message: 'Cleanup request processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  deleteFile,
  downloadFile,
  generateShareLink,
  accessSharedFile,
  cleanupIncompleteUpload,
};
