import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';

const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [truncateLength, setTruncateLength] = useState(15);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [uploadStartTime, setUploadStartTime] = useState(null);
  const [resumableUpload, setResumableUpload] = useState(null);
  const controllerRef = useRef(null);
  const fileInputRef = useRef(null);

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
          setMessage('Upload interrupted. You can resume your previous upload.');
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(uploadState));
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
      return `${Math.round(seconds)} second${seconds !== 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
  };

  const calculateTimeRemaining = (loaded, total, elapsedTime) => {
    if (progress === 0) return null;
    
    const uploadRate = loaded / elapsedTime; // bytes per millisecond
    const remainingBytes = total - loaded;
    
    if (uploadRate <= 0) return null;
    
    const remainingTimeMs = remainingBytes / uploadRate;
    return formatTimeRemaining(remainingTimeMs / 1000);
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    
    // Add metadata to help with resumable uploads on the server side
    if (resumableUpload) {
      formData.append('resumableUploadId', resumableUpload.fileId);
      formData.append('resumableProgress', resumableUpload.progress.toString());
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    try {
      setMessage('');
      setProgress(0);
      setIsUploading(true);
      setUploadStartTime(Date.now());
      setEstimatedTime(null);

      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          signal: controller.signal,
          onUploadProgress: (event) => {
            const percent = Math.round((event.loaded * 100) / event.total);
            setProgress(percent);
            
            // Calculate estimated time remaining
            if (uploadStartTime && percent > 0 && percent < 100) {
              const elapsedTime = Date.now() - uploadStartTime;
              const timeRemaining = calculateTimeRemaining(event.loaded, event.total, elapsedTime);
              setEstimatedTime(timeRemaining);
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
      
      setMessage('File uploaded successfully!');
      setTimeout(() => setMessage(''), 10000);
      setFile(null);
      refresh();
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
        setMessage('Upload cancelled.');
        setFile(null);
        setTimeout(() => setMessage(''), 10000);
      } else {
        setMessage('Upload failed.');
        setTimeout(() => setMessage(''), 10000);
      }
    } finally {
      setProgress(0);
      setIsUploading(false);
      setEstimatedTime(null);
      setUploadStartTime(null);
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
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      
      // If this file matches our saved upload, keep the resumable state
      if (resumableUpload && 
          resumableUpload.fileName === droppedFile.name && 
          resumableUpload.fileSize === droppedFile.size) {
        setMessage('You can resume your previous upload.');
      } else {
        setResumableUpload(null);
      }
    }
  }, [resumableUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  
  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      
      // If this file matches our saved upload, keep the resumable state
      if (resumableUpload && 
          resumableUpload.fileName === selectedFile.name && 
          resumableUpload.fileSize === selectedFile.size) {
        setMessage('You can resume your previous upload.');
      } else {
        setResumableUpload(null);
      }
    }
  };
  
  const handleResumeUpload = () => {
    handleUpload();
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
            ? <span className={`font-medium break-words ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {getTruncatedFileName(file.name)}
              </span>
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
            </div>
            {estimatedTime && (
              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {estimatedTime === 'Finalizing...' ? estimatedTime : `Estimated time: ${estimatedTime}`}
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

      {!isUploading && resumableUpload && file && 
       file.name === resumableUpload.fileName && 
       file.size === resumableUpload.fileSize && (
        <div className="mb-4">
          <div className={`p-3 rounded ${darkMode ? 'bg-yellow-800 text-yellow-200' : 'bg-yellow-100 text-yellow-800'}`}>
            <p className="mb-2">Previous upload was interrupted at {resumableUpload.progress}%</p>
            <div className="flex justify-between gap-2">
              <button
                type="button"
                onClick={handleResumeUpload}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors w-full"
              >
                Resume Upload
              </button>
              <button
                type="button"
                onClick={handleRemove}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md font-medium transition-colors w-full"
              >
                Start New Upload
              </button>
            </div>
          </div>
        </div>
      )}

      {!isUploading && file && (!resumableUpload || 
                               file.name !== resumableUpload.fileName || 
                               file.size !== resumableUpload.fileSize) && (
        <div className="flex justify-between gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors w-full"
          >
            Upload
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors w-full`}
          >
            Remove
          </button>
        </div>
      )}

      {message && <p className={`mt-3 ${
        message.includes('success')
          ? 'text-green-500'
          : message.includes('failed')
            ? 'text-red-500'
            : message.includes('resume')
              ? darkMode ? 'text-blue-400' : 'text-blue-600'
              : 'text-blue-500'
      }`}>{message}</p>}
    </form>
  );
};

export default UploadForm;
