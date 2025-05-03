// components/UploadForm.jsx
// This version includes all the modifications to auto-resume uploads using localStorage
// and adds JWT authentication headers to backend calls for multi-user support.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 for unique upload IDs

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000; // 2 second delay before actual upload starts

// Helper function to get the JWT token from localStorage
const getToken = () => localStorage.getItem('token');


const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [truncateLength, setTruncateLength] = useState(15);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [pendingResume, setPendingResume] = useState(null); // Stores state if a resume is pending
  const [messageTimer, setMessageTimer] = useState(null); // Timer for status messages
  const [loading, setLoading] = useState(false); // State for initial preparation loading


  const controllerRef = useRef(null); // For cancelling Axios request
  const fileInputRef = useRef(null); // Reference to the hidden file input
  const uploadFileRef = useRef(null); // Holds the file object for upload
  const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 }); // For speed/time calculation
  const uploadTimeoutRef = useRef(null); // Timeout ID for the upload delay

  // --- Utility Functions ---

  const showMessage = useCallback((msg, timeout = STATUS_MESSAGE_TIMEOUT) => {
    setMessage(msg);
    // Clear any existing timer before setting a new one
    if (messageTimer) clearTimeout(messageTimer);
    const timer = setTimeout(() => setMessage(''), timeout);
    setMessageTimer(timer);
  }, [messageTimer]); // Include messageTimer in deps

   // Function to calculate SHA-256 hash of a file slice for resume verification
   // Note: This is a client-side check. Server-side verification is also recommended.
   const calculateFileSignature = async (file) => {
        if (!file) return null;
        try {
            // Read a slice of the file as ArrayBuffer
            const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer(); // Hash first 1MB or less

            // Use SubtleCrypto to digest the buffer
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);

            // Convert ArrayBuffer to hex string
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.error("Error calculating file signature:", error);
            return null; // Return null if hashing fails
        }
   };


   // Function to save upload state to localStorage
   const saveUploadState = async (uploadId, file, progress, uploadStreamId) => {
       if (!file) return; // Don't save state without a file

       const signature = await calculateFileSignature(file); // Calculate signature
       if (signature === null) {
            console.warn("Could not calculate file signature, skipping state save.");
            return; // Do not save state if signature calculation failed
       }

       const state = {
           uploadId, // Unique ID for this upload attempt (consistent across pauses/resumes)
           filename: file.name,
           fileSize: file.size,
           fileType: file.type, // MIME type
           fileSignature: signature, // Store file signature for verification
           uploadedProgress: progress, // Percentage uploaded (0-100)
           lastSaved: Date.now(), // Timestamp
           uploadStreamId: uploadStreamId // Optional: backend-provided ID if helpful for resume
       };
       try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            console.log('Upload state saved:', state);
       } catch (error) {
            console.error("Error saving upload state to localStorage:", error);
       }
   };

   // Function to remove upload state from localStorage
   const clearUploadState = useCallback(async (uploadIdToCleanup = null) => {
       const savedState = localStorage.getItem(STORAGE_KEY);
       if (savedState) {
           try {
               const state = JSON.parse(savedState);
               // Optionally notify backend to clean up an upload by ID if provided
               // This requires the uploadId to be part of the saved state and sent to backend
               if (uploadIdToCleanup && state.uploadId === uploadIdToCleanup) {
                    console.log(`Notifying backend to cleanup incomplete upload ${uploadIdToCleanup}`);
                    const token = getToken(); // Get token for auth
                    if (token) {
                         try {
                            // NOTE: This cleanup call requires authentication.
                            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${uploadIdToCleanup}`, {
                                headers: { Authorization: `Bearer ${token}` } // Add Auth header
                              });
                             console.log(`Backend cleanup notification sent for ${uploadIdToCleanup}`);
                         } catch (err) {
                             console.error(`Failed to notify backend for cleanup ${uploadIdToCleanup}:`, err);
                             // Decide how to handle cleanup failure - maybe log and continue?
                         }
                    } else {
                        console.warn("No token found, cannot notify backend for cleanup.");
                    }
               }

           } catch (error) {
               console.error("Error parsing saved state during cleanup:", error);
           } finally {
               // Always remove from localStorage regardless of backend notification success/failure
               localStorage.removeItem(STORAGE_KEY);
               setPendingResume(null); // Also clear pending resume state in component
               console.log('Upload state cleared from localStorage');
           }
       } else {
           // State was already clear, just ensure pendingResume is null
           setPendingResume(null);
       }

   }, []); // Empty dependency array as it doesn't depend on external state

  // --- Upload Logic ---

  const performUpload = useCallback(async (fileToUpload, uploadId, startByte = 0) => {
    if (!fileToUpload) {
        setIsUploading(false);
        setLoading(false); // Ensure loading is false
        showMessage('No file selected for upload.');
        return;
    }

    setIsUploading(true);
    setLoading(false); // Turn off preparation loading
    setProgress(Math.round((startByte / fileToUpload.size) * 100)); // Set initial progress
    setEstimatedTime(null);
    setUploadSpeed(0);
    lastProgressUpdateRef.current = { time: Date.now(), loaded: startByte }; // Initialize with startByte
    setError(''); // Clear any general errors (assuming setError is available or handled by App.jsx)

    controllerRef.current = new AbortController(); // Create a new AbortController

    // Slice the file to send only the remaining part
    const fileSlice = fileToUpload.slice(startByte);

    const formData = new FormData();
    formData.append('file', fileSlice); // Append the sliced file data

    // Add metadata for resumable upload
    formData.append('resumableUploadId', uploadId);
    formData.append('resumableProgress', startByte); // Tell backend where to resume from


    const token = getToken(); // Get token for auth
    if (!token) {
         showMessage('Upload failed: Not authenticated. Please log in.');
         setIsUploading(false);
         setLoading(false);
         // Potentially trigger a global logout in App.jsx here
         return; // Stop upload if no token
    }

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          signal: controllerRef.current.signal, // Link controller to request
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${token}` // *** Add Authorization header ***
          },
          onUploadProgress: (event) => {
            // loaded and total in the event are for the *current slice* being uploaded
            // We need to calculate overall progress
            const totalBytesUploadedSoFar = startByte + event.loaded;
            const totalOverallSize = fileToUpload.size;
            const percent = Math.round((totalBytesUploadedSoFar / totalOverallSize) * 100);
            setProgress(percent);

             // Calculate speed and estimated time for the *current slice*
             const now = Date.now();
             const timeElapsed = (now - lastProgressUpdateRef.current.time) / 1000; // in seconds
             const bytesLoadedThisUpdate = totalBytesUploadedSoFar - lastProgressUpdateRef.current.loaded;

             // Avoid division by zero
             if (timeElapsed > 0 && bytesLoadedThisUpdate > 0) {
                 const speed = bytesLoadedThisUpdate / timeElapsed; // bytes per second
                 setUploadSpeed(speed);

                 // Estimate remaining time based on overall remaining bytes
                 const remainingBytesOverall = totalOverallSize - totalBytesUploadedSoFar;
                 const estimatedTimeSec = remainingBytesOverall / speed; // in seconds
                 setEstimatedTime(estimatedTimeSec);
             }

             lastProgressUpdateRef.current = { time: now, loaded: totalBytesUploadedSoFar };

             // Save state periodically (e.g., every 5% or 10%) or based on time
             // Saving frequently can be performance intensive. A threshold is better.
             if (percent % 5 === 0 && percent > 0 && percent < 100) {
                // Pass the overall progress percentage and the backend-provided file ID if available
                // The backend should ideally return the _id of the file object for the ongoing upload
                // in the progress response or in the initial upload start response.
                // Assuming res?.data?._id from the *finish* event or a progress update is available/relevant.
                // If the backend doesn't return an uploadStreamId during progress, you might omit it here.
                saveUploadState(uploadId, fileToUpload, percent, res?.data?._id); // Save progress
             }
          }
        }
      );

      // Upload finished successfully
      setIsUploading(false);
      setLoading(false);
      setProgress(100); // Ensure progress is 100% on finish
      setEstimatedTime(null);
      setUploadSpeed(0);
      showMessage(`'${fileToUpload.name}' uploaded successfully!`);

      // Clear state on successful upload, passing the uploadId for backend cleanup confirmation
      clearUploadState(uploadId);
      setFile(null); // Clear the selected file from the form
      if (fileInputRef.current) { // Safely access fileInputRef
          fileInputRef.current.value = ''; // Reset file input element
      }


      if (refresh) refresh(); // Refresh the file list

    } catch (err) {
      setIsUploading(false);
      setLoading(false);
      setEstimatedTime(null);
      setUploadSpeed(0);

      if (axios.isCancel(err)) {
        showMessage(`Upload of '${fileToUpload.name}' cancelled.`);
        // Do NOT clear upload state on cancel, allow resume
         // Save state on cancel, passing the current progress and uploadId
         saveUploadState(uploadId, fileToUpload, progress, err.response?.data?._id); // Save current progress on cancel
         console.log('Upload cancelled, state saved for resume.');

      } else {
        console.error('Upload error:', err);
        // Handle 401 Unauthorized specifically
        if (err.response && err.response.status === 401) {
            showMessage('Upload failed: Unauthorized. Please log in again.', 10000); // Longer timeout
            // Potentially trigger a global logout in App.jsx here
             // window.dispatchEvent(new CustomEvent('unauthorized')); // Custom event example
        } else if (err.response && err.response.data && err.response.data.error) {
             showMessage(`Upload of '${fileToUpload.name}' failed: ${err.response.data.error}`, 10000);
        }
         else {
           showMessage(`Upload of '${fileToUpload.name}' failed: ${err.message}`, 10000); // Longer timeout
        }

         // On fatal error, decide if you want to clear state or leave it for manual retry.
         // Leaving it allows the user to potentially manually resume if the error was transient.
         // clearUploadState(uploadId); // Optional: Clear state on fatal error
      }
       controllerRef.current = null; // Clear controller ref
    }
  }, [refresh, showMessage, progress, saveUploadState, clearUploadState]); // Include necessary deps

  // --- Event Handlers ---

  const handleFileChange = (e) => {
      const selectedFile = e.target.files && e.target.files[0]; // Safely access files array
      if (selectedFile) {
          setFile(selectedFile);
          uploadFileRef.current = selectedFile; // Store file reference
          setProgress(0);
          setEstimatedTime(null);
          setUploadSpeed(0);
          setMessage(''); // Clear messages on new file selection
          clearUploadState(); // Clear any pending resume state on new file select
      } else {
          setFile(null);
          uploadFileRef.current = null;
          setProgress(0);
          setEstimatedTime(null);
          setUploadSpeed(0);
          setMessage('');
      }
  };

  const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent default browser handling
      const droppedFile = e.dataTransfer.files && e.dataTransfer.files[0]; // Safely access files array
      if (droppedFile) {
          setFile(droppedFile);
           uploadFileRef.current = droppedFile; // Store file reference
          setProgress(0);
          setEstimatedTime(null);
          setUploadSpeed(0);
          setMessage(''); // Clear messages on drop
          clearUploadState(); // Clear any pending resume state on drop
      }
  };

  const handleDragOver = (e) => {
      e.preventDefault();
       e.stopPropagation(); // Prevent default browser handling
      // Optional: Add visual feedback for drag over
      // e.currentTarget.classList.add('drag-over');
  };
   const handleDragLeave = (e) => {
       e.preventDefault();
       e.stopPropagation();
       // Optional: Remove visual feedback for drag leave
       // e.currentTarget.classList.remove('drag-over');
   };


  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!file) {
        showMessage('Please select a file to upload.');
        return;
    }

     // If there's a pending resume state, verify the selected file matches
    if (pendingResume) {
        setLoading(true); // Show loading while verifying file
        const currentFileSignature = await calculateFileSignature(file);
        setLoading(false); // Hide loading after verification

        if (currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize) {
             showMessage('Selected file does not match the pending incomplete upload. Please select the correct file or remove the pending upload.');
             // Do NOT start upload, let the user fix it.
             return;
        }
         // If files match, proceed to resume
         showMessage('File verified. Preparing to resume upload...');

    } else {
        // If no pending resume, start a new upload preparation
        showMessage('Preparing upload...');
    }

    // Start the actual upload after a small delay
    setLoading(true); // Show loading while preparing/waiting for delay
    uploadTimeoutRef.current = setTimeout(() => {
        const uploadId = pendingResume?.uploadId || uuidv4(); // Use pending ID or generate new one
        // Calculate start byte based on pending progress and file size
        const startByte = pendingResume ? Math.round((pendingResume.uploadedProgress / 100) * file.size) : 0;

        // Ensure startByte does not exceed file size
        const actualStartByte = Math.min(startByte, file.size);

        console.log(`Starting upload ${pendingResume ? 'resume' : 'new'} from byte ${actualStartByte}`);
        performUpload(file, uploadId, actualStartByte);
        setPendingResume(null); // Clear pending resume state after starting upload
         setLoading(false); // Loading will be managed by isUploading now
    }, UPLOAD_DELAY);


  }, [file, performUpload, showMessage, pendingResume, clearUploadState]); // Added clearUploadState to deps


   // Handle cancelling the upload
  const handleCancel = useCallback(() => {
    // Clear the initial upload delay timeout if it hasn't started yet
     if (uploadTimeoutRef.current) {
         clearTimeout(uploadTimeoutRef.current);
         uploadTimeoutRef.current = null;
         setIsUploading(false); // Ensure uploading state is false
         setLoading(false); // Ensure loading state is false
         showMessage("Upload preparation cancelled.");
          // Decide if you want to clear saved state here or allow resume after manual cancel
          // Leaving it allows the user to click 'Resume Upload' again.
          // clearUploadState(); // Optional: Clear state on manual cancel before upload starts
     } else if (isUploading && controllerRef.current) {
        // If upload is in progress, abort the Axios request
        controllerRef.current.abort();
        // The .catch block in performUpload will handle the cancellation message and state saving
     } else {
        showMessage("No upload in progress to cancel.");
     }
  }, [isUploading, showMessage]); // Added showMessage to deps

  const handleRemove = useCallback(() => {
      if (isUploading) {
          showMessage("Cannot remove file during upload. Please cancel first.");
          return;
      }
      // Clear any pending upload delay timeout
      if (uploadTimeoutRef.current) {
          clearTimeout(uploadTimeoutRef.current);
          uploadTimeoutRef.current = null;
          setLoading(false); // Ensure loading is false
      }

      setFile(null);
      uploadFileRef.current = null;
      setProgress(0);
      setEstimatedTime(null);
      setUploadSpeed(0);
      setMessage('');
      if (fileInputRef.current) {
          fileInputRef.current.value = ''; // Reset the file input element
      }
       clearUploadState(); // Clear any pending resume state
  }, [isUploading, showMessage, clearUploadState]);


    // --- Resume Upload Logic (on component mount/window focus) ---
    useEffect(() => {
        const checkPendingUpload = async () => {
            console.log("Checking for pending upload state...");
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const now = Date.now();

                     // Check if the state is recent, a file name/size exists, and progress is less than 100%
                    if (now - state.lastSaved < UPLOAD_EXPIRY_TIME && state.filename && state.fileSize > 0 && state.uploadedProgress < 100) {
                        // We don't have the actual file object here from previous session.
                        // User will need to re-select the file to resume the upload stream.

                        // Set the pending resume state so the form knows to offer resume option
                        setPendingResume(state);
                        showMessage(`Found incomplete upload: '${state.filename}' (${state.uploadedProgress}% completed). Select the same file to resume.`);


                        // Optional: Ping backend to check if the upload stream still exists
                        // This would require a backend endpoint like GET /api/files/uploads/:uploadId/status
                        // and potentially updating the saved state with server-side progress.
                        // Not implemented in the provided backend snippets, but the client state exists.

                    } else {
                        console.log("Pending upload state is expired, invalid, or already completed, clearing.");
                         // Clear expired state, potentially notifying backend for cleanup
                         clearUploadState(state?.uploadId);
                    }
                } catch (e) {
                    console.error("Error parsing saved upload state:", e);
                     // Clear invalid state, potentially notifying backend for cleanup if uploadId was present
                     clearUploadState(e?.uploadId); // Attempt to pass uploadId if available in the error object or state
                }
            } else {
                 console.log("No pending upload state found in localStorage.");
            }
             console.log("Pending upload check complete.");
        };

        // Check on component mount
        checkPendingUpload();

        // Also check when the window regains focus (e.g., user switches tabs)
        window.addEventListener('focus', checkPendingUpload);

        return () => {
             window.removeEventListener('focus', checkPendingUpload);
             // Cleanup the message timer if the component unmounts
             if (messageTimer) clearTimeout(messageTimer);
              // Cleanup any pending upload timeout
            if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
        };

    }, [clearUploadState, showMessage, messageTimer]); // Added dependencies


    // --- Truncate filename if too long ---
    useEffect(() => {
        const containerWidth = fileInputRef.current?.parentElement?.offsetWidth;
        if (file && containerWidth) {
             // Estimate how many characters fit based on container width (rough estimation)
             const charWidthEstimate = 8; // Average pixel width per character
             // Subtract space for icons, padding, and potential size/progress text
             const paddingAndIconSpace = 100; // Estimate padding + icons space in px
             const maxChars = Math.floor((containerWidth - paddingAndIconSpace) / charWidthEstimate);
             setTruncateLength(Math.max(10, maxChars)); // Minimum length of 10 characters
        } else {
             setTruncateLength(25); // Default if container width is not available
        }
         // Recalculate on window resize
        const handleResize = () => {
            const currentContainerWidth = fileInputRef.current?.parentElement?.offsetWidth;
             if (file && currentContainerWidth) {
                const charWidthEstimate = 8;
                const paddingAndIconSpace = 100;
                const maxChars = Math.floor((currentContainerWidth - paddingAndIconSpace) / charWidthEstimate);
                setTruncateLength(Math.max(10, maxChars));
             } else {
                setTruncateLength(25);
             }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);

    }, [file]); // Recalculate when file changes or window resizes


    // Function to format bytes into a human-readable string
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

     // Function to format time in seconds into HH:MM:SS or MM:SS
    const formatTime = (seconds) => {
        if (seconds === null || seconds === Infinity || isNaN(seconds) || seconds < 0) return '--:--';
        const s = Math.floor(seconds % 60);
        const m = Math.floor((seconds / 60) % 60);
        const h = Math.floor(seconds / 3600);
        const formattedS = s < 10 ? '0' + s : s;
        const formattedM = m < 10 ? '0' + m : m;
        return h > 0 ? `${h}:${formattedM}:${formattedS}` : `${m}:${formattedS}`;
    };


    // Helper to get message color class
    const getMessageColor = (msg) => {
        if (!msg) return '';
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('success') || lowerMsg.includes('uploaded')) return 'text-green-500';
        if (lowerMsg.includes('fail') || lowerMsg.includes('error') || lowerMsg.includes('unauthorized') || lowerMsg.includes('match')) return 'text-red-500';
        if (lowerMsg.includes('cancel')) return 'text-yellow-500';
        if (lowerMsg.includes('resume') || lowerMsg.includes('pending') || lowerMsg.includes('preparing')) return 'text-blue-500';
        return 'text-gray-500';
    };

     // Truncate filename helper
    const truncateFilename = (name, length) => {
         if (!name) return '';
        if (name.length <= length) return name;
        const parts = name.split('.');
        const extension = parts.length > 1 ? parts.pop() : '';
        const baseName = parts.join('.'); // Join back parts before extension

        const availableLength = length - (extension ? extension.length + 1 : 0); // Account for extension and dot
        const ellipsisLength = 3; // Length of '...'

        if (availableLength <= ellipsisLength) {
            // If not enough space for base name + ellipsis, just truncate the beginning
            return baseName.slice(0, length - (extension ? extension.length + 1 : 0)) + (extension ? '.' + extension : '');
        }

        const startLength = Math.floor((availableLength - ellipsisLength) / 2);
        const endLength = availableLength - ellipsisLength - startLength;

        return `${baseName.slice(0, startLength)}...${baseName.slice(baseName.length - endLength)}${extension ? '.' + extension : ''}`;
    };


  return (
    <div className={`mb-8 p-6 rounded-xl shadow-md border transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Upload Files</h2>

      {/* Drag and Drop Area / File Input */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-300
                   ${darkMode ? 'border-gray-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500'}
                   ${file ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave} // Added drag leave handler
        onClick={() => {
             if (!isUploading && !loading) { // Prevent opening file dialog while uploading or preparing
                 fileInputRef.current.click(); // Trigger file input click
             } else {
                 showMessage(isUploading ? 'Cannot select a new file during upload.' : 'Upload is preparing...');
             }
        }}
      >
        <input
          type="file"
          ref={fileInputRef} // Attach ref
          onChange={handleFileChange}
          className="hidden" // Hide the default input
          disabled={isUploading || loading} // Disable input while uploading or preparing
        />
        {file ? (
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Selected: {truncateFilename(file.name, truncateLength)} ({formatBytes(file.size)})
          </p>
        ) : (
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Drag & Drop files here, or click to browse
          </p>
        )}
      </div>

      {/* Upload progress bar and info */}
      {(isUploading || loading || (file && progress > 0 && progress < 100 && !message.includes('completed'))) && (
        <div className="mt-4">
           {/* Display filename, progress percentage, speed, time left */}
           <div className="flex flex-col sm:flex-row sm:justify-between mb-1 text-sm font-medium">
               <span className={cn("truncate sm:w-1/2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                   {isUploading || loading ? (
                        <span>{isUploading ? 'Uploading:' : 'Preparing:'} {truncateFilename(file?.name || '', truncateLength)}</span>
                   ) : (
                        <span>{truncateFilename(file?.name || '', truncateLength)}</span>
                   )}
               </span>
               <span className={cn("text-right sm:w-1/2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                   {isUploading || (file && progress > 0 && progress < 100) ? `${progress}%` : ''}
               </span>
           </div>

           {/* Progress Bar */}
           {isUploading || (file && progress > 0 && progress < 100) ? (
                <div className={cn(`w-full rounded-full h-2.5`, darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                   <div
                       className="h-2.5 rounded-full bg-blue-600 transition-all duration-100"
                       style={{ width: `${progress}%` }}
                   ></div>
               </div>
           ) : (
               // Placeholder or empty space when no active progress
               <div className="w-full rounded-full h-2.5 invisible"></div>
           )}


           {/* Speed and Time Left */}
           {(isUploading || (file && progress > 0 && progress < 100)) && uploadSpeed > 0 && (
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                     <span>Speed: {formatBytes(uploadSpeed)}/s</span>
                     <span>Time Left: {formatTime(estimatedTime)}</span>
                </div>
           )}


          {/* Cancel button with proper spacing */}
          {(isUploading || loading) && ( // Show cancel button if uploading OR preparing
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                    {loading && ( // Show spinner if preparing
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     )}
                     Cancel
                </button>
              </div>
          )}
        </div>
      )}

      {/* Action buttons - only show when file is selected and not uploading or preparing */}
      {file && !isUploading && !loading && (
        <div className="flex gap-3 mt-4"> {/* Adjusted margin-top */}
          <button
            type="button" // Changed from submit to button
            onClick={handleSubmit} // Call handleSubmit
            className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-wait ${
              pendingResume // Check if it's a resume scenario
                ? (darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700') // Blue for Resume
                : (darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700') // Green for Upload
            }`}
            disabled={loading || isUploading} // Disable while loading (preparing) or uploading
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
           {/* If pending resume exists and message is about mismatch, add a clear option */}
           {pendingResume && message.includes('Selected file does not match') && (
              <button
                className="ml-2 text-sm underline"
                onClick={() => {
                    clearUploadState(pendingResume?.uploadId); // Clear the pending state
                    showMessage('Pending upload state cleared.'); // Show confirmation message
                }}
              >
                 Clear Pending
              </button>
           )}
        </p>
      )}

       {/* CSS Animations */}
        <style jsx>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
             @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: .5; }
            }
            .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }

            /* Optional: Add drag-over style */
            /* .drag-over { border-color: #3b82f6; } */
        `}</style>
    </div>
  );
};

export default UploadForm;
             
