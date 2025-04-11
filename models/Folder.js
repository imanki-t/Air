import mongoose from 'mongoose';

const folderSchema = new mongoose.Schema({
  name: String,
  parent: String,
  icon: String,
  color: String,
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Folder', folderSchema);
