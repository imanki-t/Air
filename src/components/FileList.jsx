// src/components/FileList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FileItem from './FileItem';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('all');

  const fetchFiles = async () => {
    const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`);
    setFiles(res.data);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);

  return (
    <div>
      <div className="mb-4 space-x-2 text-sm text-white">
        <button onClick={() => setFilter('all')} className="vintage-btn">All</button>
        <button onClick={() => setFilter('image')} className="vintage-btn">Images</button>
        <button onClick={() => setFilter('video')} className="vintage-btn">Videos</button>
        <button onClick={() => setFilter('audio')} className="vintage-btn">Audio</button>
        <button onClick={() => setFilter('document')} className="vintage-btn">Docs</button>
        <button onClick={() => setFilter('other')} className="vintage-btn">Other</button>
      </div>
      {filtered.map(file => (
        <FileItem key={file._id} file={file} refresh={fetchFiles} />
      ))}
    </div>
  );
};

export default FileList;
