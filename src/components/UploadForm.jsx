import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

// Utility for conditional class names (from FileList.jsx)
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Constants for upload behavior and state management
const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes for upload state expiry
const STORAGE_KEY = 'fileUploadState'; // Key for localStorage
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000; // Delay before starting each file upload (for UI feedback)
const MAX_FILES_SELECTED = 10; // Maximum number of files a user can select at once
const UPLOADED_FILES_DISPLAY_TIMEOUT = 5000; // 5 seconds for uploaded files to disappear

const UploadForm = ({ refresh, darkMode }) => {
 // State variables for managing file uploads and UI
 const [files, setFiles] = useState([]); // Files selected by the user, awaiting upload
 const [uploadedFiles, setUploadedFiles] = useState([]); // Files successfully uploaded
 const [currentFileIndex, setCurrentFileIndex] = useState(0); // Index of the file currently being uploaded
 const [message, setMessage] = useState(''); // User feedback messages
 const [progress, setProgress] = useState(0); // Progress of the current file being uploaded
 const [isUploading, setIsUploading] = useState(false); // Flag to indicate if an upload is in progress
 const [truncateLength, setTruncateLength] = useState(15); // Length to truncate file names for display
 const [estimatedTime, setEstimatedTime] = useState(null); // Estimated time remaining for current upload
 const [uploadSpeed, setUploadSpeed] = useState(0); // Current upload speed
 const [pendingResume, setPendingResume] = useState(null); // State for a pending single-file resume
 const [messageTimer, setMessageTimer] = useState(null); // Timer for clearing messages
 const [showUploadedFiles, setShowUploadedFiles] = useState(false); // Controls visibility of uploaded files section

 // Refs for DOM elements and mutable values
 const controllerRef = useRef(null); // AbortController for cancelling uploads
 const fileInputRef = useRef(null); // Reference to the hidden file input element
 const uploadFileRef = useRef(null); // Reference to the file currently being uploaded
 const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 }); // For calculating upload speed
 const uploadTimeoutRef = useRef(null); // Timeout for delayed upload start
 const socketRef = useRef(null); // WebSocket for real-time updates (e.g., refreshing file list)
 const uploadedFilesDisplayTimerRef = useRef(null); // Timer for hiding uploaded files

 // Effect for initializing WebSocket connection
 useEffect(() => {
   // Connect to the backend WebSocket server
   socketRef.current = io(import.meta.env.VITE_BACKEND_URL);
   // Disconnect on component unmount
   return () => {
     if (socketRef.current) socketRef.current.disconnect();
   };
 }, []);

 // Effect for checking saved uploads and handling window focus/unmount
 useEffect(() => {
   checkForSavedUploads(); // Check for any incomplete uploads on component mount

   const handleFocus = () => {
     checkForSavedUploads(); // Re-check on window focus
   };

   window.addEventListener('focus', handleFocus);

   return () => {
     window.removeEventListener('focus', handleFocus);
     // Clear any active timers on component unmount
     if (messageTimer) {
       clearTimeout(messageTimer);
     }
     if (uploadTimeoutRef.current) {
       clearTimeout(uploadTimeoutRef.current);
     }
     if (uploadedFilesDisplayTimerRef.current) {
       clearTimeout(uploadedFilesDisplayTimerRef.current);
     }
   };
 }, []);

 // Function to check for and load saved upload state from localStorage
 const checkForSavedUploads = () => {
   try {
     const savedUploadState = localStorage.getItem(STORAGE_KEY);
     if (!savedUploadState) return false;

     const parsedState = JSON.parse(savedUploadState);
     const now = Date.now();
     // Check if the saved state is still valid (within expiry time)
     if (parsedState?.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
       setPendingResume(parsedState); // Set pending resume state
       return true;
     } else {
       // If expired or invalid, remove from localStorage and clean up
       localStorage.removeItem(STORAGE_KEY);
       if (parsedState?.fileId) {
         cleanupIncompleteUpload(parsedState.fileId);
       }
       return false;
     }
   } catch (error) {
     console.error('Error checking for saved uploads:', error);
     localStorage.removeItem(STORAGE_KEY); // Clear localStorage on error
     return false;
   }
 };

 // Effect for updating file name truncation length based on window size
 useEffect(() => {
   const updateTruncateLength = () => {
     setTruncateLength(window.innerWidth >= 768 ? 50 : 25);
   };

   updateTruncateLength(); // Set initial length
   window.addEventListener('resize', updateTruncateLength); // Update on resize

   return () => {
     window.removeEventListener('resize', updateTruncateLength); // Clean up event listener
   };
 }, []);

 // Function to save current upload state to localStorage for resume
 const saveUploadState = (uploadData = null) => {
   // Only save if it's a single file upload scenario or specific upload data is provided
   if (files.length > 1) return; // Do not save state for multi-file uploads

   const dataToSave = uploadData ||
     (uploadFileRef.current && {
       fileName: uploadFileRef.current.name,
       fileSize: uploadFileRef.current.size,
       fileType: uploadFileRef.current.type,
       progress: progress,
       fileId: uploadFileRef.current.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now() // Unique ID for the file
     });
   if (!dataToSave) return;

   dataToSave.timestamp = Date.now(); // Add timestamp for expiry

   // Read a slice of the file to create a signature for verification
   if (uploadFileRef.current) {
     const reader = new FileReader();
     reader.onload = function(event) {
       const fullResult = event.target.result;
       const truncatedResult = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024)); // Max 1MB signature
       dataToSave.fileSignature = truncatedResult;
       localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
     };
     const fileSlice = uploadFileRef.current.slice(0, Math.min(1024 * 1024, uploadFileRef.current.size));
     reader.readAsDataURL(fileSlice);
   } else {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
   }
 };

 // Effect for managing message display timeout
 useEffect(() => {
   if (message) {
     if (messageTimer) {
       clearTimeout(messageTimer);
     }

     const timer = setTimeout(() => {
       setMessage(''); // Clear message after timeout
     }, STATUS_MESSAGE_TIMEOUT);

     setMessageTimer(timer);

     return () => {
       clearTimeout(timer); // Clean up timer on message change or component unmount
     };
   }
 }, [message]);

 // Function to clean up incomplete uploads on the backend
 const cleanupIncompleteUpload = async (fileId) => {
   try {
     await axios.delete(
       `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${fileId}`
     );
   } catch (error) {
     console.error('Error cleaning up incomplete upload:', error);
   }
 };

 // Helper function to truncate file names for display
 const getTruncatedFileName = (name) => {
   if (!name) return '';
   return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
 };

 // Helper function to format time in seconds into a human-readable string
 const formatTimeRemaining = (seconds) => {
   if (!seconds && seconds !== 0) return 'Calculating...';
   if (seconds < 60) {
     return `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? 's' : ''}`;
   } else if (seconds < 3600) {
     const minutes = Math.floor(seconds / 60);
     const remainingSeconds = Math.round(seconds % 60);
     return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ?
       's' : ''}`;
   } else if (seconds < 86400) {
     const hours = Math.floor(seconds / 3600);
     const minutes = Math.floor((seconds % 3600) / 60);
     return `${hours} hour${hours !== 1 ?
       's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
   } else {
     const days = Math.floor(seconds / 86400);
     const hours = Math.floor((seconds % 86400) / 3600);
     return `${days} day${days !== 1 ?
       's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
   }
 };

 // Helper function to calculate estimated time remaining for upload
 const calculateTimeRemaining = (loaded, total, uploadSpeed) => {
   if (uploadSpeed <= 0) return null;
   const remainingBytes = total - loaded;
   const remainingTimeSeconds = remainingBytes / uploadSpeed;

   return formatTimeRemaining(remainingTimeSeconds);
 };

 // Helper function to format bytes into human-readable sizes (KB, MB, GB, etc.)
 const formatBytes = (bytes, decimals = 2) => {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const dm = decimals < 0 ? 0 : decimals;
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
 };

 // Function to verify file signature for resume functionality (single file)
 const verifyFileSignature = async (selectedFile, fileSignature) => {
   if (!selectedFile || !fileSignature) return false;
   return new Promise((resolve) => {
     const reader = new FileReader();
     reader.onload = function(event) {
       const fullResult = event.target.result;
       const selectedSignature = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));
       resolve(selectedSignature === fileSignature);
     };
     const fileSlice = selectedFile.slice(0, Math.min(1024 * 1024, selectedFile.size));
     reader.readAsDataURL(fileSlice);
   });
 };

 // Core function to perform the actual file upload
 const performUpload = async (fileToUpload) => {
   const formData = new FormData();
   formData.append('file', fileToUpload);

   // Apply resumable upload parameters if applicable (only for single file resume)
   if (pendingResume && files.length === 0 && fileToUpload.name === pendingResume.fileName && fileToUpload.size === pendingResume.fileSize) {
     formData.append('resumableUploadId', pendingResume.fileId);
     formData.append('resumableProgress', pendingResume.progress.toString());
   }

   const controller = new AbortController();
   controllerRef.current = controller; // Store controller for potential cancellation

   try {
     setMessage(''); // Clear previous messages
     setProgress(pendingResume && files.length === 0 && fileToUpload.name === pendingResume.fileName && fileToUpload.size === pendingResume.fileSize ? pendingResume.progress : 0);
     setEstimatedTime('Calculating...');
     setUploadSpeed(0);
     lastProgressUpdateRef.current = { time: Date.now(), loaded: 0 };
     setShowUploadedFiles(true); // Show uploaded files section when upload starts

     // Event listeners for window unload to save upload state
     const handleUnload = () => {
       if (progress < 100 && files.length === 0) { // Only save for single file incomplete uploads
         saveUploadState({
           fileName: fileToUpload.name,
           fileSize: fileToUpload.size,
           fileType: fileToUpload.type,
           progress: progress,
           fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
         });
       }
     };

     window.addEventListener('unload', handleUnload);
     window.addEventListener('beforeunload', handleUnload);

     // Axios POST request to upload the file
     await axios.post(
       `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
       formData,
       {
         signal: controller.signal, // Abort signal
         headers: {
           'Content-Type': 'multipart/form-data'
         },
         onUploadProgress: (event) => {
           if (!event.total) {
             setMessage('Unable to calculate upload progress. Upload is continuing...');
             return;
           }

           const percent = Math.round((event.loaded * 100) / event.total);
           setProgress(percent);

           const now = Date.now();
           const timeDiff = now - lastProgressUpdateRef.current.time;
           if (timeDiff > 500) { // Update speed every 500ms
             const loadedDiff =
               event.loaded - lastProgressUpdateRef.current.loaded;
             const speedBps = (loadedDiff / timeDiff) * 1000;
             setUploadSpeed(speedBps);
             lastProgressUpdateRef.current = { time: now, loaded: event.loaded };

             if (speedBps > 0) {
               const remaining = calculateTimeRemaining(event.loaded, event.total, speedBps);
               setEstimatedTime(remaining);
             }
           }

           if (percent === 100) {
             setEstimatedTime('Finalizing...');
           }

           // Save upload state periodically for single file uploads
           if (percent < 100 && percent % 5 === 0 && files.length === 0) {
             saveUploadState({
               fileName: fileToUpload.name,
               fileSize: fileToUpload.size,
               fileType: fileToUpload.type,
               progress: percent,
               fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
             });
           }
         }
       }
     );

     // Clean up after successful upload
     window.removeEventListener('unload', handleUnload);
     window.removeEventListener('beforeunload', handleUnload);
     localStorage.removeItem(STORAGE_KEY); // Clear saved state
     setPendingResume(null);
     uploadFileRef.current = null;
     setMessage(`File "${fileToUpload.name}" uploaded successfully.`);

     // Add the successfully uploaded file to the list
     setUploadedFiles(prev => [...prev, fileToUpload]);

     // Move to the next file if multiple files are selected
     if (currentFileIndex < files.length - 1) {
       setCurrentFileIndex(prevIndex => prevIndex + 1);
     } else {
       // All files uploaded
       setIsUploading(false);
       setFiles([]); // Clear the list of files to upload
       setCurrentFileIndex(0);
       setMessage('All files uploaded successfully!');
       // Set timer to hide uploaded files section
       if (uploadedFilesDisplayTimerRef.current) {
         clearTimeout(uploadedFilesDisplayTimerRef.current);
       }
       uploadedFilesDisplayTimerRef.current = setTimeout(() => {
         setShowUploadedFiles(false);
         setUploadedFiles([]); // Clear the list after hiding
       }, UPLOADED_FILES_DISPLAY_TIMEOUT);
     }

     // Emit WebSocket event and refresh parent component
     if (socketRef.current) {
       socketRef.current.emit('fileUploaded');
     }
     refresh();
   } catch (err) {
     // Handle upload errors
     window.removeEventListener('unload', handleUnload);
     window.removeEventListener('beforeunload', handleUnload);

     if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
       setMessage('Upload cancelled.');
     } else {
       const errorMessage = err.response?.status === 413
         ?
         'File too large. Please upload a smaller file.'
         : err.response?.status === 415
           ?
           'Unsupported file type. Please try a different file.'
           : err.response?.status >= 500
             ?
             'Server error. Please try again later.'
             : 'Upload failed. Please try again.';

       setMessage(errorMessage);
       // Save upload state for single file resume on failure
       if (files.length === 0) {
         saveUploadState({
           fileName: fileToUpload.name,
           fileSize: fileToUpload.size,
           fileType: fileToUpload.type,
           progress: progress,
           fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
         });
         setPendingResume({
           fileName: fileToUpload.name,
           fileSize: fileToUpload.size,
           fileType: fileToUpload.type,
           progress: progress,
           fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now(),
           timestamp: Date.now()
         });
       }
     }
     setIsUploading(false); // Stop uploading on error
     setShowUploadedFiles(false); // Hide uploaded files section on error
   } finally {
     setProgress(0); // Reset progress
     setEstimatedTime(null);
     setUploadSpeed(0);
     controllerRef.current = null;
     uploadTimeoutRef.current = null;
   }
 };

 // Function to initiate the upload process for multiple files
 const handleUpload = async (e) => {
   if (e) e.preventDefault(); // Prevent default form submission

   if (files.length === 0) {
     setMessage('Please select files to upload.');
     return;
   }

   if (!isUploading) { // Start uploading only if not already uploading
     setIsUploading(true);
     setCurrentFileIndex(0); // Start from the first file
     setMessage('');
     uploadFileRef.current = files[0]; // Set the first file to be uploaded
     setShowUploadedFiles(true); // Show uploaded files section when upload starts

     uploadTimeoutRef.current = setTimeout(() => {
       performUpload(files[0]); // Start the first upload after a delay
     }, UPLOAD_DELAY);
   }
 };

 // Effect to automatically proceed to the next file in the queue
 useEffect(() => {
   if (isUploading && !uploadTimeoutRef.current && currentFileIndex < files.length) {
     // If uploading, no current timeout, and there are more files
     uploadFileRef.current = files[currentFileIndex]; // Set the next file
     setProgress(0); // Reset progress for the new file
     uploadTimeoutRef.current = setTimeout(() => {
       performUpload(files[currentFileIndex]); // Start uploading the next file
     }, UPLOAD_DELAY);
   } else if (isUploading && currentFileIndex >= files.length) {
     // If all files have been processed
     setIsUploading(false);
     setMessage('All files uploaded successfully!');
     setFiles([]); // Clear the list of files to upload
     setCurrentFileIndex(0);
     // Set timer to hide uploaded files section
     if (uploadedFilesDisplayTimerRef.current) {
       clearTimeout(uploadedFilesDisplayTimerRef.current);
     }
     uploadedFilesDisplayTimerRef.current = setTimeout(() => {
       setShowUploadedFiles(false);
       setUploadedFiles([]); // Clear the list after hiding
     }, UPLOADED_FILES_DISPLAY_TIMEOUT);
   }
 }, [currentFileIndex, files, isUploading]); // Dependencies: current file, files list, uploading status

 // Function to cancel the ongoing upload or clear all selected files
 const handleCancel = () => {
   if (uploadTimeoutRef.current) {
     clearTimeout(uploadTimeoutRef.current);
     uploadTimeoutRef.current = null;
   }

   if (controllerRef.current) {
     controllerRef.current.abort(); // Abort the current Axios request
     controllerRef.current = null;
   }

   localStorage.removeItem(STORAGE_KEY); // Clear saved state
   setPendingResume(null);
   uploadFileRef.current = null;

   setIsUploading(false);
   setFiles([]); // Clear all files to upload
   setUploadedFiles([]); // Clear successfully uploaded files as well on full cancel
   setCurrentFileIndex(0);
   setShowUploadedFiles(false); // Hide uploaded files section on cancel

   if (pendingResume?.fileId) {
     cleanupIncompleteUpload(pendingResume.fileId);
   }

   setMessage('Upload cancelled.');
 };

 // Function to remove a file from the list of files to be uploaded
 const handleRemoveFile = (indexToRemove) => {
   setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
   if (files.length === 1) { // If only one file was left and it's removed
     setMessage('');
   }
 };

 // Callback for handling files dropped into the drag-and-drop area
 const handleDrop = useCallback(async (e) => {
   e.preventDefault();
   e.stopPropagation();

   if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
     setMessage('No valid files detected. Please try again.');
     return;
   }

   const droppedFiles = Array.from(e.dataTransfer.files);
   // Limit to MAX_FILES_SELECTED
   const newFiles = [...files, ...droppedFiles].slice(0, MAX_FILES_SELECTED);
   if (newFiles.length > MAX_FILES_SELECTED) {
     setMessage(`You can only select a maximum of ${MAX_FILES_SELECTED} files.`);
     return;
   }
   setFiles(newFiles);
   setMessage('');
   setPendingResume(null); // Clear resume state when new files are selected
   localStorage.removeItem(STORAGE_KEY);
 }, [files]); // Dependency on 'files' to correctly append

 // Callback for handling drag over events (to allow dropping)
 const handleDragOver = useCallback((e) => {
   e.preventDefault();
   e.stopPropagation();
 }, []);

 // Handler for when files are selected via the file input
 const handleFileInputChange = async (e) => {
   if (!e.target.files || e.target.files.length === 0) {
     return;
   }

   const selectedFiles = Array.from(e.target.files);
   // Limit to MAX_FILES_SELECTED
   const newFiles = [...files, ...selectedFiles].slice(0, MAX_FILES_SELECTED);
   if (newFiles.length > MAX_FILES_SELECTED) {
     setMessage(`You can only select a maximum of ${MAX_FILES_SELECTED} files.`);
     return;
   }
   setFiles(newFiles);
   setMessage('');
   setPendingResume(null); // Clear resume state when new files are selected
   localStorage.removeItem(STORAGE_KEY);
 };

 // Function to trigger the file input click for resume (single file scenario)
 const handleResumeUpload = () => {
   if (fileInputRef.current) {
     fileInputRef.current.click();
   }
 };

 // Function to cancel a pending resume (single file scenario)
 const handleCancelResume = () => {
   localStorage.removeItem(STORAGE_KEY);
   setPendingResume(null);
   setMessage('');
   if (pendingResume?.fileId) {
     cleanupIncompleteUpload(pendingResume.fileId);
   }
 };

 // Helper function to determine message color based on content and dark mode
 const getMessageColor = (messageText) => {
   if (messageText.includes('successfully')) {
     return darkMode ?
       'text-blue-400' : 'text-blue-600';
   } else if (messageText.includes('verified') || messageText.includes('Ready to resume')) {
     return darkMode ?
       'text-blue-400' : 'text-blue-600';
   } else if (messageText.includes('Different file')) {
     return darkMode ?
       'text-amber-400' : 'text-amber-600';
   } else if (messageText.includes('cancelled')) {
     return darkMode ? 'text-blue-400' : 'text-blue-600';
   } else {
     return darkMode ? 'text-red-400' : 'text-red-600';
   }
 };

 const isSingleFileSelected = files.length === 1;
 const isMultipleFilesSelected = files.length > 1;

 return (
   <form
     onSubmit={handleUpload}
     className={cn(
       'mb-6 p-6 rounded-xl shadow-lg w-full mx-auto max-w-7xl my-4 border transition-colors duration-300',
       darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
     )}
   >
     <h3 className={cn('text-2xl font-semibold mb-6 text-center', darkMode ? 'text-white' : 'text-gray-900')}>
       Upload Files
     </h3>

     {/* Resume Previous Upload Section - Only shown for single file scenario and not uploading */}
     {pendingResume && !isUploading && files.length === 0 && (
       <div className={cn('mb-6 p-5 rounded-lg border', darkMode ? 'bg-blue-800/40 border-blue-600' : 'bg-blue-50 border-blue-400')}>
         <div className="mb-4">
           <h4 className={cn('text-lg font-semibold', darkMode ? 'text-blue-400' : 'text-blue-600')}>
             Resume Previous Upload
           </h4>
           <p className={cn('text-sm mt-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>
             Your previous upload of "{getTruncatedFileName(pendingResume.fileName)}"
             was interrupted at {pendingResume.progress}%.
           </p>
         </div>
         <div className="flex justify-center gap-4">
           <button
             type="button"
             onClick={handleResumeUpload}
             className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors shadow-md"
           >
             Resume
           </button>
           <button
             type="button"
             onClick={handleCancelResume}
             className={cn(
               'flex-1 px-4 py-2.5 rounded-md font-medium transition-colors shadow-md',
               darkMode
                 ? 'bg-gray-700 hover:bg-gray-600 text-white'
                 : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
             )}
           >
             Cancel
           </button>
         </div>
       </div>
     )}

     {/* File Selection Area - Hidden when uploading */}
     {!isUploading && (
       <label
         htmlFor="fileInput"
         className={cn(
           'block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors duration-200 ease-in-out border-2 border-dashed',
           darkMode
             ? 'bg-gray-800 hover:bg-gray-700 border-gray-600'
             : 'bg-gray-100 hover:bg-gray-200 border-gray-300',
           // Removed the blue border when files are selected
           // files.length > 0 ? (darkMode ? 'border-blue-500' : 'border-blue-400') : ''
         )}
         title="Drag and drop files or click to browse"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
       >
         <div className="flex flex-col items-center justify-center">
           <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-12 w-12 mb-3', darkMode ?
             'text-gray-400' : 'text-gray-500')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
           </svg>
           <span className={cn('text-lg', darkMode ?
             'text-gray-300' : 'text-gray-600')}>
             Drag and drop files or click to browse
           </span>
           {files.length >= MAX_FILES_SELECTED && (
             <p className="text-sm text-red-500 mt-2">Maximum {MAX_FILES_SELECTED} files selected.</p>
           )}
         </div>
       </label>
     )}

     <input
       id="fileInput"
       type="file"
       ref={fileInputRef}
       onChange={handleFileInputChange}
       className="hidden"
       multiple
       accept="*" // Allow all file types
     />

     {/* Files to Upload List - Only shown when files are selected and not uploading */}
     {files.length > 0 && !isUploading && (
       <div className="mb-4">
         <h4 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-800')}>
           Files to Upload ({files.length}):
         </h4>
         <ul className="space-y-2 max-h-60 overflow-y-auto pr-2"> {/* Added max-height and scroll */}
           {files.map((file, index) => (
             <li
               key={file.name + file.size + index}
               className={cn(
                 'flex justify-between items-center p-3 rounded-md shadow-sm',
                 darkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700' // Same background as drag and drop
               )}
             >
               <div className="flex-grow pr-4 overflow-hidden"> {/* Removed border-r, added overflow-hidden */}
                 <span className="block text-ellipsis overflow-hidden whitespace-nowrap">
                   {file.name}
                 </span>
                 <span className="block text-sm text-gray-500">
                   ({formatBytes(file.size)})
                 </span>
               </div>
               <button
                 type="button"
                 onClick={() => handleRemoveFile(index)}
                 className={cn(
                   "ml-4 p-1.5 rounded-full transition-colors flex-shrink-0", // Added flex-shrink-0
                   darkMode ? "hover:bg-gray-600 text-gray-400" : "hover:bg-gray-200 text-gray-500"
                 )}
                 aria-label={`Remove ${file.name}`}
               >
                 <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /> </svg>
               </button>
             </li>
           ))}
         </ul>
       </div>
     )}

     {/* Current File Upload Progress - Only shown when uploading */}
     {isUploading && uploadFileRef.current && (
       <div className="mb-4 p-4 rounded-lg shadow-inner border border-transparent"> {/* Removed blue border */}
         <h4 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-800')}>
           Uploading {isSingleFileSelected ? '' : `(${currentFileIndex + 1} of ${files.length}):`} {getTruncatedFileName(uploadFileRef.current.name)}
         </h4>
         <div className={cn('w-full rounded-full h-6 mb-3 overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
           <div
             className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
             style={{ width: `${progress}%` }}
           >
             <div className="w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
           </div>
         </div>

         <div className="mb-4">
           <div className="flex justify-between items-center mb-2">
             <div className={cn('text-base font-medium', darkMode ?
               'text-gray-200' : 'text-gray-700')}>
               Progress: {progress}%
             </div>
           </div>

           <div className={cn('text-sm mb-2', darkMode ?
             'text-gray-300' : 'text-gray-600')}>
             Upload speed: {uploadSpeed > 0 ?
               formatBytes(uploadSpeed) + '/s' : 'Calculating...'}
           </div>

           <div className={cn('text-sm', darkMode ?
             'text-gray-300' : 'text-gray-600')}>
             Estimated time: {estimatedTime}
           </div>
         </div>

         <div className="mt-4">
           <button
             type="button"
             onClick={handleCancel}
             className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors shadow-md"
           >
             Cancel All Uploads
           </button>
         </div>
       </div>
     )}

     {/* Action Buttons - Only shown when files are selected and not uploading */}
     {files.length > 0 && !isUploading && (
       <div className="flex gap-3 mt-2">
         <button
           type="submit"
           className={cn(
             'flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors shadow-md',
             message.includes('Different file') || files.length === 0
               ? 'bg-blue-400 cursor-not-allowed'
               : 'bg-blue-600 hover:bg-blue-700'
           )}
           disabled={message.includes('Different file') || files.length === 0}
         >
           {isSingleFileSelected ? 'Upload' : `Upload All (${files.length})`}
         </button>
         <button
           type="button"
           onClick={() => {
             setFiles([]);
             setMessage('');
             setUploadedFiles([]); // Clear uploaded files on clear all
             setPendingResume(null);
             localStorage.removeItem(STORAGE_KEY);
           }}
           className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors shadow-md"
         >
           {isSingleFileSelected ? 'Clear' : 'Clear All'}
         </button>
       </div>
     )}

     {/* Successfully Uploaded Files List */}
     {showUploadedFiles && uploadedFiles.length > 0 && (
       <div className="mt-6">
         <h4 className={cn('text-lg font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-800')}>
           Successfully Uploaded:
         </h4>
         <ul className="space-y-2 max-h-40 overflow-y-auto pr-2"> {/* Added max-height and scroll */}
           {uploadedFiles.map((file, index) => (
             <li
               key={file.name + file.size + index}
               className={cn('flex justify-between items-center p-3 rounded-md shadow-sm', darkMode ? 'bg-green-800/40 text-green-200' : 'bg-green-50 text-green-700')}
             >
               <div className="flex-grow overflow-hidden">
                 <span className="block text-ellipsis overflow-hidden whitespace-nowrap">
                   {getTruncatedFileName(file.name)}
                 </span>
                 <span className="block text-sm text-gray-500">
                   ({formatBytes(file.size)})
                 </span>
               </div>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 flex-shrink-0 ml-4" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
               </svg>
             </li>
           ))}
         </ul>
       </div>
     )}

     {/* Status Message Display */}
     {message && (
       <p className={cn('mt-4 text-center font-medium text-base', getMessageColor(message))}>
         {message}
       </p>
     )}
   </form>
 );
};

export default UploadForm;
