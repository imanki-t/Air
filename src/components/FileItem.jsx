import React from 'react';
import axios from 'axios';

const FileItem = ({ file, refresh }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const download = () => {
    window.open(`${backendUrl}/api/files/download/${file._id}`, '_blank');
  };

  const deleteFile = async () => {
  const confirmDelete = confirm(`Are you sure you want to delete "${file.filename}"?`);
  if (!confirmDelete) return;

  await axios.delete(`${backendUrl}/api/files/${file._id}`);
  refresh();
};

  const share = async () => {
    const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
    alert(`Shareable Link (1 hr):\n${res.data.url}`);
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const renderPreview = () => {
    const url = `${backendUrl}/api/files/download/${file._id}`;
    const type = file.metadata?.type;

    if (type === 'image') {
      return <img src={url} alt={file.filename} className="max-h-48 w-auto rounded-lg mb-2" />;
    }

    if (type === 'video') {
      return <video src={url} controls className="w-full rounded-lg mb-2" />;
    }

    if (type === 'audio') {
      return <audio src={url} controls className="w-full mb-2" />;
    }

    return (
      <div className="mb-2 p-2 text-sm text-center bg-yellow-200 rounded">
        {file.filename.split('.').pop().toUpperCase()} file
      </div>
    );
  };

  return (
    <div className="bg-yellow-100 p-4 rounded-xl shadow-lg border-4 border-dashed border-purple-600 mb-3">
      {renderPreview()}
      <h3 className="text-black font-bold truncate">{file.filename}</h3>
      <p className="text-xs text-gray-600">Type: {file.metadata?.type}</p>
      <p className="text-xs text-gray-600">Size: {formatSize(file.length)}</p>
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
