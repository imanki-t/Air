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
  <div className={`w-full h-[180px] flex flex-col p-3 rounded-xl shadow-md border animate-pulse ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
    <div className={`h-28 mb-2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    <div className={`h-4 w-3/4 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    <div className="mt-2 space-y-2">
      <div className={`h-3 w-1/2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
    </div>
  </div>
);

const FileList = ({ files = [], refresh, darkMode, isLoading }) => {
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

  // Refs for modal click-outside handling
  const sortOptionsRef = useRef(null);
  const batchShareModalRef = useRef(null);
  const batchDownloadModalRef = useRef(null);
  const deleteConfirmModalRef = useRef(null);

  // Reset selections when files change
  useEffect(() => {
    setSelectedFiles([]);
  }, [files]);

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
  const filtered = files?.filter((f) => filter === 'all' || f.metadata?.type === filter) || [];
  const visibleFiles = filtered.filter((f) =>
    f.filename.toLowerCase().includes(searchInput.toLowerCase())
  );

  const sortedFiles = [...visibleFiles].sort((a, b) => {
    switch (sortOption) {
      case 'size': return (a.length || 0) - (b.length || 0);
      case 'date': return new Date(b.uploadDate) - new Date(a.uploadDate);
      case 'name': return a.filename.localeCompare(b.filename);
      case 'group': {
        const order = { image: 1, video: 2, document: 3, audio: 4, other: 5 };
        return (order[a.metadata?.type] || 6) - (order[b.metadata?.type] || 6);
      }
      default: return new Date(b.uploadDate) - new Date(a.uploadDate);
    }
  });

  // Selection handlers
  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    if (!newMode) setSelectedFiles([]);
  };

  const handleSelectFile = (fileId) => {
    if (!selectionMode) return;
    setSelectedFiles(prev =>
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    setSelectedFiles(selectedFiles.length === sortedFiles.length ? [] : sortedFiles.map(file => file._id));
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
  const buttonStyle = darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300';
  const activeButtonStyle = 'bg-blue-600 text-white';

  return (
    <div className={`transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl ${darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'}`}>
      {/* Header */}
      <div className="text-center sm:text-left mb-6">
        <h2 className={`text-2xl font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Files
        </h2>
        <span className={`text-sm px-3 py-1 rounded-full inline-block ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
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
            className={`w-full px-4 py-2 pr-10 rounded-lg transition-colors border ${
              darkMode
                ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500'
                : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-600'
            }`}
          />
          {searchInput && (
            <button
              onClick={() => setSearchInput('')}
              className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full ${
                darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleSelectionMode}
            className={`p-2 rounded-md transition-colors ${selectionMode ? activeButtonStyle : buttonStyle}`}
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

          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={`p-2 rounded-md transition-colors ${showMetadata ? activeButtonStyle : buttonStyle}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className={`p-2 rounded-md transition-colors ${sortOption !== 'default' ? activeButtonStyle : buttonStyle}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            
            {showSortOptions && (
              <div 
                ref={sortOptionsRef} 
                className={`absolute right-0 mt-2 w-48 rounded-lg shadow-lg z-20 ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}
              >
                {['Latest First', 'Name', 'Size', 'Date', 'File Type'].map((option, index) => {
                  const optionId = ['default', 'name', 'size', 'date', 'group'][index];
                  return (
                    <button
                      key={optionId}
                      onClick={() => {
                        setSortOption(optionId);
                        setShowSortOptions(false);
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm ${
                        sortOption === optionId
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                          : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100')
                      }`}
                    >
                      {option}
                      {sortOption === optionId && (
                        <svg className="ml-auto h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={`flex items-center rounded-md overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <button
              onClick={() => setView('list')}
              className={`p-2 transition-colors ${view === 'list' ? activeButtonStyle : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={`p-2 transition-colors ${view === 'grid' ? activeButtonStyle : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Selection Mode Bar */}
      {selectionMode && (
        <div className={`mb-6 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-blue-50 border border-blue-200'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center">
              <button
                onClick={toggleSelectAll}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
                }`}
              >
                {selectedFiles.length === sortedFiles.length ? 'Deselect All' : 'Select All'}
              </button>
              <span className={`text-sm font-medium ml-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {selectedFiles.length} selected
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={batchDownload}
                disabled={selectedFiles.length === 0 || batchOperationLoading}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  selectedFiles.length === 0 || batchOperationLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Download
              </button>
              <button
                onClick={batchShare}
                disabled={selectedFiles.length === 0 || batchOperationLoading}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  selectedFiles.length === 0 || batchOperationLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                Share
              </button>
              <button
                onClick={() => selectedFiles.length > 0 && setShowDeleteConfirmModal(true)}
                disabled={selectedFiles.length === 0 || batchOperationLoading}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  selectedFiles.length === 0 || batchOperationLoading
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File Grid/List View */}
      {isLoading ? (
        <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {Array(skeletonCount).fill().map((_, i) => (
            <FileItemSkeleton key={i} darkMode={darkMode} />
          ))}
        </div>
      ) : sortedFiles.length > 0 ? (
        <div className={`grid ${view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4`}>
          {sortedFiles.map((file) => (
            <FileItem
              key={file._id}
              file={file}
              darkMode={darkMode}
              showDetails={showMetadata}
              viewType={view}
              onSelect={() => handleSelectFile(file._id)}
              isSelected={selectedFiles.includes(file._id)}
              selectionMode={selectionMode}
              refresh={refresh}
            />
          ))}
        </div>
      ) : (
        <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium mb-1">No files found</h3>
          <p className="text-sm">{searchInput ? 'Try a different search term' : 'Upload files to get started'}</p>
        </div>
      )}

      {/* Modals */}
      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div 
            ref={deleteConfirmModalRef} 
            className={`p-6 rounded-lg shadow-xl max-w-md w-full ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'}`}
          >
            <h2 className="font-semibold text-xl mb-4">Delete {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'}</h2>
            <p className={`text-sm mb-6 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to permanently delete these items? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className={`px-4 py-2 rounded-md font-medium ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={batchDelete}
                disabled={batchOperationLoading}
                className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium ${batchOperationLoading ? 'opacity-70 cursor-wait' : ''}`}
              >
                {batchOperationLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showBatchShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div 
            ref={batchShareModalRef} 
            className={`p-6 rounded-lg shadow-xl max-w-md w-full ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'}`}
          >
            <h2 className="font-semibold text-xl mb-4">Share Files</h2>
            <div className={`flex items-center mb-5 p-2 rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'}`}>
              <input
                type="text"
                value={batchShareLink || 'Generating link...'}
                readOnly
                className={`flex-grow text-sm p-1 bg-transparent outline-none ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}
              />
              <button
                onClick={copyToClipboard}
                disabled={!batchShareLink || copied}
                className={`ml-2 px-3 py-1.5 rounded-md text-sm font-medium ${
                  copied
                    ? 'bg-green-600 text-white'
                    : !batchShareLink
                      ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800')
                }`}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {batchShareLink && (
              <div className="flex flex-col items-center">
                <div className="p-3 rounded-lg bg-white shadow-sm border">
                  <QRCodeSVG
                    value={batchShareLink}
                    size={150}
                    level="H"
                    includeMargin={true}
                    bgColor="#FFFFFF"
                    fgColor="#000000"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowBatchShareModal(false)}
                className={`px-5 py-2 rounded-md font-medium ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showBatchDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div 
            ref={batchDownloadModalRef} 
            className={`p-6 rounded-lg shadow-xl max-w-sm w-full ${darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'}`}
          >
            <h2 className="font-semibold text-xl mb-4">Preparing Files</h2>
            <div className="my-6">
              <div className="flex justify-between mb-1 text-sm">
                <span>Compressing files...</span>
                <span>{batchDownloadProgress}%</span>
              </div>
              <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-gray-700" : "bg-gray-200"}`}>
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out" style={{ width: `${batchDownloadProgress}%` }}></div>
              </div>
            </div>
            <p className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Creating ZIP archive with {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
