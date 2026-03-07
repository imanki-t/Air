// utils/fileType.js
const getFileCategory = (mimetype) => {
  // [FIX] Guard against null/undefined mimetype — Multer can produce this when
  // a file is uploaded with no Content-Type header. Without the guard,
  // mimetype.startsWith() throws a TypeError and crashes the upload handler.
  if (!mimetype) return 'other';
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.startsWith('application/')) return 'document';
  return 'other';
};

module.exports = getFileCategory;
