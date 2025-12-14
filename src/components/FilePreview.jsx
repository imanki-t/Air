// src/components/FilePreview.jsx
import React, { useState } from 'react';

const FilePreview = ({ file, onClose }) => {
  const { isDark } = useTheme();
  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const previewUrl = `${API_URL}/api/files/preview/${file._id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className={`max-w-4xl w-full mx-4 rounded-xl overflow-hidden ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`}>
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className={isDark ? 'text-white' : 'text-gray-900'}>
            {file.filename}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-auto">
          {file.metadata?.type === 'image' && (
            <img src={previewUrl} alt={file.filename} className="max-w-full" />
          )}
          {file.metadata?.type === 'video' && (
            <video controls className="max-w-full">
              <source src={previewUrl} />
            </video>
          )}
          {file.metadata?.type === 'audio' && (
            <audio controls className="w-full">
              <source src={previewUrl} />
            </audio>
          )}
          {file.metadata?.type === 'document' && (
            <iframe src={previewUrl} className="w-full h-[60vh]" />
          )}
        </div>
      </div>
    </div>
  );
};

export default FilePreview;
