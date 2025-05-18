// UploadForm_with_IndexedDB_Resume.jsx
// This version includes all the modifications to auto-resume uploads using IndexedDB without requiring file reselection.
// Be sure to include `fileStore.js` in the same directory.


import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import { getFile, getBackendId, deleteFile } from './src/fileStore'; // Adjusted to include deleteFile and getBackendId

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000;
// 2 second delay before actual upload starts

const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
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
  // Check for saved upload state on component mount
  useEffect(() => {
    checkForSavedUploads();

    // Also check for saved uploads when window gets focus
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
  // Separate function to check for saved uploads
  const checkForSavedUploads = () => {
    try {
      const savedUploadState = localStorage.getItem(STORAGE_KEY);
      if (!savedUploadState) return false;

      const parsedState = JSON.parse(savedUploadState);
      const now = Date.now();
      // Check if the saved state is still valid (within 5 minutes)
      if (parsedState?.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
        console.log('Found saved upload state:', parsedState);
        setPendingResume(parsedState);
        return true;
      } else {
        // Clear expired upload state
        localStorage.removeItem(STORAGE_KEY);
        // If there's a stored file ID, request cleanup on the server
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

  // Handle window resize for responsive filename truncation
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
  // Save upload state when upload is interrupted
  const saveUploadState = (uploadData = null) => {
    const dataToSave = uploadData ||
      (file && {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        progress: progress,
        fileId: file.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
      });
    if (!dataToSave) return;

    // Add timestamp
    dataToSave.timestamp = Date.now();
    // If we have the actual file available, save it as a data URL
    if (uploadFileRef.current) {
      const reader = new FileReader();
      reader.onload = function(event) {
        // Save only the first 1MB of the file to avoid localStorage limits
        // This will be used just for verification when resuming
        const fullResult = event.target.result;
        const truncatedResult = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));
        dataToSave.fileSignature = truncatedResult;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      };
      // Only read a small slice of the file to create a signature
      const fileSlice = uploadFileRef.current.slice(0, Math.min(1024 * 1024, uploadFileRef.current.size));
      reader.readAsDataURL(fileSlice);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  };
  // Auto-dismiss messages after timeout
  useEffect(() => {
    if (message) {
      // Clear any existing timer
      if (messageTimer) {
        clearTimeout(messageTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        setMessage('');
      }, STATUS_MESSAGE_TIMEOUT);

      setMessageTimer(timer);


      return () => {

        clearTimeout(timer);
      };
    }
  }, [message]);
  // Updated cleanup function for incomplete uploads

import { getFile, getBackendId, deleteFile } from './src/fileStore'; // Adjusted to include deleteFile and getBackendId
import axios from 'axios'; // Added axios import

// Updated function that properly handles the file ID
const cleanupIncompleteUpload = async (fileId) => {
  try {
    // First, check if we need to get a proper ID from IndexedDB
    let backendId = fileId;

    // If the fileId appears to be a filename or not a MongoDB ObjectId
    if (fileId && typeof fileId === 'string' && !/^[0-9a-fA-F]{24}$/.test(fileId)) {
      // Try to get the file object from IndexedDB
      try {
        const fileObject = await getFile(fileId);
        if (fileObject && fileObject.mongoId) {
          // Use the MongoDB ID if available
          backendId = fileObject.mongoId;
        } else {
             // If no mongoId in file object, try to get it directly by filename
             const directBackendId = await getBackendId(fileId);
             if (directBackendId) {
                 backendId = directBackendId;
             }
        }
      } catch (dbError) {
        console.log('Could not retrieve file from IndexedDB:', dbError);
        // Continue with the original ID if we can't get the stored object
      }
    }

    console.log(`Cleaning up file with ID: ${backendId}`);

    // Check if backendId is valid before making the API call
    if (!backendId || typeof backendId !== 'string' || !/^[0-9a-fA-F]{24}$/.test(backendId)) {
        console.log('Invalid backendId, skipping backend cleanup.');
         // Still attempt to remove from IndexedDB
        try {
            await deleteFile(fileId);
        } catch (deleteError) {
            console.log('Note: Could not delete from IndexedDB after invalid backendId:', deleteError);
        }
        return; // Exit the function if backendId is invalid
    }

    // Make the API call with the appropriate ID
    const response = await axios.delete(
      `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${backendId}`
    );

    console.log('Cleanup successful:', response.data);


    // Also remove from IndexedDB if needed
    try {
      await deleteFile(fileId);
    } catch (deleteError) {
      console.log('Note: Could not delete from IndexedDB:', deleteError);
      // Not critical, so we continue
    }

  } catch (error) {
    console.error('Error cleaning up file:', error);
    // Still return normally since the backend will clean up what it can
  }
};

  // Format filename for display
  const getTruncatedFileName = (name) => {
    if (!name) return '';
    return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
  };
  // Format time remaining with units
  const formatTimeRemaining = (seconds) => {
    if (!seconds && seconds !== 0) return 'Calculating...';
    if (seconds < 60) {
      return `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ?
        's' : ''}`;
    } else if (seconds < 86400) { // Less than 24 hours
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ?
        's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else { // More than 24 hours
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days} day${days !== 1 ?
        's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
    }
  };
  // Calculate estimated time remaining
  const calculateTimeRemaining = (loaded, total, uploadSpeed) => {
    if (uploadSpeed <= 0) return null;
    const remainingBytes = total - loaded;
    const remainingTimeSeconds = remainingBytes / uploadSpeed;

    return formatTimeRemaining(remainingTimeSeconds);
  };
  // Format bytes to readable size
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  // Verify if the selected file matches the stored file signature
  const verifyFileSignature = async (selectedFile, fileSignature) => {
    if (!selectedFile || !fileSignature) return false;
    return new Promise((resolve) => {
      // Read first chunk of the selected file
      const reader = new FileReader();
      reader.onload = function(event) {
        // Get the start of the selected file data
        const fullResult = event.target.result;
        const selectedSignature = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));

        // Compare with stored signature

        resolve(selectedSignature ===
          fileSignature);
      };

      // Only read a small slice of the file
      const fileSlice = selectedFile.slice(0, Math.min(1024 * 1024, selectedFile.size));
      reader.readAsDataURL(fileSlice);
    });
  };

  // The actual upload implementation after delay
  const performUpload = async (fileToUpload) => {
    const formData = new FormData();
    formData.append('file', fileToUpload);

    // Add metadata to help with resumable uploads on the server side
    if (pendingResume) {
      formData.append('resumableUploadId', pendingResume.fileId);
      formData.append('resumableProgress', pendingResume.progress.toString());
    }

    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      setMessage('');
      setProgress(pendingResume ? pendingResume.progress : 0);
      setEstimatedTime('Calculating...');
      setUploadSpeed(0);
      setPendingResume(null);
      lastProgressUpdateRef.current = { time: Date.now(), loaded: 0 };

      // Add event listener for unload only during active upload
      const handleUnload = () => {
        // Save upload state when page is closed/refreshed
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

      // Add the event listener
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
            // Ensure we

            if (!event.total) {
              setMessage('Unable to calculate upload progress. Upload is continuing...');
              return;
            }

            const percent = Math.round((event.loaded * 100) / event.total);

            setProgress(percent);


            // Calculate upload speed
            const now = Date.now();
            const timeDiff = now - lastProgressUpdateRef.current.time;
            if (timeDiff > 500) { // Update speed every 500ms for stability
              const loadedDiff =
                event.loaded - lastProgressUpdateRef.current.loaded;

              const speedBps = (loadedDiff / timeDiff) * 1000;
              // bytes per second
              setUploadSpeed(speedBps);
              lastProgressUpdateRef.current = { time: now, loaded: event.loaded };

              // Calculate estimated time remaining based on current speed
              if (speedBps > 0) {
                const remaining = calculateTimeRemaining(event.loaded, event.total, speedBps);
                setEstimatedTime(remaining);
              }
            }

            if (percent === 100) {
              setEstimatedTime('Finalizing...');
            }

            // Continuously update the saved state during upload
            if (percent < 100 && percent % 5 === 0) { // Save every 5%
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
      // Remove the event listeners after upload completes
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
      // Clear any saved upload state on successful upload
      localStorage.removeItem(STORAGE_KEY);
      setPendingResume(null);
      uploadFileRef.current = null;
      setMessage('File uploaded successfully.');

      if (socketRef.current) {
        socketRef.current.emit('fileUploaded');
      }

      setFile(null);
      refresh(); // Call the refresh function provided as prop
    } catch (err) {
      // Remove the event listeners if there's an error
      window.removeEventListener('unload', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);

      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
        // Reset state to show drag and drop area
        setFile(null);
        uploadFileRef.current = null;
      } else {
        console.error('Upload error:', err);
        // More descriptive error message based on error type
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
        // Save upload state for possible resume
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

  // Find the handleUpload function and fix it - around line 375
  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    // Use the file ref for upload
    const fileToUpload = uploadFileRef.current || file;
    if (!fileToUpload) {
      setMessage('Error: Please select a file to upload');
      return;
    }

    // Set uploading state immediately so UI shows upload progress
    setIsUploading(true);
    setMessage('');
    setProgress(pendingResume ? pendingResume.progress : 0);
    // Set a timeout for the actual upload - this happens in the background
    // The user already sees the uploading UI state
    uploadTimeoutRef.current = setTimeout(() => {
      performUpload(fileToUpload);
    }, UPLOAD_DELAY);
    // 2 second delay
  };

  // Handle cancel upload
  const handleCancel = () => {
    // If we're in the delay period, clear the timeout
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
    }

    // If we have an active controller, abort the request
    if (controllerRef.current) {
      controllerRef.current.abort();
      controllerRef.current = null;
    }

    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setPendingResume(null);
    uploadFileRef.current = null;

    // Reset UI state
    setIsUploading(false);
    setFile(null);
    // If we had a file ID, request cleanup on the server
    if (pendingResume?.fileId) {
      cleanupIncompleteUpload(pendingResume.fileId);
    }

    setMessage('Upload cancelled.');
  };

  // Handle file removal
  const handleRemove = () => {
    setFile(null);
    setMessage('');
    setProgress(0);
    setPendingResume(null);
    uploadFileRef.current = null;

    localStorage.removeItem(STORAGE_KEY);

    // If there was a file ID, cleanup on the server
    if (pendingResume?.fileId) {
      cleanupIncompleteUpload(pendingResume.fileId);
    }
  };

  // Handle file drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if files were dropped
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      setMessage('No valid file detected. Please try again.');
      return;
    }

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setMessage('');
      setFile(droppedFile);
      uploadFileRef.current =
        droppedFile;

      // Check if this is a resume situation
      if (pendingResume) {
        if (pendingResume.fileName === droppedFile.name &&
          pendingResume.fileSize === droppedFile.size) {

          // Verify file signature if available
          if (pendingResume.fileSignature) {

            const isMatchingFile = await verifyFileSignature(droppedFile, pendingResume.fileSignature);

            if (isMatchingFile) {
              setMessage('Resume file verified. Ready to resume upload.');
              // Auto-start upload when correct file is detected
              setTimeout(() => handleUpload(), 500);
            } else {
              setMessage('Different file detected. Starting new upload.');
              setPendingResume(null);
              localStorage.removeItem(STORAGE_KEY);
            }
          } else {
            setMessage('Ready to resume upload.');
            // Auto-start upload when correct file is detected
            setTimeout(() => handleUpload(), 500);
          }
        } else {
          // Wrong file for resume - clear file and show resume UI again
          setMessage('Different file detected. Please select the correct file.');
          setFile(null);
          uploadFileRef.current = null;
        }
      }
    }
  };
  // Handle resume upload - this will prompt user to select the file again
  const handleResumeUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle cancel resume
  const handleCancelResume = () => {
    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setPendingResume(null);

    // Clear the message immediately
    setMessage('');
    // If we had a file ID, request cleanup on the server
    if (pendingResume?.fileId) {
      cleanupIncompleteUpload(pendingResume.fileId);
    }
  };


  // Determine message color based on content
  const getMessageColor = (messageText) => {
    if (messageText.includes('successfully')) {
      return darkMode ?
        'text-blue-400' : 'text-blue-600';  // Changed from green to blue
    } else if (messageText.includes('verified') || messageText.includes('Ready to resume')) {
      return darkMode ?
        'text-blue-400' : 'text-blue-600';  // Changed from green to blue
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

      {/* Resume Notice */}
      {pendingResume && !isUploading && !file &&

        (
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
            {/* Adjusted button container: removed gap-4 from flex, added mr-4 to first button */}
            <div className="flex justify-center -space-x-1 -mt-1">
              <button
                type="button"
                onClick={handleResumeUpload}

                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors mr-4" // Added mr-4
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

      {/* Upload area - only show if not currently uploading */}
      {(!isUploading && (!pendingResume || file)) && (
        <label
          htmlFor="fileInput"
          className={`block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors ${
            darkMode

              ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'

              : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
            } ${file ? (darkMode ? 'border-blue-500' : 'border-blue-400') : ''}`}
          title={file ? file.name : 'Drag and drop file or click to browse'}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >

          <div className="flex flex-col items-center justify-center">

            <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 ${darkMode ?
              'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {file
              ?
              <div>
                <span className={`font-medium break-words ${darkMode ?
                  'text-blue-400' : 'text-blue-600'}`}>
                  {getTruncatedFileName(file.name)}
                </span>
                {file.size && (
                  <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>

                    {formatBytes(file.size)}

                  </p>
                )}
              </div>
              : <span className={`text-lg ${darkMode ?
                'text-gray-300' : 'text-gray-600'}`}>
                {pendingResume
                  ?
                  `Select "${getTruncatedFileName(pendingResume.fileName)}" to resume upload`
                  : "Drag and drop file or click to browse"}
              </span>}
          </div>
        </label>
      )}

      <input
        id="fileInput"
        type="file"

        ref={fileInputRef}

        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload progress - with fixed heights and clear separation */}
      {isUploading && (
        <div className="mb-4">
          {/* Progress bar */}
          <div className={`w-full rounded-full h-6 mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>

            <div

              className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${progress}%` }}
            >
              {/* Fill animation for progress bar */}
              <div className="w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>

            </div>

          </div>

          {/* Progress info container - fixed height and properly spaced */}
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

          {/* Cancel button with proper spacing */}
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

      {/* Action
        buttons - only show when file is selected and not uploading */}
      {file && !isUploading && (
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors ${
              message.includes('Different file')

                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
              }`}
            disabled={message.includes('Different file')}
          >
            {pendingResume ?
              'Resume Upload' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
          >
            Remove
          </button>


        </div>
      )}

      {/* Status message */}
      {message && (
        <p className={`mt-4 text-center font-medium text-base ${getMessageColor(message)}`}>
          {message}
        </p>
      )}
    </form>
  );
};

export default UploadForm;
