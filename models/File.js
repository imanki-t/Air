import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema({
  name: String,
  path: String,
  size: Number,
  type: String,
  folder: String,
  createdAt: { type: Date, default: Date.now },
  starred: { type: Boolean, default: false },
  expiryDate: Date,
  note: String,
});

export default mongoose.model('File', fileSchema);
