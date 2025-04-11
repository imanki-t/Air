import React, { useState } from 'react';
import FileItem from './FileItem';

const FileList = ({ files, refresh }) => {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list'); // 'list' or 'grid'
  const [searchInput, setSearchInput] = useState('');

  const filtered = files.filter(
    (f) => filter === 'all' || f.metadata?.type === filter
  );

  const visibleFiles = filtered.filter((f) =>
    f.filename.toLowerCase().includes(searchInput.toLowerCase())
  );

  const clearSearch = () => {
    setSearchInput('');
  };

  return (
    <div>
      {/* Search + View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Search bar */}
        <div className="flex-grow">
          <input
            type="text"
            placeholder="⌕"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full sm:max-w-sm px-4 py-2 text-2xl placeholder:text-2xl rounded-lg bg-yellow-200 text-black border-2 border-yellow-400 shadow-inner placeholder:text-gray-700 font-mono"
          />
        </div>

        {/* Clear & View buttons */}
        <div className="flex gap-2 items-center">
          {searchInput && (
            <button
              onClick={clearSearch}
              className="vintage-btn bg-red-600 hover:bg-red-700 px-2 py-1 text-xl"
              title="Clear"
            >
              ×
            </button>
          )}
          <button
            onClick={() => setView('list')}
            className={`vintage-btn px-3 py-1 text-xl ${
              view === 'list' ? 'bg-blue-600' : 'bg-gray-500'
            }`}
            title="List View"
          >
            ≡
          </button>
          <button
            onClick={() => setView('grid')}
            className={`vintage-btn px-3 py-1 text-xl ${
              view === 'grid' ? 'bg-blue-600' : 'bg-gray-500'
            }`}
            title="Grid View"
          >
            ⬚
          </button>
        </div>
      </div>

      {/* File type filters */}
      <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto text-sm text-white">
        <button onClick={() => setFilter('all')} className="vintage-btn">All</button>
        <button onClick={() => setFilter('image')} className="vintage-btn">Images</button>
        <button onClick={() => setFilter('video')} className="vintage-btn">Videos</button>
        <button onClick={() => setFilter('audio')} className="vintage-btn">Audio</button>
        <button onClick={() => setFilter('document')} className="vintage-btn">Docs</button>
        <button onClick={() => setFilter('other')} className="vintage-btn">Other</button>
      </div>

      {/* File list */}
      {visibleFiles.length === 0 ? (
        <p className="text-yellow-200 text-center">No files found.</p>
      ) : (
        <div
          className={`grid gap-4 ${
            view === 'grid'
              ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'
              : 'grid-cols-1'
          }`}
        >
          {visibleFiles.map((file) => (
            <div key={file._id} className="w-full">
              <FileItem file={file} refresh={refresh} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileList;
