// models/File.js
const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  driveId: {
    type: String,
    required: true
  },
  metadata: {
    filename: String,
    type: String, // 'document', 'image', 'video', etc.
    size: Number,
    uploadDate: Date,
    contentType: String,
    resumableUploadId: String,
    resumableProgress: Number,

    // Sharing info
    shareId: String,
    shareExpires: Date,
    shareVoided: Boolean,
    isSharedZip: Boolean
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // For now, to support backward compatibility. Future uploads should make this true.
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { collection: 'drive_mappings' }); // Map to existing collection

module.exports = mongoose.model('File', FileSchema);
