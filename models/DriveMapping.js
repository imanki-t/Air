// models/DriveMapping.js
const mongoose = require('mongoose');

const driveMappingSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    auto: true
  },
  driveId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  metadata: {
    filename: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['image', 'video', 'audio', 'document', 'other'],
      default: 'other'
    },
    contentType: String,
    size: Number,
    uploadDate: Date,
    shareId: String,
    shareExpires: Date,
    shareVoided: Boolean,
    isSharedZip: Boolean,
    uploadedAt: Date,
    resumableUploadId: String,
    resumableProgress: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound indexes for efficient queries
driveMappingSchema.index({ userId: 1, createdAt: -1 });
driveMappingSchema.index({ userId: 1, folderId: 1 });
driveMappingSchema.index({ 'metadata.shareId': 1 });

const DriveMapping = mongoose.model('DriveMapping', driveMappingSchema, 'drive_mappings');

module.exports = DriveMapping;
