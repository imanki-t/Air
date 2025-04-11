import React, { useState } from 'react';
import FileItem from './FileItem';

const FileList = ({ files, refresh }) => {
  const [filter, setFilter] = useState('all');

  const filtered = files.filter(
    (f) => filter === 'all' || f.metadata?.type === filter
  );

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

      {filtered.length === 0 && (
        <div className="p-4 text-center">
          <p className="text-yellow-200">No files found. Upload something!</p>
        </div>
      )}

      {filtered.map((file) => (
        <FileItem key={file._id} file={file} refresh={refresh} />
      ))}
    </div>
  );
};

export default FileList;
