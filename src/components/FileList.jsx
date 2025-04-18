import React, { useState, useEffect } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode.react'; 

// Skeleton Loading Component for FileItem
const FileItemSkeleton = ({ darkMode }) => (
  <div className={`w-full h-[180px] flex flex-col justify-between p-3 sm:p-4 rounded-xl shadow-md border ${
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  } animate-pulse`}>
    <div className={`h-28 mb-2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    <div className={`h-4 w-3/4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    <div className="mt-2 space-y-2">
      <div className={`h-3 w-1/2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
      <div className={`h-3 w-2/3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    </div>
  </div>
);

const FileList = ({ files, refresh, darkMode, isLoading }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('list');
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);
  
  // Batch operations states
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  
  // New states for modals and sharing
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (window.innerWidth >= 768) setView('grid');
  }, []);
  
  // Clear selection when files change
  useEffect(() => {
    setSelectedFiles([]);
  }, [files]);

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
  
  // Toggle selection mode
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedFiles([]);
  };
  
  // Handle file selection
  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };
  
  // Select all visible files
  const selectAll = () => {
    if (selectedFiles.length === sortedFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(sortedFiles.map(file => file._id));
    }
  };
  
  // Batch delete operation
  const batchDelete = async () => {
    if (selectedFiles.length === 0) return;
    
    setBatchOperationLoading(true);
    try {
      await Promise.all(selectedFiles.map(fileId => 
        axios.delete(`${backendUrl}/api/files/${fileId}`)
      ));
      refresh();
      setSelectedFiles([]);
      setSelectionMode(false);
      setShowDeleteConfirmModal(false);
    } catch (err) {
      console.error('Batch delete failed:', err);
      alert('Some files could not be deleted.');
    } finally {
      setBatchOperationLoading(false);
    }
  };
  
  // Batch download operation with ZIP
  const batchDownload = async () => {
    if (selectedFiles.length === 0) return;
    
    setBatchOperationLoading(true);
    setShowBatchDownloadProgress(true);
    setBatchDownloadProgress(0);
    
    try {
      const zip = new JSZip();
      let completedFiles = 0;
      
      // Download each file and add to zip
      for (const fileId of selectedFiles) {
        const selectedFile = files.find(f => f._id === fileId);
        if (!selectedFile) continue;
        
        const response = await axios({
          url: `${backendUrl}/api/files/download/${fileId}`,
          method: 'GET',
          responseType: 'blob'
        });
        
        zip.file(selectedFile.filename, response.data);
        completedFiles++;
        setBatchDownloadProgress(Math.round((completedFiles / selectedFiles.length) * 100));
      }
      
      // Generate and download the zip
      const zipBlob = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE'
      }, (metadata) => {
        setBatchDownloadProgress(Math.round(metadata.percent));
      });
      
      saveAs(zipBlob, 'files.zip');
      
    } catch (err) {
      console.error('Batch download failed:', err);
      alert('Some files could not be downloaded.');
    } finally {
      setBatchOperationLoading(false);
      setTimeout(() => {
        setShowBatchDownloadProgress(false);
      }, 1000);
    }
  };
  
  // Batch share files
  const batchShare = async () => {
    if (selectedFiles.length === 0) return;
    
    setBatchOperationLoading(true);
    try {
      // In a real implementation, this would create a shared link for multiple files
      // For now, we'll simulate it
      const res = await axios.post(`${backendUrl}/api/files/share-batch`, {
        fileIds: selectedFiles
      });
      
      setBatchShareLink(res.data.url || 'https://share.example.com/batch/' + Date.now());
      setShowBatchShareModal(true);
    } catch (err) {
      console.error('Batch share failed:', err);
    } finally {
      setBatchOperationLoading(false);
    }
  };
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(batchShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  // Generate skeleton items for loading state
  const skeletonArray = Array(8).fill(0);

  // Define consistent text color for utility buttons (metadata toggle, view toggles, sort)
  const buttonTextColor = darkMode ? 'text-white' : 'text-gray-600';

  return (
    <div
      className={`transition-colors duration-300 rounded-xl ${
        darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      } p-6 shadow-md`}
    >
      <div className="flex flex-col mb-6">
        <div className="flex justify-center mb-2">
          <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Your Files
          </h2>
        </div>
        
        {/* File count indicator - moved below title and centered */}
        <div className="flex justify-center">
          <div className={`text-sm px-3 py-1 rounded-full ${
            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
          }`}>
            {visibleFiles.length} file{visibleFiles.length !== 1 ? 's' : ''}
            {filter !== 'all' ? ` (${filter})` : ''}
          </div>
        </div>
      </div>

      {/* Search, View, Metadata Toggle, and Sort/Group Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-grow">
          <div className="relative">
            <input
              type="text"
              placeholder="⌕"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`!font-normal text-base search-placeholder w-full sm:max-w-sm px-4 py-2 pr-10 rounded-lg transition-colors ${
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
          {/* Multi-select button */}
          <button
            onClick={toggleSelectionMode}
            className={`p-2 rounded-md transition-colors ${
              selectionMode
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            } ${!selectionMode ? buttonTextColor : ''}`}
            title="Selection Mode"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          
          {/* Metadata Toggle */}
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
          
          {/* Sort / Group Toggle */}
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
          
          {/* List View */}
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
          
          {/* Grid View */}
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

      {/* Batch Operations Bar (Shown when in selection mode) - Fixed for mobile */}
      {selectionMode && (
        <div className={`flex flex-col sm:flex-row items-center justify-between mb-4 p-3 rounded-lg ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="flex items-center gap-2 w-full sm:w-auto mb-2 sm:mb-0 justify-center sm:justify-start">
            <button 
              onClick={selectAll}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {selectedFiles.length === sortedFiles.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {selectedFiles.length} selected
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center w-full sm:w-auto">
            <button
              onClick={batchDownload}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedFiles.length === 0 
                  ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
              }`}
            >
              Download Zip
            </button>
            <button
              onClick={batchShare}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedFiles.length === 0 
                  ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
              }`}
            >
              Share All
            </button>
            <button
              onClick={() => selectedFiles.length > 0 && setShowDeleteConfirmModal(true)}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                selectedFiles.length === 0 
                  ? `${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`
              }`}
            >
              Delete
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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

      {/* File list with loading skeletons */}
      {isLoading ? (
        // Skeleton loading grid/list
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {skeletonArray.map((_, index) => (
            <div key={index} className="w-full">
              <FileItemSkeleton darkMode={darkMode} />
            </div>
          ))}
        </div>
      ) : sortedFiles.length === 0 ? (
        // Empty state
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
        // Files grid/list
        <div className={`grid gap-4 ${view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'}`}>
          {sortedFiles.map((file) => (
            <div key={file._id} className="w-full">
              <FileItem 
                file={file} 
                refresh={refresh} 
                showMetadata={showMetadata} 
                darkMode={darkMode}
                isSelected={selectedFiles.includes(file._id)}
                onSelect={handleSelectFile}
                selectionMode={selectionMode}
              />
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
      
      {/* Batch Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Confirm Delete
            </h2>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}?
              <span className="block font-medium mt-1 mb-1">This action cannot be undone.</span>
            </p>
            <div className="flex w-full justify-between gap-3 mt-4">
              <button 
                onClick={() => setShowDeleteConfirmModal(false)} 
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                }`}
              >
                Cancel
              </button>
              <button 
                onClick={batchDelete} 
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
                disabled={batchOperationLoading}
              >
                {batchOperationLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Batch Share Modal */}
{showBatchShareModal && (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
    <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <button
        onClick={() => setShowBatchShareModal(false)}
        className={`absolute top-3 right-3 p-1 text-lg font-bold hover:text-blue-600 transition-colors ${
          darkMode ? 'text-gray-300' : 'text-gray-600'
        }`}
        title="Close"
      >
        ×
      </button>
      <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Share Files
      </h2>
      <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
        Use this link to share {selectedFiles.length} selected file{selectedFiles.length !== 1 ? 's' : ''}:
      </p>
      
      {/* Share link with copy button */}
      <div className={`flex items-center mb-4 p-2 rounded-md ${
        darkMode ? 'bg-gray-700' : 'bg-gray-100'
      }`}>
        <input 
          type="text" 
          value={batchShareLink} 
          readOnly 
          className={`flex-grow text-sm font-medium p-1 bg-transparent outline-none ${
            darkMode ? 'text-gray-300' : 'text-gray-700'
          }`}
        />
        <button 
          onClick={copyToClipboard} 
          className={`ml-2 p-2 rounded-md transition-colors ${
            copied 
              ? 'bg-green-600 text-white' 
              : darkMode 
                ? 'bg-gray-600 hover:bg-gray-500 text-white' 
                : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      {/* QR Code with loading state */}
      <div className="flex justify-center my-4">
        <div className={`p-2 rounded-lg ${darkMode ? 'bg-white' : 'bg-gray-100'}`}>
          {qrCodeLoading ? (
            <div className="h-[150px] w-[150px] flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <QRCode value={batchShareLink} size={150} renderAs="svg" />
          )}
        </div>
      </div>
      
      {/* Close button */}
      <div className="flex justify-center mt-4">
        <button 
          onClick={() => setShowBatchShareModal(false)} 
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
      
      {/* Batch Download Progress Modal */}
      {showBatchDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Preparing Download
            </h2>
            <div className="mb-2">
              <div className="relative pt-1">
                <div className="overflow-hidden h-2 mb-2 text-xs flex rounded-full bg-gray-300">
                  <div 
                    style={{ width: `${batchDownloadProgress}%` }} 
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600"
                  ></div>
                </div>
                <p className={`text-center text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {batchDownloadProgress}% complete
                </p>
              </div>
            </div>
            <p className={`text-sm mt-4 text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Creating ZIP file with {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}...
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
