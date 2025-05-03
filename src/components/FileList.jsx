// components/FileList.jsx
// This component displays the list of files and handles filtering, sorting,
// view toggling, selection, and batch operations.
// Includes JWT authentication headers for API calls for multi-user support.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Helper function to get the JWT token from localStorage
const getToken = () => localStorage.getItem('token');


// Skeleton Loading Placeholder
const FileItemSkeleton = ({ darkMode, viewType = 'grid' }) => (
  <div className={cn(
      'w-full flex flex-col p-3 rounded-xl shadow-md border animate-pulse',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
      viewType === 'list' ? 'h-[100px] flex-row items-center space-x-4' : 'h-[180px]' // Adjust height/layout for list view
    )}>
      {viewType === 'grid' ? (
          <>
            <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            <div className="mt-2 space-y-2">
              <div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            </div>
          </>
      ) : ( // List view layout
          <>
            <div className={cn('w-16 h-16 mb-2 rounded-md flex-shrink-0', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            <div className="flex-grow space-y-2">
                 <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                 <div className={cn('h-3 w-1/3 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            </div>
          </>
      )}

  </div>
);


const FileList = ({ files = [], refresh, darkMode, isLoading }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // --- UI State ---
  const [filter, setFilter] = useState('all');
  const [view, setView] = useState('grid'); // 'grid' or 'list'
  const [searchInput, setSearchInput] = useState('');
  const [showMetadata, setShowMetadata] = useState(false); // Toggle for extra file details
  const [sortOption, setSortOption] = useState('default'); // 'default', 'name', 'size', 'date'
  const [showSortOptions, setShowSortOptions] = useState(false); // For dropdown visibility

  // --- Selection State (for batch operations) ---
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]); // Array of selected file IDs

  // --- Batch Operation State ---
  const [batchOperationLoading, setBatchOperationLoading] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0); // 0-100 percentage
  const [copied, setCopied] = useState(false); // For copy link button state

   // --- Refs ---
   const sortDropdownRef = useRef(null);
   const batchShareModalRef = useRef(null);
   const batchDownloadModalRef = useRef(null); // Ref for the download progress modal
   const fileListContainerRef = useRef(null); // Ref for the main file list container


  // --- Effects ---

   // Close sort options dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if the clicked element is inside the dropdown or the button that opens it
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target)) {
                setShowSortOptions(false);
            }
        };
        // Add event listener to the whole document
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            // Clean up the event listener
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [sortDropdownRef]); // Depend on sortDropdownRef


     // Effect to reset selection mode when filter, search, or sort changes
    useEffect(() => {
        // Only reset if selection mode is active and there are selected files
        if (selectionMode && selectedFiles.length > 0) {
             setSelectionMode(false);
             setSelectedFiles([]);
        }
         // Optional: scroll to top when filtering/sorting
         if (fileListContainerRef.current) {
             fileListContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
         }
    }, [filter, searchInput, sortOption]); // Depend on filter, searchInput, sortOption

     // Effect to deselect all files when selection mode is turned OFF
    useEffect(() => {
        if (!selectionMode) {
            setSelectedFiles([]);
        }
    }, [selectionMode]); // Depend on selectionMode state


   // Effect for share link copied state
   useEffect(() => {
       if (copied) {
           const timer = setTimeout(() => setCopied(false), 2000);
           return () => clearTimeout(timer);
       }
   }, [copied]);


  // --- Filtering, Searching, Sorting Logic ---

  const filteredFiles = files.filter(file => {
    const matchesFilter = filter === 'all' || (file.metadata?.type || 'other') === filter;
    const matchesSearch = searchInput === '' || (file.metadata?.filename || '').toLowerCase().includes(searchInput.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const sortedFiles = [...filteredFiles].sort((a, b) => {
    const aMeta = a.metadata || {};
    const bMeta = b.metadata || {};

    switch (sortOption) {
      case 'name':
        // Case-insensitive and locale-aware comparison
        return (aMeta.filename || '').toLowerCase().localeCompare((bMeta.filename || '').toLowerCase());
      case 'size':
        return (a.length || 0) - (b.length || 0); // 'length' in GridFS file object is file size
      case 'date':
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime(); // Latest first (timestamp comparison)
      case 'default': // Latest first by uploadDate
      default:
        return new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime();
    }
  });


   // --- Selection Handlers ---

   const handleFileSelect = (fileId) => {
       setSelectedFiles(prevSelected => {
           if (prevSelected.includes(fileId)) {
               // Deselect
               return prevSelected.filter(id => id !== fileId);
           } else {
               // Select
               return [...prevSelected, fileId];
           }
       });
   };

   const toggleSelectionMode = () => {
       setSelectionMode(prev => !prev);
       // Selection state is automatically cleared by the useEffect that depends on selectionMode
   };

   const selectAllFiles = () => {
       // Select all files that are currently visible after filtering/sorting
       setSelectedFiles(sortedFiles.map(file => file._id));
   };

   const deselectAllFiles = () => {
       setSelectedFiles([]);
   };


  // --- Batch Operations ---

  const batchDelete = async () => {
      if (selectedFiles.length === 0) return; // Should not happen if button is disabled
      setShowDeleteConfirmModal(false); // Close modal
      setBatchOperationLoading(true);

      const token = getToken(); // Get token for auth
       if (!token) {
          alert('Batch delete failed: Not authenticated. Please log in.');
          setBatchOperationLoading(false);
           // Potentially trigger a global logout in App.jsx here
          return;
       }

      try {
          // Use Promise.allSettled to continue even if some deletions fail
          const results = await Promise.allSettled(selectedFiles.map(id =>
            axios.delete(`${backendUrl}/api/files/${id}`, {
                 headers: { Authorization: `Bearer ${token}` } // *** Add Auth header ***
            })
          ));

           // Check results for failures (optional, but good for detailed feedback)
           const failedDeletions = results.filter(result => result.status === 'rejected');
           if (failedDeletions.length > 0) {
               console.error("Some batch deletions failed:", failedDeletions);
               // You might want to show a partial success/failure message or retry option
           }

          setSelectedFiles([]); // Clear selection after attempt
          setSelectionMode(false); // Exit selection mode
          if (refresh) refresh(); // Refresh the file list
      } catch (err) {
           console.error('Batch delete error:', err);
            // Handle unauthorized error specifically
           if (err.response && err.response.status === 401) {
               alert('Session expired or unauthorized. Please log in again.');
               // Potentially trigger a global logout in App.jsx here
           } else if (err.response && err.response.data && err.response.data.error) {
               alert(`Batch delete failed: ${err.response.data.error}`);
           }
           else {
               alert('Failed to perform batch delete.');
           }
      } finally {
          setBatchOperationLoading(false);
      }
  };

   const batchDownload = async () => {
       if (selectedFiles.length === 0) return; // Should not happen if button is disabled
       setBatchOperationLoading(true);
       setShowBatchDownloadProgress(true); // Show progress modal
       setBatchDownloadProgress(0);

       const zip = new JSZip();
       const filesToZip = sortedFiles.filter(file => selectedFiles.includes(file._id));

       const token = getToken(); // Get token for auth
       if (!token) {
          alert('Batch download failed: Not authenticated. Please log in.');
          setBatchOperationLoading(false);
          setShowBatchDownloadProgress(false);
          // Potentially trigger a global logout in App.jsx here
          return;
       }


       try {
           for (let i = 0; i < filesToZip.length; i++) {
               const file = filesToZip[i];
               try {
                   const response = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
                       responseType: 'blob', // Get file data as Blob
                        headers: { Authorization: `Bearer ${token}` } // *** Add Auth header ***
                   });
                   // Add file to zip. Use file.metadata.filename for the name if available, fallback to file.filename
                   const filenameInZip = file.metadata?.filename || file.filename || `file_${file._id}.${getFileExtension(file.filename)}`;
                   zip.file(filenameInZip, response.data);
                   // Update progress (basic: based on number of files added)
                   setBatchDownloadProgress(Math.round(((i + 1) / filesToZip.length) * 100));

               } catch (downloadError) {
                   console.error(`Failed to download file ${file._id} for zipping:`, downloadError);
                   // Decide how to handle individual file download errors in a batch.
                   // For now, we log and continue, but the file won't be in the zip.
                   // You might want to skip the file, show a warning, or stop the whole process.
               }
           }

           // Generate the zip file
           const zipBlob = await zip.generateAsync({
               type: "blob",
               compression: "DEFLATE", // Use DEFLATE for compression
               compressionOptions: {
                   level: 6 // Compression level 0-9 (6 is default)
               }
            });

           // Save the zip file to the user's computer
           saveAs(zipBlob, `KUWUTEN_Files_${Date.now()}.zip`);

           setSelectedFiles([]); // Clear selection after download attempt
           setSelectionMode(false); // Exit selection mode

       } catch (zipError) {
           console.error('Batch zip or save error:', zipError);
            // Handle unauthorized error specifically if it happens during download attempt inside the loop
           if (zipError.response && zipError.response.status === 401) {
              alert('Session expired or unauthorized during download. Please log in again.');
              // Potentially trigger a global logout in App.jsx here
           } else {
                alert('Failed to create batch download zip.');
           }
       } finally {
           setBatchOperationLoading(false);
           setShowBatchDownloadProgress(false); // Hide progress modal
           setBatchDownloadProgress(0); // Reset progress
       }
   };

    const batchShare = async () => {
        if (selectedFiles.length === 0) return; // Should not happen if button is disabled
        setBatchOperationLoading(true);
        setBatchShareLink(''); // Clear previous share link

        const token = getToken(); // Get token for auth
       if (!token) {
          alert('Batch share failed: Not authenticated. Please log in.');
          setBatchOperationLoading(false);
           // Potentially trigger a global logout in App.jsx here
          return;
       }

        // Create a zip file client-side first, then upload it to a special endpoint
        const zip = new JSZip();
        const filesToZip = sortedFiles.filter(file => selectedFiles.includes(file._id));

        try {
            for (const file of filesToZip) {
                 try {
                    const response = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
                        responseType: 'blob',
                         headers: { Authorization: `Bearer ${token}` } // *** Add Auth header ***
                    });
                     const filenameInZip = file.metadata?.filename || file.filename || `file_${file._id}.${getFileExtension(file.filename)}`;
                    zip.file(filenameInZip, response.data);
                 } catch (downloadError) {
                     console.error(`Failed to download file ${file._id} for batch sharing:`, downloadError);
                     // Decide how to handle individual file download errors in a batch share scenario
                     // For now, log and skip the file in the zip.
                 }
            }

             // Generate the zip file as a Blob
            const zipBlob = await zip.generateAsync({
                 type: "blob",
                 compression: "DEFLATE",
                 compressionOptions: { level: 6 }
            });

            // Create FormData to send the zip Blob to the backend
            const formData = new FormData();
            // Use a consistent filename like 'shared_archive.zip' or timestamped
            formData.append('zipFile', zipBlob, `shared_archive_${Date.now()}.zip`);


            // Upload the zip file to a new backend endpoint designed for sharing
            const uploadResponse = await axios.post(`${backendUrl}/api/files/share-zip`, formData, {
                 headers: {
                   'Content-Type': 'multipart/form-data',
                   Authorization: `Bearer ${token}` // *** Add Auth header ***
                 },
                 // Optional: add onUploadProgress for the zip upload itself if needed
            });

            // Assuming backend responds with { url: '...' }
            if (uploadResponse.data && uploadResponse.data.url) {
                setBatchShareLink(uploadResponse.data.url);
                setShowBatchShareModal(true); // Show the share modal with the generated link
            } else {
                 // If backend doesn't return a URL but success status, something is wrong.
                 throw new Error('Backend did not return a share URL.');
            }

            setSelectedFiles([]); // Clear selection after attempt
            setSelectionMode(false); // Exit selection mode


        } catch (err) {
            console.error('Batch share error:', err);
             // Handle unauthorized error specifically
           if (err.response && err.response.status === 401) {
              alert('Session expired or unauthorized during batch share. Please log in again.');
              // Potentially trigger a global logout in App.jsx here
           } else if (err.response && err.response.data && err.response.data.error) {
              alert(`Batch share failed: ${err.response.data.error}`);
           }
           else {
               alert('Failed to generate batch share link.');
           }
            setBatchShareLink(''); // Ensure link is cleared on error
        } finally {
            setBatchOperationLoading(false);
        }
    };


  // --- Render Methods ---

  const renderFileItems = () => {
    // Show skeletons if loading OR if files array is null/undefined (initial state)
    if (isLoading || files === null) {
      const skeletonCount = view === 'grid' ? 12 : 6; // More skeletons for grid
      return Array.from({ length: skeletonCount }).map((_, i) => (
        <FileItemSkeleton key={i} darkMode={darkMode} viewType={view} />
      ));
    }

    // Show "No files found" if files array is empty AFTER loading is complete
    if (files.length === 0 && !isLoading) {
       return (
         <div className={cn("text-center p-8", darkMode ? "text-gray-400" : "text-gray-600")}>
           You haven't uploaded any files yet.
         </div>
       );
    }

     // Show "No files match" if the FILTERED/SORTED list is empty, but original files exist
     if (sortedFiles.length === 0 && files.length > 0) {
         return (
            <div className={cn("text-center p-8", darkMode ? "text-gray-400" : "text-gray-600")}>
               No files match your filter or search criteria.
            </div>
         );
     }


    // Render actual file items from the sorted and filtered list
    return sortedFiles.map(file => (
      <FileItem
        key={file._id}
        file={file}
        refresh={refresh} // Pass refresh down
        showDetails={showMetadata} // Pass metadata toggle state
        darkMode={darkMode}
        isSelected={selectedFiles.includes(file._id)} // Check if selected
        onSelect={handleFileSelect} // Pass selection handler
        selectionMode={selectionMode} // Pass selection mode state
        viewType={view} // Pass current view type
      />
    ));
  };

   // Helper to format bytes
   const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

     // Helper to format date
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    // Helper to get file extension
    const getFileExtension = (filename) => {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop() : ''; // Return extension without capitalization
    };


  return (
    <div ref={fileListContainerRef} className={`flex-grow w-full overflow-y-auto pr-2 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}> {/* Added overflow-y-auto and padding */}
       {/* Header with controls */}
        <div className="sticky top-0 z-10 flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0 py-2 backdrop-blur-sm"
             className={cn("sticky top-0 z-10 flex flex-col md:flex-row md:items-center md:justify-between mb-6 space-y-4 md:space-y-0 py-2", darkMode ? 'bg-gray-900/80' : 'bg-gray-50/80')} // Added sticky header with backdrop
        >
             {/* File count and Batch actions */}
             <div className="flex items-center space-x-4">
                 <h3 className={`text-xl font-semibold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                     {isLoading ? 'Loading...' : `${files.length} File${files.length !== 1 ? 's' : ''}`}
                 </h3>

                 {/* Batch Action Buttons */}
                 {selectedFiles.length > 0 && (
                     <div className="flex space-x-3">
                         {/* Batch Delete */}
                         <button
                             onClick={() => setShowDeleteConfirmModal(true)} // Show confirmation modal
                             disabled={batchOperationLoading}
                             className={cn(
                                 "px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait",
                                 darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                             )}
                         >
                            {batchOperationLoading && ( // Show spinner if any batch op is loading
                                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                             )}
                             Delete ({selectedFiles.length})
                         </button>
                          {/* Batch Download */}
                         <button
                             onClick={batchDownload}
                              disabled={batchOperationLoading}
                             className={cn(
                                 "px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait",
                                 darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                             )}
                         >
                              {batchOperationLoading && ( // Show spinner if any batch op is loading
                                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                             )}
                             Download ({selectedFiles.length})
                         </button>
                          {/* Batch Share */}
                         <button
                              onClick={batchShare}
                               disabled={batchOperationLoading}
                             className={cn(
                                 "px-3 py-1 rounded text-sm font-medium transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-wait",
                                 darkMode ? 'bg-purple-700 hover:bg-purple-600 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                             )}
                         >
                              {batchOperationLoading && ( // Show spinner if any batch op is loading
                                 <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                             )}
                             Share ({selectedFiles.length})
                         </button>
                         {/* Deselect All */}
                         <button
                             onClick={deselectAllFiles}
                              disabled={batchOperationLoading}
                             className={cn(
                                 "px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                 darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                             )}
                         >
                             Deselect All
                         </button>
                     </div>
                 )}

                 {/* Toggle Selection Mode */}
                  <button
                      onClick={toggleSelectionMode}
                       disabled={isLoading || files.length === 0} // Disable if loading or no files
                      className={cn(
                          "px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                          selectionMode
                             ? (darkMode ? 'bg-yellow-700 hover:bg-yellow-600 text-white' : 'bg-yellow-600 hover:bg-yellow-700 text-white')
                             : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700')
                      )}
                  >
                      {selectionMode ? 'Exit Selection Mode' : 'Select Files'}
                  </button>
             </div>


            {/* Search, Filter, Sort, View Controls */}
            <div className="flex items-center space-x-3">
                {/* Search Input */}
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className={cn(
                        "px-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500",
                         darkMode ? 'bg-gray-700 border border-gray-600 text-white placeholder-gray-400' : 'border border-gray-300 text-gray-800 placeholder-gray-500'
                    )}
                 />

                {/* Sort/Filter Dropdown Toggle */}
                <div className="relative" ref={sortDropdownRef}>
                     <button
                         onClick={() => setShowSortOptions(!showSortOptions)}
                         className={cn(
                             "px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                             darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                         )}
                     >
                         Options
                         <svg className={cn("ml-2 -mr-0.5 h-4 w-4 transition-transform", showSortOptions ? 'rotate-180' : 'rotate-0')} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                         </svg>
                     </button>
                     {/* Sort/Filter Dropdown Content */}
                     {showSortOptions && (
                         <div className={cn(
                            "absolute right-0 mt-2 w-56 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50",
                            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                         )} role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                             <div className="py-1" role="none">
                                  {/* Sort Options */}
                                  <div className={cn("px-4 py-2 text-xs font-semibold", darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                                  {['default', 'name', 'size', 'date'].map(option => (
                                     <button
                                         key={option}
                                         onClick={() => { setSortOption(option); setShowSortOptions(false); }}
                                         className={cn(
                                             "block w-full text-left px-4 py-2 text-sm",
                                             darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100',
                                             sortOption === option && (darkMode ? 'bg-gray-700 font-semibold' : 'bg-gray-100 font-semibold')
                                         )}
                                         role="menuitem"
                                     >
                                        {option === 'default' ? 'Latest' : option.charAt(0).toUpperCase() + option.slice(1)} {/* Capitalize or use 'Latest' */}
                                     </button>
                                  ))}
                                   <div className={cn("border-t my-1", darkMode ? 'border-gray-700' : 'border-gray-200')}></div> {/* Divider */}
                                   {/* Filter Options */}
                                  <div className={cn("px-4 py-2 text-xs font-semibold", darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                                   {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (
                                     <button
                                         key={type}
                                         onClick={() => { setFilter(type); setShowSortOptions(false); }}
                                         className={cn(
                                             "block w-full text-left px-4 py-2 text-sm",
                                             darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100',
                                             filter === type && (darkMode ? 'bg-gray-700 font-semibold' : 'bg-gray-100 font-semibold')
                                         )}
                                         role="menuitem"
                                     >
                                        {type.charAt(0).toUpperCase() + type.slice(1)} {/* Capitalize first letter */}
                                     </button>
                                  ))}
                                   <div className={cn("border-t my-1", darkMode ? 'border-gray-700' : 'border-gray-200')}></div> {/* Divider */}
                                   {/* Show Metadata Toggle */}
                                   <div className={cn("flex items-center justify-between px-4 py-2 text-sm", darkMode ? 'text-gray-200' : 'text-gray-700')}>
                                       <span>Show Details</span>
                                       <label htmlFor="showMetadataToggle" className="flex items-center cursor-pointer">
                                           <div className="relative">
                                               <input
                                                   type="checkbox"
                                                   id="showMetadataToggle"
                                                   className="sr-only"
                                                   checked={showMetadata}
                                                   onChange={() => setShowMetadata(!showMetadata)}
                                                />
                                               <div className={cn("block w-10 h-6 rounded-full transition-colors", darkMode ? 'bg-gray-600' : 'bg-gray-300', showMetadata ? 'bg-blue-600' : '')}></div>
                                               <div className={cn("dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform", showMetadata ? 'transform translate-x-full' : '')}></div>
                                           </div>
                                       </label>
                                   </div>
                             </div>
                         </div>
                     )}
                 </div>


                {/* View Toggles (Grid/List) */}
                 <div className="flex space-x-1">
                     <button
                         onClick={() => setView('grid')}
                         className={cn(
                             "p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                             view === 'grid'
                                ? (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-800')
                                : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200')
                         )}
                         aria-label="Grid View"
                     >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                             <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM11 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2h-2zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2h-2z" />
                          </svg>
                     </button>
                     <button
                         onClick={() => setView('list')}
                          className={cn(
                             "p-1.5 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                             view === 'list'
                                ? (darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-300 text-gray-800')
                                : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200')
                         )}
                         aria-label="List View"
                     >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                         </svg>
                     </button>
                 </div>
             </div>

        </div>


      {/* File List / Grid Container */}
      <div className={cn(
          'grid gap-6',
          view === 'grid' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'
       )}>
         {renderFileItems()}
      </div>

      {/* Batch Delete Confirmation Modal */}
      {showDeleteConfirmModal && (
        <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn")} aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className={cn(
             "relative rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all",
              darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
           )}>
             <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={cn("mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 mb-4", darkMode ? 'text-red-500' : 'text-red-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg leading-6 font-medium" id="modal-title">Delete Selected Files</h3>
                <div className="mt-2">
                  <p className={cn("text-sm", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    Are you sure you want to delete {selectedFiles.length} selected file{selectedFiles.length > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                </div>
             </div>
             <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse justify-center gap-3">
               <button
                 type="button"
                 className={cn(
                    "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm",
                    darkMode ? 'bg-red-700 hover:bg-red-600 focus:ring-red-500' : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                 )}
                 onClick={batchDelete}
                 disabled={batchOperationLoading} // Disable while loading
               >
                 {batchOperationLoading ? (
                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                 ) : 'Delete'}
               </button>
               <button
                 type="button"
                 className={cn(
                   "mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm",
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 focus:ring-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                 )}
                 onClick={() => setShowDeleteConfirmModal(false)}
                  disabled={batchOperationLoading} // Disable while loading
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Batch Download Progress Modal */}
      {showBatchDownloadProgress && (
         <div ref={batchDownloadModalRef} className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn")} aria-labelledby="download-progress-title" role="dialog" aria-modal="true">
            <div className={cn(
              "relative rounded-lg shadow-xl w-full max-w-xs p-6 transform transition-all text-center",
               darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
             )}>
               <svg className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 mb-4 text-blue-500 animate-bounce" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
               </svg>
               <h3 className="text-lg leading-6 font-medium" id="download-progress-title">Preparing Download</h3>
               <div className="mt-4">
                 <p className={cn("text-sm mb-2", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                   Zipping {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}...
                 </p>
                 <div className={cn(`w-full rounded-full h-2.5`, darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                    <div
                        className="h-2.5 rounded-full bg-blue-600 transition-all duration-100"
                        style={{ width: `${batchDownloadProgress}%` }}
                    ></div>
                 </div>
                 <p className={cn("text-sm mt-2", darkMode ? 'text-gray-400' : 'text-gray-500')}>{batchDownloadProgress}%</p>
               </div>
            </div>
         </div>
      )}


       {/* Batch Share Link Modal */}
      {showBatchShareModal && (
        <div ref={batchShareModalRef} className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn")} aria-labelledby="share-link-title" role="dialog" aria-modal="true">
          <div className={cn(
             "relative rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all text-center",
              darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
           )}>
             <svg xmlns="http://www.w3.org/2000/svg" className={cn("mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 mb-4", darkMode ? 'text-purple-500' : 'text-purple-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.632l6.632-3.316m0 6.632a3 3 0 110-2.684a3 3 0 010 2.684z" />
             </svg>
             <h3 className="text-lg leading-6 font-medium" id="share-link-title">Share Selected Files</h3>
             <div className="mt-4 text-center">
                {batchShareLink ? (
                    <>
                     {/* QR Code */}
                     <div className="flex justify-center mb-4">
                       <QRCodeSVG
                         value={batchShareLink}
                         size={128}
                         level={"H"}
                         includeMargin={false}
                         fgColor={darkMode ? "#d1d5db" : "#1f2937"} // qr code color
                         bgColor={darkMode ? "#1f2937" : "#ffffff"} // qr code background color
                       />
                     </div>
                     {/* Share Link Input */}
                     <div className={cn("relative rounded-md shadow-sm mt-2", darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                         <input
                             type="text"
                             value={batchShareLink}
                             readOnly
                             className={cn(
                                 "w-full px-3 py-2 pr-10 text-sm rounded-md border focus:outline-none",
                                 darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'
                             )}
                          />
                         <button
                              onClick={() => {
                                  navigator.clipboard.writeText(batchShareLink);
                                  setCopied(true);
                              }}
                              className={cn(
                                  "absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5 font-medium focus:outline-none",
                                   darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'
                               )}
                           >
                                {copied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                ) : (
                                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h6a2 2 0 002-2v-6a2 2 0 00-2-2h-6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                                )}
                           </button>
                      </div>
                    </>
                ) : (
                    <p className={cn("text-sm", darkMode ? 'text-gray-400' : 'text-gray-500')}>Generating link...</p>
                )}
             </div>
             <div className="mt-5 sm:mt-6 sm:flex sm:flex-row-reverse justify-center"> {/* Adjusted layout */}
               <button
                 type="button"
                 className={cn(
                   "w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:w-auto sm:text-sm",
                   darkMode ? 'bg-blue-700 hover:bg-blue-600 focus:ring-blue-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                 )}
                 onClick={() => {
                    setShowBatchShareModal(false);
                    setBatchShareLink(''); // Clear share link when closing modal
                    setCopied(false); // Reset copied state
                 }}
               >
                 Close
               </button>
             </div>

            {/* Disclaimer below the link */}
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
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
         .dot {
            transition: transform 0.2s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FileList;
               
