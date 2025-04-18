import React, { useState, useEffect, useRef } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeSVG } from 'qrcode.react';

// Utility function for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Skeleton Loading Component
const FileItemSkeleton = ({ darkMode }) => (
  <div className={cn(
    'w-full h-[180px] flex flex-col justify-between p-3 sm:p-4 rounded-xl shadow-md border animate-pulse',
    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
  )}>
    <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    <div className="mt-2 space-y-2">
      <div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
      <div className={cn('h-3 w-2/3 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    </div>
  </div>
);

const FileList = ({ files, refresh, darkMode, isLoading }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [sortOption, setSortOption] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Batch Operations
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCodeLoading, setQrCodeLoading] = useState(true);

  // Refs for modal click-outside handling
  const sortOptionsRef = useRef(null);
  const batchShareModalRef = useRef(null);
  const batchDownloadModalRef = useRef(null);
  const deleteConfirmModalRef = useRef(null);

  // Reset selections when files change
  useEffect(() => {
    setSelectedFiles([]);
  }, [files]);

  // Handle QR code loading state
  useEffect(() => {
    if (showBatchShareModal && batchShareLink) {
      setQrCodeLoading(true);
      const timer = setTimeout(() => {
        setQrCodeLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
    setQrCodeLoading(true);
  }, [showBatchShareModal, batchShareLink]);

  // Handle clicks outside modals
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sortOptionsRef.current && !sortOptionsRef.current.contains(event.target)) {
        setShowSortOptions(false);
      }
      if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(event.target)) {
        setShowDeleteConfirmModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and sort files
  const filtered = files.filter((f) => filter === 'all' || f.metadata?.type === filter);
  const visibleFiles = filtered.filter((f) =>
    f.filename.toLowerCase().includes(searchInput.toLowerCase())
  );

  const sortedFiles = [...visibleFiles].sort((a, b) => {
    switch (sortOption) {
      case 'size':
        return (a.length || 0) - (b.length || 0);
      case 'date':
        return new Date(b.uploadDate) - new Date(a.uploadDate);
      case 'name':
        return a.filename.localeCompare(b.filename);
      case 'group': {
        const order = { image: 1, video: 2, document: 3, audio: 4, other: 5 };
        const getOrder = (file) => order[file.metadata?.type] || 6;
        return getOrder(a) - getOrder(b);
      }
      default:
        return new Date(b.uploadDate) - new Date(a.uploadDate);
    }
  });

  // Search handlers
  const clearSearch = () => setSearchInput('');

  // Selection handlers
  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    if (!newMode) setSelectedFiles([]);
  };

  const handleSelectFile = (fileId) => {
    if (!selectionMode) return;
    setSelectedFiles(prev =>
      prev.includes(fileId)
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedFiles.length === sortedFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(sortedFiles.map(file => file._id));
    }
  };

  // Batch operations
  const batchDelete = async () => {
    if (selectedFiles.length === 0) return;
    setBatchOperationLoading(true);
    try {
      await Promise.allSettled(selectedFiles.map(fileId =>
        axios.delete(`${backendUrl}/api/files/${fileId}`)
      ));
      refresh();
      setSelectedFiles([]);
      setSelectionMode(false);
      setShowDeleteConfirmModal(false);
    } catch (err) {
      console.error('Batch delete failed:', err);
      alert('An error occurred during deletion. Please try again.');
    } finally {
      setBatchOperationLoading(false);
    }
  };

  const batchDownload = async () => {
    if (selectedFiles.length === 0) return;
    setBatchOperationLoading(true);
    setShowBatchDownloadProgress(true);
    setBatchDownloadProgress(0);

    const zip = new JSZip();
    let completedFiles = 0;
    const filesToDownload = selectedFiles.map(fileId => 
      files.find(f => f._id === fileId)).filter(Boolean);

    try {
      for (const selectedFile of filesToDownload) {
        try {
          const response = await axios({
            url: `${backendUrl}/api/files/download/${selectedFile._id}`,
            method: 'GET',
            responseType: 'blob'
          });
          zip.file(selectedFile.filename, response.data);
          completedFiles++;
          setBatchDownloadProgress(Math.round((completedFiles / filesToDownload.length) * 100));
        } catch (fileError) {
          console.error(`Failed to download file ${selectedFile.filename}:`, fileError);
        }
      }

      if (completedFiles === 0) {
        throw new Error("No files could be downloaded.");
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE'
      });

      saveAs(zipBlob, `files_${Date.now()}.zip`);

    } catch (err) {
      console.error('Batch download failed:', err);
      alert('Download could not be completed. Please try again.');
    } finally {
      setBatchOperationLoading(false);
      setTimeout(() => {
        setShowBatchDownloadProgress(false);
        setBatchDownloadProgress(0);
      }, 1500);
    }
  };

  const batchShare = async () => {
    if (selectedFiles.length === 0) return;
    setBatchOperationLoading(true);
    setQrCodeLoading(true);
    setShowBatchShareModal(true);
    setBatchShareLink('');

    try {
      const res = await axios.post(`${backendUrl}/api/files/share-batch`, {
        fileIds: selectedFiles
      });
      
      const shareUrl = res.data.url;
      if (!shareUrl) {
        throw new Error("Share URL not received from backend.");
      }
      setBatchShareLink(shareUrl);
    } catch (err) {
      console.error('Batch share failed:', err);
      alert('Failed to create share link.');
      setShowBatchShareModal(false);
    } finally {
      setBatchOperationLoading(false);
    }
  };

  const copyToClipboard = async () => {
    if (!batchShareLink) return;
    try {
      await navigator.clipboard.writeText(batchShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
      alert('Could not copy link to clipboard.');
    }
  };

  // UI style helpers
  const skeletonCount = view === 'grid' ? 8 : 4;
  const buttonTextColor = darkMode ? 'text-gray-300' : 'text-gray-600';
  const buttonBgHover = darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300';
  const buttonBgActive = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const buttonBgIdle = darkMode ? 'bg-gray-700' : 'bg-gray-200';

  return (
    <div
      className={cn(
        'transition-colors duration-300 rounded-lg p-4 sm:p-6 shadow-lg w-full mx-auto max-w-7xl',
        darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
      )}
    >
      {/* Header */}
      <div className="text-center sm:text-left mb-6">
        <h2 className={cn('text-2xl sm:text-3xl font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
          Your Files
        </h2>
        <span className={cn(
          'text-sm px-3 py-1 rounded-full inline-block',
          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
        )}>
          {visibleFiles.length} item{visibleFiles.length !== 1 ? 's' : ''}
          {filter !== 'all' ? ` (${filter})` : ''}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        {/* Search Input */}
        <div className="relative flex-grow w-full md:w-auto">
          <input
            type="text"
            placeholder="Search files..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={cn(
              'w-full md:max-w-xs px-4 py-2 pr-10 rounded-lg transition-colors border focus:outline-none focus:ring-2',
              darkMode
                ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500'
                : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-600'
            )}
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              className={cn(
                'absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full transition-colors',
                darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
              )}
              title="Clear search"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end">
          {/* Selection Mode Toggle */}
          <button
            onClick={toggleSelectionMode}
            className={cn(
              'p-2 rounded-md transition-colors duration-200',
              selectionMode ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
            )}
            title={selectionMode ? "Exit Selection Mode" : "Select Files"}
          >
            {selectionMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {/* Metadata Toggle */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn(
              'p-2 rounded-md transition-colors duration-200',
              showMetadata ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
            )}
            title={showMetadata ? "Hide Details" : "Show Details"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className={cn(
                'p-2 rounded-md transition-colors duration-200',
                sortOption !== 'default' ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
              )}
              title="Sort Files"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            
            {showSortOptions && (
              <div 
                ref={sortOptionsRef} 
                className={cn(
                  "absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 origin-top-right animate-fade-in-down",
                  darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
                )}
              >
                <div className="py-1 rounded-lg overflow-hidden">
                  {[
                    { id: 'default', label: 'Latest First' },
                    { id: 'name', label: 'Name' },
                    { id: 'size', label: 'Size' },
                    { id: 'date', label: 'Date' },
                    { id: 'group', label: 'File Type' }
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setSortOption(option.id);
                        setShowSortOptions(false);
                      }}
                      className={cn(
                        "flex items-center w-full px-4 py-2 text-sm transition-colors duration-150",
                        sortOption === option.id
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                          : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100')
                      )}
                    >
                      {option.label}
                      {sortOption === option.id && (
                        <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className={cn(
            'flex items-center rounded-md overflow-hidden',
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          )}>
            <button
              onClick={() => setView('list')}
              className={cn(
                'p-2 transition-colors duration-200',
                view === 'list' 
                  ? buttonBgActive 
                  : cn(darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')
              )}
              title="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn(
                'p-2 transition-colors duration-200',
                view === 'grid' 
                  ? buttonBgActive 
                  : cn(darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')
              )}
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Selection Mode Bar - Improved for Mobile */}
{selectionMode && (
  <div className={cn(
    'sticky top-0 z-10 mb-6 p-3 rounded-lg transition-all duration-300 ease-in-out',
    darkMode ? 'bg-gray-700/90 backdrop-blur-sm' : 'bg-blue-50/90 backdrop-blur-sm border border-blue-200'
  )}>
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      {/* Selection Controls - Simplified for Mobile */}
      <div className="flex items-center justify-between">
        <button
          onClick={toggleSelectAll}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center gap-1.5',
            darkMode
              ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
          )}
        >
          {selectedFiles.length === sortedFiles.length ? (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deselect All
            </>
          ) : (
            <>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
              Select All
            </>
          )}
        </button>
        
        <span className={cn('text-sm font-medium ml-2', darkMode ? 'text-gray-300' : 'text-gray-600')}>
          {selectedFiles.length} selected
        </span>
      </div>

      {/* Action Buttons - Better Spacing for Mobile */}
      <div className="grid grid-cols-3 gap-2 mt-3 sm:mt-0">
        <button
          onClick={batchDownload}
          disabled={selectedFiles.length === 0 || batchOperationLoading}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-1.5',
            selectedFiles.length === 0 || batchOperationLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="hidden sm:inline">Download</span>
        </button>
        
        <button
          onClick={batchShare}
          disabled={selectedFiles.length === 0 || batchOperationLoading}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-1.5',
            selectedFiles.length === 0 || batchOperationLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          <span className="hidden sm:inline">Share</span>
        </button>
        
        <button
          onClick={() => selectedFiles.length > 0 && setShowDeleteConfirmModal(true)}
          disabled={selectedFiles.length === 0 || batchOperationLoading}
          className={cn(
            'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center justify-center gap-1.5',
            selectedFiles.length === 0 || batchOperationLoading
              ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700'
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="hidden sm:inline">Delete</span>
        </button>
      </div>
    </div>
  </div>
)}

{/* Improved Delete Confirmation Modal */}
{showDeleteConfirmModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div 
      ref={deleteConfirmModalRef} 
      className={cn(
        'p-6 rounded-lg shadow-xl max-w-md w-full relative',
        darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3',
            'bg-red-100 text-red-600'
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="font-semibold text-xl">Delete {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'}</h2>
        </div>
        <button
          onClick={() => setShowDeleteConfirmModal(false)}
          className={cn(
            "p-1 rounded-full transition-colors",
            darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
          )}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <p className={cn('text-sm mb-6', darkMode ? 'text-gray-300' : 'text-gray-600')}>
        Are you sure you want to permanently delete {selectedFiles.length === 1 ? 'this item' : 'these items'}? <strong className="font-medium block mt-1">This action cannot be undone.</strong>
      </p>
      
      <div className="flex justify-end gap-3">
        <button
          onClick={() => setShowDeleteConfirmModal(false)}
          className={cn(
            'px-4 py-2 rounded-md font-medium transition-colors duration-150 border',
            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
          )}
        >
          Cancel
        </button>
        <button
          onClick={batchDelete}
          disabled={batchOperationLoading}
          className={cn(
            'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors duration-150 flex items-center justify-center min-w-24',
            batchOperationLoading ? 'opacity-70 cursor-wait' : ''
          )}
        >
          {batchOperationLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Deleting...
            </>
          ) : "Delete"
          }
        </button>
      </div>
    </div>
  </div>
)}

{/* Improved Share Modal with QR Code Fix */}
{showBatchShareModal && (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div 
      ref={batchShareModalRef} 
      className={cn(
        'p-6 rounded-lg shadow-xl max-w-md w-full relative',
        darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3',
            'bg-green-100 text-green-600'
          )}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
            </svg>
          </div>
          <h2 className="font-semibold text-xl">Share Files</h2>
        </div>
        <button
          onClick={() => setShowBatchShareModal(false)}
          className={cn(
            "p-1 rounded-full transition-colors",
            darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
          )}
          title="Close"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Share link input */}
      <p className={cn('text-sm mb-3', darkMode ? 'text-gray-300' : 'text-gray-600')}>
        Anyone with this link can access {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''}.
      </p>
      
      <div className={cn(
        'flex items-center mb-5 p-2 rounded-md border',
        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
      )}>
        <input
          type="text"
          value={batchShareLink || 'Generating link...'}
          readOnly
          className={cn(
            'flex-grow text-sm p-1 bg-transparent outline-none truncate',
            darkMode ? 'text-gray-300' : 'text-gray-700'
          )}
        />
        <button
          onClick={copyToClipboard}
          disabled={!batchShareLink || copied}
          className={cn(
            'ml-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex-shrink-0 flex items-center',
            copied
              ? 'bg-green-600 text-white'
              : !batchShareLink
                ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                : (darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800')
          )}
        >
          {copied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Copied
            </>
          ) : 'Copy'}
        </button>
      </div>

      {/* QR Code Section - Fixed */}
      <div className="flex flex-col items-center">
        <div className={cn(
          "p-3 rounded-lg bg-white", // Always white for QR code readability
          "shadow-sm border", // Consistent border
          darkMode ? "border-gray-600" : "border-gray-200"
        )}>
          {/* QR Code Display with proper error handling */}
          {qrCodeLoading || !batchShareLink ? (
            <div className="h-32 w-32 sm:h-40 sm:w-40 flex items-center justify-center text-gray-500">
              <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : (
            <QRCodeSVG
              value={batchShareLink}
              size={200} // Larger size for better scanning
              level="H" // Higher error correction
              includeMargin={true}
              bgColor="#FFFFFF"
              fgColor="#000000"
            />
          )}
        </div>
        
        <p className={cn('text-xs mt-3', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          Scan with a mobile device to access shared files
        </p>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => setShowBatchShareModal(false)}
          className={cn(
            'px-5 py-2 rounded-md font-medium transition-colors duration-150',
            darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          )}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

{/* Improved Download Progress Modal */}
{showBatchDownloadProgress && (
  <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div 
      ref={batchDownloadModalRef} 
      className={cn(
        'p-6 rounded-lg shadow-xl max-w-sm w-full',
        darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
      )}
    >
      <div className="flex items-center mb-4">
        <div className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center mr-3',
          'bg-blue-100 text-blue-600'
        )}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="font-semibold text-xl">Preparing Files</h2>
      </div>
      
      <div className="my-6">
        <div className="flex justify-between mb-1 text-sm">
          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>Compressing files...</span>
          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>{batchDownloadProgress}%</span>
        </div>
        <div className={cn("h-2 rounded-full overflow-hidden", darkMode ? "bg-gray-700" : "bg-gray-200")}>
          <div 
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${batchDownloadProgress}%` }}
          ></div>
        </div>
      </div>
      
      <p className={cn('text-sm text-center', darkMode ? 'text-gray-400' : 'text-gray-500')}>
        Creating ZIP archive with {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
      </p>
    </div>
  </div>
)}
