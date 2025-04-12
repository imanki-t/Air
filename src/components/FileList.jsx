import React, { useState, useEffect } from 'react';  
import FileItem from './FileItem';  
  
const FileList = ({ files, refresh }) => {  
  const [filter, setFilter] = useState('all');  
  const [view, setView] = useState('list');  
  const [searchInput, setSearchInput] = useState('');  
  const [showMetadata, setShowMetadata] = useState(false); // metadata hidden by default  
  
  useEffect(() => {  
    if (window.innerWidth >= 768) setView('grid');  
  }, []);  
  
  const filtered = files.filter(  
    (f) => filter === 'all' || f.metadata?.type === filter  
  );  
  
  const visibleFiles = filtered.filter((f) =>  
    f.filename.toLowerCase().includes(searchInput.toLowerCase())  
  );  
  
  const clearSearch = () => setSearchInput('');  
  
  return (  
    <div>  
      {/* Search + View + Metadata Toggle */}  
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">  
        <div className="flex-grow">  
          <input  
            type="text"  
            placeholder="⌕"  
            value={searchInput}  
            onChange={(e) => setSearchInput(e.target.value)}  
            className="w-full sm:max-w-sm px-5 py-2 text-2xl placeholder:text-2xl rounded-lg bg-yellow-200 text-black border-2 border-yellow-400 shadow-inner placeholder:text-gray-700 font-mono"  
          />  
        </div>  
  
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
            onClick={() => setShowMetadata(!showMetadata)}  
            className={`vintage-btn px-3 py-1 text-xl ${showMetadata ? 'bg-blue-600' : 'bg-gray-500'}`}  
            title="Toggle Metadata and Buttons"  
          >  
            ❖  
          </button>  
          <button  
            onClick={() => setView('list')}  
            className={`vintage-btn px-3 py-1 text-xl ${view === 'list' ? 'bg-blue-600' : 'bg-gray-500'}`}  
            title="List View"  
          >  
            ≡  
          </button>  
          <button  
            onClick={() => setView('grid')}  
            className={`vintage-btn px-3 py-1 text-xl ${view === 'grid' ? 'bg-blue-600' : 'bg-gray-500'}`}  
            title="Grid View"  
          >  
            ⬚  
          </button>  
        </div>  
      </div>  
  
      {/* Filters */}  
      <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto text-sm text-white">  
        {['all', 'image', 'video', 'audio', 'document', 'other'].map((type) => (  
          <button  
            key={type}  
            onClick={() => setFilter(type)}  
            className={`vintage-btn ${filter === type ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}  
          >  
            {type === 'all' ? 'All' :  
              type === 'image' ? 'Images' :  
              type === 'video' ? 'Videos' :  
              type === 'audio' ? 'Audio' :  
              type === 'document' ? 'Docs' : 'Other'}  
          </button>  
        ))}  
      </div>  
  
      {/* File list */}  
      {visibleFiles.length === 0 ? (  
        <p className="text-yellow-100 text-center">No files found.</p>  
      ) : (  
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>  
          {visibleFiles.map((file) => (  
            <div key={file._id} className="w-full">  
              <FileItem file={file} refresh={refresh} showMetadata={showMetadata} />  
            </div>  
          ))}  
        </div>  
      )}  
    </div>  
  );  
};  
  
export default FileList;
