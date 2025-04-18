// FileItem.jsx - Updated with improved styling, selection handling, and menu visibility
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react'; // Assuming QRCodeSVG is preferred over QRCode

// Utility function to generate conditional class names (assuming it's available globally or imported)
// If not available, you might need to define it here or import from a shared file
const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileItem = ({ file, refresh, showMetadata, darkMode, isSelected, onSelect, selectionMode, hideActions }) => {
 const backendUrl = import.meta.env.VITE_BACKEND_URL;

 const [showShare, setShowShare] = useState(false);
 const [shareLink, setShareLink] = useState('');
 const [copied, setCopied] = useState(false);
 const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
 const [isLoading, setIsLoading] = useState(false); // For individual file operations like download/share link generation
 const [showMenu, setShowMenu] = useState(false); // State for the kebab menu dropdown
 const [downloadProgress, setDownloadProgress] = useState(0);

 const menuRef = React.useRef(null);
 const shareModalRef = React.useRef(null);
 const deleteModalRef = React.useRef(null);


 // Close menu/modals when clicking outside (improved to use specific refs)
 useEffect(() => {
   const handleOutsideClick = (event) => {
     // Close Kebab menu if open and click is outside
     if (showMenu && menuRef.current && !menuRef.current.contains(event.target)) {
       setShowMenu(false);
     }
     // Close Share modal if open and click is outside
     if (showShare && shareModalRef.current && !shareModalRef.current.contains(event.target)) {
        // Optional: Decide if clicking outside should close the modal.
        // Keeping it open requires explicit close button click for better UX.
        // setShowShare(false);
     }
      // Close Delete modal if open and click is outside
     if (showDeleteConfirm && deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
        // Optional: Decide if clicking outside should close the modal.
        // Keeping it open requires explicit close button click for better UX.
        // setShowDeleteConfirm(false);
     }
   };

   document.addEventListener('mousedown', handleOutsideClick);

   return () => {
     document.removeEventListener('mousedown', handleOutsideClick);
   };
 }, [showMenu, showShare, showDeleteConfirm]); // Depend on modal/menu visibility states


 // Handle Escape key to close modals/menu
 const handleKeyDown = useCallback(
   (e) => {
     if (e.key === 'Escape') {
       if (showShare) setShowShare(false);
       else if (showDeleteConfirm) setShowDeleteConfirm(false);
       else if (showMenu) setShowMenu(false);
     }
   },
   [showShare, showDeleteConfirm, showMenu]
 );

 useEffect(() => {
   if (showShare || showDeleteConfirm || showMenu) {
     window.addEventListener('keydown', handleKeyDown);
   } else {
     window.removeEventListener('keydown', handleKeyDown);
   }
   return () => window.removeEventListener('keydown', handleKeyDown);
 }, [showShare, showDeleteConfirm, showMenu, handleKeyDown]); // Depend on states and handler


 const download = async () => {
   setShowMenu(false); // Close menu on action
   setIsLoading(true);
   setDownloadProgress(0);

   try {
     const response = await axios({
       url: `${backendUrl}/api/files/download/${file._id}`,
       method: 'GET',
       responseType: 'blob',
       onDownloadProgress: (progressEvent) => {
         const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
         setDownloadProgress(percentCompleted);
       },
     });

     // Create download link using file-saver
     saveAs(new Blob([response.data]), file.filename);

   } catch (err) {
     console.error('Download failed:', err);
     alert('Failed to download file.'); // User feedback
   } finally {
     setIsLoading(false);
     setDownloadProgress(0); // Reset progress after download attempt
   }
 };

 const deleteFile = async () => {
   setShowDeleteConfirm(false); // Close confirmation modal immediately
   setIsLoading(true); // Indicate loading for the delete action
   try {
     await axios.delete(`${backendUrl}/api/files/${file._id}`);
     refresh(); // Refresh file list in parent component
   } catch (err) {
     console.error('Delete failed:', err);
      alert('Failed to delete file.'); // User feedback
   } finally {
     setIsLoading(false); // End loading
   }
 };

 const share = async () => {
   setShowMenu(false); // Close menu on action
   setIsLoading(true); // Indicate loading for link generation
   setShareLink(''); // Clear previous link
   setCopied(false); // Reset copied state

   try {
     const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
     const shareUrl = res.data.url; // Assuming backend returns { url: '...' }
     if (!shareUrl) {
         throw new Error("Share URL not received from backend.");
     }
     setShareLink(shareUrl);
     setShowShare(true); // Show share modal with the link
   } catch (err) {
     console.error('Share failed:', err);
     alert('Failed to generate share link.'); // User feedback
     setShowShare(false); // Ensure modal is closed on error
   } finally {
     setIsLoading(false); // End loading
   }
 };

 const copyToClipboard = async () => {
   if (!shareLink) return; // Only copy if link exists
   try {
     await navigator.clipboard.writeText(shareLink);
     setCopied(true);
     setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
   } catch (err) {
     console.error('Copy failed:', err);
     alert('Could not copy link to clipboard.'); // User feedback
   }
 };

 const formatSize = (bytes) => {
   if (bytes === undefined || bytes === null) return 'Unknown';
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
 };


 const renderPreview = () => {
   const url = `${backendUrl}/api/files/download/${file._id}`;
   const type = file.metadata?.type;
   // Use object-cover for grid view, object-contain for list view or default
   const previewClass = cn(
       'rounded-md mb-2 w-full',
       'object-cover', // Default to cover for grid
       'h-28', // Fixed height for grid preview
       // Add list view specific height if needed, or let content dictate
       // viewMode === 'list' ? 'h-auto' : 'h-28',
       isLoading ? 'opacity-50' : '' // Indicate loading visually
   );

   // Simple check for common image types
   if (type && type.startsWith('image/')) return <img src={url} alt={file.filename} className={previewClass} />;
   // Simple check for common video types
   if (type && type.startsWith('video/')) return <video src={url} controls className={previewClass} />;
   // Simple check for common audio types
   if (type && type.startsWith('audio/')) return <audio src={url} controls className="w-full mb-2" />;


   // Fallback for other file types
   return (
     <div className={cn(
         `flex items-center justify-center h-28 mb-2 rounded-md`, // Fixed height for consistency in grid
         darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600',
         isLoading ? 'opacity-50' : ''
     )}>
       <div className="text-center p-2">
         <div className="text-2xl mb-1">
           {/* Icon/Text based on file extension or type */}
           {(() => {
             const ext = file.filename.split('.').pop()?.toLowerCase() || '';
             switch (ext) {
               case 'pdf': return 'PDF';
               case 'doc': case 'docx': return 'DOC';
               case 'xls': case 'xlsx': return 'XLS';
               case 'ppt': case 'pptx': return 'PPT';
               case 'zip': case 'rar': case '7z': return 'ZIP';
               case 'txt': return 'TXT';
               // Add more cases for other common types
               default:
                   // Fallback based on general type if available
                   if (type && type.includes('document')) return 'DOC';
                   if (type && type.includes('text')) return 'TXT';
                   return 'FILE'; // Generic fallback
             }
           })()}
         </div>
         <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
           {file.filename.split('.').pop()?.toUpperCase() || 'N/A'}
         </span>
       </div>
     </div>
   );
 };

 // For file selection in batch operations - prevent default link behavior
 const handleItemClick = (e) => {
   if (selectionMode) {
     // Prevent default behavior like navigating for links
     e.preventDefault();
     // Stop propagation to prevent the click from affecting parent elements unnecessarily
     e.stopPropagation();
     onSelect(file._id);
   }
   // If not in selection mode, allow default click behavior (e.g., opening file link if the div was a link)
   // Note: The current structure is a div, so default behavior is just the click handler.
   // If you wrap this in an <a> tag, you'd need to preventDefault conditionally.
 };


 return (
   <>
     <div
       className={cn(
         `w-full relative transition-all duration-300 ease-in-out cursor-pointer`, // Added cursor-pointer
         // Removed fixed height, let content and padding manage height
         // ${showMetadata ? 'h-auto' : 'h-[180px]'}
         'flex flex-col justify-between p-3 sm:p-4 text-sm sm:text-base rounded-xl shadow-md border',
         // IMPORTANT: Removed overflow-hidden to prevent menu clipping
         // overflow-hidden
         isSelected ? 'ring-2 ring-blue-500 border-blue-500' : '',
         darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'
       )}
       onClick={handleItemClick}
     >
       {/* Selection Checkbox (Shown only in selection mode) */}
       {selectionMode && (
         // Use a styled div instead of default checkbox for better control and theme matching
         <div
           className={cn(
             "absolute top-2 left-2 z-10 w-5 h-5 rounded flex items-center justify-center cursor-pointer",
             isSelected ? "bg-blue-600 border-blue-600" : (darkMode ? "bg-gray-600 border-gray-500" : "bg-gray-200 border-gray-300"),
             "border"
           )}
            onClick={(e) => { e.stopPropagation(); onSelect(file._id); }} // Stop propagation to not trigger item click
         >
           {/* Replaced blue tick with a simple checkmark SVG if selected */}
           {isSelected && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                   <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                 </svg>
           )}
         </div>
       )}

       {/* Loading Progress Indicator (for individual file download) */}
       {isLoading && downloadProgress > 0 && downloadProgress < 100 && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20"> {/* Increased z-index */}
            <div className="w-4/5 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-linear"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

       {/* Kebab Menu Button (Hidden during selectionMode) */}
       {!hideActions && (
         <div className="absolute top-2 right-2 z-30"> {/* Increased z-index */}
           <button
             onClick={(e) => {
               e.stopPropagation(); // Prevent click from selecting item
               setShowMenu(!showMenu);
             }}
             className={cn(
               `p-1 rounded-full transition-colors duration-200`,
               darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-200'
             )}
             title="Actions"
           >
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
             </svg>
           </button>

           {/* Dropdown Menu */}
           {showMenu && (
             <div
               ref={menuRef}
               className={cn(
                 `absolute right-0 mt-1 py-1 w-36 rounded-md shadow-lg z-50 origin-top-right animate-fade-in-down`, // Added animation
                 darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'
               )}
             >
               <button
                 onClick={download}
                 className={cn(
                   `w-full text-left px-4 py-2 text-sm transition-colors duration-150`,
                   darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                 )}
               >
                 Download
               </button>
               <button
                 onClick={share}
                 className={cn(
                   `w-full text-left px-4 py-2 text-sm transition-colors duration-150`,
                   darkMode ? 'hover:bg-gray-600 text-gray-200' : 'hover:bg-gray-100 text-gray-700'
                 )}
               >
                 Share
               </button>
               <button
                 onClick={(e) => {
                   e.stopPropagation(); // Prevent click from selecting item
                   setShowMenu(false); // Close kebab menu
                   setShowDeleteConfirm(true); // Open delete modal
                 }}
                 className={cn(
                   `w-full text-left px-4 py-2 text-sm transition-colors duration-150`,
                   darkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-100 text-red-600'
                 )}
               >
                 Delete
               </button>
             </div>
           )}
         </div>
       )}

       {/* File Preview */}
       {renderPreview()}

       {/* File Name (with tooltip and truncate) */}
       <h3 title={file.filename} className={cn(`font-semibold truncate`, darkMode ? 'text-white' : 'text-gray-800')}>
         {file.filename}
       </h3>

       {/* Metadata (shown conditionally) */}
       {showMetadata && (
         <div className={cn(`mt-2 text-xs space-y-1`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
           <p>Type: {file.metadata?.type || 'Unknown'}</p>
           <p>Size: {formatSize(file.length)}</p>
           <p>Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
         </div>
       )}
     </div>

     {/* Share Modal */}
     {showShare && (
       <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div ref={shareModalRef} className={cn(
           `p-6 rounded-lg shadow-xl max-w-sm w-full relative`,
           darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
         )}>
           <button
             onClick={() => setShowShare(false)}
             className={cn(
               "absolute top-3 right-3 p-1 rounded-full transition-colors",
               darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
             )}
             title="Close"
           >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
           </button>
           <h2 className={cn(`font-semibold text-xl mb-4 text-center`, darkMode ? 'text-white' : 'text-gray-900')}>Shareable Link</h2>

           {shareLink ? (
             <div className="flex justify-center my-5">
               <div className={cn(
                  "p-3 rounded-lg inline-block",
                  darkMode ? 'bg-white' : 'bg-gray-50' // White background for QR code readability
                )}>
                 {/* Using QRCodeSVG */}
                 <QRCodeSVG
                   value={shareLink}
                   size={150} // Adjusted size for consistency
                   level={"H"}
                   includeMargin={true}
                   bgColor={darkMode ? "#FFFFFF" : "#F9FAFB"} // Match inner background
                   fgColor={darkMode ? "#1F2937" : "#111827"} // Match text colors
                 />
               </div>
             </div>
           ) : (
             // Show a loading indicator or message while link is generating
             <div className={cn("flex justify-center my-5 text-center", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p>Generating link...</p>
                {/* Optional: Add a spinner */}
             </div>
           )}

           {/* Share link input */}
           <div className={cn(
             'flex items-center mb-5 p-2 rounded-md border',
             darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
           )}>
             <input
               type="text"
               value={shareLink || ''} // Display empty if not generated yet
               readOnly
               className={cn(
                 'flex-grow text-sm p-1 bg-transparent outline-none truncate',
                 darkMode ? 'text-gray-300' : 'text-gray-700'
               )}
             />
             <button
               onClick={copyToClipboard}
               disabled={!shareLink || copied} // Disable if no link or already copied
               className={cn(
                 'ml-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex-shrink-0',
                 copied
                   ? 'bg-green-600 text-white'
                   : !shareLink
                     ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                     : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
               )}
             >
               {copied ? 'Copied!' : 'Copy'}
             </button>
           </div>

           <div className="flex justify-center mt-6">
             <button
               onClick={() => setShowShare(false)}
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

     {/* Delete Confirmation Modal */}
     {showDeleteConfirm && (
       <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
         <div ref={deleteModalRef} className={cn(
           `p-6 rounded-lg shadow-xl max-w-sm w-full relative`,
           darkMode ? 'bg-gray-800 border border-gray-700 text-gray-200' : 'bg-white border border-gray-200 text-gray-800'
         )}>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className={cn(
                "absolute top-3 right-3 p-1 rounded-full transition-colors",
                darkMode ? 'text-gray-400 hover:text-white hover:bg-gray-600' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'
              )}
              title="Close"
            >
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
            </button>
           <h2 className={cn(`font-semibold text-xl mb-4`, darkMode ? 'text-white' : 'text-gray-900')}>Confirm Delete</h2>
           <p className={cn(`text-sm mb-6`, darkMode ? 'text-gray-300' : 'text-gray-600')}>
             Are you sure you want to permanently delete
             <span className={cn("font-bold max-w-full truncate overflow-hidden whitespace-nowrap block my-1", darkMode ? 'text-white' : 'text-gray-800')}>
               {file.filename}
             </span>
             This action cannot be undone.
           </p>
           <div className="flex justify-end gap-3">
             <button
               onClick={() => setShowDeleteConfirm(false)}
               className={cn(
                 'px-4 py-2 rounded-md font-medium transition-colors duration-150 border',
                 darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300'
               )}
             >
               Cancel
             </button>
             <button
               onClick={deleteFile}
               disabled={isLoading} // Disable delete button while deleting
               className={cn(
                 'px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors duration-150 flex items-center justify-center',
                  isLoading ? 'opacity-70 cursor-wait' : ''
               )}
             >
                {isLoading ? (
                   <>
                     <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                     Deleting...
                   </>
                 ) : 'Delete'
               }
             </button>
           </div>
         </div>
       </div>
     )}
   </>
 );
};

export default FileItem;