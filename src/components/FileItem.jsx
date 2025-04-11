// src/components/FileItem.jsx
import React from 'react';
import axios from 'axios';

const FileItem = ({ file, refresh }) => {
  const download = () => {
    window.open(`${import.meta.env.VITE_BACKEND_URL}/api/files/download/${file._id}`, '_blank');
  };

  const deleteFile = async () => {
    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/${file._id}`);
    refresh();
  };

  const share = async () => {
    const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/share/${file._id}`);
    alert(`Shareable Link (1 hr):\n${res.data.url}`);
  };

  return (
    <div className="bg-yellow-100 p-4 rounded-xl shadow-lg border-4 border-dashed border-purple-600 mb-3">
      <h3 className="text-black font-bold">{file.filename}</h3>
      <p className="text-xs text-gray-600">Type: {file.metadata?.type}</p>
      <p className="text-xs text-gray-500">Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
      <div className="mt-2 space-x-2">
        <button onClick={download} className="vintage-btn bg-blue-600 hover:bg-blue-700">Download</button>
        <button onClick={share} className="vintage-btn bg-yellow-500 hover:bg-yellow-600">Share</button>
        <button onClick={deleteFile} className="vintage-btn bg-red-600 hover:bg-red-700">Delete</button>
      </div>
    </div>
  );
};

export default FileItem;
