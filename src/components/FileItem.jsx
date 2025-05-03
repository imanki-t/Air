// components/FileItem.jsx
// This component displays a single file and handles individual actions
// (Download, Share, Delete) and selection state.
// Includes JWT authentication headers for API calls for multi-user support.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';
import { saveAs } from 'file-saver'; // Used for direct download fallback if streaming fails

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Helper function to get the JWT token from localStorage
const getToken = () => localStorage.getItem('token');


const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // --- State ---
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false); // For copy link button state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false); // Loading state for item-specific actions (download, share, delete)
  const [showMenu, setShowMenu] = useState(false); // For the kebab menu dropdown
  const [downloadProgress, setDownloadProgress] = useState(0); // 0-100 percentage for individual download
  const [isDownloading, setIsDownloading] = useState(false); // State for individual download progress overlay


  // --- Refs ---
  const menuRef = useRef(null); // Ref for the kebab menu dropdown element
  const shareModalRef = useRef(null); // Ref for the share modal element
  const deleteModalRef = useRef(null); // Ref for the delete confirmation modal element
  const itemRef = useRef(null); // Ref for the main file item div


  // --- Effects ---

  // Close menu/modals on outside click
  useEffect(() => {
    const handleOutsideClick = (event) => {
      // Close menu only if click is outside the menu itself
      if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
         // Check if the click target is the menu button to prevent immediate reopening
         // The menu button should be a child of the main item div, not the menu itself.
        const menuButton = itemRef.current?.querySelector('button[aria-label="File actions menu"]');
        if (!menuButton || !menuButton.contains(event.target)) {
             setShowMenu(false);
        }
      }

      // Close share modal if click is outside the modal content
      if (showShare && shareModalRef.current && !shareModalRef.current.contains(event.target)) {
           setShowShare(false);
           setShareLink(''); // Clear share link when closing modal
           setCopied(false); // Reset copied state
      }
       // Close delete modal if click is outside the modal content
       if (showDeleteConfirm && deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
           setShowDeleteConfirm(false);
       }
    };
    // Add event listener to the whole document
    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      // Clean up the event listener
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [showMenu, showShare, showDeleteConfirm, menuRef, shareModalRef, deleteModalRef, itemRef]); // Added all relevant refs/states to deps


   // Effect for copy link copied state
   useEffect(() => {
       if (copied) {
           const timer = setTimeout(() => setCopied(false), 2000);
           return () => clearTimeout(timer);
       }
   }, [copied]);


  // --- Action Handlers ---

  // Handle individual file download
  const downloadFile = useCallback(async () => {
    setIsActionLoading(true);
    setIsDownloading(true); // Show download progress overlay
    setDownloadProgress(0);
     setShowMenu(false); // Close menu immediately

    const token = getToken(); // Get token for auth
    if (!token) {
         alert('Download failed: Not authenticated. Please log in.');
         setIsActionLoading(false);
         setIsDownloading(false);
         setDownloadProgress(0);
         // Potentially trigger a global logout in App.jsx here
         return; // Stop if no token
    }


    try {
      const response = await axios({
        url: `${backendUrl}/api/files/download/${file._id}`,
        method: 'GET',
        responseType: 'blob', // Important: responseType must be 'blob' for file downloads
         headers: { // *** Add headers here ***
             Authorization: `Bearer ${token}` // *** Add Authorization header ***
         },
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setDownloadProgress(percentCompleted);
        },
      });

      // Use file-saver to trigger the download in the browser
      // Use the original filename from metadata if available, otherwise use GridFS filename
      const filename = file.metadata?.filename || file.filename || `download_${file._id}`;
      saveAs(response.data, filename);

      setIsActionLoading(false);
      setIsDownloading(false);
      setDownloadProgress(0);


    } catch (error) {
      console.error('Download error:', error);
      setIsActionLoading(false);
      setIsDownloading(false);
      setDownloadProgress(0);

      // Handle unauthorized error specifically
      if (error.response && error.response.status === 401) {
          alert('Session expired or unauthorized. Please log in again.');
           // Potentially trigger a global logout in App.jsx here
           // window.dispatchEvent(new CustomEvent('unauthorized')); // Custom event example
      } else if (error.response && error.response.data && error.response.data.error) {
           alert(`Download failed: ${error.response.data.error}`);
      }
      else {
         alert('Failed to download file.');
      }
    }
  }, [file, backendUrl]);


   // Handle individual file share
  const shareFile = useCallback(async () => {
    setIsActionLoading(true);
    setShareLink(''); // Clear previous link
    setCopied(false); // Reset copied state
    setShowMenu(false); // Close menu

    const token = getToken(); // Get token for auth
    if (!token) {
         alert('Share failed: Not authenticated. Please log in.');
         setIsActionLoading(false);
         // Potentially trigger a global logout in App.jsx here
         return; // Stop if no token
    }

    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`, {}, { // Pass empty data object if no body is needed
          headers: { // *** Add headers here ***
              Authorization: `Bearer ${token}` // *** Add Authorization header ***
          }
      });

      if (res.data && res.data.url) {
        setShareLink(res.data.url);
        setShowShare(true); // Show the share modal
      } else {
        // If backend doesn't return a URL but success status, something is wrong.
        throw new Error('Backend did not return a share URL.');
      }

      setIsActionLoading(false);

    } catch (err) {
      console.error('Share error:', err);
      setIsActionLoading(false);
      setShareLink(''); // Ensure link is cleared on error

       // Handle unauthorized error specifically
      if (err.response && err.response.status === 401) {
          alert('Session expired or unauthorized. Please log in again.');
           // Potentially trigger a global logout in App.jsx here
      } else if (err.response && err.response.data && err.response.data.error) {
           alert(`Share failed: ${err.response.data.error}`);
      }
      else {
         alert('Failed to generate share link.');
      }
    }
  }, [file, backendUrl]);


  // Handle individual file deletion
  const deleteFile = useCallback(async () => {
    setShowDeleteConfirm(false); // Close the confirmation modal
    setIsActionLoading(true);
    setShowMenu(false); // Close menu

    const token = getToken(); // Get token for auth
    if (!token) {
         alert('Delete failed: Not authenticated. Please log in.');
         setIsActionLoading(false);
         // Potentially trigger a global logout in App.jsx here
         return; // Stop if no token
    }


    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`, { // *** Add config object for headers ***
          headers: { // *** Add headers here ***
              Authorization: `Bearer ${token}` // *** Add Authorization header ***
          }
      });

      setIsActionLoading(false);
      // Call the refresh function passed from FileList to update the list
      if (refresh) refresh();

    } catch (err) {
      console.error('Delete error:', err);
      setIsActionLoading(false);

       // Handle unauthorized error specifically
      if (err.response && err.response.status === 401) {
          alert('Session expired or unauthorized. Please log in again.');
           // Potentially trigger a global logout in App.jsx here
      } else if (err.response && err.response.data && err.response.data.error) {
          alert(`Delete failed: ${err.response.data.error}`);
      }
      else {
         alert('Failed to delete file.');
      }
    }
  }, [file, backendUrl, refresh]); // Added refresh to deps


  // --- Utility Functions ---

  // Format bytes into a human-readable string
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    try {
       return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
       console.error("Error formatting date:", dateString, e);
       return 'Invalid Date';
    }
  };

   // Get file extension
   const getFileExtension = (filename) => {
        if (!filename) return '';
        const parts = filename.split('.');
        return parts.length > 1 ? parts.pop().toUpperCase() : 'FILE'; // Return extension in uppercase
   };


  // Determine the layout based on viewType prop
  const isListView = viewType === 'list';

  // --- Render Methods ---

  // Render file icon/preview based on type
  const renderFilePreview = () => {
    const fileType = file.metadata?.type || 'other';
    const fileMime = file.contentType || ''; // Use contentType from GridFS file object

    // Basic image preview
    // Using the /download route URL for previewing. Note: This route sets Content-Disposition: attachment.
    // Browsers might still render images if the blob is displayable, but a dedicated /preview route
    // without the attachment header would be better for explicit previewing vs downloading.
    if (fileType === 'image' && file._id) {
        return (
             <img
                // Using the download route. Auth headers are implicitly handled by axios wrapper or similar if implemented globally.
                // If not using a global wrapper, consider a separate public preview endpoint or
                // handle auth headers explicitly here if this image needs to be authenticated.
                // Given the current structure, the download route is protected, so this preview relies on authentication.
                src={`${backendUrl}/api/files/download/${file._id}`}
                alt={file.metadata?.filename || 'Image preview'}
                className={cn("w-full h-full rounded-md", isListView ? 'object-contain' : 'object-cover')} // Contain in list view, cover in grid view
                // Add onerror to show a fallback icon if the image fails to load/display (e.g., auth failed or file corrupted)
                onError={(e) => {
                     console.error("Image preview failed to load:", e.target.src);
                     e.target.onerror = null; // Prevent infinite loop
                     // Replace with a generic image icon or type indicator
                     const parent = e.target.parentElement;
                     if (parent) {
                         // Create fallback element (e.g., div with icon)
                         const fallback = document.createElement('div');
                         fallback.className = 'flex flex-col items-center justify-center w-full h-full bg-gray-700 rounded-md'; // Use same background as icons
                         fallback.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                 <span class="text-sm font-mono mt-2 text-gray-400">${getFileExtension(file.metadata?.filename || file.filename)}</span>`;
                         parent.replaceChild(fallback, e.target); // Replace the img tag with the fallback div
                     }
                }}
            />
        );
    }

     // Placeholder for video/audio previews (would require <video> or <audio> tags and authenticated streaming)
    if (fileType === 'video') {
         // return <video controls src={`${backendUrl}/api/files/download/${file._id}`} className="w-full h-full object-cover rounded-md"></video>;
        return (
             <div className="flex items-center justify-center w-full h-full bg-gray-700 rounded-md">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h.01M19 18h.01M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H6a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
             </div>
        );
    }
    if (fileType === 'audio') {
        // return <audio controls src={`${backendUrl}/api/files/download/${file._id}`} className="w-full h-full rounded-md"></audio>;
         return (
             <div className="flex items-center justify-center w-full h-full bg-gray-700 rounded-md">
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6a2 2 0 00-2-2H5a2 2 0 00-2 2v13a2 2 0 002 2h2a2 2 0 002-2zm0 0V6a2 2 0 012-2h2a2 2 0 012 2v13a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
        );
    }

    // Default icon for other types
    return (
        <div className="flex flex-col items-center justify-center w-full h-full bg-gray-700 rounded-md">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a3 3 0 011 5.917m-9 2.172A11.96 11.96 0 0112 15.75c2.929 0 5.642-.908 7.962-2.485-.59-.376-1.236-.691-1.927-.99A15.98 15.98 0 0012 13a15.98 0 00-6.035 1.765zm0 0h.01" />
            </svg>
            <span className="text-sm font-mono mt-2 text-gray-400">{getFileExtension(file.metadata?.filename || file.filename)}</span>
        </div>
    );
  };


  return (
    <div
        ref={itemRef} // Attach ref to the main div
        className={cn(
            `relative rounded-xl shadow-md border transition-colors duration-300 overflow-hidden group`,
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
            isActionLoading ? 'cursor-wait' : '', // Indicate loading with cursor
            selectionMode ? (isSelected ? (darkMode ? 'ring-2 ring-blue-500' : 'ring-2 ring-600') : (darkMode ? 'hover:border-gray-500 cursor-pointer' : 'hover:border-gray-400 cursor-pointer')) : '', // Add ring/hover effect in selection mode
            isListView ? 'flex items-center space-x-4 p-3 h-[100px]' : 'flex flex-col h-[280px] p-3' // Adjust padding/layout/height for list view
        )}
         // Handle click for selection mode - Stop propagation for clicks inside item when in selection mode
         onClick={selectionMode ? (e) => { e.stopPropagation(); onSelect(file._id); } : undefined}
    >
        {/* Selection Checkbox/Indicator */}
        {selectionMode && (
             <div className={cn(
                 "absolute top-2 left-2 w-6 h-6 rounded-full border flex items-center justify-center z-10 transition-all duration-100",
                 darkMode ? 'border-gray-500 bg-gray-700' : 'border-gray-400 bg-gray-200',
                 isSelected ? (darkMode ? 'bg-blue-600 border-blue-600' : 'bg-blue-600 border-blue-600') : ''
             )}>
                 {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                 )}
             </div>
        )}


        {/* File Preview / Icon Area */}
         {isListView ? (
             // List View Preview Area
             <div className="flex-shrink-0 w-16 h-16 flex items-center justify-center overflow-hidden rounded-md bg-gray-700"> {/* Added background */}
                 {renderFilePreview()}
             </div>
         ) : (
              // Grid View Preview Area
             <div className="w-full h-48 flex items-center justify-center overflow-hidden rounded-md bg-gray-700"> {/* Added background */}
                 {renderFilePreview()}
             </div>
         )}


      {/* File Info and Actions */}
      <div className={cn("flex-grow min-w-0", !isListView && "mt-2")}> {/* Added min-w-0 to allow truncation in list view */}
         {/* Filename and Kebab Menu */}
         <div className={cn("flex items-center justify-between", isListView ? 'mb-1' : 'mb-2')}> {/* Adjust margin bottom based on view */}
            <span className={cn("font-medium text-sm truncate", darkMode ? 'text-gray-200' : 'text-gray-800')}>
               {file.metadata?.filename || file.filename || 'Unnamed File'} {/* Use metadata filename first */}
            </span>

            {/* Kebab Menu Button - Hide in selection mode */}
            {!selectionMode && (
                <div className="relative flex-shrink-0"> {/* Ref is on the menu content, not the button */}
                    <button
                       onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} // Stop event propagation
                       className={cn(
                           "p-1 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500",
                           darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-200'
                       )}
                       aria-label="File actions menu"
                   >
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                           <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                       </svg>
                   </button>

                    {/* Kebab Menu Dropdown */}
                   {showMenu && (
                       <div
                           ref={menuRef} // Attach ref to the menu content
                           className={cn(
                           "absolute right-0 mt-2 w-48 rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-20", // Increased z-index
                           darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                       )} role="menu" aria-orientation="vertical" aria-labelledby="menu-button">
                           <div className="py-1" role="none">
                                {/* Download */}
                                <button
                                   onClick={(e) => { e.stopPropagation(); downloadFile(); }} // Stop propagation and call handler
                                    disabled={isActionLoading} // Disable while any action is loading
                                   className={cn(
                                       "flex items-center px-4 py-2 text-sm w-full text-left transition-colors disabled:opacity-50 disabled:cursor-wait",
                                       darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                   )}
                                   role="menuitem"
                               >
                                    {isActionLoading && isDownloading && (
                                       <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                    )}
                                   Download
                                </button>
                                {/* Share */}
                                <button
                                   onClick={(e) => { e.stopPropagation(); shareFile(); }} // Stop propagation and call handler
                                    disabled={isActionLoading} // Disable while any action is loading
                                    className={cn(
                                       "flex items-center px-4 py-2 text-sm w-full text-left transition-colors disabled:opacity-50 disabled:cursor-wait",
                                       darkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'
                                   )}
                                    role="menuitem"
                                >
                                     {isActionLoading && !isDownloading && showShare === false && ( // Show loading spinner specifically for share if not downloading
                                        <svg className="animate-spin h-4 w-4 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                     )}
                                    Share
                                </button>
                                {/* Delete */}
                                <button
                                   onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }} // Stop propagation and show modal
                                    disabled={isActionLoading} // Disable while any action is loading
                                    className={cn(
                                       "flex items-center px-4 py-2 text-sm w-full text-left transition-colors disabled:opacity-50 disabled:cursor-wait",
                                       darkMode ? 'text-red-400 hover:bg-red-900 hover:text-white' : 'text-red-600 hover:bg-red-100'
                                   )}
                                    role="menuitem"
                                >
                                    Delete
                                </button>
                           </div>
                       </div>
                   )}
                </div>
            )}
         </div>

         {/* File Details (Size, Date, Type, Dimensions) - Conditionally shown */}
         {showDetails && (
              <div className={cn("text-xs space-y-1", isListView ? '' : 'mt-1')}> {/* Adjust margin top in grid view */}
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Size: {formatBytes(file.length)}</p> {/* Use file.length for size */}
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Uploaded: {formatDate(file.uploadDate)}</p> {/* Use file.uploadDate */}
                  <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Type: {file.metadata?.type || 'Other'}</p>
                  {/* Add dimensions if available in metadata */}
                  {/* {file.metadata?.dimensions && (
                      <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Dimensions: {file.metadata.dimensions}</p>
                  )} */}
              </div>
          )}
      </div>

      {/* Download Progress Overlay */}
      {isDownloading && downloadProgress >= 0 && downloadProgress < 100 && ( // Show if downloading and not yet 100%
           <div className={cn(
               "absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 text-white text-lg font-bold z-30 animate-fadeIn",
               isActionLoading ? 'cursor-wait' : '' // Indicate loading with cursor
           )}>
               {downloadProgress}%
           </div>
      )}


      {/* Share Link Modal */}
      {showShare && (
        <div ref={shareModalRef} className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn")} aria-labelledby="share-link-title" role="dialog" aria-modal="true">
          <div className={cn(
             "relative rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all text-center",
              darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
           )}>
             <svg xmlns="http://www.w3.org/2000/svg" className={cn("mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 mb-4", darkMode ? 'text-blue-500' : 'text-blue-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6.632l6.632-3.316m0 6.632a3 3 0 110-2.684a3 3 0 010 2.684z" />
             </svg>
             <h3 className="text-lg leading-6 font-medium" id="share-link-title">Share File</h3>
             <div className="mt-4 text-center">
                {shareLink ? (
                    <>
                     {/* QR Code */}
                     <div className="flex justify-center mb-4">
                       <QRCodeSVG
                         value={shareLink}
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
                             value={shareLink}
                             readOnly
                             className={cn(
                                 "w-full px-3 py-2 pr-10 text-sm rounded-md border focus:outline-none",
                                 darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'border-gray-300 text-gray-700'
                             )}
                          />
                         <button
                              onClick={() => {
                                  navigator.clipboard.writeText(shareLink);
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
                     isActionLoading ? ( // Show generating message only if share action triggered loading
                         <p className={cn("text-sm flex items-center justify-center gap-2", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                            Generating link...
                         </p>
                     ) : (
                         <p className={cn("text-sm", darkMode ? 'text-gray-400' : 'text-gray-500')}>Link not available yet.</p>
                     )
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
                    setShowShare(false);
                    setShareLink(''); // Clear share link when closing modal
                    setCopied(false); // Reset copied state
                    setIsActionLoading(false); // Ensure loading is off
                 }}
               >
                 Close
               </button>
             </div>

            {/* Disclaimer below the link */}
            {shareLink && (
              <div className="mt-4 text-center">
                <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                  Anyone with the link can access this file.
                </p>
              </div>
            )}
          </div>
        </div>
      )}


       {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div ref={deleteModalRef} className={cn("fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fadeIn")} aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className={cn(
             "relative rounded-lg shadow-xl w-full max-w-sm p-6 transform transition-all",
              darkMode ? 'bg-gray-800 text-gray-200' : 'bg-white text-gray-800'
           )}>
             <div className="text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className={cn("mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 mb-4", darkMode ? 'text-red-500' : 'text-red-600')} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-lg leading-6 font-medium" id="modal-title">Delete File</h3>
                <div className="mt-2">
                  <p className={cn("text-sm", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                    Are you sure you want to delete "{file.metadata?.filename || file.filename}"? This action cannot be undone.
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
                 onClick={deleteFile}
                 disabled={isActionLoading} // Disable button while action is loading
               >
                 {isActionLoading ? (
                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                 ) : 'Delete'}
               </button>
               <button
                 type="button"
                 className={cn(
                   "mt-3 w-full inline-flex justify-center rounded-md border shadow-sm px-4 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm",
                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 hover:bg-gray-600 focus:ring-gray-500' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500'
                 )}
                 onClick={() => setShowDeleteConfirm(false)}
                 disabled={isActionLoading} // Disable cancel while action is loading
               >
                 Cancel
               </button>
             </div>
          </div>
        </div>
      )}


       {/* CSS Animations (shared with FileList, could be moved to a global CSS file) */}
        <style jsx>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
             @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
            }
            .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

             .dot {
                transition: transform 0.2s ease-in-out;
            }
        `}</style>
    </div>
  );
};

export default FileItem;
