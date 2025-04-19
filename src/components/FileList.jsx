import React, { useState, useEffect, useRef } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Skeleton Loading Placeholder
const FileItemSkeleton = ({ darkMode }) => (
  <div className={cn(
      'w-full h-[180px] flex flex-col p-3 rounded-xl shadow-md border animate-pulse',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    )}>
    <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    <div className="mt-2 space-y-2">
      <div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
    </div>
  </div>
);

const FileList = ({ files = [], refresh, darkMode, isLoading }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // UI State
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');               // default grid
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  const [sortOption, setSortOption] = useState('default'); // 'default' === Latest First
  const [showSortOptions, setShowSortOptions] = useState(false);

  // Batch Operations State
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // Refs for clicking outside modals
  const sortOptionsRef = useRef(null);
  const deleteConfirmModalRef = useRef(null);
  const batchShareModalRef = useRef(null);
  const batchDownloadModalRef = useRef(null);

  // Reset selections when files list changes
  useEffect(() => setSelectedFiles([]), [files]);

  // Click-outside handler for dropdowns/modals
  useEffect(() => {
    const handleClickOutside = e => {
      if (sortOptionsRef.current && !sortOptionsRef.current.contains(e.target)) {
        setShowSortOptions(false);
      }
      if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(e.target)) {
        setShowDeleteConfirmModal(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter and search
  const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);
  const visible = filtered.filter(f =>
    f.filename.toLowerCase().includes(searchInput.toLowerCase())
  );

  // Sort logic
  const sortedFiles = [...visible].sort((a, b) => {
    switch (sortOption) {
      case 'name': return a.filename.localeCompare(b.filename);
      case 'size': return (a.length || 0) - (b.length || 0);
      case 'date': return new Date(b.uploadDate) - new Date(a.uploadDate);
      case 'default':
      default:    // Latest First
        return new Date(b.uploadDate) - new Date(a.uploadDate);
    }
  });

  // Selection handlers
  const toggleSelectionMode = () => {
    const on = !selectionMode;
    setSelectionMode(on);
    if (!on) setSelectedFiles([]);
  };
  const handleSelectFile = id => {
    if (!selectionMode) return;
    setSelectedFiles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };
  const toggleSelectAll = () => {
    setSelectedFiles(prev =>
      prev.length === sortedFiles.length
        ? []
        : sortedFiles.map(f => f._id)
    );
  };

  // Batch Operations (delete, download, share)
  const batchDelete = async () => {
    setBatchOperationLoading(true);
    try {
      await Promise.allSettled(selectedFiles.map(id =>
        axios.delete(`${backendUrl}/api/files/${id}`)
      ));
      refresh(); setSelectionMode(false); setShowDeleteConfirmModal(false);
    } catch {
      alert('Error deleting files.');
    } finally {
      setBatchOperationLoading(false);
    }
  };

  const batchDownload = async () => {
    setBatchOperationLoading(true);
    setShowBatchDownloadProgress(true);
    setBatchDownloadProgress(0);
    const zip = new JSZip();
    let done = 0;
    const toDownload = selectedFiles
      .map(id => files.find(f => f._id === id))
      .filter(Boolean);

    try {
      for (const file of toDownload) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
          responseType: 'blob'
        });
        zip.file(file.filename, res.data);
        done++;
        setBatchDownloadProgress(Math.round((done / toDownload.length) * 100));
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      saveAs(blob, `files_${Date.now()}.zip`);
    } catch {
      alert('Error preparing download.');
    } finally {
      setBatchOperationLoading(false);
      setTimeout(() => {
        setShowBatchDownloadProgress(false);
        setBatchDownloadProgress(0);
      }, 1500);
    }
  };

  const batchShare = async () => {
    setBatchOperationLoading(true);
    setShowBatchShareModal(true);
    setBatchShareLink('');
    try {
      const responses = await Promise.all(
        selectedFiles.map(id =>
          axios.post(`${backendUrl}/api/files/share/${id}`)
        )
      );
      const urls = responses.map(r => r.data.url).filter(Boolean);
      const link = urls.length === 1
        ? urls[0]
        : `${window.location.origin}/shared-batch/${Date.now()}`;
      setBatchShareLink(link);
    } catch {
      alert('Error creating share link.');
      setShowBatchShareModal(false);
    } finally {
      setBatchOperationLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(batchShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Failed to copy link.');
    }
  };

  return (
    <div className={cn(
      'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl',
      darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
    )}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className={cn('text-2xl font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
          Your Files
        </h2>
        <span className={cn('text-sm px-3 py-1 rounded-full inline-block',
          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700')}>
          {visible.length} item{visible.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
        </span>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
        {/* Search */}
        <div className="relative flex-grow w-full md:w-auto">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <span className={cn(darkMode ? 'text-gray-300' : 'text-gray-500', 'text-xl')}>⌕</span>
          </div>
          <input
            type="text"
            placeholder=""
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg transition-colors border',
              darkMode
                ? 'bg-gray-700 text-white border-gray-600 focus:ring-blue-500'
                : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-blue-600'
            )}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 items-center">
          <button
            onClick={toggleSelectionMode}
            className={cn('p-2 rounded-md transition-colors',
              selectionMode
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600')}
          >
            {/* Toggle Select Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {selectionMode
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
            </svg>
          </button>

          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn('p-2 rounded-md transition-colors',
              showMetadata
                ? 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600')}
          >
            {/* Metadata Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortOptions(!showSortOptions)}
              className={cn('p-2 rounded-md transition-colors',
                sortOption !== 'default'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-600')}
            >
              {/* Sort Icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
              </svg>
            </button>
            {showSortOptions && (
              <div
                ref={sortOptionsRef}
                className={cn(
                  'absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-20 border',
                  darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                )}
              >
                <div className="py-2 text-center font-semibold">
                  Sort Menu
                </div>
                {[
                  { label: 'Latest First', id: 'default' },
                  { label: 'Name',         id: 'name'    },
                  { label: 'Size',         id: 'size'    },
                  { label: 'Date',         id: 'date'    },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }}
                    className={cn(
                      'flex items-center w-full px-4 py-2 text-sm',
                      sortOption === opt.id
                        ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                        : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100')
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <div className="border-t my-2" />
                <div className="px-4 py-1 font-semibold text-sm">
                  Filter by Type
                </div>
                {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (
                  <button
                    key={type}
                    onClick={() => { setFilter(type); setShowSortOptions(false); }}
                    className={cn(
                      'flex items-center w-full px-4 py-2 text-sm',
                      darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    {type === 'all'
                      ? 'All'
                      : type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className={cn('flex items-center rounded-md overflow-hidden',
            darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 transition-colors',
                view === 'list'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors',
                view === 'grid'
                  ? 'bg-blue-600 text-white'
                  : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-700 hover:bg-gray-300')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Batch Selection Bar */}
      {selectionMode && (
        <div className={cn('mb-6 p-3 rounded-lg border',
          darkMode ? 'bg-gray-700 border-gray-600' : 'bg-blue-50 border-blue-200')}>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSelectAll}
              className={cn('flex-1 py-2 rounded-md text-sm font-medium text-center',
                darkMode
                  ? 'bg-gray-600 text-gray-200 hover:bg-gray-500'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300')}
            >
              {selectedFiles.length === sortedFiles.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={batchDownload}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={cn('flex-1 h-9 rounded-md font-medium',
                selectedFiles.length === 0 || batchOperationLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700')}
            >
              Download
            </button>
            <button
              onClick={batchShare}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={cn('flex-1 h-9 rounded-md font-medium',
                selectedFiles.length === 0 || batchOperationLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700')}
            >
              Share
            </button>
            <button
              onClick={() => setShowDeleteConfirmModal(true)}
              disabled={selectedFiles.length === 0 || batchOperationLoading}
              className={cn('flex-1 h-9 rounded-md font-medium',
                selectedFiles.length === 0 || batchOperationLoading
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700')}
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Files Display */}
      {isLoading ? (
        <div className={cn(
          'grid gap-4',
          view === 'grid'
            ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1'
        )}>
          {Array(view === 'grid' ? 8 : 4).fill().map((_, i) => (
            <FileItemSkeleton key={i} darkMode={darkMode} />
          ))}
        </div>
      ) : sortedFiles.length > 0 ? (
        <div className={cn(
          'grid gap-4',
          view === 'grid'
            ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4'
            : 'grid-cols-1'
        )}>
          {sortedFiles.map(file => (
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
        <div className={cn('text-center py-12', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          <svg className="mx-auto h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <h3 className="text-lg font-medium mb-1">No files found</h3>
          <p className="text-sm">
            {searchInput ? 'Try a different search term' : 'Upload files to get started'}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div ref={deleteConfirmModalRef} className={cn(
            'p-6 rounded-lg shadow-xl max-w-md w-full',
            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
          )}>
            <h2 className="font-semibold text-xl mb-4">
              Delete {selectedFiles.length} {selectedFiles.length === 1 ? 'item' : 'items'}
            </h2>
            <p className="text-sm mb-6">
              Are you sure you want to permanently delete these items? This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                className={cn('flex-1 px-4 py-2 rounded-md font-medium',
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
              >
                Cancel
              </button>
              <button
                onClick={batchDelete}
                disabled={batchOperationLoading}
                className={cn('flex-1 px-4 py-2 rounded-md font-medium',
                  batchOperationLoading ? 'opacity-70 cursor-wait bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white')}
              >
                {batchOperationLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showBatchDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div ref={batchDownloadModalRef} className={cn(
            'p-6 rounded-lg shadow-xl max-w-sm w-full',
            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
          )}>
            <h2 className="text-center font-semibold text-xl mb-4">Preparing Files</h2>
            <div className="my-6">
              <div className="flex justify-between mb-1 text-sm">
                <span>Compressing files...</span>
                <span>{batchDownloadProgress}%</span>
              </div>
              <div className={cn('h-2 rounded-full overflow-hidden',
                darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                <div
                  className="h-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${batchDownloadProgress}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-center">
              Creating ZIP archive with {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showBatchShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div ref={batchShareModalRef} className={cn(
            'p-6 rounded-lg shadow-xl max-w-md w-full relative',
            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
          )}>
            <button
              onClick={() => setShowBatchShareModal(false)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-200 text-gray-500"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 
                  111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 
                  11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 
                  1 0 010-1.414z" />
              </svg>
            </button>
            <h2 className="text-center font-semibold text-xl mb-2">Share Files</h2>
            <h3 className="text-center font-medium mb-4">QR Code</h3>
            <div className="flex justify-center mb-4">
              <QRCodeSVG value={batchShareLink} size={150} level="H" includeMargin />
            </div>
            <div className={cn('flex items-center p-2 rounded-md border',
              darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300')}>
              <input
                type="text"
                value={batchShareLink || 'Generating link...'}
                readOnly
                className={cn('flex-grow p-1 bg-transparent outline-none text-sm',
                  darkMode ? 'text-gray-300' : 'text-gray-700')}
              />
              <button
                onClick={copyToClipboard}
                disabled={!batchShareLink || copied}
                className={cn('ml-2 px-3 py-1.5 rounded-md text-sm font-medium',
                  copied
                    ? 'bg-green-600 text-white'
                    : !batchShareLink
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800')}
              >
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileList;
