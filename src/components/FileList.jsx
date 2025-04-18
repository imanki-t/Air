import React, { useState, useEffect, useRef } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import QRCode from 'qrcode.react';

// --- UI Enhancement Helper ---
// Utility function to generate conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Skeleton Loading Component for FileItem (Unchanged)
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
 const [view, setView] = useState('list'); // Default to list, adjust based on screen size later
 const [searchInput, setSearchInput] = useState('');
 const [showMetadata, setShowMetadata] = useState(false);
 const [sortOption, setSortOption] = useState('default');
 const [showSortOptions, setShowSortOptions] = useState(false);

 // --- Batch Operations ---
 const [selectionMode, setSelectionMode] = useState(false);
 const [selectedFiles, setSelectedFiles] = useState([]);
 const [batchOperationLoading, setBatchOperationLoading] = useState(false);
 const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
 const [batchShareLink, setBatchShareLink] = useState('');
 const [showBatchShareModal, setShowBatchShareModal] = useState(false);
 const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
 const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
 const [copied, setCopied] = useState(false);
 const [qrCodeLoading, setQrCodeLoading] = useState(true); // State for QR code generation loading

 const sortOptionsModalRef = useRef(null);
 const batchShareModalRef = useRef(null);
 const batchDownloadModalRef = useRef(null);
 const deleteConfirmModalRef = useRef(null);


 // --- Effects ---
 useEffect(() => {
   // Set initial view based on screen size
   if (window.innerWidth >= 768) {
     setView('grid');
   }
   // Clear selection when files data changes
   setSelectedFiles([]);
 }, [files]);

 // Effect to handle QR code generation timing for Batch Share Modal
 useEffect(() => {
   if (showBatchShareModal && batchShareLink) {
     setQrCodeLoading(true); // Start loading
     // Simulate QR code generation time or wait for actual generation if async
     const timer = setTimeout(() => {
       setQrCodeLoading(false); // End loading after a short delay
     }, 300); // Adjust delay as needed
     return () => clearTimeout(timer);
   }
 }, [showBatchShareModal, batchShareLink]);

 // Effect to handle clicks outside modals
 useEffect(() => {
   const handleClickOutside = (event) => {
     if (sortOptionsModalRef.current && !sortOptionsModalRef.current.contains(event.target)) {
       setShowSortOptions(false);
     }
     if (batchShareModalRef.current && !batchShareModalRef.current.contains(event.target)) {
       // Don't close share modal on outside click, only via button
     }
     if (batchDownloadModalRef.current && !batchDownloadModalRef.current.contains(event.target)) {
       // Don't close download progress on outside click
     }
     if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(event.target)) {
       setShowDeleteConfirmModal(false);
     }
   };

   document.addEventListener('mousedown', handleClickOutside);
   return () => {
     document.removeEventListener('mousedown', handleClickOutside);
   };
 }, []);


 // --- Filtering and Sorting ---
 const filtered = files.filter((f) => filter === 'all' || f.metadata?.type === filter);
 const visibleFiles = filtered.filter((f) =>
   f.filename.toLowerCase().includes(searchInput.toLowerCase())
 );

 const sortedFiles = [...visibleFiles].sort((a, b) => {
   switch (sortOption) {
     case 'size':
       return (a.length || 0) - (b.length || 0);
     case 'date':
       return new Date(b.uploadDate) - new Date(a.uploadDate); // Sort descending by default
     case 'name':
       return a.filename.localeCompare(b.filename);
     case 'group': {
       const order = { image: 1, video: 2, document: 3, audio: 4 };
       const getOrder = (file) => order[file.metadata?.type] || 5;
       return getOrder(a) - getOrder(b);
     }
     default:
       // Default sort (usually by date descending)
       return new Date(b.uploadDate) - new Date(a.uploadDate);
   }
 });


 // --- Handlers ---
 const clearSearch = () => setSearchInput('');

 const chooseSortOption = (option) => {
   setSortOption(option);
   setShowSortOptions(false);
 };

 const toggleSelectionMode = () => {
   const newMode = !selectionMode;
   setSelectionMode(newMode);
   if (!newMode) { // Clear selection when exiting selection mode
     setSelectedFiles([]);
   }
 };

 const handleSelectFile = (fileId) => {
   if (!selectionMode) return; // Only allow selection in selection mode
   setSelectedFiles(prev =>
     prev.includes(fileId)
       ? prev.filter(id => id !== fileId)
       : [...prev, fileId]
   );
 };

 const selectAllVisible = () => {
   setSelectedFiles(sortedFiles.map(file => file._id));
 };

 const deselectAll = () => {
   setSelectedFiles([]);
 };


 // --- Batch Operations Logic ---
 const batchDelete = async () => {
   if (selectedFiles.length === 0) return;
   setBatchOperationLoading(true);
   try {
     await Promise.all(selectedFiles.map(fileId =>
       axios.delete(`${backendUrl}/api/files/${fileId}`)
     ));
     refresh(); // Refresh file list
     setSelectedFiles([]); // Clear selection
     setSelectionMode(false); // Exit selection mode
     setShowDeleteConfirmModal(false); // Close modal
   } catch (err) {
     console.error('Batch delete failed:', err);
     alert('Some files could not be deleted. Please try again.');
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

   try {
     for (const fileId of selectedFiles) {
       const selectedFile = files.find(f => f._id === fileId);
       if (!selectedFile) continue;

       try {
         const response = await axios({
           url: `${backendUrl}/api/files/download/${fileId}`,
           method: 'GET',
           responseType: 'blob'
         });
         zip.file(selectedFile.filename, response.data);
         completedFiles++;
         setBatchDownloadProgress(Math.round((completedFiles / selectedFiles.length) * 100));
       } catch (fileError) {
         console.error(`Failed to download file ${selectedFile.filename}:`, fileError);
         // Optionally notify the user about specific file failures
       }
     }

     if (completedFiles === 0) {
       throw new Error("No files could be added to the zip.");
     }

     const zipBlob = await zip.generateAsync({
       type: 'blob',
       compression: 'DEFLATE'
     }, (metadata) => {
       // Note: zip.generateAsync progress updates might not be granular per file
       // The progress state updated during file downloads provides better feedback
     });
     saveAs(zipBlob, `download_${Date.now()}.zip`); // Use a more unique name

   } catch (err) {
     console.error('Batch download failed:', err);
     alert('Batch download could not be completed. Some files might have failed.');
   } finally {
     setBatchOperationLoading(false);
     // Keep progress modal open slightly longer to show 100%
     setTimeout(() => {
       setShowBatchDownloadProgress(false);
     }, 1500);
   }
 };

 const batchShare = async () => {
   if (selectedFiles.length === 0) return;
   setBatchOperationLoading(true);
   setQrCodeLoading(true); // Set loading before API call
   setShowBatchShareModal(true); // Show modal immediately
   setBatchShareLink(''); // Clear previous link

   try {
     // Simulate API call for batch sharing
     const res = await axios.post(`${backendUrl}/api/files/share-batch`, {
       fileIds: selectedFiles
     });
     // Use the actual URL from the response if available
     setBatchShareLink(res.data.url || `https://share.example.com/batch/${Date.now()}`);
     // QR code loading will be handled by the useEffect hook watching batchShareLink
   } catch (err) {
     console.error('Batch share failed:', err);
     alert('Failed to create batch share link.');
     setShowBatchShareModal(false); // Close modal on error
   } finally {
     setBatchOperationLoading(false);
     // QR Code loading state is managed by the useEffect hook
   }
 };

 const copyToClipboard = async () => {
   if (!batchShareLink) return;
   try {
     await navigator.clipboard.writeText(batchShareLink);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000); // Reset copied state
   } catch (err) {
     console.error('Failed to copy link:', err);
     alert('Could not copy link to clipboard.');
   }
 };

 // --- Render Logic ---
 const skeletonArray = Array(view === 'grid' ? 8 : 4).fill(0); // Adjust skeleton count based on view
 const buttonTextColor = darkMode ? 'text-gray-300' : 'text-gray-600';
 const buttonBgHover = darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-300';
 const buttonBgActive = darkMode ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
 const buttonBgIdle = darkMode ? 'bg-gray-700' : 'bg-gray-200';

 return (
   <div
     className={cn(
       'transition-colors duration-300 rounded-lg p-4 sm:p-6 shadow-lg w-full mx-auto max-w-7xl', // Added max-width
       darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
     )}
   >
     {/* --- Header --- */}
     <div className="text-center mb-6">
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

     {/* --- Controls Row --- */}
     <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between flex-wrap">
       {/* Search Input */}
       <div className="relative flex-grow w-full md:w-auto">
         <input
           type="text"
           placeholder="Search files..." // Clearer placeholder
           value={searchInput}
           onChange={(e) => setSearchInput(e.target.value)}
           className={cn(
             'w-full sm:max-w-xs px-4 py-2 pr-10 rounded-lg transition-colors duration-200 border focus:outline-none focus:ring-2 focus:ring-offset-1',
             darkMode
               ? 'bg-gray-700 text-white border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
               : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-500 focus:ring-blue-600 focus:border-blue-600'
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

       {/* Right-aligned Control Buttons */}
       <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end">
         {/* Selection Mode Toggle (Clipboard Icon) */}
         <button
           onClick={toggleSelectionMode}
           className={cn(
             'p-2 rounded-md transition-colors duration-200',
             selectionMode ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
           )}
           title={selectionMode ? "Cancel Selection" : "Enable Selection Mode"}
         >
           {/* Use a clipboard-check icon when active */}
           {selectionMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> {/* Alternative: Circle with minus */}
                </svg>
           ) : (
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> {/* Clipboard list icon */}
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

         {/* Sort Toggle */}
         <div className="relative">
            <button
              onClick={() => setShowSortOptions(prev => !prev)} // Toggle directly
              className={cn(
                'p-2 rounded-md transition-colors duration-200',
                sortOption !== 'default' ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
              )}
              title="Sort Options"
            >
              {/* Using a sort icon */}
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h9m-9 4h13M19 8l-4-4-4 4M19 16l-4 4-4-4" />
              </svg>
            </button>
            {/* Sort Options Dropdown (Improved Positioning) */}
            {showSortOptions && (
              <div ref={sortOptionsModalRef} className={cn(
                "absolute right-0 mt-2 w-48 rounded-md shadow-lg z-20",
                darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
              )}>
                <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                  {['default', 'name', 'size', 'date', 'group'].map((option) => (
                    <button
                      key={option}
                      onClick={() => chooseSortOption(option)}
                      className={cn(
                        "block w-full text-left px-4 py-2 text-sm transition-colors duration-150",
                        sortOption === option
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700')
                          : (darkMode ? 'text-gray-300 hover:bg-gray-600 hover:text-white' : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900')
                      )}
                      role="menuitem"
                    >
                      {option === 'default' ? 'Default Order' : `Sort by ${option.charAt(0).toUpperCase() + option.slice(1)}`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

         {/* List View Toggle */}
         <button
           onClick={() => setView('list')}
           className={cn(
             'p-2 rounded-md transition-colors duration-200',
             view === 'list' ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
           )}
           title="List View"
         >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
           </svg>
         </button>

         {/* Grid View Toggle */}
         <button
           onClick={() => setView('grid')}
           className={cn(
             'p-2 rounded-md transition-colors duration-200',
             view === 'grid' ? buttonBgActive : `${buttonBgIdle} ${buttonTextColor} ${buttonBgHover}`
           )}
           title="Grid View"
         >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
             <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
           </svg>
         </button>
       </div>
     </div>

     {/* --- Batch Operations Bar (Improved Styling & Symmetry) --- */}
     {selectionMode && (
       <div className={cn(
         'flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 p-3 rounded-lg transition-all duration-300 ease-in-out',
         darkMode ? 'bg-gray-700/80 backdrop-blur-sm' : 'bg-blue-50 border border-blue-200' // Theme-aware background
       )}>
         {/* Left Side: Select/Deselect & Count */}
         <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
           {/* ** Improved Select/Deselect Buttons ** */}
           <button
             onClick={selectAllVisible}
             disabled={selectedFiles.length === sortedFiles.length || sortedFiles.length === 0}
             className={cn(
               'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 border',
               darkMode
                 ? 'border-gray-500 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                 : 'border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
             )}
           >
             Select All
           </button>
            <button
             onClick={deselectAll}
             disabled={selectedFiles.length === 0}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 border',
                darkMode
                  ? 'border-gray-500 text-gray-300 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed'
              )}
           >
             Deselect All
           </button>
           <span className={cn('text-sm font-medium tabular-nums', darkMode ? 'text-gray-300' : 'text-gray-600')}>
             {selectedFiles.length} selected
           </span>
         </div>

         {/* Right Side: Action Buttons */}
         <div className="flex flex-wrap gap-2 justify-center sm:justify-end w-full sm:w-auto">
           {/* ** Buttons matching theme, better spacing, Cancel removed ** */}
           <button
             onClick={batchDownload}
             disabled={selectedFiles.length === 0 || batchOperationLoading}
             className={cn(
               'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center gap-1',
               'text-white', // White text for colored buttons
               selectedFiles.length === 0 || batchOperationLoading
                 ? 'bg-gray-400 cursor-not-allowed'
                 : 'bg-blue-600 hover:bg-blue-700'
             )}
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
               <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
             </svg>
             Download
           </button>
           <button
             onClick={batchShare}
             disabled={selectedFiles.length === 0 || batchOperationLoading}
             className={cn(
               'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center gap-1',
               'text-white',
                selectedFiles.length === 0 || batchOperationLoading
                 ? 'bg-gray-400 cursor-not-allowed'
                 : 'bg-green-600 hover:bg-green-700' // Changed color for Share
             )}
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342A8 8 0 0112 11.5c1.97 0 3.795.637 5.316 1.842m-10.632 4.314A8.001 8.001 0 0112 16.5c1.97 0 3.795.637 5.316 1.842m-10.632-4.314a1 1 0 00-1.19 1.189 8 8 0 0011.8 4.864 1 1 0 101.19-1.189 6 6 0 01-9.42-3.675zM12 10a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
             Share
           </button>
           <button
             onClick={() => selectedFiles.length > 0 && setShowDeleteConfirmModal(true)}
             disabled={selectedFiles.length === 0 || batchOperationLoading}
             className={cn(
               'px-3 py-1.5 rounded-md text-sm font-medium transition-colors duration-150 flex items-center gap-1',
               'text-white',
                selectedFiles.length === 0 || batchOperationLoading
                 ? 'bg-gray-400 cursor-not-allowed'
                 : 'bg-red-600 hover:bg-red-700'
             )}
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
             Delete
           </button>
           {/* ** Cancel button removed as requested, use clipboard icon toggle ** */}
         </div>
       </div>
     )}


     {/* --- Filters --- */}
     <div className="mb-6 flex flex-wrap gap-2 justify-center sm:justify-start">
       {['all', 'image', 'video', 'audio', 'document', 'other'].map((type) => (
         <button
           key={type}
           onClick={() => setFilter(type)}
           className={cn(
             'px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200',
             filter === type
               ? 'bg-blue-600 text-white shadow-md'
               : darkMode
                 ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                 : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
           )}
         >
           {type.charAt(0).toUpperCase() + type.slice(1)}
         </button>
       ))}
     </div>

     {/* --- File List / Grid --- */}
     {isLoading ? (
       <div className={cn(
         'grid gap-4',
         view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1' // Added xl breakpoint
       )}>
         {skeletonArray.map((_, index) => <FileItemSkeleton key={index} darkMode={darkMode} />)}
       </div>
     ) : sortedFiles.length === 0 ? (
       <div className={cn('text-center py-16 px-4', darkMode ? 'text-gray-400' : 'text-gray-500')}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
         <p className="text-xl font-medium mb-2">No files found</p>
         <p className="text-sm">
            {searchInput ? 'Try adjusting your search or filter.' : 'Upload some files to get started!'}
         </p>
       </div>
     ) : (
       <div className={cn(
         'grid gap-4',
         view === 'grid' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
       )}>
         {sortedFiles.map((file) => (
           <FileItem
             key={file._id}
             file={file}
             refresh={refresh}
             showMetadata={showMetadata}
             darkMode={darkMode}
             isSelected={selectedFiles.includes(file._id)}
             onSelect={() => handleSelectFile(file._id)} // Pass handler directly
             selectionMode={selectionMode}
             // ** Pass prop to hide kebab menu during selection **
             hideActions={selectionMode}
             // ** Assuming FileItem uses isSelected for outline, no tick needed here **
             viewMode={view} // Pass view mode if FileItem needs it
           />
         ))}
       </div>
     )}

     {/* --- Modals --- */}

     {/* ** Batch Delete Confirmation Modal (Styling improvements) ** */}
     {showDeleteConfirmModal && (
       <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div ref={deleteConfirmModalRef} className={cn(
           'p-6 rounded-lg shadow-xl max-w-md w-full relative',
           darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
         )}>
            <button
              onClick={() => setShowDeleteConfirmModal(false)}
              className={cn(
                "absolute top-2 right-2 p-1 rounded-full transition-colors",
                darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
              )}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
           <h2 className="font-semibold text-xl mb-4">Confirm Deletion</h2>
           <p className={cn('text-sm mb-6', darkMode ? 'text-gray-300' : 'text-gray-600')}>
             Are you sure you want to permanently delete {selectedFiles.length} selected item{selectedFiles.length !== 1 ? 's' : ''}? <strong className="font-medium block mt-1">This action cannot be undone.</strong>
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
                 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors duration-150 flex items-center justify-center',
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
                 ) : `Delete ${selectedFiles.length} Item${selectedFiles.length !== 1 ? 's' : ''}`
               }
             </button>
           </div>
         </div>
       </div>
     )}

     {/* ** Batch Share Modal (QR Code Loading Fixed, Styling) ** */}
     {showBatchShareModal && (
       <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div ref={batchShareModalRef} className={cn(
           'p-6 rounded-lg shadow-xl max-w-md w-full relative',
            darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
         )}>
            <button
               onClick={() => setShowBatchShareModal(false)}
               className={cn(
                "absolute top-2 right-2 p-1 rounded-full transition-colors",
                darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
               )}
               title="Close"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
           <h2 className="font-semibold text-xl mb-4">Share Link</h2>
           <p className={cn('text-sm mb-4', darkMode ? 'text-gray-300' : 'text-gray-600')}>
             Anyone with this link can view the {selectedFiles.length} selected item{selectedFiles.length !== 1 ? 's' : ''}.
           </p>

           {/* Share link input */}
           <div className={cn(
             'flex items-center mb-5 p-2 rounded-md border',
             darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
           )}>
             <input
               type="text"
               value={batchShareLink || 'Generating link...'} // Show placeholder if empty
               readOnly
               className={cn(
                 'flex-grow text-sm p-1 bg-transparent outline-none truncate', // Added truncate
                 darkMode ? 'text-gray-300' : 'text-gray-700'
               )}
             />
             <button
               onClick={copyToClipboard}
               disabled={!batchShareLink || copied}
               className={cn(
                 'ml-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex-shrink-0',
                 copied
                   ? 'bg-green-600 text-white'
                   : !batchShareLink
                     ? (darkMode ? 'bg-gray-600 text-gray-400' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                     : (darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800')
               )}
             >
               {copied ? 'Copied!' : 'Copy'}
             </button>
           </div>

           {/* QR Code Section */}
            <div className="flex justify-center my-5">
              <div className={cn(
                "p-3 rounded-lg inline-block", // Removed fixed bg color, let parent control
                darkMode ? 'bg-white' : 'bg-gray-50' // White background for QR code readability in dark mode
                )}>
                {qrCodeLoading || !batchShareLink ? (
                   <div className="h-[150px] w-[150px] flex items-center justify-center text-gray-500">
                     <svg className="animate-spin h-8 w-8" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                   </div>
                ) : (
                  <QRCode
                     value={batchShareLink}
                     size={150}
                     level={"H"} // Higher error correction level
                     includeMargin={true}
                     renderAs="svg"
                     bgColor={darkMode ? "#FFFFFF" : "#F9FAFB"} // Match inner background
                     fgColor={darkMode ? "#1F2937" : "#111827"} // Match text colors
                  />
                )}
              </div>
            </div>

           <div className="flex justify-center mt-6">
             <button
               onClick={() => setShowBatchShareModal(false)}
                className={cn(
                  'px-5 py-2 rounded-md font-medium transition-colors duration-150 border',
                  darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
                )}
             >
               Close
             </button>
           </div>
         </div>
       </div>
     )}

     {/* ** Batch Download Progress Modal (Centered Text, Styling) ** */}
     {showBatchDownloadProgress && (
       <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div ref={batchDownloadModalRef} className={cn(
           'p-6 rounded-lg shadow-xl max-w-sm w-full text-center', // Added text-center
            darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
         )}>
            {/* ** Centered Title ** */}
           <h2 className="font-semibold text-xl mb-5">
             Preparing Download
           </h2>
           <div className="mb-3">
             <div className="relative pt-1">
                {/* Progress Bar */}
               <div className="overflow-hidden h-2.5 mb-2 text-xs flex rounded-full bg-opacity-50" style={{backgroundColor: darkMode ? 'rgba(75, 85, 99, 0.5)' : 'rgba(229, 231, 235, 0.5)'}}>
                 <div
                   style={{ width: `${batchDownloadProgress}%` }}
                   className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-300 ease-linear"
                 ></div>
               </div>
                {/* ** Centered Progress Text ** */}
               <p className={cn('text-sm font-medium', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                 {batchDownloadProgress}% Complete
               </p>
             </div>
           </div>
            {/* ** Centered Status Text ** */}
           <p className={cn('text-sm mt-4', darkMode ? 'text-gray-400' : 'text-gray-500')}>
             Creating ZIP archive with {selectedFiles.length} item{selectedFiles.length !== 1 ? 's' : ''}...
           </p>
         </div>
       </div>
     )}
   </div>
 );
};

export default FileList;
