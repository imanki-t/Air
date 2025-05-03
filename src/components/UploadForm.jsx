import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import uuid

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000; // 2 second delay before actual upload starts

// Helper function to get the JWT token from localStorage
const getToken = () => localStorage.getItem('token');

const calculateFileSignature = async (file) => {
    if (!file) return null;
    try {
        const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error("Error calculating file signature:", error);
        return null;
    }
};


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
  const uploadTimeoutRef = useRef(null);
  const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 });

  const showMessage = (msg) => {
    setMessage(msg);
    if (messageTimer) {
      clearTimeout(messageTimer);
    }
    const timer = setTimeout(() => {
      setMessage('');
    }, STATUS_MESSAGE_TIMEOUT);
    setMessageTimer(timer);
  };


  const saveUploadState = useCallback(async (uploadId, fileToSave, progressToSave, uploadStreamId = null) => {
    if (!fileToSave) return;
    const signature = await calculateFileSignature(fileToSave);
    if (signature === null) return;

    const state = {
        uploadId,
        filename: fileToSave.name,
        fileSize: fileToSave.size,
        fileType: fileToSave.type,
        fileSignature: signature,
        uploadedProgress: progressToSave,
        lastSaved: Date.now(),
        uploadStreamId
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
        console.error("Error saving upload state:", error);
    }
  }, []);

  const clearUploadState = useCallback(async (uploadIdToCleanup = null) => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            if (uploadIdToCleanup && state.uploadId === uploadIdToCleanup) {
                const token = getToken();
                if (token) {
                    await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${uploadIdToCleanup}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } else {
                  console.warn('No authentication token available for cleanup.');
                }
            }
        } catch (err) {
            console.error("Error during backend cleanup:", err);
        } finally {
            localStorage.removeItem(STORAGE_KEY);
            setPendingResume(null);
        }
    } else {
        setPendingResume(null);
    }
  }, []);


  // Restore Upload State on Mount
  useEffect(() => {
      const checkPendingUpload = async () => {
          const savedState = localStorage.getItem(STORAGE_KEY);
          if (savedState) {
              try {
                  const state = JSON.parse(savedState);
                  const now = Date.now();
                  if (now - state.lastSaved < UPLOAD_EXPIRY_TIME && state.filename && state.fileSize > 0 && state.uploadedProgress < 100) {
                      setPendingResume(state);
                      showMessage(`Found incomplete upload: '${state.filename}' (${state.uploadedProgress}% completed). Select the same file to resume.`);
                  } else {
                      clearUploadState(state?.uploadId);
                  }
              } catch (e) {
                  clearUploadState();
              }
          }
      };

      checkPendingUpload();
      window.addEventListener('focus', checkPendingUpload);
      return () => {
          window.removeEventListener('focus', checkPendingUpload);
          if (messageTimer) clearTimeout(messageTimer);
          if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
      };
  }, [clearUploadState, messageTimer]);


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


  // Perform Upload Logic
  const performUpload = useCallback(async (fileToUpload, uploadId, startByte = 0) => {
      setIsUploading(true);
      const token = getToken();
      if (!token) {
          showMessage("Authentication required.");
          setIsUploading(false);
          return;
      }

      const fileSlice = fileToUpload.slice(startByte);
      const formData = new FormData();
      formData.append('file', fileSlice);
      formData.append('resumableUploadId', uploadId);
      formData.append('resumableProgress', startByte);

      controllerRef.current = new AbortController();

      try {
          await axios.post(
              `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
              formData,
              {
                  signal: controllerRef.current.signal,
                  headers: {
                      'Content-Type': 'multipart/form-data',
                      Authorization: `Bearer ${token}` // Add Authorization header
                  },
                  onUploadProgress: (event) => {
                      if (!event.total) {
                          showMessage('Unable to calculate upload progress. Upload is continuing...');
                          return;
                      }

                      const totalBytes = startByte + event.loaded;
                      const percent = Math.round((totalBytes / fileToUpload.size) * 100);
                      setProgress(percent);

                      const now = Date.now();
                      const timeDiff = now - lastProgressUpdateRef.current.time;
                       if (timeDiff > 500) { // Update speed every 500ms for stability
                          const loadedDiff = event.loaded - lastProgressUpdateRef.current.loaded;
                          const speedBps = (loadedDiff / timeDiff) * 1000; // bytes per second
                          setUploadSpeed(speedBps);
                          lastProgressUpdateRef.current = { time: now, loaded: event.loaded };

                          if (speedBps > 0) {
                              const remaining = calculateTimeRemaining(totalBytes, fileToUpload.size, speedBps);
                              setEstimatedTime(remaining);
                          }
                      }

                      if (percent === 100) {
                          setEstimatedTime('Finalizing...');
                      }

                      if (percent % 5 === 0 && percent < 100) {
                          saveUploadState(uploadId, fileToUpload, percent);
                      }
                  }
              }
          );

          setProgress(100);
          showMessage(`Upload completed: '${fileToUpload.name}'`);
          clearUploadState(uploadId);
          setFile(null); // Clear file state on successful upload
          refresh(); // Call the refresh function provided as prop

      } catch (err) {
          if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
              showMessage(`Upload cancelled.`);
              saveUploadState(uploadId, fileToUpload, progress); // Save state on cancel
          } else {
              console.error('Upload error:', err);
              const errorMessage = err.response?.status === 413
                  ? 'File too large. Please upload a smaller file.'
                  : err.response?.status === 415
                      ? 'Unsupported file type. Please try a different file.'
                      : err.response?.status === 401
                          ? 'Authentication failed. Please log in again.'
                          : err.response?.status >= 500
                              ? 'Server error. Please try again later.'
                              : 'Upload failed. Please try again.';

              showMessage(errorMessage);
              saveUploadState(uploadId, fileToUpload, progress); // Save state on error
              setPendingResume({ // Set pending resume state on error
                uploadId: uploadId,
                filename: fileToUpload.name,
                fileSize: fileToUpload.size,
                fileType: fileToUpload.type,
                uploadedProgress: progress,
                lastSaved: Date.now(),
                fileSignature: await calculateFileSignature(fileToUpload)
              });
          }
      } finally {
          setIsUploading(false);
          // Only reset progress, estimatedTime, uploadSpeed if not cancelled and a resume state is saved
          if (!(axios.isCancel(err) || err.code === 'ERR_CANCELED') && localStorage.getItem(STORAGE_KEY)) {
             // Keep progress and estimated time for resume indication
          } else {
            setProgress(0);
            setEstimatedTime(null);
            setUploadSpeed(0);
          }
          controllerRef.current = null;
          uploadTimeoutRef.current = null;
      }
  }, [saveUploadState, clearUploadState, progress]); // Added progress to dependencies


  // Handle Upload Submission
  const handleSubmit = useCallback(async (e) => {
      e.preventDefault();
      if (!file) return showMessage('Please select a file to upload.');

      if (pendingResume) {
          showMessage('Verifying file for resume...');
          setLoading(true); // Assuming you have a loading state setter
          const currentFileSignature = await calculateFileSignature(file);
          setLoading(false);

          if (currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize) {
              clearUploadState(pendingResume?.uploadId); // Clear previous state if file mismatch
              showMessage('Selected file does not match the pending incomplete upload. Starting new upload.');
              // Proceed with new upload logic below
          } else {
              showMessage('File verified. Preparing to resume upload...');
              setLoading(true);
               uploadTimeoutRef.current = setTimeout(() => {
                  const uploadId = pendingResume.uploadId;
                  const startByte = Math.round((pendingResume.uploadedProgress / 100) * file.size);
                  performUpload(file, uploadId, startByte);
                  setPendingResume(null); // Clear pending resume after initiating upload
                  setLoading(false);
              }, UPLOAD_DELAY);
              return; // Exit handleSubmit after initiating resume
          }
      } else {
          showMessage('Preparing upload...');
      }

      // Logic for new upload (or if resume verification failed)
      setLoading(true); // Assuming you have a loading state setter
      uploadTimeoutRef.current = setTimeout(() => {
          const uploadId = uuidv4(); // Generate new uploadId for a new upload
          performUpload(file, uploadId, 0); // Start from byte 0 for new upload
          setPendingResume(null); // Ensure pending resume is cleared for a new upload
          setLoading(false);
      }, UPLOAD_DELAY);

  }, [file, performUpload, pendingResume, clearUploadState]);


  // Handle cancel upload
  const handleCancel = useCallback(() => {
    // If we're in the delay period, clear the timeout
    if (uploadTimeoutRef.current) {
      clearTimeout(uploadTimeoutRef.current);
      uploadTimeoutRef.current = null;
      setIsUploading(false);
      // Keep the current file and progress for potential resume
      showMessage('Upload preparation cancelled.');
       // Save the current state when cancelling before upload starts
      if(file && progress > 0) {
         saveUploadState(pendingResume?.uploadId || uuidv4(), file, progress);
         setPendingResume({ // Update pending resume state
            uploadId: pendingResume?.uploadId || uuidv4(),
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedProgress: progress,
            lastSaved: Date.now(),
             // fileSignature will be calculated in saveUploadState
         });
      } else if (file) {
          // If cancelled before progress starts, save state with 0 progress
           const newUploadId = uuidv4();
           saveUploadState(newUploadId, file, 0);
           setPendingResume({
            uploadId: newUploadId,
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            uploadedProgress: 0,
            lastSaved: Date.now(),
             // fileSignature will be calculated in saveUploadState
         });
      }

    } else if (controllerRef.current) {
      // If we have an active controller, abort the request
      controllerRef.current.abort();
      controllerRef.current = null;
      // saveUploadState is called in performUpload's catch block for cancel
    }
     setIsUploading(false);
  }, [uploadTimeoutRef, controllerRef, file, progress, pendingResume, saveUploadState]);


  // Handle file removal
  const handleRemove = useCallback(() => {
    if (isUploading) return showMessage("Cancel before removing.");
    if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
    setFile(null);
    setProgress(0);
    setEstimatedTime(null);
    setUploadSpeed(0);
    clearUploadState(pendingResume?.uploadId); // Clear state and cleanup on remove
  }, [isUploading, pendingResume, clearUploadState]);


  // Handle file drop
  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Check if files were dropped
    if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
      showMessage('No valid file detected. Please try again.');
      return;
    }

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setMessage('');
      setFile(droppedFile);

      // Check if this is a resume situation
      if (pendingResume) {
        if (pendingResume.filename === droppedFile.name &&
            pendingResume.fileSize === droppedFile.size) {

          // Verify file signature if available
          if (pendingResume.fileSignature) {
              const isMatchingFile = await calculateFileSignature(droppedFile);
              if (isMatchingFile === pendingResume.fileSignature) {
                showMessage('Resume file verified. Ready to resume upload.');
                // Auto-start upload when correct file is detected
                setTimeout(() => handleSubmit({preventDefault: () => {}}), 500); // Pass dummy event object
              } else {
                showMessage('Different file detected. Starting new upload.');
                clearUploadState(pendingResume?.uploadId);
                setPendingResume(null); // Clear pending resume state
              }
          } else {
            showMessage('Ready to resume upload.');
             setTimeout(() => handleSubmit({preventDefault: () => {}}), 500); // Auto-start upload
          }
        } else {
          // Wrong file for resume - clear file and show resume UI again
          showMessage('Different file detected. Please select the correct file or clear the pending upload.');
          setFile(null);
          // Keep pendingResume state to show resume prompt
        }
      } else {
         clearUploadState(); // Clear any old state if dropping a new file
      }
    }
  }, [pendingResume, clearUploadState, handleSubmit]); // Added handleSubmit to dependencies


  // Handle drag over
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  // Handle file input change
  const handleFileInputChange = useCallback(async (e) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setMessage('');
      setFile(selectedFile);

      // Check if this is a resume situation
      if (pendingResume) {
        if (pendingResume.filename === selectedFile.name &&
            pendingResume.fileSize === selectedFile.size) {

          // Verify file signature if available
          if (pendingResume.fileSignature) {
            const isMatchingFile = await calculateFileSignature(selectedFile);
            if (isMatchingFile === pendingResume.fileSignature) {
              showMessage('Resume file verified. Ready to resume upload.');
               setTimeout(() => handleSubmit({preventDefault: () => {}}), 500); // Auto-start upload
            } else {
              showMessage('Different file detected. Starting new upload.');
              clearUploadState(pendingResume?.uploadId);
              setPendingResume(null); // Clear pending resume state
            }
          } else {
            showMessage('Ready to resume upload.');
             setTimeout(() => handleSubmit({preventDefault: () => {}}), 500); // Auto-start upload
          }
        } else {
          // Wrong file for resume - clear file and show resume UI again
          showMessage('Different file detected. Please select the correct file or clear the pending upload.');
          setFile(null);
           // Keep pendingResume state to show resume prompt
        }
      } else {
         clearUploadState(); // Clear any old state if selecting a new file
      }
    }
  }, [pendingResume, clearUploadState, handleSubmit]); // Added handleSubmit to dependencies


  // Handle resume upload - this will prompt user to select the file again
  const handleResumeUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle cancel resume
  const handleCancelResume = useCallback(() => {
    clearUploadState(pendingResume?.uploadId); // Clear state and cleanup on cancel resume
  }, [pendingResume, clearUploadState]);


  // Determine message color based on content
  const getMessageColor = (messageText) => {
    if (!messageText) return '';
    if (messageText.includes('successfully') || messageText.includes('verified') || messageText.includes('Ready to resume')) {
      return darkMode ? 'text-blue-400' : 'text-blue-600';
    } else if (messageText.includes('Different file') || messageText.includes('cancelled') || messageText.includes('preparation cancelled')) {
       return darkMode ? 'text-amber-400' : 'text-amber-600';
    } else {
      return darkMode ? 'text-red-400' : 'text-red-600';
    }
  };

  const [loading, setLoading] = useState(false); // Added loading state

 return (
    <form
      onSubmit={handleSubmit}
      className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
    >
      <h3 className={`text-xl font-medium mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
        Upload File
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
              Your previous upload of "{getTruncatedFileName(pendingResume.filename)}"
              was interrupted at {pendingResume.uploadedProgress}%.
            </p>
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleResumeUpload}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Select file to Resume
            </button>
             <button
              type="button"
              onClick={handleCancelResume}
              className={`px-4 py-2.5 rounded-md font-medium transition-colors ${
                darkMode
                  ? 'bg-gray-700 hover:bg-gray-600 text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              Clear Pending Upload
            </button>
          </div>
        </div>
      )}

      {/* Upload area - only show if not currently uploading and no pending resume (or file is selected for resume) */}
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
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {file
              ?
                <div>
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
                  {pendingResume
                    ? `Drag and drop or click to select "${getTruncatedFileName(pendingResume.filename)}" to resume upload`
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

      {/* Upload progress */}
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

          {/* Progress info container */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <div className={`text-base font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Progress: {progress}%
              </div>
            </div>

            <div className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Upload speed: {uploadSpeed > 0 ? formatBytes(uploadSpeed) + '/s' : 'Calculating...'}
            </div>

            <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Estimated time: {estimatedTime}
            </div>
          </div>

          {/* Cancel button */}
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

       {/* Loading spinner or message */}
      {loading && (
          <div className={`mt-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Loading...
          </div>
      )}


      {/* Action buttons - only show when file is selected, not uploading, and not in a pending resume state requiring file selection*/}
      {file && !isUploading && !loading && (
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
            {pendingResume ? 'Resume Upload' : 'Upload'}
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
