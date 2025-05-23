// services/fileService.js
const { ObjectId } = require('mongodb');
const mongoose = require('mongoose');
const crypto = require('crypto');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const getFileCategory = require('../utils/fileType'); // Assuming this utility exists
const { initDriveClient, initDriveFolder } = require('../config/drive'); // Assuming these utilities exist
const {
 getDriveIdMapping,
 storeDriveMapping,
 bufferToStream,
 streamToBuffer,
 safeObjectId
} = require('../utils/driveUtils'); // Assuming these utilities exist

// Initialize Google Drive client
const { drive, auth } = initDriveClient();
let driveFolderId;

// Get the root folder ID
(async () => {
 try {
   driveFolderId = await initDriveFolder(drive);
   console.log('Google Drive folder initialized:', driveFolderId);
 } catch (error) {
   console.error('Failed to initialize Google Drive folder:', error);
 }
})();

const db = mongoose.connection;

// Generate a short share ID (6 characters)
const generateShortShareId = () => {
 const buffer = crypto.randomBytes(4);
 return buffer.toString('base64')
   .replace(/\+/g, '0')
   .replace(/\//g, '1')
   .replace(/=/g, '')
   .substring(0, 6);
};

// --- Upload file to Google Drive ---
const uploadFile = async (req, res) => {
 try {
   if (!driveFolderId) {
     // Attempt to re-initialize if driveFolderId is not set
     console.log('Re-initializing Google Drive folder in uploadFile...');
     driveFolderId = await initDriveFolder(drive);
     if (!driveFolderId) {
       throw new Error('Google Drive folder ID could not be initialized.');
     }
     console.log('Google Drive folder re-initialized:', driveFolderId);
   }

   const { originalname, mimetype, stream } = req.file;
   const resumableUploadId = req.body.resumableUploadId;
   const resumableProgress = req.body.resumableProgress;

   const type = getFileCategory(mimetype); // Make sure getFileCategory handles video mimetypes
   const metadata = {
     filename: originalname,
     type,
     uploadedAt: new Date(),
   };

   if (resumableUploadId) {
     metadata.resumableUploadId = resumableUploadId;
     metadata.resumableProgress = resumableProgress;
   }

   const driveFileMetadata = {
     name: originalname,
     parents: [driveFolderId],
     description: JSON.stringify(metadata), // Store metadata in description
     mimeType: mimetype,
   };

   const buffer = await streamToBuffer(stream);

   const driveRes = await drive.files.create({
     resource: driveFileMetadata,
     media: {
       mimeType: mimetype,
       body: bufferToStream(buffer)
     },
     fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
   });

   const mongoId = new ObjectId();

   await storeDriveMapping(mongoId, driveRes.data.id, {
     ...metadata, // Spread the existing metadata
     contentType: mimetype,
     size: driveRes.data.size,
     uploadDate: new Date(driveRes.data.createdTime)
   });

   const responseObj = {
     _id: mongoId,
     length: parseInt(driveRes.data.size || 0),
     chunkSize: 261120, // Standard GridFS chunk size, can be adjusted
     uploadDate: new Date(driveRes.data.createdTime),
     filename: driveRes.data.name,
     contentType: driveRes.data.mimeType,
     metadata: metadata, // Ensure metadata is included
     driveId: driveRes.data.id,
     webContentLink: driveRes.data.webContentLink,
     webViewLink: driveRes.data.webViewLink
   };

   res.status(201).json(responseObj);
 } catch (error) {
   console.error('Upload error:', error.message, error.stack);
   res.status(500).json({ error: 'Failed to upload file. ' + error.message });
 }
};

// --- Get all files ---
const getFiles = async (req, res) => {
 try {
   const files = await db.collection('drive_mappings')
     .find({})
     .sort({ 'metadata.uploadedAt': -1 }) // Sort by upload date
     .toArray();

   const formattedFiles = files.map(file => ({
     _id: file._id,
     length: file.metadata.size,
     chunkSize: 261120,
     uploadDate: file.metadata.uploadDate,
     filename: file.metadata.filename,
     contentType: file.metadata.contentType,
     metadata: file.metadata, // Ensure full metadata is passed
     driveId: file.driveId
   }));

   res.json(formattedFiles);
 } catch (error) {
   console.error('Error retrieving files:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Delete a file ---
const deleteFile = async (req, res) => {
 try {
   const fileId = req.params.id;
   const driveIdMapping = await db.collection('drive_mappings').findOne(safeObjectId(fileId) ? { _id: safeObjectId(fileId) } : { 'metadata.filename': fileId });

   if (!driveIdMapping || !driveIdMapping.driveId) {
       return res.status(404).json({ error: 'File mapping not found or Drive ID missing.' });
   }
   const driveId = driveIdMapping.driveId;

   await drive.files.delete({
     fileId: driveId
   });

   const objectId = safeObjectId(fileId);
   const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
   await db.collection('drive_mappings').deleteOne(deleteQuery);

   const io = req.app.get('io');
   if (io) {
     io.emit('refreshFileList');
   }

   res.json({ message: 'File deleted' });
 } catch (error) {
   console.error('Delete error:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Download file ---
const downloadFile = async (req, res) => {
 try {
   const fileId = req.params.id;
   const driveIdMapping = await db.collection('drive_mappings').findOne(safeObjectId(fileId) ? { _id: safeObjectId(fileId) } : { 'metadata.filename': fileId });

   if (!driveIdMapping || !driveIdMapping.driveId) {
       return res.status(404).json({ error: 'File mapping not found or Drive ID missing.' });
   }
   const driveId = driveIdMapping.driveId;

   const fileMetadata = await drive.files.get({
     fileId: driveId,
     fields: 'name, mimeType, size'
   });

   if (fileMetadata.data.size) {
     res.setHeader('Content-Length', fileMetadata.data.size);
   }

   const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
   res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
   res.setHeader('Content-Type', fileMetadata.data.mimeType);

   const driveResponse = await drive.files.get({
     fileId: driveId,
     alt: 'media'
   }, { responseType: 'stream' });

   driveResponse.data.pipe(res);
 } catch (error) {
   console.error('Download error:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Generate and serve image or video thumbnail ---
const getThumbnail = async (req, res) => {
 const fileId = req.params.id;
 let driveId;
 let tempFilePath = null; // For storing downloaded video temporarily
 let tempFramePath = null; // For storing extracted frame temporarily

 try {
   const driveIdMapping = await db.collection('drive_mappings').findOne(safeObjectId(fileId) ? { _id: safeObjectId(fileId) } : { 'metadata.filename': fileId });

   if (!driveIdMapping || !driveIdMapping.driveId) {
       return res.status(404).json({ error: 'File mapping not found or Drive ID missing for thumbnail.' });
   }
   driveId = driveIdMapping.driveId;


   const fileMetadata = await drive.files.get({
     fileId: driveId,
     fields: 'name, mimeType, size'
   });

   const mimeType = fileMetadata.data.mimeType;

   if (mimeType.startsWith('image/')) {
     // --- Image Thumbnail Logic (existing) ---
     const driveResponse = await drive.files.get({
       fileId: driveId,
       alt: 'media'
     }, { responseType: 'stream' });

     const imageBuffer = await streamToBuffer(driveResponse.data);
     const thumbnailBuffer = await sharp(imageBuffer)
       .resize(300, 300, {
         fit: 'inside',
         withoutEnlargement: true
       })
       .jpeg({ quality: 70, progressive: true })
       .toBuffer();

     res.setHeader('Content-Type', 'image/jpeg');
     res.setHeader('Content-Length', thumbnailBuffer.length);
     res.setHeader('Cache-Control', 'public, max-age=86400');
     res.setHeader('ETag', `"${crypto.createHash('md5').update(thumbnailBuffer).digest('hex')}"`);
     res.send(thumbnailBuffer);

   } else if (mimeType.startsWith('video/')) {
     // --- Video Thumbnail Logic (New) ---
     console.log(`Generating thumbnail for video: ${fileMetadata.data.name}`);

     // 1. Download the video file temporarily
     const videoResponse = await drive.files.get({
       fileId: driveId,
       alt: 'media'
     }, { responseType: 'stream' });

     // Create a temporary file path
     const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-thumb-'));
     tempFilePath = path.join(tempDir, fileMetadata.data.name || `video_${Date.now()}`);
     const writer = fs.createWriteStream(tempFilePath);
     videoResponse.data.pipe(writer);

     await new Promise((resolve, reject) => {
       writer.on('finish', resolve);
       writer.on('error', (err) => {
           console.error("Error writing video to temp file:", err);
           reject(new Error('Failed to write video to temporary file. ' + err.message));
       });
     });
     console.log(`Video temporarily saved to: ${tempFilePath}`);


     // 2. Extract a frame using ffmpeg
     tempFramePath = path.join(tempDir, `frame_${Date.now()}.png`);
     await new Promise((resolve, reject) => {
       ffmpeg(tempFilePath)
         .on('end', () => {
           console.log(`Frame extracted to: ${tempFramePath}`);
           resolve();
         })
         .on('error', (err) => {
           console.error('FFmpeg error:', err.message);
           // Check if the error is due to ffmpeg not being found
           if (err.message.includes('ENOENT') || err.message.toLowerCase().includes('ffmpeg not found')) {
                reject(new Error('FFmpeg not found. Please ensure FFmpeg is installed and in your system PATH.'));
           } else {
                reject(new Error('Failed to extract frame using FFmpeg. ' + err.message));
           }
         })
         .screenshots({
           count: 1,
           timemarks: ['1'], // Try to get a frame from the 1st second
           filename: path.basename(tempFramePath),
           folder: path.dirname(tempFramePath),
           size: '640x?' // Optional: specify size for extracted frame
         });
     });

     // 3. Read the frame and generate thumbnail with Sharp
     const frameBuffer = await fs.promises.readFile(tempFramePath);
     const thumbnailBuffer = await sharp(frameBuffer)
       .resize(300, 300, {
         fit: 'inside',
         withoutEnlargement: true
       })
       .jpeg({ quality: 70, progressive: true })
       .toBuffer();

     res.setHeader('Content-Type', 'image/jpeg');
     res.setHeader('Content-Length', thumbnailBuffer.length);
     res.setHeader('Cache-Control', 'public, max-age=86400');
     res.setHeader('ETag', `"${crypto.createHash('md5').update(thumbnailBuffer).digest('hex')}"`);
     res.send(thumbnailBuffer);

   } else {
     // --- Fallback for unsupported types ---
     console.warn(`Thumbnail requested for unsupported type: ${mimeType}`);
     // Option: Send a default placeholder image
     // For now, sending 400
     return res.status(400).json({ error: 'File type not supported for thumbnails (image or video only)' });
   }

 } catch (error) {
   console.error('Thumbnail generation error:', error.message, error.stack);
   // Fallback to serving a generic placeholder or original if it's an image and sharp failed initially
   try {
       // Attempt to get metadata again for fallback, only if driveId was resolved
       if (driveId) {
           const fileMetadata = await drive.files.get({
               fileId: driveId,
               fields: 'mimeType, size' // Only get necessary fields
           });

           // If it was an image and sharp failed, try sending original (as per original logic)
           if (fileMetadata.data.mimeType.startsWith('image/')) {
               console.log("Falling back to original image due to Sharp error.");
               const driveResponse = await drive.files.get({
                   fileId: driveId,
                   alt: 'media'
               }, { responseType: 'stream' });

               res.setHeader('Content-Type', fileMetadata.data.mimeType);
               if (fileMetadata.data.size) {
                   res.setHeader('Content-Length', fileMetadata.data.size);
               }
               res.setHeader('Cache-Control', 'public, max-age=3600');
               driveResponse.data.pipe(res);
               return; // Exit after piping
           }
       }
   } catch (fallbackError) {
       console.error('Fallback thumbnail error:', fallbackError.message, fallbackError.stack);
   }
   // If all else fails or it's not an image fallback case
   res.status(500).json({ error: 'Failed to generate thumbnail. ' + error.message });

 } finally {
   // --- Cleanup temporary files ---
   if (tempFilePath) {
     fs.unlink(tempFilePath, err => {
       if (err) console.error(`Error deleting temp video file ${tempFilePath}:`, err);
       else console.log(`Deleted temp video file: ${tempFilePath}`);
       // Clean up the directory if tempFilePath was created
       const dirPath = path.dirname(tempFilePath);
       fs.rm(dirPath, { recursive: true, force: true }, (rmErr) => {
           if (rmErr) console.error(`Error deleting temp directory ${dirPath}:`, rmErr);
           else console.log(`Deleted temp directory: ${dirPath}`);
       });
     });
   } else if (tempFramePath) { // If only frame path exists (e.g. image processing didn't need temp video)
       const dirPath = path.dirname(tempFramePath);
        fs.rm(dirPath, { recursive: true, force: true }, (rmErr) => { // Also remove its directory
           if (rmErr) console.error(`Error deleting temp directory for frame ${dirPath}:`, rmErr);
           else console.log(`Deleted temp directory for frame: ${dirPath}`);
       });
   }
 }
};


// --- Helper function to cleanup expired or voided share links ---
const cleanupExpiredLinks = async () => {
 try {
   const now = new Date();
   if (!db || !db.collection) {
     console.log('MongoDB connection not ready yet for cleanup. Skipping.');
     return 0;
   }
   const collection = db.collection('drive_mappings');
   const cursor = collection.find({
     $or: [
       { 'metadata.shareExpires': { $lt: now } },
       { 'metadata.shareVoided': true }
     ]
   });
   const expiredOrVoidedLinks = await cursor.toArray().catch(err => {
     console.error('Error converting cursor to array for cleanup:', err);
     return [];
   });
   for (const link of expiredOrVoidedLinks) {
     await collection.updateOne(
       { _id: link._id },
       {
         $unset: {
           'metadata.shareId': "",
           'metadata.shareExpires': "",
           'metadata.shareVoided': ""
         }
       }
     );
     console.log(`Cleaned up expired/voided share link for file: ${link._id}`);
   }
   return expiredOrVoidedLinks.length;
 } catch (error) {
   console.error('Error cleaning up expired links:', error);
   return 0;
 }
};

// --- Generate shareable link ---
const generateShareLink = async (req, res) => {
 try {
   const fileId = req.params.id;
   const driveIdMapping = await db.collection('drive_mappings').findOne(safeObjectId(fileId) ? { _id: safeObjectId(fileId) } : { 'metadata.filename': fileId });

   if (!driveIdMapping || !driveIdMapping.driveId) {
       return res.status(404).json({ error: 'File mapping not found or Drive ID missing for share link.' });
   }
   const driveId = driveIdMapping.driveId;

   const shareId = generateShortShareId();

   await drive.permissions.create({
     fileId: driveId,
     requestBody: {
       role: 'reader',
       type: 'anyone'
     }
   });

   const objectId = safeObjectId(fileId);
   const updateQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };

   const expirationDate = new Date();
   expirationDate.setDate(expirationDate.getDate() + 30); // Share link expires in 30 days

   const existingFile = await db.collection('drive_mappings').findOne(updateQuery);
   if (existingFile && existingFile.metadata && existingFile.metadata.shareId) {
     await db.collection('drive_mappings').updateOne(
       updateQuery,
       { $set: { 'metadata.shareVoided': true } }
     );
     await cleanupExpiredLinks(); // Clean up immediately
   }

   await db.collection('drive_mappings').updateOne(
     updateQuery,
     {
       $set: {
         'metadata.shareId': shareId,
         'metadata.shareExpires': expirationDate,
         'metadata.shareVoided': false
       }
     }
   );

   const shareURL = `${process.env.BACKEND_URL || 'http://localhost:3000'}/s/${shareId}`; // Fallback for BACKEND_URL
   res.json({
     url: shareURL,
     expires: expirationDate
   });
 } catch (error) {
   console.error('Share error:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Access shared file via link ---
const accessSharedFile = async (req, res) => {
 try {
   const shareId = req.params.shareId;
   await cleanupExpiredLinks();

   const now = new Date();
   const fileMapping = await db.collection('drive_mappings').findOne({
     'metadata.shareId': shareId,
     'metadata.shareExpires': { $gt: now },
     'metadata.shareVoided': { $ne: true }
   });

   if (!fileMapping) {
     return res.status(404).json({ error: 'Link not found, expired, or voided.' });
   }

   const driveId = fileMapping.driveId;
   const fileMetadata = await drive.files.get({
     fileId: driveId,
     fields: 'name, mimeType, size'
   });

   if (fileMetadata.data.size) {
     res.setHeader('Content-Length', fileMetadata.data.size);
   }
   const safeFilename = encodeURIComponent(fileMetadata.data.name).replace(/['()]/g, escape);
   res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
   res.setHeader('Content-Type', fileMetadata.data.mimeType);

   const driveResponse = await drive.files.get({
     fileId: driveId,
     alt: 'media'
   }, { responseType: 'stream' });

   driveResponse.data.pipe(res);
 } catch (error) {
   console.error('Share access error:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Cleanup incomplete upload ---
const cleanupIncompleteUpload = async (req, res) => {
 try {
   const fileId = req.params.fileId; // This might be mongoId or filename
   console.log(`Cleanup request received for file ID/name: ${fileId}`);

   if (!fileId || fileId === 'undefined') {
     return res.status(400).json({ message: 'Invalid file ID/name for cleanup' });
   }

   let fileMapping;
   const potentialObjectId = safeObjectId(fileId);

   if (potentialObjectId) {
       fileMapping = await db.collection('drive_mappings').findOne({ _id: potentialObjectId });
   }
   
   // If not found by ObjectId, try by filename (resumable uploads might use filename as identifier initially)
   if (!fileMapping) {
       fileMapping = await db.collection('drive_mappings').findOne({ 'metadata.filename': fileId });
   }
   
   if (!fileMapping) {
     console.log(`No file mapping found for: ${fileId}. No cleanup needed from DB/Drive.`);
     return res.json({ message: 'No file found to clean up based on provided ID/name' });
   }

   const driveId = fileMapping.driveId;
   const mongoId = fileMapping._id; // Use the actual _id from the mapping

   console.log(`Found mapping: MongoDB ID ${mongoId}, Drive ID ${driveId}`);

   if (driveId) { // Only attempt Drive deletion if a driveId exists
       try {
           await drive.files.get({ fileId: driveId, fields: 'id' }); // Check if file exists on Drive
           await drive.files.delete({ fileId: driveId });
           console.log(`Deleted file from Google Drive with Drive ID: ${driveId}`);
       } catch (driveError) {
           if (driveError.code === 404) {
               console.log(`File with Drive ID ${driveId} not found on Google Drive. Assumed already deleted or never fully uploaded.`);
           } else {
               console.error(`Error deleting from Drive (fileId: ${driveId}):`, driveError.message);
               // Decide if you want to stop or continue to DB cleanup
           }
       }
   } else {
       console.log(`No Drive ID found for mapping ${mongoId}. Skipping Drive deletion.`);
   }

   // Delete mapping from MongoDB, regardless of Drive deletion outcome if mapping exists
   await db.collection('drive_mappings').deleteOne({ _id: mongoId });
   console.log(`Deleted file mapping from MongoDB with ID: ${mongoId}`);

   const io = req.app.get('io');
   if (io) {
     io.emit('refreshFileList');
   }

   res.json({ message: 'Incomplete upload cleanup process finished.' });
 } catch (error) {
   console.error('Cleanup error:', error.message, error.stack);
   // It's often better to return a success-like status to the client for cleanup
   // to prevent retry loops if the core issue is on the server or a transient problem.
   res.status(200).json({ message: 'Cleanup process attempted, check server logs for details. ' + error.message });
 }
};


// --- Upload and share ZIP ---
const uploadAndShareZip = async (req, res) => {
 try {
   if (!req.file) {
     return res.status(400).json({ error: 'No zip file uploaded.' });
   }
   if (!driveFolderId) {
     driveFolderId = await initDriveFolder(drive); // Ensure folderId is initialized
     if (!driveFolderId) throw new Error("Drive folder couldn't be initialized for ZIP upload.");
   }

   const { originalname, stream } = req.file;
   const filename = originalname || `shared_archive_${Date.now()}.zip`;
   const mimetype = 'application/zip';
   const type = 'document'; // Or 'archive'
   const uploadDate = new Date();

   const metadata = {
     filename,
     type,
     isSharedZip: true,
     uploadedAt: uploadDate,
   };

   const driveFileMetadata = {
     name: filename,
     parents: [driveFolderId],
     description: JSON.stringify(metadata),
     mimeType: mimetype,
   };

   const buffer = await streamToBuffer(stream);
   const driveRes = await drive.files.create({
     resource: driveFileMetadata,
     media: {
       mimeType: mimetype,
       body: bufferToStream(buffer)
     },
     fields: 'id, name, webContentLink, webViewLink, createdTime, mimeType, size',
   });

   const mongoId = new ObjectId();
   await storeDriveMapping(mongoId, driveRes.data.id, {
     ...metadata,
     contentType: mimetype,
     size: driveRes.data.size,
     uploadDate: uploadDate // Use consistent uploadDate
   });

   const shareId = generateShortShareId();
   const expirationDate = new Date();
   expirationDate.setDate(expirationDate.getDate() + 30);

   await drive.permissions.create({
     fileId: driveRes.data.id,
     requestBody: { role: 'reader', type: 'anyone' }
   });

   await db.collection('drive_mappings').updateOne(
     { _id: mongoId },
     {
       $set: {
         'metadata.shareId': shareId,
         'metadata.shareExpires': expirationDate,
         'metadata.shareVoided': false
       }
     }
   );

   const shareURL = `${process.env.BACKEND_URL || 'http://localhost:3000'}/s/${shareId}`;
   res.status(201).json({
     url: shareURL,
     expires: expirationDate
   });
 } catch (error) {
   console.error('Error uploading and sharing zip:', error);
   res.status(500).json({ error: error.message });
 }
};

// --- Schedule cleanup ---
const scheduleCleanup = async () => {
 try {
   if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
     console.log('MongoDB connection not ready. Delaying scheduled cleanup...');
     return 0;
   }
   return await cleanupExpiredLinks();
 } catch (error) {
   console.error('Schedule cleanup error:', error);
   return 0;
 }
};

module.exports = {
 uploadFile,
 getFiles,
 deleteFile,
 downloadFile,
 getThumbnail,
 generateShareLink,
 accessSharedFile,
 cleanupIncompleteUpload,
 uploadAndShareZip,
 scheduleCleanup
};
