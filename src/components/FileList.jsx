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
  
  // States for modals and sharing
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (window.innerWidth >= 768) setView('grid');
  }, []);
  
  // Clear selection when files change
  useEffect(() => {
    setSelectedFiles([]);
  }, [files]);

  // Generate QR code when shared modal is shown
  useEffect(() => {
    if (showBatchShareModal) {
      // Simulate QR code generation delay
      setTimeout(() => {
        document.getElementById('qr-code-container')?.classList.remove('hidden');
        document.getElementById('qr-loading')?.classList.add('hidden');
      }, 800);
    }
  }, [showBatchShareModal]);

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
              placeholder="Search files..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={`!font-normal text-base search-placeholder w-full sm:max-w-sm pl-10 pr-10 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400'
                  : 'bg-gray-100 text-gray-900 border-gray-200 placeholder-gray-500'
              } border focus:outline-none focus:ring-2 ${
                darkMode ? 'focus:ring-blue-500' : 'focus:ring-blue-600'
              }`}
            />
            {/* Search icon */}
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            
            {searchInput && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                title="Clear"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
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
          
          {/* Metadata Toggle - Only show if not in selection mode */}
          {!selectionMode && (
            <button
              onClick={() => setShowMetadata(!showMetadata)}
              className={`p-2 rounded-md transition-colors ${
                showMetadata
                  ? 'bg-blue-600 text-white'
                  : darkMode
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
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
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </button>
          )}
          
          {/* Sort / Group Toggle - Only show if not in selection mode */}
          {!selectionMode && (
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </button>
          )}
          
          {/* List View */}
          <button
            onClick={() => setView('list')}
            className={`p-2 rounded-md transition-colors ${
              view === 'list'
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {/* Grid View */}
          <button
            onClick={() => setView('grid')}
            className={`p-2 rounded-md transition-colors ${
              view === 'grid'
                ? 'bg-blue-600 text-white'
                : darkMode
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
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

      {/* Batch Operations Bar (Shown when in selection mode) */}
      {selectionMode && (
        <div className={`sticky top-4 z-10 flex items-center justify-between mb-4 p-3 rounded-lg shadow-md ${
          darkMode ? 'bg-gray-700' : 'bg-gray-100'
        }`}>
          <div className="flex items-center">
            <button 
              onClick={selectAll}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode 
                  ? selectedFiles.length === sortedFiles.length 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-600 hover:bg-gray-500 text-white' 
                  : selectedFiles.length === sortedFiles.length
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              {selectedFiles.length === sortedFiles.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className={`ml-3 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {selectedFiles.length} selected
            </span>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={batchDownload}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                selectedFiles.length === 0 
                  ? `opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
            <button
              onClick={batchShare}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                selectedFiles.length === 0 
                  ? `opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
            <button
              onClick={() => selectedFiles.length > 0 && setShowDeleteConfirmModal(true)}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center ${
                selectedFiles.length === 0 
                  ? `opacity-50 cursor-not-allowed ${darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500'}`
                  : `${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
            <button
              onClick={toggleSelectionMode}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
              }`}
              title="Exit Selection Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              ? 'Audio'
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
              className={`absolute top-3 right-3 p-2 rounded-full hover:bg-opacity-80 ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600'
              }`}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
              Sort Options
            </h2>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => chooseSortOption('default')}
                className={`px-4 py-2 rounded-lg flex items-center justify-between transition-colors ${
                  sortOption === 'default'
                    
