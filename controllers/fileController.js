import File from '../models/File.js';
import fs from 'fs';
import path from 'path';

export const uploadFile = async (req, res) => {
  const file = req.files.file;
  const uploadPath = `uploads/${Date.now()}-${file.name}`;
  file.mv(uploadPath);

  const savedFile = await File.create({
    name: file.name,
    path: uploadPath,
    size: file.size,
    type: file.mimetype,
    folder: req.body.folder || null,
  });

  res.json(savedFile);
};

export const getFiles = async (req, res) => {
  const files = await File.find();
  res.json(files);
};

export const deleteFile = async (req, res) => {
  const file = await File.findById(req.params.id);
  if (file) {
    fs.unlinkSync(file.path);
    await file.remove();
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'File not found' });
  }
};

export const renameFile = async (req, res) => {
  const file = await File.findByIdAndUpdate(req.params.id, { name: req.body.name }, { new: true });
  res.json(file);
};

export const downloadFile = async (req, res) => {
  const file = await File.findById(req.params.id);
  res.download(path.resolve(file.path));
};
