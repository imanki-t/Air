import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const RESUME_PROMPT_TIMEOUT = 10 * 1000; // 10 seconds in milliseconds

const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [truncateLength, setTruncateLength] = useState(15);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [resumableUpload, setResumableUpload] = useState(null);
  const [resumePromptTimer, setResumePromptTimer] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0); // Track upload speed in bytes/second
  const controllerRef = useRef(null);
  const fileInputRef = useRef(null);
  const originalFileRef = useRef(null); // Store the actual file reference
  const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 }); // For speed calculation

  // Check for saved upload state on component mount
  useEffect(() => {
    const savedUploadState = localStorage.getItem(STORAGE_KEY);
    if (savedUploadState) {
      try {
        const parsedState = JSON.parse(savedUploadState);
        const now = Date.now();
        
        // Check if the saved state is still valid (within 5 minutes)
        if (parsedState.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
          setResumableUpload(parsedState);
          
          // Start the auto-dismiss timer for resume prompt
          const timer = setTimeout(() => {
            setResumableUpload(null);
            localStorage.removeItem(STORAGE_KEY);
            // Clear file state when resume prompt disappears
            setFile(null);
          }, RESUME_PROMPT_TIMEOUT);
          
          setResumePromptTimer(timer);
          
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

            // Store file blob in IndexedDB for resumable uploads
            if (parsedState.fileBlob) {
              // Convert Base64 string back to blob if it exists
              try {
                const fetchResp = fetch(parsedState.fileBlob);
                fetchResp.then(res => res.blob()).then(blob => {
                  const file = new File([blob], parsedState.fileName, { type: parsedState.fileType });
                  originalFileRef.current = file;
                }).catch(err => {
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
          if (parsedState.fileId) {
            cleanupIncompleteUpload(parsedState.fileId);
          }
        }
      } catch (error) {
        console.error('Error parsing saved upload state:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    
    return () => {
      if (resumePromptTimer) {
        clearTimeout(resumePromptTimer);
      }
    };
  }, []);

  // Cleanup function to remove incomplete uploads on the server
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

  useEffect(() => {
    const updateTruncateLength = () => {
      setTruncateLength(window.innerWidth >= 768 ? 40 : 15);
    };
    updateTruncateLength();
    window.addEventListener('resize', updateTruncateLength);
    
    // Add beforeunload event listener to detect page refresh/close
    const handleBeforeUnload = () => {
      if (isUploading && file) {
        // Save current upload state to localStorage before page unloads
        const uploadState = {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          progress: progress,
          timestamp: Date.now(),
          fileId: file.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now() // Create a unique file ID
        };
        
        // Save file blob data if available and if original file exists
        if (originalFileRef.current) {
          const reader = new FileReader();
          reader.onload = function(event) {
            uploadState.fileBlob = event.target.result;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
          };
          reader.readAsDataURL(originalFileRef.current);
        } else {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
        }
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('resize', updateTruncateLength);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isUploading, file, progress]);

  const getTruncatedFileName = (name) => {
    if (!name) return '';
    return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
  };

  const formatTimeRemaining = (seconds) => {
    if (seconds < 60) {
      return `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const calculateTimeRemaining = (loaded, total, uploadSpeed) => {
    if (progress === 0 || uploadSpeed <= 0) return null;
    
    const remainingBytes = total - loaded;
    const remainingTimeSeconds = remainingBytes / uploadSpeed;
    
    return formatTimeRemaining(remainingTimeSeconds);
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    
    // Use the original file if we're resuming, otherwise use the current file
    const fileToUpload = originalFileRef.current || file;
    if (!fileToUpload) {
      setMessage('Error: File not available. Please select the file again.');
      return;
    }
    
    // Clear the auto-dismiss timer if it exists
    if (resumePromptTimer) {
      clearTimeout(resumePromptTimer);
      setResumePromptTimer(null);
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
      setProgress(resumableUpload ? resumableUpload.progress : 0); // Start from saved progress if resuming
      setIsUploading(true);
      setUploadStartTime(Date.now());
      setEstimatedTime(null);
      setUploadSpeed(0);
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
              if (percent > 0 && percent < 100 && speedBps > 0) {
                const remaining = calculateTimeRemaining(event.loaded, event.total, speedBps);
                setEstimatedTime(remaining);
              }
            }
            
            if (percent === 100) {
              setEstimatedTime('Finalizing');
            }
          }
        }
      );

      // Clear any saved upload state on successful upload
      localStorage.removeItem(STORAGE_KEY);
      setResumableUpload(null);
      originalFileRef.current = null;
      
      setMessage('File uploaded successfully.');
      setTimeout(() => setMessage(''), 10000);
      setFile(null);
      refresh();
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
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
            const reader = new FileReader();
            reader.onload = function(event) {
              uploadState.fileBlob = event.target.result;
              localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
              setResumableUpload(uploadState);
            };
            reader.readAsDataURL(originalFileRef.current);
          } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
            setResumableUpload(uploadState);
          }
        }
      }
    } finally {
      setProgress(0);
      setIsUploading(false);
      setEstimatedTime(null);
      setUploadStartTime(null);
      setUploadSpeed(0);
      controllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    
    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setResumableUpload(null);
    originalFileRef.current = null;
    
    if (resumePromptTimer) {
      clearTimeout(resumePromptTimer);
      setResumePromptTimer(null);
    }
    
    // If we had a file ID, request cleanup on the server
    if (file && resumableUpload?.fileId) {
      cleanupIncompleteUpload(resumableUpload.fileId);
    }
  };

  const handleRemove = () => {
    setFile(null);
    setMessage('');
    setProgress(0);
    setResumableUpload(null);
    originalFileRef.current = null;
    
    if (resumePromptTimer) {
      clearTimeout(resumePromptTimer);
      setResumePromptTimer(null);
    }
    
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Clear any existing messages when a new file is selected
      setMessage('');
      setFile(droppedFile);
      originalFileRef.current = droppedFile; // Store the actual file reference
      
      // If this file matches our saved upload, keep the resumable state
      if (resumableUpload && 
          resumableUpload.fileName === droppedFile.name && 
          resumableUpload.fileSize === droppedFile.size) {
        // Do nothing, keep the resumable state
      } else {
        // New file selected, clear resumable state
        setResumableUpload(null);
        localStorage.removeItem(STORAGE_KEY);
        
        if (resumePromptTimer) {
          clearTimeout(resumePromptTimer);
          setResumePromptTimer(null);
        }
      }
    }
  }, [resumableUpload, resumePromptTimer]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Clear any existing messages when a new file is selected
      setMessage('');
      setFile(selectedFile);
      originalFileRef.current = selectedFile; // Store the actual file reference
      
      // If this file matches our saved upload, keep the resumable state
      if (resumableUpload && 
          resumableUpload.fileName === selectedFile.name && 
          resumableUpload.fileSize === selectedFile.size) {
        // Do nothing, keep the resumable state
      } else {
        // New file selected, clear resumable state
        setResumableUpload(null);
        localStorage.removeItem(STORAGE_KEY);
        
        if (resumePromptTimer) {
          clearTimeout(resumePromptTimer);
          setResumePromptTimer(null);
        }
      }
    }
  };
  
  const handleResumeUpload = () => {
    // Check if we have the file data stored (either as original file or in localStorage)
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
            handleUpload();
          })
          .catch(err => {
            console.error('Failed to restore file from blob:', err);
            setMessage('Please select the same file again to resume upload');
            if (fileInputRef.current) {
              fileInputRef.current.click();
            }
          });
      } catch (error) {
        console.error('Error restoring file:', error);
        setMessage('Please select the same file again to resume upload');
        if (fileInputRef.current) {
          fileInputRef.current.click();
        }
      }
    } else if (!originalFileRef.current) {
      setMessage('Please select the same file again to resume upload');
      // Focus on the file input to encourage the user to select the file
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      // We have the original file, proceed with upload
      handleUpload();
    }
  };
  
  const handleCancelResume = () => {
    // Clear the auto-dismiss timer if it exists
    if (resumePromptTimer) {
      clearTimeout(resumePromptTimer);
      setResumePromptTimer(null);
    }
    
    // Clean up the stored upload state
    localStorage.removeItem(STORAGE_KEY);
    setResumableUpload(null);
    setFile(null);
    originalFileRef.current = null;
    
    // If we had a file ID, request cleanup on the server
    if (resumableUpload?.fileId) {
      cleanupIncompleteUpload(resumableUpload.fileId);
    }
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

      {/* Upload area */}
      <label
        htmlFor="fileInput"
        className={`block w-full cursor-pointer px-4 py-6 rounded-lg mb-4 text-center transition-colors ${
          darkMode
            ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'
            : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
        } ${file ? 'border-blue-500' : ''}`}
        title={file ? file.name : 'Drag and drop file or click to browse'}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="flex flex-col items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            : <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Drag and drop file or click to browse
              </span>}
        </div>
      </label>

      <input
        id="fileInput"
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Upload progress */}
      {isUploading && (
        <>
          <div className={`w-full rounded-full h-4 mb-1 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div
              className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          
          <div className="flex justify-between items-center mb-3">
            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {progress}% 
              {uploadSpeed > 0 && (
                <span className="ml-1">at {formatBytes(uploadSpeed)}/s</span>
              )}
            </div>
            {estimatedTime && (
              <div className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {estimatedTime === 'Finalizing' 
                  ? 'Finalizing...' 
                  : `Remaining: ${estimatedTime}`}
              </div>
            )}
          </div>
          
          <div className="flex justify-between gap-2 mb-3">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors w-full"
            >
              Cancel Upload
            </button>
          </div>
        </>
      )}

      {/* 
