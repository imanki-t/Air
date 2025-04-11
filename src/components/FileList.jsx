// src/components/FileList.jsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import FileItem from './FileItem';

const FileList = () => {
  const [files, setFiles] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`);
      setFiles(res.data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto text-sm text-white">
        <button onClick={() => setFilter('all')} className="vintage-btn">All</button>
        <button onClick={() => setFilter('image')} className="vintage-btn">Images</button>
        <button onClick={() => setFilter('video')} className="vintage-btn">Videos</button>
        <button onClick={() => setFilter('audio')} className="vintage-btn">Audio</button>
        <button onClick={() => setFilter('document')} className="vintage-btn">Docs</button>
        <button onClick={() => setFilter('other')} className="vintage-btn">Other</button>
      </div>
      
      {loading && (
        <div className="p-4 text-center">
          <p className="text-yellow-200">Loading files...</p>
        </div>
      )}
      
      {error && (
        <div className="p-4 text-center bg-red-800 bg-opacity-50 rounded-lg border-2 border-red-500">
          <p className="text-white">{error}</p>
          <button onClick={fetchFiles} className="vintage-btn mt-2 bg-blue-600 hover:bg-blue-700">
            Try Again
          </button>
        </div>
      )}
      
      {!loading && !error && filtered.length === 0 && (
        <div className="p-4 text-center">
          <p className="text-yellow-200">No files found. Upload something!</p>
        </div>
      )}
      
      {!loading && !error && filtered.map(file => (
        <FileItem key={file._id} file={file} refresh={fetchFiles} />
      ))}
    </div>
  );
};

export default FileList;
