import React, { useState, useEffect } from 'react';
import FileItem from './FileItem';

const FileList = ({ files, refresh, darkMode }) => {
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list');
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);

  useEffect(() => {
    if (window.innerWidth >= 768) setView('grid');
  }, []);

  const filtered = files.filter((f) => filter === 'all' || f.metadata?.type === filter);

  const visibleFiles = filtered.filter((f) =>
    f.filename.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Apply sort based on selected option
  const sortedFiles = [...visibleFiles].sort((a, b) => {
    switch (sortOption) {
      case 'size':
        return (a.length || 0) - (b.length || 0);
      case 'date':
        return new Date(a.uploadDate) - new Date(b.uploadDate);
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'group': {
        // Grouping order: image, video, document, audio, others
        const order = { image: 1, video: 2, document: 3, audio: 4 };
        const getOrder = (file) => order[file.metadata?.type] || 5;
        return getOrder(a) - getOrder(b);
      }
      default:
        return 0;
    }
  });

  const clearSearch = () => setSearchInput('');

  // Handler for choosing a sort option
  const chooseSortOption = (option) => {
    setSortOption(option);
    setShowSortOptions(false);
  };

  // Define consistent text color for utility buttons (metadata toggle, view toggles, sort)
  const buttonTextColor = darkMode ? 'text-white' : 'text-gray-600';

  return (
    <div
      className={`transition-colors duration-300 rounded-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } p-6 shadow-md`}
    >
      <h2 className={`text-2xl font-semibold mb-6 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Your Files
      </h2>

      {/* Search, View, Metadata Toggle, and Sort/Group Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <div className="relative">
            <input
              type="text"
              placeholder="⌕"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`font-light search-placeholder w-full sm:max-w-sm px-4 py-2 pr-10 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
                  : 'bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-500'
              } border focus:outline-none focus:ring-2 ${
                darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
              }`}
            />
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 items-center">
          {/* Metadata Toggle - Updated with consistent text color */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-md transition-colors ${
              showMetadata
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700'
                : 'bg-gray-200'
            } ${!showMetadata ? buttonTextColor : ''}`}
            title="Toggle Metadata and Buttons"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </button>
          {/* Sort / Group Toggle - Updated with consistent text color */}
          <button
            onClick={() => setShowSortOptions(true)}
            className={`p-2 rounded-md transition-colors ${
              sortOption !== 'default'
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            } ${sortOption === 'default' ? buttonTextColor : ''}`}
            title="Sort Options"
          >
            <span className="block h-5 w-5 text-center leading-none font-bold">⧉</span>
          </button>
          {/* List View - Updated with consistent text color */}
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-md transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700'
                : 'bg-gray-200'
            } ${view !== 'list' ? buttonTextColor : ''}`}
            title="List View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          {/* Grid View - Updated with consistent text color */}
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md transition-colors ${
              view === 'grid'
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700'
                : 'bg-gray-200'
            } ${view !== 'grid' ? buttonTextColor : ''}`}
            title="Grid View"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-2 overflow-x-auto">
        {['all', 'image', 'video', 'audio', 'document', 'other'].map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {type === 'all'
              ? 'All'
              : type === 'image'
              ? 'Images'
              : type === 'video'
              ? 'Videos'
              : type === 'audio'
              ? 'Audios'
              : type === 'document'
              ? 'Docs'
              : 'Other'}
          </button>
        ))}
      </div>

      {/* File list */}
      {sortedFiles.length === 0 ? (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-12 w-12 mx-auto mb-4 opacity-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <p className="text-lg font-medium">No files found</p>
          <p className="mt-1">Try uploading a file or changing your search criteria</p>
        </div>
      ) : (
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {sortedFiles.map((file) => (
            <div key={file._id} className="w-full">
              <FileItem file={file} refresh={refresh} showMetadata={showMetadata} darkMode={darkMode} />
            </div>
          ))}
        </div>
      )}

      {/* Sort/Group Options Modal */}
      {showSortOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div
            className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
          >
            <button
              onClick={() => setShowSortOptions(false)}
              className={`absolute top-3 right-3 p-1 text-lg font-bold hover:text-blue-600 transition-colors ${
                darkMode ? 'text-gray-300' : 'text-gray-600'
              }`}
              title="Close"
            >
              ×
            </button>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Sort Options
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => chooseSortOption('default')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  sortOption === 'default'
                    ? darkMode
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-600'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Default
              </button>
              <button
                onClick={() => chooseSortOption('size')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  sortOption === 'size'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Sort by Size
              </button>
              <button
                onClick={() => chooseSortOption('date')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  sortOption === 'date'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Sort by Date
              </button>
              <button
                onClick={() => chooseSortOption('name')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  sortOption === 'name'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Sort by Name
              </button>
              <button
                onClick={() => chooseSortOption('group')}
                className={`px-3 py-1 rounded-md transition-colors ${
                  sortOption === 'group'
                    ? 'bg-blue-600 text-white'
                    : darkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                }`}
              >
                Sort by Type
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
