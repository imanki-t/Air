import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000;
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000;
const UPLOAD_DELAY = 2000;

const UploadForm = ({ refresh, darkMode }) => {
 const [files, setFiles] = useState([]);
 const [uploadedFiles, setUploadedFiles] = useState([]);
 const [currentFileIndex, setCurrentFileIndex] = useState(0);
 const [message, setMessage] = useState('');
 const [progress, setProgress] = useState(0);
 const [isUploading, setIsUploading] = useState(false);
 const [truncateLength, setTruncateLength] = useState(15);
 const [estimatedTime, setEstimatedTime] = useState(null);
 const [uploadSpeed, setUploadSpeed] = useState(0);
 const [pendingResume, setPendingResume] = useState(null);
 const [messageTimer, setMessageTimer] = useState(null);
 const controllerRef = useRef(null);
 const fileInputRef = useRef(null);
 const uploadFileRef = useRef(null);
 const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 });
 const uploadTimeoutRef = useRef(null);
 const socketRef = useRef(null);

 useEffect(() => {
   socketRef.current = io(import.meta.env.VITE_BACKEND_URL);
   return () => {
     if (socketRef.current) socketRef.current.disconnect();
   };
 }, []);

 useEffect(() => {
   checkForSavedUploads();

   const handleFocus = () => {
     checkForSavedUploads();
   };

   window.addEventListener('focus', handleFocus);

   return () => {
     window.removeEventListener('focus', handleFocus);
     if (messageTimer) {
       clearTimeout(messageTimer);
     }
     if (uploadTimeoutRef.current) {
       clearTimeout(uploadTimeoutRef.current);
     }
   };
 }, []);

 const checkForSavedUploads = () => {
   try {
     const savedUploadState = localStorage.getItem(STORAGE_KEY);
     if (!savedUploadState) return false;

     const parsedState = JSON.parse(savedUploadState);
     const now = Date.now();
     if (parsedState?.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
       setPendingResume(parsedState);
       return true;
     } else {
       localStorage.removeItem(STORAGE_KEY);
       if (parsedState?.fileId) {
         cleanupIncompleteUpload(parsedState.fileId);
       }
       return false;
     }
   } catch (error) {
     console.error('Error checking for saved uploads:', error);
     localStorage.removeItem(STORAGE_KEY);
     return false;
   }
 };

 useEffect(() => {
   const updateTruncateLength = () => {
     setTruncateLength(window.innerWidth >= 768 ? 50 : 25);
   };

   updateTruncateLength();
   window.addEventListener('resize', updateTruncateLength);

   return () => {
     window.removeEventListener('resize', updateTruncateLength);
   };
 }, []);

 const saveUploadState = (uploadData = null) => {
   const dataToSave = uploadData ||
     (uploadFileRef.current && {
       fileName: uploadFileRef.current.name,
       fileSize: uploadFileRef.current.size,
       fileType: uploadFileRef.current.type,
       progress: progress,
       fileId: uploadFileRef.current.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
     });
   if (!dataToSave) return;

   dataToSave.timestamp = Date.now();
   if (uploadFileRef.current) {
     const reader = new FileReader();
     reader.onload = function(event) {
       const fullResult = event.target.result;
       const truncatedResult = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));
       dataToSave.fileSignature = truncatedResult;
       localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
     };
     const fileSlice = uploadFileRef.current.slice(0, Math.min(1024 * 1024, uploadFileRef.current.size));
     reader.readAsDataURL(fileSlice);
   } else {
     localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
   }
 };

 useEffect(() => {
   if (message) {
     if (messageTimer) {
       clearTimeout(messageTimer);
     }

     const timer = setTimeout(() => {
       setMessage('');
     }, STATUS_MESSAGE_TIMEOUT);

     setMessageTimer(timer);

     return () => {
       clearTimeout(timer);
     };
   }
 }, [message]);

 const cleanupIncompleteUpload = async (fileId) => {
   try {
     await axios.delete(
       `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${fileId}`
     );
   } catch (error) {
     console.error('Error cleaning up incomplete upload:', error);
   }
 };

 const getTruncatedFileName = (name) => {
   if (!name) return '';
   return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
 };

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

 const calculateTimeRemaining = (loaded, total, uploadSpeed) => {
   if (uploadSpeed <= 0) return null;
   const remainingBytes = total - loaded;
   const remainingTimeSeconds = remainingBytes / uploadSpeed;

   return formatTimeRemaining(remainingTimeSeconds);
 };

 const formatBytes = (bytes, decimals = 2) => {
   if (bytes === 0) return '0 Bytes';
   const k = 1024;
   const dm = decimals < 0 ? 0 : decimals;
   const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

   const i = Math.floor(Math.log(bytes) / Math.log(k));
   return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
 };

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

 const performUpload = async (fileToUpload) => {
   const formData = new FormData();
   formData.append('file', fileToUpload);

   if (pendingResume && fileToUpload.name === pendingResume.fileName && fileToUpload.size === pendingResume.fileSize) {
     formData.append('resumableUploadId', pendingResume.fileId);
     formData.append('resumableProgress', pendingResume.progress.toString());
   }

   const controller = new AbortController();
   controllerRef.current = controller;
   try {
     setMessage('');
     setProgress(pendingResume && fileToUpload.name === pendingResume.fileName && fileToUpload.size === pendingResume.fileSize ? pendingResume.progress : 0);
     setEstimatedTime('Calculating...');
     setUploadSpeed(0);
     lastProgressUpdateRef.current = { time: Date.now(), loaded: 0 };

     const handleUnload = () => {
       if (progress < 100) {
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

     await axios.post(
       `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
       formData,
       {
         signal: controller.signal,
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
           if (timeDiff > 500) {
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

           if (percent < 100 && percent % 5 === 0) {
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

     window.removeEventListener('unload', handleUnload);
     window.removeEventListener('beforeunload', handleUnload);
     localStorage.removeItem(STORAGE_KEY);
     setPendingResume(null);
     uploadFileRef.current = null;
     setMessage(`File "${fileToUpload.name}" uploaded successfully.`);

     setUploadedFiles(prev => [...prev, fileToUpload]);
     setFiles(prev => prev.filter(f => f.name !== fileToUpload.name || f.size !== fileToUpload.size));

     if (socketRef.current) {
       socketRef.current.emit('fileUploaded');
     }
     refresh();
   } catch (err) {
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
   } finally {
     setProgress(0);
     setIsUploading(false);
     setEstimatedTime(null);
     setUploadSpeed(0);
     controllerRef.current = null;
     uploadTimeoutRef.current = null;
   }
 };

 const handleUpload = async (e) => {
   if (e) e.preventDefault();

   if (files.length === 0) {
     setMessage('Please select files to upload.');
     return;
   }

   if (currentFileIndex < files.length) {
     setIsUploading(true);
     setMessage('');
     uploadFileRef.current = files[currentFileIndex];
     setProgress(0);

     uploadTimeoutRef.current = setTimeout(() => {
       performUpload(files[currentFileIndex]);
     }, UPLOAD_DELAY);
   } else {
     setMessage('All files uploaded successfully!');
     setFiles([]);
     setCurrentFileIndex(0);
   }
 };

 useEffect(() => {
   if (isUploading && !uploadTimeoutRef.current && currentFileIndex < files.length) {
     uploadFileRef.current = files[currentFileIndex];
     setProgress(0);
     uploadTimeoutRef.current = setTimeout(() => {
       performUpload(files[currentFileIndex]);
     }, UPLOAD_DELAY);
   } else if (isUploading && currentFileIndex >= files.length) {
     setIsUploading(false);
     setMessage('All files uploaded successfully!');
     setFiles([]);
     setCurrentFileIndex(0);
   }
 }, [currentFileIndex, files, isUploading]);


 const handleCancel = () => {
   if (uploadTimeoutRef.current) {
     clearTimeout(uploadTimeoutRef.current);
     uploadTimeoutRef.current = null;
   }

   if (controllerRef.current) {
     controllerRef.current.abort();
     controllerRef.current = null;
   }

   localStorage.removeItem(STORAGE_KEY);
   setPendingResume(null);
   uploadFileRef.current = null;

   setIsUploading(false);
   setFiles([]);
   setUploadedFiles([]);
   setCurrentFileIndex(0);

   if (pendingResume?.fileId) {
     cleanupIncompleteUpload(pendingResume.fileId);
   }

   setMessage('Upload cancelled.');
 };

 const handleRemoveFile = (indexToRemove) => {
   setFiles(prevFiles => prevFiles.filter((_, index) => index !== indexToRemove));
   if (files.length === 1) {
     setMessage('');
   }
 };

 const handleDrop = useCallback(async (e) => {
   e.preventDefault();
   e.stopPropagation();

   if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
     setMessage('No valid files detected. Please try again.');
     return;
   }

   const droppedFiles = Array.from(e.dataTransfer.files);
   setFiles(prevFiles => [...prevFiles, ...droppedFiles]);
   setMessage('');
   setPendingResume(null);
   localStorage.removeItem(STORAGE_KEY);
 }, []);

 const handleDragOver = useCallback((e) => {
   e.preventDefault();
   e.stopPropagation();
 }, []);

 const handleFileInputChange = async (e) => {
   if (!e.target.files || e.target.files.length === 0) {
     return;
   }

   const selectedFiles = Array.from(e.target.files);
   setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
   setMessage('');
   setPendingResume(null);
   localStorage.removeItem(STORAGE_KEY);
 };

 const handleResumeUpload = () => {
   if (fileInputRef.current) {
     fileInputRef.current.click();
   }
 };

 const handleCancelResume = () => {
   localStorage.removeItem(STORAGE_KEY);
   setPendingResume(null);
   setMessage('');
   if (pendingResume?.fileId) {
     cleanupIncompleteUpload(pendingResume.fileId);
   }
 };

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

 return (
   <form
     onSubmit={handleUpload}
     className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
       darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
     }`}
   >
     <h3 className={`text-2xl font-semibold mb-2 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
       ‎
     </h3>

     {pendingResume && !isUploading && files.length === 0 && (
       <div className={`mb-6 p-5 rounded-lg ${darkMode ? 'bg-blue-800/40 border border-blue-600' : 'bg-blue-50 border border-blue-400'}`}>
         <div className="mb-4">
           <h4 className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
             Resume Previous Upload
           </h4>
           <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
             Your previous upload of "{getTruncatedFileName(pendingResume.fileName)}"
             was interrupted at {pendingResume.progress}%.
           </p>
         </div>
         <div className="flex justify-center -space-x-1 -mt-1">
           <button
             type="button"
             onClick={handleResumeUpload}
             className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors mr-4"
           >
             Resume
           </button>
           <button
             type="button"
             onClick={handleCancelResume}
             className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
               darkMode
                 ?
                 'bg-gray-700 hover:bg-gray-600 text-white'
                 : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
             }`}
           >
             Cancel
           </button>
         </div>
       </div>
     )}

     {!isUploading && (
       <label
         htmlFor="fileInput"
         className={`block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors ${
           darkMode
             ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'
             : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
         } ${files.length > 0 ? (darkMode ? 'border-blue-500' : 'border-blue-400') : ''}`}
         title="Drag and drop files or click to browse"
         onDrop={handleDrop}
         onDragOver={handleDragOver}
       >
         <div className="flex flex-col items-center justify-center">
           <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 ${darkMode ?
             'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
           </svg>
           <span className={`text-lg ${darkMode ?
             'text-gray-300' : 'text-gray-600'}`}>
             Drag and drop files or click to browse
           </span>
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
     />

     {files.length > 0 && !isUploading && (
       <div className="mb-4">
         <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
           Files to Upload:
         </h4>
         <ul className="space-y-2">
           {files.map((file, index) => (
             <li
               key={file.name + file.size + index}
               className={`flex justify-between items-center p-3 rounded-md ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'}`}
             >
               <span>{getTruncatedFileName(file.name)} ({formatBytes(file.size)})</span>
               <button
                 type="button"
                 onClick={() => handleRemoveFile(index)}
                 className={`ml-4 text-red-500 hover:text-red-700 ${darkMode ? 'text-red-400 hover:text-red-600' : ''}`}
               >
                 ×
               </button>
             </li>
           ))}
         </ul>
       </div>
     )}

     {isUploading && uploadFileRef.current && (
       <div className="mb-4">
         <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
           Uploading: {getTruncatedFileName(uploadFileRef.current.name)}
         </h4>
         <div className={`w-full rounded-full h-6 mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
           <div
             className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
             style={{ width: `${progress}%` }}
           >
             <div className="w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
           </div>
         </div>

         <div className="mb-8">
           <div className="flex justify-between items-center mb-2">
             <div className={`text-base font-medium ${darkMode ?
               'text-gray-200' : 'text-gray-700'}`}>
               Progress: {progress}%
             </div>
           </div>

           <div className={`text-sm mb-2 ${darkMode ?
             'text-gray-300' : 'text-gray-600'}`}>
             Upload speed: {uploadSpeed > 0 ?
               formatBytes(uploadSpeed) + '/s' : 'Calculating...'}
           </div>

           <div className={`text-sm ${darkMode ?
             'text-gray-300' : 'text-gray-600'}`}>
             Estimated time: {estimatedTime}
           </div>
         </div>

         <div className="mt-4">
           <button
             type="button"
             onClick={handleCancel}
             className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
           >
             Cancel Upload
           </button>
         </div>
       </div>
     )}

     {files.length > 0 && !isUploading && (
       <div className="flex gap-3 mt-2">
         <button
           type="submit"
           className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors ${
             message.includes('Different file') || files.length === 0
               ? 'bg-blue-400 cursor-not-allowed'
               : 'bg-blue-600 hover:bg-blue-700'
           }`}
           disabled={message.includes('Different file') || files.length === 0}
         >
           Upload All ({files.length})
         </button>
         <button
           type="button"
           onClick={() => {
             setFiles([]);
             setMessage('');
             setPendingResume(null);
             localStorage.removeItem(STORAGE_KEY);
           }}
           className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
         >
           Clear All
         </button>
       </div>
     )}

     {uploadedFiles.length > 0 && (
       <div className="mt-6">
         <h4 className={`text-lg font-semibold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
           Successfully Uploaded:
         </h4>
         <ul className="space-y-2">
           {uploadedFiles.map((file, index) => (
             <li
               key={file.name + file.size + index}
               className={`flex justify-between items-center p-3 rounded-md ${darkMode ? 'bg-green-800/40 text-green-200' : 'bg-green-50 text-green-700'}`}
             >
               <span>{getTruncatedFileName(file.name)} ({formatBytes(file.size)})</span>
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                 <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
               </svg>
             </li>
           ))}
         </ul>
       </div>
     )}

     {message && (
       <p className={`mt-4 text-center font-medium text-base ${getMessageColor(message)}`}>
         {message}
       </p>
     )}
   </form>
 );
};

export default UploadForm;
