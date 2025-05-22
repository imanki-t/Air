import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
const backendUrl = import.meta.env.VITE_BACKEND_URL;

// --- State ---
const [showShare, setShowShare] = useState(false);
const [shareLink, setShareLink] = useState('');
const [copied, setCopied] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [isActionLoading, setIsActionLoading] = useState(false); // Loading state for item-specific actions (download, share, delete)
const [showMenu, setShowMenu] = useState(false);
const [downloadProgress, setDownloadProgress] = useState(0);

// --- Refs ---
const menuRef = useRef(null);
const shareModalRef = useRef(null);
const deleteModalRef = useRef(null);

// --- Effects ---
// Close menu/modals on outside click
useEffect(() => {
 const handleOutsideClick = (event) => {
   // Close menu only if click is outside the menu itself
   if (menuRef.current && !menuRef.current.contains(event.target)) {
     // Check if the click target is the menu button to prevent immediate reopening
     const menuButton = menuRef.current.previousElementSibling; // Assumes button is sibling before menu div
     if (!menuButton || !menuButton.contains(event.target)) {
          setShowMenu(false);
     }
   }
   // Close modals
   if (shareModalRef.current && !shareModalRef.current.contains(event.target)) {
      setShowShare(false);
   }
   if (deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
      setShowDeleteConfirm(false);
   }
 };

 if (showMenu || showShare || showDeleteConfirm) {
    document.addEventListener('mousedown', handleOutsideClick);
 }

 return () => {
   document.removeEventListener('mousedown', handleOutsideClick);
 };
}, [showMenu, showShare, showDeleteConfirm]);

// Close modals on Escape key
const handleKeyDown = useCallback((e) => {
   if (e.key === 'Escape') {
     if (showShare) setShowShare(false);
     if (showDeleteConfirm) setShowDeleteConfirm(false);
     if (showMenu) setShowMenu(false);
   }
 }, [showShare, showDeleteConfirm, showMenu]);

useEffect(() => {
 if (showShare || showDeleteConfirm || showMenu) {
   window.addEventListener('keydown', handleKeyDown);
 } else {
   window.removeEventListener('keydown', handleKeyDown);
 }
 return () => window.removeEventListener('keydown', handleKeyDown);
}, [showShare, showDeleteConfirm, showMenu, handleKeyDown]);

// --- Actions ---
const download = async () => {
setShowMenu(false); //
setIsActionLoading(true); //
setDownloadProgress(0); //
try { //
 const response = await axios({ //
   url: `${backendUrl}/api/files/download/${file._id}`, //
   method: 'GET', //
   responseType: 'blob', //
   onDownloadProgress: (progressEvent) => {
     // --- MODIFICATION START ---
     // Only update progress if progressEvent.total is a positive number
     if (progressEvent.total && progressEvent.total > 0) {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total); //
        setDownloadProgress(percentCompleted); //
     }
     // If progressEvent.total is not available (or is 0), downloadProgress will retain
     // its current value (which was set to 0 at the start of this download function).
     // The previous 'else { setDownloadProgress(50); }' block has been removed.
     // --- MODIFICATION END ---
   },
 });
 const url = window.URL.createObjectURL(new Blob([response.data])); //
 const link = document.createElement('a'); //
 link.href = url; //
 link.setAttribute('download', file.filename); //
 document.body.appendChild(link); //
 link.click(); //
 link.remove(); //
 window.URL.revokeObjectURL(url); //
} catch (err) { //
 console.error('Download failed:', err); //
 // alert(`Failed to download ${file.filename}.`); // Replaced with a more graceful message later if needed
} finally { //
 setIsActionLoading(false); //
 // Reset progress slightly later to show completion
 setTimeout(() => setDownloadProgress(0), 1200); //
}
};


const deleteFile = async () => {
 setIsActionLoading(true);
 try {
   // API endpoint: /api/files/:id
   await axios.delete(`${backendUrl}/api/files/${file._id}`);
   setShowDeleteConfirm(false); // Close modal first
   refresh(); // Refresh the list (this item will disappear)
 } catch (err) {
   console.error('Delete failed:', err);
   // alert(`Failed to delete ${file.filename}.`); // Replaced with a more graceful message later if needed
   setIsActionLoading(false); // Reset loading state on error only
   setShowDeleteConfirm(false);
 }
 // No finally block resetting loading state, as the component might unmount
};

const share = async () => {
 setShowMenu(false);
 setIsActionLoading(true); // Use isActionLoading for the modal spinner
 setShareLink('');
 setCopied(false);
 setShowShare(true);
 try {
   const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
   setShareLink(res.data.url);
 } catch (err) {
   console.error('Share failed:', err);
   // alert(`Failed to generate share link for ${file.filename}.`); // Replaced with a more graceful message later if needed
   setShowShare(false);
 } finally {
   setIsActionLoading(false); // Stop loading in modal regardless of outcome
 }
};

const copyToClipboard = async () => {
  if (!shareLink) return;
  try {
    await document.execCommand('copy'); // Using document.execCommand for broader compatibility in iframes
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Copy failed:', err);
    // alert('Failed to copy link.'); // Replaced with a more graceful message later if needed
  }
};

// --- Helpers ---
const formatSize = (bytes) => {
 if (bytes === null || bytes === undefined || bytes < 0) return 'N/A';
 if (bytes === 0) return '0 Bytes';
 const k = 1024;
 const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
 const i = Math.floor(Math.log(bytes) / Math.log(k));
 return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
 if (!dateString) return 'Unknown date';
 try {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  } catch (e) {
     console.error("Error formatting date:", dateString, e);
     return 'Invalid date';
  }
};

// Define Icon component for clarity
const FileTypeIcon = ({ type, darkMode, size = "h-10 w-10" }) => {
   const iconColor = darkMode ? "text-gray-400" : "text-gray-500";

   const icons = {
       image: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
       video: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
       audio: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
       document: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
       other: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
   };
   return <div className={iconColor}>{icons[type] || icons['other']}</div>;
};


// Preview logic based on metadata type and viewType
const renderPreview = (isListView) => {
 const url = `${backendUrl}/api/files/download/${file._id}`;
 const type = file.metadata?.type || 'other';

 // Classes for image/video previews
 const imageVideoPreviewClasses = 'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';

 // Base classes for the preview container
 let containerBaseClasses = `relative overflow-hidden group ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`;

 if (isListView) {
   containerBaseClasses += ' w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0'; // Small fixed size for list view
 } else {
   containerBaseClasses += ' h-32 mb-2 rounded-t-lg'; // Larger size for grid view
 }

 if (type === 'image') {
   return (
     <div className={containerBaseClasses}>
       <img src={url} alt={`Preview of ${file.filename}`} className={imageVideoPreviewClasses} loading="lazy" />
       <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
     </div>
   );
 }

 if (type === 'video') {
   return (
     <div className={containerBaseClasses}>
       <video src={`${url}#t=0.5`} preload="metadata" className={`${imageVideoPreviewClasses} bg-black`} />
       <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-300">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clipRule="evenodd" />
           </svg>
       </div>
     </div>
   );
 }

 // Default: Show file type icon centered
 const fileExtension = file.filename.split('.').pop().toUpperCase();
 return (
   <div className={`${containerBaseClasses} flex flex-col items-center justify-center`}>
      <FileTypeIcon type={type} darkMode={darkMode} size={isListView ? "h-8 w-8 sm:h-10 sm:w-10" : "h-10 w-10"} />
      {type !== 'audio' && ( // Don't show extension for audio as icon is clear
         <span className={`mt-1 text-xs font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
             {fileExtension}
         </span>
      )}
   </div>
 );
};

// Handle item click for selection
const handleItemClick = (e) => {
 // Allow clicking menu button even in selection mode
 const menuButton = e.currentTarget.querySelector('[aria-label="File options"]');
 if (menuButton && menuButton.contains(e.target)) {
     return; // Let menu button handle its own click
  }

 if (selectionMode) {
   e.preventDefault();
   onSelect(file._id);
 }
 // Potentially add navigation or file preview action here if not in selection mode
};

// --- Render ---
return (
 <>
   {/* Main Item Card */}
   <div
     className={cn(
       `relative text-sm rounded-xl shadow-md border transition-all duration-200 ease-in-out`, // Removed overflow-hidden
       isSelected
         ? `ring-2 ring-offset-1 ${darkMode ? 'ring-blue-500 bg-gray-750 border-blue-700' : 'ring-blue-600 bg-blue-50 border-blue-400'}`
         : `${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`,
       darkMode ? 'text-white' : 'text-gray-900',
       selectionMode ? 'cursor-pointer' : '',
       'transform hover:-translate-y-0.5 hover:shadow-lg',
       viewType === 'list'
         ? 'flex items-center p-3 gap-3 min-h-[90px] sm:min-h-[110px]' // Flex row for list view
         : 'flex flex-col justify-between h-full min-h-[200px]' // Original flex col for grid view
     )}
     onClick={handleItemClick}
     role="listitem" aria-selected={isSelected}
   >
     {/* Content Area */}
     {viewType === 'list' && (
       <>
         {/* Preview Area for List View */}
         {renderPreview(true)}

         {/* Info Area for List View */}
         <div className="flex flex-col flex-grow min-w-0"> {/* min-w-0 to allow truncation */}
           {/* Filename */}
           <h3
             title={file.filename}
             className={cn(
               `font-medium text-sm truncate mb-1`,
               darkMode ? 'text-gray-100' : 'text-gray-800'
             )}
           >
             {file.filename}
           </h3>

           {/* Basic Metadata (Size) - always visible */}
           <div className={cn(`text-xs mt-0.5`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
              <p className="truncate">{formatSize(file.length)}</p>
           </div>

           {/* Extended Metadata (conditionally rendered) */}
           {showDetails && (
             <div className={cn(
               `mt-2 text-xs space-y-1 pt-2 border-t`,
               darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
              )}>
               {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
               <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
               {file.metadata?.dimensions && (
                 <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>
               )}
             </div>
           )}
         </div>

         {/* Selection Indicator / Kebab Menu Area for List View */}
         <div className="flex-shrink-0 ml-auto self-start pt-1"> {/* ml-auto pushes it to the right, self-start aligns to top */}
             {selectionMode ? (
                // Selection Checkbox-like Indicator
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150",
                  isSelected
                     ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500')
                     : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80')
                )}>
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  )}
                </div>
            ) : (
                // Kebab Menu Button
                <div className="relative">
                   <button
                     onClick={(e) => {
                       e.stopPropagation(); // Prevent card click
                       setShowMenu(prev => !prev);
                     }}
                     className={cn(
                       `p-1.5 rounded-full transition-colors duration-150`,
                       showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700')
                              : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'),
                       'backdrop-blur-sm bg-opacity-50' // Add subtle background for visibility over preview
                     )}
                     aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options"
                   >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                   </button>

                   {/* Dropdown Menu */}
                   {showMenu && (
                     <div
                       ref={menuRef}
                       className={cn(
                         `absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border`,
                         `backdrop-blur-md`, // More blur
                         darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200'
                       )}
                       role="menu"
                     >
                       {/* Download Button (No Hover) */}
                       <button onClick={download} className={cn(
           'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
           darkMode ? 'text-white' : 'text-gray-700'
         )} role="menuitem">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
           </svg>
           Get
         </button>

                       {/* Divider between Download and Share */}
                        <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                       {/* Share Button (No Hover) */}
                       <button onClick={share} className={cn(
                         'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                         darkMode ? 'text-white' : 'text-gray-700' // Default text color
                       )} role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                       </button>

                       {/* Divider before Delete */}
                       <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                       {/* Delete Button (No Hover, retains color) */}
                       <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn(
                         'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                         darkMode ? 'text-red-400' : 'text-red-600' // Keep delete color indication
                       )} role="menuitem">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                       </button>
                     </div>
                   )}
                </div>
            )}
         </div>
       </>
     )}

     {viewType === 'grid' && (
       <div className="flex flex-col h-full">
           {/* Preview Area for Grid View */}
           {renderPreview(false)}

           {/* Info Area for Grid View */}
           <div className="p-3 pt-2 flex flex-col flex-grow">
             {/* Filename */}
             <h3
               title={file.filename}
               className={cn(
                 `font-medium text-sm truncate mb-1`,
                 darkMode ? 'text-gray-100' : 'text-gray-800'
               )}
             >
               {file.filename}
             </h3>

             {/* Basic Metadata (Size) - always visible */}
             <div className={cn(`text-xs mt-0.5`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
             </div>

              {/* Spacer to push metadata down if showDetails is true */}
             {showDetails && <div className="flex-grow min-h-[1rem]"></div>}

             {/* Extended Metadata (conditionally rendered) */}
             {showDetails && (
               <div className={cn(
                 `mt-2 text-xs space-y-1 pt-2 border-t`,
                 darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
                )}>
                 {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                 <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                 {file.metadata?.dimensions && (
                   <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>
                 )}
                 {/* Add more details if available */}
               </div>
             )}
           </div>

           {/* Selection Indicator / Kebab Menu Area for Grid View */}
           <div className="absolute top-1.5 right-1.5 z-10">
               {selectionMode ? (
                  // Selection Checkbox-like Indicator
                  <div className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150",
                    isSelected
                       ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500')
                       : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80')
                  )}>
                    {isSelected && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                  </div>
              ) : (
                  // Kebab Menu Button
                  <div className="relative">
                     <button
                       onClick={(e) => {
                         e.stopPropagation(); // Prevent card click
                         setShowMenu(prev => !prev);
                       }}
                       className={cn(
                         `p-1.5 rounded-full transition-colors duration-150`,
                         showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700')
                                : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'),
                         'backdrop-blur-sm bg-opacity-50' // Add subtle background for visibility over preview
                       )}
                       aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options"
                     >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                     </button>

                     {/* Dropdown Menu */}
                     {showMenu && (
                       <div
                         ref={menuRef}
                         className={cn(
                           `absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border`,
                           `backdrop-blur-md`, // More blur
                           darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200'
                         )}
                         role="menu"
                       >
                         {/* Download Button (No Hover) */}
                         <button onClick={download} className={cn(
             'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
             darkMode ? 'text-white' : 'text-gray-700'
           )} role="menuitem">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
             </svg>
             Get
           </button>

                         {/* Divider between Download and Share */}
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                         {/* Share Button (No Hover) */}
                         <button onClick={share} className={cn(
                           'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                           darkMode ? 'text-white' : 'text-gray-700' // Default text color
                         )} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                         </button>

                         {/* Divider before Delete */}
                         <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                         {/* Delete Button (No Hover, retains color) */}
                         <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn(
                           'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                           darkMode ? 'text-red-400' : 'text-red-600' // Keep delete color indication
                         )} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                         </button>
                       </div>
                     )}
                  </div>
              )}
           </div>
       </div>
     )}

     {/* Download Progress Overlay */}
     {isActionLoading && downloadProgress > 0 && (
       <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg backdrop-blur-sm">
          <div className="w-4/5 max-w-xs text-center">
            <div className="mb-1.5 text-xs font-medium text-white">Downloading... {downloadProgress}%</div>
            <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${downloadProgress}%` }}></div>
            </div>
          </div>
       </div>
     )}
   </div>

   {/* --- Modals for FileItem --- */}

   {/* Share Modal */}
   {showShare && (
     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
       <div
         ref={shareModalRef}
         className={cn(
           `p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`,
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          )}
         role="dialog" aria-modal="true" aria-labelledby="share-file-title"
       >
         {/* Close Button */}
         <button
           onClick={() => setShowShare(false)}
           className={cn(
               `absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50`,
                isActionLoading ? "cursor-not-allowed" : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')
            )}
           disabled={isActionLoading} title="Close" aria-label="Close share dialog"
         >
           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
         </button>
         {/* Title */}
         <h2 id="share-file-title" className={cn(`font-semibold mb-5 text-lg text-center truncate px-8`, darkMode ? 'text-white' : 'text-gray-800')}>
             Share
         </h2>

         {/* QR Code */}
         <div className="flex justify-center mb-5">
             <div className={cn("p-2 border rounded-lg", darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50')}>
                {isActionLoading && !shareLink ? ( // Show spinner while loading link
                   <div className="w-40 h-40 flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                   </div>
                ) : shareLink ? (
                  <QRCodeSVG
                    value={shareLink} size={160} bgColor="transparent"
                    fgColor={darkMode ? "#FFFFFF" : "#000000"} level="M" includeMargin={false} className="block"
                  />
                ) : ( // Show error if loading finished but no link
                   <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-500 p-2">Failed to load QR Code.</div>
                )}
             </div>
          </div>

         {/* Link Input and Copy Button */}
          <div className="flex flex-col gap-2.5 mb-4">
             <input
                value={isActionLoading ? 'Generating...' : shareLink || 'Error generating link'}
                readOnly
                className={cn(
                    `w-full px-3 py-2 rounded font-mono text-xs border`, // Smaller text
                    `overflow-x-auto whitespace-nowrap`, // Allow scroll
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-800',
                    'disabled:opacity-70'
                )}
                disabled={isActionLoading} aria-label="Shareable link" onClick={(e) => e.target.select()}
              />
              <button
                onClick={copyToClipboard}
                disabled={!shareLink || copied || isActionLoading}
                className={cn(
                    `w-full px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2`,
                     copied ? 'bg-green-600 text-white cursor-default'
                          : !shareLink || isActionLoading
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

         {/* Footer Text */}
         <p className={cn(`text-xs text-center`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
           Anyone with this link can view or download this file.
         </p>
       </div>
     </div>
   )}

   {/* Delete Confirmation Modal */}
   {showDeleteConfirm && (
     <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
       <div
         ref={deleteModalRef}
         className={cn(
           `p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`,
              darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
         )}
         role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" aria-describedby="delete-file-desc"
       >
          <h2 id="delete-file-title" className={cn(`font-semibold mb-2 text-lg`, darkMode ? 'text-white' : 'text-gray-800')}>Confirm Delete</h2>
          <p id="delete-file-desc" className={cn(`text-sm mb-3`, darkMode ? 'text-gray-300' : 'text-gray-600')}>
            Are you sure you want to permanently delete this file?
          </p>
          {/* Display filename */}
          <div className={cn(
              `font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-3 p-2 rounded text-sm`,
               darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
          )}>
            {file.filename}
          </div>
          <p className={cn(`text-sm mb-5`, darkMode ? 'text-gray-400' : 'text-gray-600')}>
            This action cannot be undone.
          </p>
          {/* Buttons */}
          <div className="flex w-full justify-between gap-3 mt-4">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isActionLoading}
              className={cn(
                  `flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm`,
                   isActionLoading
                      ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                      : (darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300')
              )}
            >
              Cancel
            </button>
            <button
              onClick={deleteFile}
              disabled={isActionLoading}
              className={cn(
                  `flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm text-white flex items-center justify-center gap-2`,
                  isActionLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700'
              )}
            >
               {isActionLoading && (
                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
               )}
              Delete
            </button>
          </div>
       </div>
     </div>
   )}

    {/* CSS Animations (shared with FileList, could be moved to a global CSS file) */}
     <style jsx>{`
         @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
         .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
         @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
         .animate-modalIn { animation: modalIn 0.25s ease-out; }
     `}</style>
 </>
);
};

export default FileItem;
