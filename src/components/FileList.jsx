// src/components/FileList.jsx
// Original FileList with added: folders prop, Add to Folder batch operation, folder picker dropdown
import React, { useState, useEffect, useRef } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { io } from 'socket.io-client';
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

// SVG Arrow Icons
const ArrowLeftIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

// ─── NEW: Folder SVG icon (small, for folder picker) ───────────────────────
const FolderSmallIcon = ({ color = '#6366f1' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill={color}>
    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
  </svg>
);

// Outline folder icon for batch button (matches stroke style of other action icons)
const FolderOutlineIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
  </svg>
);

// ─── NEW: BatchFolderPicker — inline panel replacing action buttons ──────────
const BatchFolderPicker = ({ folders, darkMode, onSelect, loading }) => {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? folders.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders;

  return (
    <div
      className={cn('w-full folder-picker-anim')}
      role="listbox"
      aria-label="Select a folder"
    >
      {/* Search bar — full width, white/bright outline */}
      <div className="relative w-full">
        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-white opacity-70" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <input
          type="text"
          placeholder=""
          value={search}
          onChange={e => setSearch(e.target.value)}
          autoFocus
          className={cn(
            'w-full pl-8 pr-3 py-1.5 rounded-md text-xs outline-none border-2',
            darkMode
              ? 'bg-gray-700 text-white border-white focus:border-white placeholder-gray-400'
              : 'bg-white text-gray-900 border-white focus:border-white placeholder-gray-400 shadow-sm'
          )}
        />
      </div>

      {/* Folder list — horizontal scrollable row */}
      <div className="mt-2 flex flex-row gap-1.5 overflow-x-auto pb-1 sort-scrollbar">
        {loading ? (
          <span className={cn('text-xs py-1 px-2', darkMode ? 'text-gray-500' : 'text-gray-400')}>Loading...</span>
        ) : filtered.length === 0 ? (
          <span className={cn('text-xs py-1 px-2', darkMode ? 'text-gray-500' : 'text-gray-400')}>
            {search ? 'No match' : 'No folders yet'}
          </span>
        ) : (
          filtered.map(folder => (
            <button
              key={folder._id}
              onClick={() => onSelect(folder)}
              className={cn(
                'flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-colors whitespace-nowrap',
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-indigo-700 hover:border-indigo-500 hover:text-white'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-indigo-50 hover:border-indigo-400 hover:text-indigo-700'
              )}
              role="option"
            >
              <FolderSmallIcon color={folder.color} />
              <span className="truncate max-w-[100px]">{folder.name}</span>
              <span className="text-xs opacity-60">{folder.fileIds?.length || 0}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main FileList Component
// NEW PROPS ADDED: folders = [], onFoldersChanged
// All original code preserved below unchanged except additions marked with NEW
// ─────────────────────────────────────────────────────────────────────────────
const FileList = ({ files = [], refresh, darkMode, isLoading, folders = [], onFoldersChanged, hideFolderFiles = false }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // --- UI State ---
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid');
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false);
  // Updated sortOption to reflect new granular options
  const [sortOption, setSortOption] = useState('default');
  const [showSortOptions, setShowSortOptions] = useState(false);

  // --- Pagination State ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  // Default to 20 for PC
  const [isPaginationEnabled, setIsPaginationEnabled] = useState(true);
  // Pagination toggle, default ON
  const [isEditingPage, setIsEditingPage] = useState(false);
  // New state for page editing
  const [editPageValue, setEditPageValue] = useState('');
  // New state for edited page value

  // --- Batch Operations State ---
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
  const [copied, setCopied] = useState(false);

  // ─── NEW: Folder picker state ─────────────────────────────────────────────
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folderMoveLoading, setFolderMoveLoading] = useState(false);
  const folderPickerRef = useRef(null);
  // ─────────────────────────────────────────────────────────────────────────

  // --- Refs ---
  const sortOptionsRef = useRef(null);
  const deleteConfirmModalRef = useRef(null);
  const batchShareModalRef = useRef(null);
  const sortButtonRef = useRef(null);
  const batchDownloadModalRef = useRef(null);
  const pageInputRef = useRef(null);
  // Ref for the page input field

  // --- Screen Size Detection for Responsive Items Per Page and Mobile View State ---
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_BACKEND_URL); // uses your VITE_BACKEND_URL

    socket.on("connect", () => {
      console.log("Connected to WebSocket");
    });

    socket.on("refreshFileList", () => {
      console.log("Received refreshFileList event");
      refresh(); // Refresh files when event received
    });

    // ─── NEW: listen for folder updates ────────────────────────────────────
    socket.on("refreshFolderList", () => {
      if (onFoldersChanged) onFoldersChanged();
    });
    // ───────────────────────────────────────────────────────────────────────

    return () => {
      socket.disconnect();
    };
  }, [refresh]); // Added refresh to dependency array

  useEffect(() => {
    const handleResize = () => {
      const mobileBreakpoint = 768; // Adjust breakpoint as needed
      if (window.innerWidth < mobileBreakpoint) {
        setItemsPerPage(10);
        setIsMobileView(true);
      } else if (window.innerWidth >= mobileBreakpoint && window.innerWidth < 1024) {
        setItemsPerPage(15);
        setIsMobileView(false); // Not mobile, but not full PC
      } else {
        setItemsPerPage(20);
        setIsMobileView(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial value on mount

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Reset selections when files list changes or selection mode exits
  useEffect(() => {
    if (!selectionMode) {
      setSelectedFiles([]);
    }
  }, [selectionMode]);

  useEffect(() => {
    setSelectedFiles([]); // Clear selection if the file list itself changes
  }, [files]);

  // Reset to first page when filter or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sortOption, searchInput, itemsPerPage]); // Added itemsPerPage here

  // Click-outside handler for dropdowns/modals
  useEffect(() => {
    const handleClickOutside = e => {
      if (
        sortOptionsRef.current &&
        !sortOptionsRef.current.contains(e.target) &&
        !sortButtonRef.current?.contains(e.target)
      ) {
        setShowSortOptions(false);
      }
      if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(e.target)) {
        setShowDeleteConfirmModal(false);
      }
      if (batchShareModalRef.current && !batchShareModalRef.current.contains(e.target) && !batchOperationLoading) {
        setShowBatchShareModal(false);
      }
      // Close page input if clicking outside
      if (isEditingPage && pageInputRef.current && !pageInputRef.current.contains(e.target)) {
        setIsEditingPage(false);
      }
      // ─── NEW: close folder picker on outside click ──────────────────────
      if (showFolderPicker && folderPickerRef.current && !folderPickerRef.current.contains(e.target)) {
        setShowFolderPicker(false);
      }
      // ────────────────────────────────────────────────────────────────────
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [batchOperationLoading, isEditingPage, showFolderPicker]); // Add showFolderPicker

  // Focus the page input when editing starts
  useEffect(() => {
    if (isEditingPage && pageInputRef.current) {
      pageInputRef.current.focus();
      pageInputRef.current.select();
    }
  }, [isEditingPage]);

  // --- Filtering Logic ---
  // Optionally exclude files that already belong to a folder
  const folderFileIds = hideFolderFiles
    ? new Set(folders.flatMap(f => f.fileIds?.map(String) || []))
    : new Set();

  const visible = files.filter(file => {
    if (hideFolderFiles && folderFileIds.has(String(file._id))) return false;
    const type = file.metadata?.type || 'other';
    const matchesFilter = filter === 'all' || type === filter;
    const matchesSearch = !searchInput.trim() ||
      file.filename?.toLowerCase().includes(searchInput.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // --- Sorting Logic ---
  const sortedFiles = [...visible].sort((a, b) => {
    if (sortOption === 'date') {
      return new Date(a.uploadDate) - new Date(b.uploadDate);
    }
    if (sortOption === 'name-asc') {
      return (a.filename || '').localeCompare(b.filename || '');
    }
    if (sortOption === 'name-desc') {
      return (b.filename || '').localeCompare(a.filename || '');
    }
    if (sortOption === 'size-desc') {
      return (b.length || 0) - (a.length || 0);
    }
    if (sortOption === 'size-asc') {
      return (a.length || 0) - (b.length || 0);
    }
    return new Date(b.uploadDate) - new Date(a.uploadDate); // default: newest first
  });

  // --- Pagination Logic ---
  const totalPages = isPaginationEnabled ? Math.ceil(sortedFiles.length / itemsPerPage) : 1;

  const displayFiles = isPaginationEnabled
    ? sortedFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    : sortedFiles;

  // Keep alias for backwards compat with parts of code that use paginatedFiles
  const paginatedFiles = displayFiles;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  // --- Page Editing Handlers ---
  const handlePageClick = () => {
    if (isPaginationEnabled && totalPages > 0) {
      setIsEditingPage(true);
      setEditPageValue(currentPage.toString());
    }
  };

  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const page = parseInt(editPageValue, 10);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        setCurrentPage(page);
        setIsEditingPage(false);
      } else {
        setIsEditingPage(false);
      }
    } else if (e.key === 'Escape') {
      setIsEditingPage(false);
    }
  };

  const handlePageInputBlur = () => {
    const page = parseInt(editPageValue, 10);
    if (isNaN(page) || page < 1 || page > totalPages || editPageValue === '') {
      setEditPageValue(currentPage.toString());
    } else {
      setCurrentPage(page);
    }
    setIsEditingPage(false);
  };

  // --- Selection Handlers ---
  const toggleSelectionMode = () => {
    setSelectionMode(prev => !prev);
  };

  const handleSelectFile = id => {
    if (!selectionMode) return;
    setSelectedFiles(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    const filesToConsider = isPaginationEnabled ? paginatedFiles : displayFiles;
    const allRelevantSelected = filesToConsider.every(file => selectedFiles.includes(file._id));
    if (allRelevantSelected && selectedFiles.length >= filesToConsider.length && filesToConsider.length > 0) {
      setSelectedFiles(prevSelected => prevSelected.filter(id => !filesToConsider.some(file => file._id === id)));
    } else {
      setSelectedFiles(prevSelected => {
        const newSelections = filesToConsider.map(file => file._id);
        const combinedSelections = new Set([...prevSelected, ...newSelections]);
        return Array.from(combinedSelections);
      });
    }
  };

  // --- Batch Operations ---
  const batchDelete = async () => {
    setBatchOperationLoading(true);
    try {
      await Promise.allSettled(selectedFiles.map(id =>
        axios.delete(`${backendUrl}/api/files/${id}`)
      ));
      refresh();
      setShowDeleteConfirmModal(false);
      setSelectionMode(false);
    } catch (err) {
      console.error('Error deleting files:', err);
    } finally {
      setBatchOperationLoading(false);
    }
  };

  // Helper functions for random strings
  function getRandomChar(type) {
    const alphabets = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const chars = type === 'alphabet' ? alphabets : numbers;
    return chars.charAt(Math.floor(Math.random() * chars.length));
  }

  function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function getWeekNumber(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  }

  function generateMixedRandom(numAlphabets, numNumbers) {
    let chars = [];
    for (let i = 0; i < numAlphabets; i++) chars.push(getRandomChar('alphabet'));
    for (let i = 0; i < numNumbers; i++) chars.push(getRandomChar('number'));
    return shuffleArray(chars).join('');
  }

  const batchDownload = async () => {
    if (selectedFiles.length === 0) return;
    setBatchOperationLoading(true);
    setShowBatchDownloadProgress(true);
    setBatchDownloadProgress(0);
    try {
      const zip = new JSZip();
      let done = 0;
      const filesToZip = selectedFiles
        .map(id => files.find(f => f._id === id))
        .filter(Boolean);

      for (const file of filesToZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
          responseType: 'blob'
        });
        zip.file(file.filename, res.data);
        done++;
        setBatchDownloadProgress(Math.round((done / filesToZip.length) * 100));
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = now.getFullYear();
      const formattedDate = `${day}${month}${year}`;
      const weekNumber = getWeekNumber(now);
      const mixedRandomString = generateMixedRandom(3, 3);
      const filename = `AIR${formattedDate}${weekNumber}${mixedRandomString}.zip`;

      saveAs(blob, filename);
      setSelectionMode(false);
      setSelectedFiles([]);
    } catch (err) {
      console.error('Error preparing batch download:', err);
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
    setCopied(false);
    try {
      const zip = new JSZip();
      let done = 0;
      const filesToZip = selectedFiles
        .map(id => files.find(f => f._id === id))
        .filter(Boolean);

      if (filesToZip.length === 0) {
        throw new Error("No valid files selected for zipping.");
      }

      for (const file of filesToZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
          responseType: 'blob'
        });
        zip.file(file.filename, res.data);
        done++;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });

      const generateRandomString = (length) => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
          result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
      };

      const timestamp = Date.now();
      const randomCombo = generateRandomString(6);
      const zipFilename = `AIRSTREAM${timestamp}${randomCombo}.zip`;
      const formData = new FormData();
      formData.append('zipFile', zipBlob, zipFilename);

      const uploadResponse = await axios.post(`${backendUrl}/api/files/share-zip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const shareUrl = uploadResponse.data?.url;
      if (!shareUrl) {
        throw new Error("Failed to generate the link.");
      }
      setBatchShareLink(shareUrl);
    } catch (err) {
      console.error('Error creating or sharing ZIP file:', err.response ? err.response.data : err.stack);
      setShowBatchShareModal(false);
    } finally {
      setBatchOperationLoading(false);
    }
  };

  // ─── NEW: Add selected files to a folder ─────────────────────────────────
  const handleAddToFolder = async (folder) => {
    if (selectedFiles.length === 0 || !folder) return;
    setFolderMoveLoading(true);
    setShowFolderPicker(false);
    try {
      const fileIdStrings = selectedFiles.map(id => String(id));
      await axios.post(`${backendUrl}/api/folders/${folder._id}/files`, {
        fileIds: fileIdStrings,
      });
      if (onFoldersChanged) await onFoldersChanged();
    } catch (err) {
      console.error('Error adding files to folder:', err);
    } finally {
      setFolderMoveLoading(false);
    }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const copyToClipboard = async () => {
    if (!batchShareLink) return;
    try {
      await navigator.clipboard.writeText(batchShareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy batch link:', err);
    }
  };

  // --- Render ---
  return (
    <div className={cn(
      'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
      darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
    )}>
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className={cn('text-2xl font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
          Your Files
        </h2>
        <span className={cn('text-sm px-3 py-1 rounded-full inline-block transition-all duration-200',
          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
        )}>
          {visible.length} item{visible.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
        </span>
      </div>

      {/* Controls Row */}
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 items-center justify-between flex-wrap">
        {/* Search Input */}
        <div className="relative flex-grow w-full md:w-auto md:flex-grow-[2]">
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', darkMode ? 'text-gray-400' : 'text-gray-500')} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            type="text"
            placeholder=""
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className={cn(
              'w-full pl-10 pr-4 py-2 rounded-lg transition-colors duration-200 border text-sm',
              darkMode
                ? 'bg-gray-800 text-white border-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500'
                : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-gray-400'
            )}
            aria-label="Search files"
          />
        </div>

        {/* Action Buttons Group */}
        <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end flex-grow md:flex-grow-0">
          {/* Pagination Toggle */}
          <button
            onClick={() => setIsPaginationEnabled(prev => !prev)}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
              isPaginationEnabled
                ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            )}
            aria-label={isPaginationEnabled ? "Disable pagination" : "Enable pagination"}
            aria-pressed={isPaginationEnabled}
            title={isPaginationEnabled ? "Disable Pagination" : "Enable Pagination"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {isPaginationEnabled ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              )}
            </svg>
          </button>

          {/* Toggle Selection (Batch Mode) */}
          <button
            onClick={toggleSelectionMode}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
              selectionMode
                ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            )}
            aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"}
            aria-pressed={selectionMode}
            title={selectionMode ? "Exit selection mode" : "Select multiple files"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              {selectionMode
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" />
              }
            </svg>
          </button>

          {/* Toggle Metadata */}
          <button
            onClick={() => setShowMetadata(!showMetadata)}
            className={cn(
              'w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
              showMetadata
                ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            )}
            aria-label={showMetadata ? "Hide file details" : "Show file details"}
            aria-pressed={showMetadata}
            title={showMetadata ? "Hide Details" : "Show Details"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Sort / Filter Button */}
          <div className="relative">
            <button
              ref={sortButtonRef}
              onClick={() => setShowSortOptions(prev => !prev)}
              className={cn(
                'w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
                showSortOptions
                  ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                  : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              )}
              aria-label="Sort and filter options"
              aria-expanded={showSortOptions}
              aria-haspopup="true"
              title="Sort & Filter"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" />
              </svg>
            </button>

            {showSortOptions && (
              <div
                ref={sortOptionsRef}
                className={cn(
                  'absolute right-0 mt-1 w-48 rounded-xl shadow-xl border z-30 overflow-y-auto max-h-52 sort-scrollbar',
                  darkMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-200',
                  'divide-y'
                )}
                role="menu"
              >
                {/* Sort Section */}
                <div>
                  <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                  {[
                    { label: 'Default', id: 'default' },
                    { label: 'Oldest', id: 'date' },
                    { label: 'Name (A-Z)', id: 'name-asc' },
                    { label: 'Name (Z-A)', id: 'name-desc' },
                    { label: 'Larger Files', id: 'size-desc' },
                    { label: 'Smaller Files', id: 'size-asc' },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }}
                      className={cn(
                        'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                        sortOption === opt.id
                          ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                          : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                      )}
                      role="menuitemradio"
                      aria-checked={sortOption === opt.id}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Filter Section */}
                <div>
                  <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                  {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (
                    <button
                      key={type}
                      onClick={() => { setFilter(type); setShowSortOptions(false); }}
                      className={cn(
                        'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                        filter === type
                          ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                          : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                      )}
                      role="menuitemradio"
                      aria-checked={filter === type}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* View Toggle */}
          <div className={cn('flex items-center rounded-md overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
            <button
              onClick={() => setView('list')}
              className={cn('p-2 transition-colors duration-200',
                view === 'list' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
              )}
              aria-label="List view"
              aria-pressed={view === 'list'}
              title="List View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>
            <button
              onClick={() => setView('grid')}
              className={cn('p-2 transition-colors duration-200',
                view === 'grid' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
              )}
              aria-label="Grid view"
              aria-pressed={view === 'grid'}
              title="Grid View"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Controls / batch-bar separator — only shown when NOT in selection mode (batch bar has its own divider) */}
      {!selectionMode && (
        <div className={cn('mb-5 border-t', darkMode ? 'border-gray-700' : 'border-gray-200')} />
      )}


      {selectionMode && (
        <div className={cn(
          'mb-4 p-3 rounded-lg border transition-all duration-300 ease-in-out',
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
        )}>
          {showFolderPicker ? (
            /* ─── Folder picker takes the whole bar ─── */
            <div className="w-full" ref={folderPickerRef}>
              <BatchFolderPicker
                folders={folders}
                darkMode={darkMode}
                onSelect={handleAddToFolder}
                loading={false}
              />
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 flex-wrap">
              {/* Select/Deselect All Button */}
              <div className="w-full md:w-auto">
                <button
                  onClick={toggleSelectAll}
                  className={cn(
                    'w-full md:w-auto py-2 px-4 rounded-md text-sm font-medium text-center transition-colors duration-200 border',
                    (isPaginationEnabled ? paginatedFiles.every(file => selectedFiles.includes(file._id)) && paginatedFiles.length > 0 : displayFiles.every(file => selectedFiles.includes(file._id)) && displayFiles.length > 0)
                      ? `border-red-400 ${darkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-white hover:bg-red-50'}`
                      : `border-blue-400 ${darkMode ? 'text-blue-300 bg-gray-700 hover:bg-gray-600' : 'text-blue-600 bg-white hover:bg-blue-50'}`
                  )}
                >
                  {(isPaginationEnabled ? paginatedFiles.every(file => selectedFiles.includes(file._id)) && paginatedFiles.length > 0 : displayFiles.every(file => selectedFiles.includes(file._id)) && displayFiles.length > 0) ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Selected Count Indicator */}
              <div className={cn('text-sm flex-grow text-center md:text-left order-last md:order-none w-full md:w-auto pt-2 md:pt-0', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                {selectedFiles.length > 0 && isPaginationEnabled
                  ? `${selectedFiles.length} of ${visible.length} total items selected till this page.`
                  : `${selectedFiles.length} of ${isPaginationEnabled ? paginatedFiles.length : displayFiles.length} selected.`
                }
              </div>

              {/* Batch Action Buttons */}
              <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-2">
                {/* Download */}
                <button
                  onClick={batchDownload}
                  disabled={selectedFiles.length === 0 || batchOperationLoading}
                  className={cn(
                    'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                    selectedFiles.length === 0 || batchOperationLoading
                      ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                  )}
                  title={selectedFiles.length > 0 ? `Download ${selectedFiles.length} items` : "Select files to download"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  <span className="hidden sm:inline">Download</span> ({selectedFiles.length})
                </button>

                {/* Share */}
                <button
                  onClick={batchShare}
                  disabled={selectedFiles.length === 0 || batchOperationLoading}
                  className={cn(
                    'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                    selectedFiles.length === 0 || batchOperationLoading
                      ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white')
                  )}
                  title={selectedFiles.length > 0 ? `Share ${selectedFiles.length} items` : "Select files to share"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                  <span className="hidden sm:inline">Share</span> ({selectedFiles.length})
                </button>

                {/* Add to Folder */}
                <button
                  onClick={() => setShowFolderPicker(true)}
                  disabled={selectedFiles.length === 0 || batchOperationLoading || folderMoveLoading}
                  className={cn(
                    'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                    selectedFiles.length === 0 || batchOperationLoading || folderMoveLoading
                      ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-indigo-700 hover:bg-indigo-600 text-white' : 'bg-indigo-600 hover:bg-indigo-700 text-white')
                  )}
                  title={selectedFiles.length > 0 ? `Add ${selectedFiles.length} items to a folder` : "Select files to add to folder"}
                >
                  {folderMoveLoading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <FolderOutlineIcon />
                  )}
                  <span className="hidden sm:inline">{folderMoveLoading ? 'Adding...' : 'Add to Folder'}</span>
                  <span className="sm:hidden">({selectedFiles.length})</span>
                </button>

                {/* Delete */}
                <button
                  onClick={() => setShowDeleteConfirmModal(true)}
                  disabled={selectedFiles.length === 0 || batchOperationLoading}
                  className={cn(
                    'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                    selectedFiles.length === 0 || batchOperationLoading
                      ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white')
                  )}
                  title={selectedFiles.length > 0 ? `Delete ${selectedFiles.length} items` : "Select files to delete"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  <span className="hidden sm:inline">Delete</span> ({selectedFiles.length})
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Files Display Area with min-height */}
      <div className="min-h-[250px]">
        {isLoading ? (
          <div className={cn(
            'grid gap-4',
            view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
          )}>
            {Array(view === 'grid' ? 10 : 5).fill().map((_, i) => (
              <FileItemSkeleton key={`skel-${i}`} darkMode={darkMode} />
            ))}
          </div>
        ) : paginatedFiles.length > 0 ? (
          <div className={cn(
            'grid gap-4',
            view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
          )}>
            {paginatedFiles.map(file => (
              <FileItem
                key={file._id}
                file={file}
                darkMode={darkMode}
                showDetails={showMetadata}
                viewType={view}
                onSelect={handleSelectFile}
                isSelected={selectedFiles.includes(file._id)}
                selectionMode={selectionMode}
                refresh={refresh}
              />
            ))}
          </div>
        ) : (
          // No Files Found Message
          <div className={cn(
            'text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]',
            darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50'
          )}>
            <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
            <h3 className="text-lg font-medium mb-1 text-gray-500">No files found</h3>
            <p className="text-sm text-gray-400">
              {searchInput ? 'Try adjusting your search or filter.' : 'Upload some files!'}
            </p>
          </div>
        )}
      </div>

      {/* Pagination Controls at the bottom */}
      {isPaginationEnabled && visible.length > 0 && (
        <div className={cn(
          'flex items-center justify-center gap-2 sm:gap-3 mt-8',
          darkMode ? 'text-gray-300' : 'text-gray-700'
        )}>
          {/* Previous Button */}
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className={cn(
              'p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
              'focus:outline-none focus:ring-2',
              currentPage === 1
                ? (darkMode ? 'bg-gray-750 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300 hover:border-gray-400')
            )}
            aria-label="Previous Page"
            title="Previous Page"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>

          {/* Page Indicator/Input */}
          <span className={cn("text-sm text-center mx-1")}>
            <span className="hidden md:inline">Page </span>
            {isEditingPage ? (
              <input
                ref={pageInputRef}
                type="number"
                min="1"
                max={totalPages}
                value={editPageValue}
                onChange={(e) => setEditPageValue(e.target.value)}
                onKeyDown={handlePageInputKeyDown}
                onBlur={handlePageInputBlur}
                className={cn(
                  'w-16 text-center p-1.5 rounded-md text-sm border',
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-600 focus:border-blue-600'
                )}
                aria-label="Current page number input"
              />
            ) : (
              <span
                className={cn(
                  "font-medium px-2 py-1 rounded-md cursor-pointer hover:underline",
                  darkMode ? 'text-gray-200 hover:text-white' : 'text-gray-800 hover:text-blue-600'
                )}
                onClick={handlePageClick}
                title="Click to jump to page"
              >
                {currentPage}
              </span>
            )}
            <span className={cn(darkMode ? 'text-gray-400' : 'text-gray-600')}> / {totalPages}</span>
          </span>

          {/* Next Button */}
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages || totalPages === 0}
            className={cn(
              'p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
              'focus:outline-none focus:ring-2',
              currentPage === totalPages || totalPages === 0
                ? (darkMode ? 'bg-gray-750 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300 hover:border-gray-400')
            )}
            aria-label="Next Page"
            title="Next Page"
          >
            <ArrowRightIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Message when pagination is enabled but no files */}
      {isPaginationEnabled && visible.length === 0 && !isLoading && (
        <div className={cn("text-center mt-6 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
          No files match your criteria.
        </div>
      )}

      {/* --- Modals --- */}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div
            ref={deleteConfirmModalRef}
            className={cn(
              'p-6 rounded-lg shadow-xl max-w-md w-full border animate-modalIn',
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
            )}
            role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"
          >
            <h2 id="delete-modal-title" className="font-semibold text-lg mb-4">
              Confirm Deletion
            </h2>
            <p id="delete-modal-description" className="text-sm mb-6">
              Are you sure you want to permanently delete {selectedFiles.length} selected {selectedFiles.length === 1 ? 'item' : 'items'}? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirmModal(false)}
                disabled={batchOperationLoading}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm',
                  darkMode
                    ? 'bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400'
                )}
              >
                Cancel
              </button>
              <button
                onClick={batchDelete}
                disabled={batchOperationLoading}
                className={cn(
                  'flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm text-white flex items-center justify-center gap-2',
                  batchOperationLoading
                    ? 'bg-red-500 cursor-wait'
                    : 'bg-red-600 hover:bg-red-700'
                )}
              >
                {batchOperationLoading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                )}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download Progress Modal */}
      {showBatchDownloadProgress && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div
            ref={batchDownloadModalRef}
            className={cn(
              'p-6 rounded-lg shadow-xl max-w-sm w-full border animate-modalIn',
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
            )}
            role="alertdialog" aria-modal="true" aria-labelledby="download-progress-title"
          >
            <h2 id="download-progress-title" className="text-center font-semibold text-lg mb-5">Preparing Download</h2>
            <div className="my-6 px-2">
              <div className="flex justify-between mb-1 text-sm font-medium">
                <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Compressing files...</span>
                <span className={darkMode ? 'text-gray-100' : 'text-gray-800'}>{batchDownloadProgress}%</span>
              </div>
              <div className={cn('h-2.5 rounded-full overflow-hidden w-full', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                <div className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full" style={{ width: `${batchDownloadProgress}%` }} />
              </div>
            </div>
            <p className={cn("text-sm text-center mt-5", darkMode ? "text-gray-400" : "text-gray-500")}>
              Creating ZIP archive ({selectedFiles.length} {selectedFiles.length !== 1 ? 'items' : 'item'}).
            </p>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showBatchShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
          <div
            ref={batchShareModalRef}
            className={cn(
              'p-6 rounded-lg shadow-xl max-w-md w-full relative border animate-modalIn',
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
            )}
            role="dialog" aria-modal="true" aria-labelledby="share-modal-title"
          >
            {/* Close Button */}
            <button
              onClick={() => {
                if (!batchOperationLoading) {
                  setShowBatchShareModal(false);
                  refresh();
                  setSelectedFiles([]);
                }
              }}
              className={cn(
                "absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50",
                batchOperationLoading ? "cursor-not-allowed" : (darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500")
              )}
              disabled={batchOperationLoading}
              aria-label="Close share dialog"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
            </button>

            <h2 id="share-modal-title" className="text-center font-semibold text-lg mb-5">Share</h2>

            {/* QR Code Section */}
            <div className="flex justify-center mb-5">
              <div className={cn("p-2 rounded-lg border", darkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-gray-50")}>
                {batchOperationLoading && !batchShareLink ? (
                  <div className="w-[150px] h-[150px] flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                ) : batchShareLink ? (
                  <QRCodeSVG
                    value={batchShareLink}
                    size={150}
                    bgColor="transparent"
                    fgColor={darkMode ? '#FFFFFF' : '#000000'}
                    level="M"
                    includeMargin={false}
                  />
                ) : (
                  <div className="w-[150px] h-[150px] flex items-center justify-center text-center text-xs text-red-500 p-2">Error generating QR code. Link might be invalid or too long.</div>
                )}
              </div>
            </div>

            {/* Link and Copy Button */}
            <div className="flex flex-col gap-2.5">
              <input
                type="text"
                value={batchOperationLoading ? 'Generating link...' : batchShareLink || 'Error - No link generated'}
                readOnly
                className={cn(
                  'w-full p-2 rounded-md border text-xs font-mono',
                  'overflow-x-auto',
                  darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                )}
                aria-label="Shareable link"
                onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyToClipboard}
                disabled={!batchShareLink || copied || batchOperationLoading}
                className={cn(
                  'w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2',
                  copied
                    ? 'bg-green-600 text-white cursor-default'
                    : !batchShareLink || batchOperationLoading
                      ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                      : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                )}
              >
                {copied ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
                ) : (
                  'Copy Link'
                )}
              </button>
            </div>

            {batchShareLink && (
              <div className="mt-4 text-center">
                <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                  Anyone with the link can access the selected file{selectedFiles.length > 1 ? 's' : ''}.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modalIn { animation: modalIn 0.25s ease-out; }
        @keyframes folderPickerIn { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .folder-picker-anim { animation: folderPickerIn 0.15s ease-out; }
        .sort-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .sort-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .sort-scrollbar::-webkit-scrollbar-thumb { background-color: #6b7280; border-radius: 9999px; }
        .sort-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #9ca3af; }
        .sort-scrollbar { scrollbar-width: thin; scrollbar-color: #6b7280 transparent; }
      `}</style>
    </div>
  );
};

export default FileList;
