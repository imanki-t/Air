import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear

const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [truncateLength, setTruncateLength] = useState(15);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [resumableUpload, setResumableUpload] = useState(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [messageTimer, setMessageTimer] = useState(null);
  
  const controllerRef = useRef(null);
  const fileInputRef = useRef(null);
  const originalFileRef = useRef(null);
  const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 });

  // Check for saved upload state on component mount and when focus is regained
  useEffect(() => {
    const checkForSavedUploads = () => {
      try {
        const savedUploadState = localStorage.getItem(STORAGE_KEY);
        if (!savedUploadState) return;

        const parsedState = JSON.parse(savedUploadState);
        const now = Date.now();
        
        // Check if the saved state is still valid (within 5 minutes)
        if (parsedState?.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
          console.log('Found saved upload state:', parsedState);
          setResumableUpload(parsedState);
          setShowResumePrompt(true);
          
          // Create a File-like object for display purposes
          if (parsedState.fileName && parsedState.fileSize && parsedState.fileType) {
            const placeholderFile = new File(
              [new ArrayBuffer(0)], // Empty content as placeholder
              parsedState.fileName,
              { type: parsedState.fileType }
            );
            
            Object.defineProperty(placeholderFile, 'size', {
              value: parsedState.fileSize,
              writable: false
            });
            
            setFile(placeholderFile);

            // Store file blob in memory for resumable uploads
            if (parsedState.fileBlob) {
              try {
                fetch(parsedState.fileBlob)
                  .then(res => res.blob())
                  .then(blob => {
                    const file = new File([blob], parsedState.fileName, { type: parsedState.fileType });
                    originalFileRef.current = file;
                    console.log('Restored file blob for resuming');
                  })
                  .catch(err => {
                    console.error('Error restoring file from blob:', err);
                  });
              } catch (error) {
                console.error('Error parsing file blob:', error);
              }
            }
          }
        } else {
          // Clear expired upload state
          localStorage.removeItem(STORAGE_KEY);
          
          // If there's a stored file ID, request cleanup on the server
          if (parsedState?.fileId) {
            cleanupIncompleteUpload(parsedState.fileId);
          }
        }
      } catch (error) {
        console.error('Error checking for saved uploads:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    
    // Run the check immediately on mount
    checkForSavedUploads();
    
    // Also check whenever the window regains focus
    const handleFocus = () => {
      checkForSavedUploads();
    };
    
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      if (messageTimer) {
        clearTimeout(messageTimer);
      }
    };
  }, []);

  // Handle window resize for responsive filename truncation
  useEffect(() => {
    const updateTruncateLength = () => {
      setTruncateLength(window.innerWidth >= 768 ? 40 : 15);
    };
    
    updateTruncateLength();
    window.addEventListener('resize', updateTruncateLength);
    
    return () => {
      window.removeEventListener('resize', updateTruncateLength);
    };
  }, []);

  // Save upload state before page unload
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isUploading && file) {
        // For modern browsers, show a confirmation dialog
        event.preventDefault();
        event.returnValue = ''; // Chrome requires returnValue to be set
        
        // Save current upload state to localStorage before page unloads
        const uploadState = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          progress: progress,
          timestamp: Date.now(),
          fileId: file.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now() // Create a unique file ID
        };
        
        // Save file blob data if available
        if (originalFileRef.current) {
          try {
            const reader = new FileReader();
            reader.onload = function(event) {
              uploadState.fileBlob = event.target.result;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
            };
            reader.readAsDataURL(originalFileRef.current);
          } catch (err) {
            console.error('Error saving file blob:', err);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
          }
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading, file, progress]);

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

  // Cleanup function for incomplete uploads
  const cleanupIncompleteUpload = async (fileId) => {
    try {
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${fileId}`
      );
      console.log('Cleaned up incomplete upload');
    } catch (error) {
      console.error('Error cleaning up incomplete upload:', error);
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
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
    } else if (seconds < 86400) { // Less than 24 hours
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else { // More than 24 hours
      const days = Math.floor(seconds / 86400);
      const hours = Math.floor((seconds % 86400) / 3600);
      return `${days} day${days !== 1 ? 's' : ''} ${hours} hour${hours !== 1 ? 's' : ''}`;
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

  // Handle file upload
  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    
    // Use the original file if we're resuming, otherwise use the current file
    const fileToUpload = originalFileRef.current || file;
    if (!fileToUpload) {
      setMessage('Error: File not available. Please select the file again.');
      return;
    }

    const formData = new FormData();
    formData.append('file', fileToUpload);
    
    // Add metadata to help with resumable uploads on the server side
    if (resumableUpload) {
      formData.append('resumableUploadId', resumableUpload.fileId);
      formData.append('resumableProgress', resumableUpload.progress.toString());
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setMessage('');
      setProgress(resumableUpload ? resumableUpload.progress : 0);
      setIsUploading(true);
      setEstimatedTime('Calculating...');
      setUploadSpeed(0);
      setShowResumePrompt(false);
      lastProgressUpdateRef.current = { time: Date.now(), loaded: 0 };

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          signal: controller.signal,
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
            
            // Calculate upload speed
            const now = Date.now();
            const timeDiff = now - lastProgressUpdateRef.current.time;
            if (timeDiff > 500) { // Update speed every 500ms for stability
              const loadedDiff = event.loaded - lastProgressUpdateRef.current.loaded;
              const speedBps = (loadedDiff / timeDiff) * 1000; // bytes per second
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
          }
        }
      );

      // Clear any saved upload state on successful upload
      localStorage.removeItem(STORAGE_KEY);
      setResumableUpload(null);
      originalFileRef.current = null;
      
      setMessage('File uploaded successfully.');
      setFile(null);
      refresh();
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
        // Reset state to show drag and drop area
        setFile(null);
        originalFileRef.current = null;
      } else {
        console.error('Upload error:', err);
        setMessage('Upload failed. Please try again.');
        
        // Save upload state for possible resume
        if (file) {
          const uploadState = {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            progress: progress,
            timestamp: Date.now(),
            fileId: file.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
          };
          
          // Save file blob data if available
          if (originalFileRef.current) {
            try {
              const reader = new FileReader();
              reader.onload = function(event) {
                uploadState.fileBlob = event.target.result;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
                setResumableUpload(uploadState);
                setShowResumePrompt(true);
              };
              reader.readAsDataURL(originalFileRef.current);
            } catch (err) {
              console.error('Error saving file blob for resume:', err);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
              setResumableUpload(uploadState);
              setShowResumePrompt(true);
            }
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
            setResumableUpload(uploadState);
            setShowResumePrompt(true);
          }
        }
      }
    } finally {
      setProgress(0);
      setIsUploading(false);
      setEstimatedTime(null);
      setUploadSpeed(0);
      controllerRef.current = null;
    }
  };

  // Handle cancel upload
  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setResumableUpload(null);
    originalFileRef.current = null;
    setShowResumePrompt(false);
    
    // Reset file state to display drag and drop again
    setFile(null);
    
    // If we had a file ID, request cleanup on the server
    if (resumableUpload?.fileId) {
      cleanupIncompleteUpload(resumableUpload.fileId);
    }
    
    setMessage('Upload cancelled.');
  };

  // Handle file removal
  const handleRemove = () => {
    setFile(null);
    setMessage('');
    setProgress(0);
    setResumableUpload(null);
    originalFileRef.current = null;
    setShowResumePrompt(false);
    
    localStorage.removeItem(STORAGE_KEY);
  };

  // Handle file drop
  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setMessage('');
      setFile(droppedFile);
      originalFileRef.current = droppedFile;
      
      // Check if this is a resume situation
      if (resumableUpload && showResumePrompt) {
        if (resumableUpload.fileName === droppedFile.name && 
            resumableUpload.fileSize === droppedFile.size) {
          // Correct file for resume, keep resume state
          console.log('Correct file for resume');
        } else {
          // Wrong file for resume
          setMessage('Wrong file uploaded.');
          setShowResumePrompt(false);
          setResumableUpload(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  }, [resumableUpload, showResumePrompt]);

  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  // Handle file input change
  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setMessage('');
      setFile(selectedFile);
      originalFileRef.current = selectedFile;
      
      // Check if this is a resume situation
      if (resumableUpload && showResumePrompt) {
        if (resumableUpload.fileName === selectedFile.name && 
            resumableUpload.fileSize === selectedFile.size) {
          // Correct file for resume, keep resume state
          console.log('Correct file for resume');
        } else {
          // Wrong file for resume
          setMessage('Wrong file uploaded.');
          setShowResumePrompt(false);
          setResumableUpload(null);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    }
  };
  
  // Handle resume upload
  const handleResumeUpload = () => {
    // Check if we have the file data stored
    if (!originalFileRef.current && resumableUpload?.fileBlob) {
      // Try to restore the file from the stored blob
      try {
        fetch(resumableUpload.fileBlob)
          .then(res => res.blob())
          .then(blob => {
            const restoredFile = new File(
              [blob], 
              resumableUpload.fileName, 
              { type: resumableUpload.fileType }
            );
            originalFileRef.current = restoredFile;
            // Start upload immediately
            handleUpload();
          })
          .catch(err => {
            console.error('Failed to restore file from blob:', err);
            setMessage('Error restoring file. Please select it again.');
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          });
      } catch (error) {
        console.error('Error restoring file:', error);
        setMessage('Error restoring file. Please select it again.');
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    } else if (originalFileRef.current) {
      // We have the original file, proceed with upload immediately
      handleUpload();
    } else {
      setMessage('Please select the file again to resume upload');
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    }
  };
  
  // Handle cancel resume
  const handleCancelResume = () => {
    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setResumableUpload(null);
    setFile(null);
    originalFileRef.current = null;
    setShowResumePrompt(false);
    
    // If we had a file ID, request cleanup on the server
    if (resumableUpload?.fileId) {
      cleanupIncompleteUpload(resumableUpload.fileId);
    }
  };

  return (
    <form
      onSubmit={handleUpload}
      className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
    >
      <h3 className={`text-xl font-medium mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Upload File
      </h3>

      {/* Resume prompt */}
      {showResumePrompt && resumableUpload && !isUploading && (
        <div className={`mb-6 p-5 rounded-lg ${darkMode ? 'bg-blue-900/30 border border-blue-700' : 'bg-blue-100 border border-blue-300'}`}>
          <div className="mb-4">
            <h4 className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Resume Previous Upload?
            </h4>
            <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Your previous upload of "{getTruncatedFileName(resumableUpload.fileName)}" was interrupted at {resumableUpload.progress}%.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleResumeUpload}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={handleCancelResume}
              className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${
                darkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Upload area - only show if not currently uploading and not showing resume prompt */}
      {!isUploading && (!showResumePrompt || !resumableUpload) && (
        <label
          htmlFor="fileInput"
          className={`block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors ${
            darkMode
              ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'
              : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
          } ${file ? 'border-blue-500' : ''}`}
          title={file ? file.name : 'Drag and drop file or click to browse'}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <div className="flex flex-col items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {file
              ? <div>
                  <span className={`font-medium break-words ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    {getTruncatedFileName(file.name)}
                  </span>
                  {file.size && (
                    <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {formatBytes(file.size)}
                    </p>
                  )}
                </div>
              : <span className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Drag and drop file or click to browse
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

      {/* Upload progress with fixed height container */}
      {isUploading && (
        <div className="mb-4">
          {/* Progress bar */}
          <div className={`w-full rounded-full h-6 mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          {/* Progress info container with fixed height */}
          <div className="h-24 mb-4">
            <div className="flex justify-between items-center mb-3">
              <div className={`text-base font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Progress: {progress}%
              </div>
            </div>
            
            <div className={`text-sm mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Upload speed: {uploadSpeed > 0 ? formatBytes(uploadSpeed) + '/s' : 'Calculating...'}
            </div>
            
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Estimated time: {estimatedTime}
            </div>
          </div>
          
          {/* Cancel button with proper spacing */}
          <div className="mt-6">
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

      {/* Action buttons - only show when file is selected and not uploading/resuming */}
      {file && !isUploading && !showResumePrompt && (
        <div className="flex gap-3 mt-2">
          <button
            type="submit"
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className={`px-4 py-2.5 rounded-md font-medium transition-colors ${
              darkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            Remove
          </button>
        </div>
      )}

      {/* Status message */}
      {message && (
        <p className={`mt-4 text-center font-medium text-base ${
          message.includes('successfully') 
            ? darkMode ? 'text-green-400' : 'text-green-600'
            : message.includes('Wrong file') 
              ? darkMode ? 'text-yellow-400' : 'text-yellow-600'
              : message.includes('cancelled')
                ? darkMode ? 'text-blue-400' : 'text-blue-600'
                : darkMode ? 'text-red-400' : 'text-red-600'
        }`}>
          {message}
        </p>
      )}
    </form>
  );
};

export default UploadForm;
