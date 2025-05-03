// fileService.js

const { GridFSBucket, ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const getFileCategory = require('../utils/fileType');

const db = mongoose.connection;
const bucket = new GridFSBucket(db, { bucketName: 'uploads' });

// --- Modified uploadFile function ---
const uploadFile = (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;
  const { originalname, mimetype, stream } = req.file;
  const resumableUploadId = req.body.resumableUploadId;
  const resumableProgress = req.body.resumableProgress;

  const type = getFileCategory(mimetype);
  const metadata = {
    filename: originalname,
    type,
    uploadedAt: new Date(),
    userId: userId, // *** Store the user ID with the file ***
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

// --- Modified getFiles function ---
const getFiles = async (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;
  const files = await db.collection('uploads.files')
    // *** Filter files by the logged-in user's ID ***
    .find({ 'metadata.userId': userId })
    .sort({ uploadDate: -1 })
    .toArray();
  res.json(files);
};

// --- Modified deleteFile function ---
const deleteFile = async (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;
  const fileId = req.params.id;

  try {
    // *** Verify file belongs to the user before deleting ***
    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId), 'metadata.userId': userId });

    if (!file) {
      return res.status(404).json({ error: 'File not found or not owned by user' });
    }

    await bucket.delete(new ObjectId(fileId));
    res.json({ message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- Modified downloadFile function ---
const downloadFile = async (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;
  const fileId = req.params.id;

  // *** Verify file belongs to the user before downloading ***
  const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId), 'metadata.userId': userId });

  if (!file) return res.status(404).json({ error: 'File not found or not owned by user' });

  res.set('Content-Type', file.contentType);
  // Set Content-Disposition header to suggest a filename
  res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);

  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

// --- Modified generateShareLink function ---
const generateShareLink = async (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;
  const fileId = req.params.id;

  try {
    // *** Verify file belongs to the user before generating link ***
    const file = await db.collection('uploads.files').findOne({ _id: new ObjectId(fileId), 'metadata.userId': userId });

    if (!file) {
      return res.status(404).json({ error: 'File not found or not owned by user' });
    }

    const shareId = uuidv4(); // Generate unique share ID

    // Store shareId in metadata
    await db.collection('uploads.files').updateOne(
      { _id: new ObjectId(fileId) },
      { $set: { 'metadata.shareId': shareId, 'metadata.sharedBy': userId } } // *** Also store which user shared it ***
    );

    const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;
    res.json({ url: shareURL });
  } catch (err) {
    console.error('Error generating share link:', err);
    res.status(500).json({ error: err.message });
  }
};

// --- accessSharedFile function (does NOT need user check) ---
// This endpoint is for anyone with the share link
const accessSharedFile = async (req, res) => {
  const shareId = req.params.shareId;

  // Find file by shareId (no user check needed here)
  const file = await db.collection('uploads.files').findOne({
    'metadata.shareId': shareId,
  });

  if (!file) return res.status(404).json({ error: 'Link not found' });

  res.set('Content-Type', file.contentType);
   // Set Content-Disposition header to suggest a filename
  res.set('Content-Disposition', `attachment; filename="${encodeURIComponent(file.filename)}"`);

  const downloadStream = bucket.openDownloadStream(file._id);
  downloadStream.pipe(res);
};

// --- cleanupIncompleteUpload function (modified to use user ID) ---
const cleanupIncompleteUpload = async (req, res) => {
   const userId = req.user._id; // Available due to protect middleware
   const fileId = req.params.fileId; // Assuming fileId is passed

   console.log(`Cleanup request received for file ID: ${fileId} for user ${userId}`);
   // Add actual cleanup logic here if needed, e.g., finding chunks by fileId and deleting
   // If you stored resumableUploadId and userId in chunks metadata, you could delete based on that.
   // For now, it's just a placeholder acknowledging the user context.
   res.json({ message: 'Cleanup request processed (user context applied)' });
};

// +++ NEW FUNCTION: uploadAndShareZip (modified to use user ID) +++
const uploadAndShareZip = (req, res) => {
  // req.user._id is available due to protect middleware
  const userId = req.user._id;

  if (!req.file) {
    return res.status(400).json({ error: 'No zip file uploaded.' });
  }

  const { originalname, stream } = req.file;
  const mimetype = 'application/zip';
  const type = 'document'; // Categorize ZIPs as document

  const metadata = {
    filename: originalname || `shared_archive_${Date.now()}.zip`,
    type,
    isSharedZip: true, // Flag for shared zips
    uploadedAt: new Date(),
    userId: userId, // *** Store the user ID with the zip file ***
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
    .on('finish', async (file) => {
      try {
        // File is uploaded, now generate share link
        const shareId = uuidv4();

        // Update the just uploaded file with the shareId and sharedBy user
        await db.collection('uploads.files').updateOne(
          { _id: file._id },
          { $set: { 'metadata.shareId': shareId, 'metadata.sharedBy': userId } } // *** Add shareId and sharedBy user ***
        );

        // Construct the share URL
        const shareURL = `${process.env.BACKEND_URL}/api/files/share/${shareId}`;

        // Send the URL back to the frontend
        res.status(201).json({ url: shareURL });

      } catch (updateError) {
        console.error("Error generating share link for zip:", updateError);
        // Attempt to delete the uploaded file if link generation failed
        try { await bucket.delete(file._id); } catch (delErr) { console.error("Failed to cleanup zip after error:", delErr); }
        res.status(500).json({ error: `Failed to generate share link: ${updateError.message}` });
      }
    });
};
// +++ END NEW FUNCTION +++


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
