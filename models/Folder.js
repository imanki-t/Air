// models/Folder.js
const mongoose = require('mongoose');

const folderSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Folder name is required'],
    trim: true,
    maxlength: [100, 'Folder name cannot exceed 100 characters']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null,
    index: true
  },
  path: {
    type: String,
    default: '/'
  },
  color: {
    type: String,
    default: '#3b82f6',
    match: [/^#[0-9A-Fa-f]{6}$/, 'Please provide a valid hex color']
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  fileCount: {
    type: Number,
    default: 0
  },
  totalSize: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for user and parent
folderSchema.index({ user: 1, parent: 1 });

// Prevent duplicate folder names within the same parent
folderSchema.index({ user: 1, parent: 1, name: 1 }, { unique: true });

// Update path before saving
folderSchema.pre('save', async function(next) {
  if (this.isModified('parent') || this.isNew) {
    if (this.parent) {
      const parentFolder = await this.constructor.findById(this.parent);
      if (parentFolder) {
        this.path = `${parentFolder.path}${parentFolder.name}/`;
      }
    } else {
      this.path = '/';
    }
  }
  next();
});

// Static method to get folder tree
folderSchema.statics.getFolderTree = async function(userId, parentId = null) {
  const folders = await this.find({ user: userId, parent: parentId })
    .sort({ name: 1 })
    .lean();
  
  for (let folder of folders) {
    folder.children = await this.getFolderTree(userId, folder._id);
  }
  
  return folders;
};

// Instance method to update file statistics
folderSchema.methods.updateStats = async function() {
  const DriveMapping = mongoose.model('DriveMapping');
  
  const stats = await DriveMapping.aggregate([
    { $match: { userId: this.user, folderId: this._id } },
    {
      $group: {
        _id: null,
        count: { $sum: 1 },
        totalSize: { $sum: '$metadata.size' }
      }
    }
  ]);
  
  if (stats.length > 0) {
    this.fileCount = stats[0].count;
    this.totalSize = stats[0].totalSize;
  } else {
    this.fileCount = 0;
    this.totalSize = 0;
  }
  
  await this.save();
};

const Folder = mongoose.model('Folder', folderSchema);

module.exports = Folder;
