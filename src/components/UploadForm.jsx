import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 for unique upload IDs

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000;
// 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000;
// 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000; // 2 second delay before actual upload starts

// 1. Add Token Helper Function
const getToken = () => localStorage.getItem('token');


// 2. Remove IndexedDB Support - No IndexedDB code found in the original file to remove.

const UploadForm = ({ refresh, darkMode }) => {
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState('');
const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [truncateLength, setTruncateLength] = useState(15); // Keep existing state
  const [estimatedTime, setEstimatedTime] = useState(null); // Keep existing state
const [uploadSpeed, setUploadSpeed] = useState(0);   // Keep existing state
  const [pendingResume, setPendingResume] = useState(null);
// Stores state if a resume is pending
  const [messageTimer, setMessageTimer] = useState(null);
// Timer for status messages
  const [loading, setLoading] = useState(false);
// State for initial preparation loading (e.g., signature calculation)


  const controllerRef = useRef(null);
// For cancelling Axios request
  const fileInputRef = useRef(null);
// Reference to the hidden file input
  const uploadTimeoutRef = useRef(null); // Timeout ID for the upload delay
  // Remove refs not explicitly used in the refactored logic if desired, e.g., uploadFileRef, lastProgressUpdateRef

  // --- Utility Functions ---

  const showMessage = useCallback((msg, timeout = STATUS_MESSAGE_TIMEOUT) => {
    setMessage(msg);
    if (messageTimer) clearTimeout(messageTimer);
    const timer = setTimeout(() => setMessage(''), timeout);
    setMessageTimer(timer);
  }, [messageTimer]);

  // 3. Add File Signature Calculation (Matches prompt)
  const calculateFileSignature = async (file) => {
    if (!file) return null;
    try {
      const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer(); // Hash first 1MB or less
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
      console.error("Error calculating file signature:", err);
      return null; // Return null if hashing fails
    }
  };

  // 4. Save Upload State to localStorage (Matches prompt)
  const saveUploadState = async (uploadId, file, progress, uploadStreamId = null) => {
    if (!file) return; // Don't save state without a file

    const signature = await calculateFileSignature(file); // Calculate signature
    if (!signature) {
        console.warn("Could not calculate file signature, skipping state save.");
        return; // Do not save state if signature calculation failed
    }

    const state = {
        uploadId, // Unique ID for this upload attempt
        filename: file.name,
        fileSize: file.size,
        fileType: file.type, // MIME type
        fileSignature: signature, // Store file signature for verification
        uploadedProgress: progress, // Percentage uploaded (0-100)
        lastSaved: Date.now(), // Timestamp
        uploadStreamId // Optional backend-provided ID
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        // console.log('Upload state saved:', state); // Optional: for debugging
    } catch (err) {
        console.error("Failed to save upload state:", err);
    }
  };


  // 5. Clear Upload State & Clean Up (Matches prompt)
  const clearUploadState = useCallback(async (uploadId = null) => {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (savedState) {
        try {
            const state = JSON.parse(savedState);
            // Notify backend to clean up only if an uploadId is provided AND it matches the stored uploadId
            if (uploadId && state.uploadId === uploadId) {
                console.log(`Attempting backend cleanup for incomplete upload ${uploadId}`);
                const token = getToken(); // Get token for auth
                if (!token) {
                    console.warn("No authentication token available for cleanup. Cannot notify backend.");
                    // Still remove local state below
                } else {
                    try {
                        // NOTE: This cleanup call requires authentication.
                        await axios.delete(
                            `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${uploadId}`,
                            { headers: { Authorization: `Bearer ${token}` } } // Add Auth header
                        );
                        console.log(`Backend cleanup notification sent for ${uploadId}`);
                    } catch (err) {
                        // Log error but proceed to remove local state
                        console.error(`Failed to notify backend for cleanup ${uploadId}:`, err.response?.data || err.message);
                        // Handle specific errors (e.g., 404 if already cleaned up) if needed
                    }
                }
            }
        } catch (err) {
            console.error("Error parsing saved state during cleanup attempt:", err);
            // Still remove local state below
        } finally {
            // Always remove from localStorage regardless of backend notification success/failure or parsing errors
            localStorage.removeItem(STORAGE_KEY);
            setPendingResume(null); // Also clear pending resume state in component
            console.log('Upload state cleared from localStorage.');
        }
    } else {
         // State was already clear, just ensure pendingResume is null
        setPendingResume(null);
    }
  }, []); // No external state dependencies needed for the core logic


  // 6. Restore Resume State on Mount (Matches prompt)
  useEffect(() => {
    const token = getToken();
    if (!token) {
        // Use showMessage for user feedback instead of console only
        showMessage("You must be logged in to upload or resume files.");
        // Potentially disable the form or parts of it here if needed based on UI requirements
        return; // Stop if not logged in
    }

    const checkPending = async () => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                // Check expiry, existence of filename, and ensure progress < 100
                if (Date.now() - state.lastSaved < UPLOAD_EXPIRY_TIME && state.filename && state.uploadedProgress < 100) {
                     setPendingResume(state);
                     // Provide more context in the message
                     showMessage(`Resume available for '${state.filename}' (${state.uploadedProgress}% complete). Select the same file to continue.`);
                } else {
                    // State is expired or invalid (e.g., completed)
                    console.log("Pending upload state is expired, invalid, or completed. Clearing.");
                    // Pass the uploadId for potential backend cleanup
                    clearUploadState(state?.uploadId);
                }
            } catch (err) {
                 console.error("Error parsing saved upload state:", err);
                 // Clear potentially corrupt state. Don't attempt cleanup as ID is uncertain.
                 clearUploadState();
            }
        } else {
             // If no saved state, ensure pendingResume is null (might be redundant but safe)
             setPendingResume(null);
        }
    };

    checkPending(); // Check on mount

    // Check when window gains focus
    window.addEventListener('focus', checkPending);

    // Cleanup function
    return () => {
        window.removeEventListener('focus', checkPending);
        // Cleanup message timer on unmount
        if (messageTimer) clearTimeout(messageTimer);
        // Cleanup upload delay timer on unmount
        if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
    };
  }, [clearUploadState, showMessage, messageTimer]); // Add dependencies


  // --- Upload Logic ---

  // 8. Modify performUpload with JWT (Matches prompt)
  const performUpload = useCallback(async (fileToUpload, uploadId, startByte = 0) => {
    setIsUploading(true);
    setLoading(false); // Ensure preparation loading is off
    controllerRef.current = new AbortController(); // Prepare for cancellation

    const token = getToken(); // Get token for auth
    if (!token) {
      showMessage("Authentication required. Please log in to upload.");
      setIsUploading(false);
      setLoading(false);
      // Potentially clear state or redirect to login
      // clearUploadState(uploadId); // Decide if state should be cleared on auth failure during upload attempt
      return; // Stop upload if no token
    }

    // Ensure startByte is valid
    const actualStartByte = Math.max(0, Math.min(startByte, fileToUpload.size));
    setProgress(Math.round((actualStartByte / fileToUpload.size) * 100)); // Set initial progress
    setEstimatedTime(null); // Reset estimations
    setUploadSpeed(0);

    const fileSlice = fileToUpload.slice(actualStartByte); // Slice the file from the correct point
    const formData = new FormData();
    formData.append("file", fileSlice); // Append the potentially partial file data
    // Add resumable upload metadata for the backend
    formData.append("resumableUploadId", uploadId);
    formData.append("resumableProgress", actualStartByte.toString()); // Send as string if backend expects it

    try {
      // Use await for the POST request
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          signal: controllerRef.current.signal, // Link controller to request
          headers: {
            'Content-Type': 'multipart/form-data', // Let browser set boundary
            Authorization: `Bearer ${token}` // *** Add Authorization header ***
          },
          onUploadProgress: (event) => {
             // Calculate overall progress based on startByte and current event progress
            const totalBytesUploadedSoFar = actualStartByte + event.loaded;
            const totalOverallSize = fileToUpload.size;
            const percent = Math.round((totalBytesUploadedSoFar / totalOverallSize) * 100);
            setProgress(percent);

            // Optional: Calculate speed and estimated time (keep existing logic if desired)
            // ... (speed/time calculation logic can be kept here) ...

             // Save state periodically (e.g., every 5%) - Use the correct saveUploadState function
            if (percent < 100 && percent % 5 === 0) {
               // Pass necessary info to saveUploadState
               saveUploadState(uploadId, fileToUpload, percent /*, optional backend stream ID*/);
            }
          }
        }
      );

      // Upload finished successfully
      setProgress(100); // Ensure progress is 100% on finish
      showMessage(`Upload complete: '${fileToUpload.name}'`);
      clearUploadState(uploadId); // Clear state and notify backend on successful upload
      setFile(null); // Clear the selected file from the form state
      if (fileInputRef.current) { fileInputRef.current.value = ''; } // Reset file input UI
      if (refresh) refresh(); // Refresh external list if provided

    } catch (err) {
      if (axios.isCancel(err)) {
        showMessage("Upload cancelled.");
        // Save current state on cancellation for potential resume
        // Ensure 'progress' state is up-to-date here or pass the last calculated percent
        saveUploadState(uploadId, fileToUpload, progress /*, optional backend stream ID*/);
        console.log('Upload cancelled by user, state saved for resume.');
      } else {
        console.error('Upload error:', err.response || err);
        // Handle specific HTTP errors (e.g., 401 Unauthorized, 413 Payload Too Large)
        let errorMsg = `Upload failed: ${err.message}`;
        if (err.response) {
            if (err.response.status === 401) {
                errorMsg = 'Upload failed: Unauthorized. Please log in again.';
                // Optionally trigger global logout or token refresh logic here
            } else if (err.response.data && err.response.data.error) {
                // Use backend error message if available
                errorMsg = `Upload failed: ${err.response.data.error}`;
            } else {
                 errorMsg = `Upload failed: Server responded with status ${err.response.status}`;
            }
        }
        showMessage(errorMsg, 10000); // Show error message for longer

        // Decide on state handling for fatal errors: clear or keep for retry?
        // Keeping state might be preferable for transient network issues.
        // clearUploadState(uploadId); // Optional: Clear state on fatal error
      }
    } finally {
      // Reset states regardless of success, cancellation, or error
      setIsUploading(false);
      setLoading(false);
      setEstimatedTime(null);
      setUploadSpeed(0);
      controllerRef.current = null; // Clear controller ref
    }
  }, [refresh, showMessage, progress, saveUploadState, clearUploadState]); // Include dependencies


  // --- Event Handlers ---

  const handleFileChange = (e) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
          // Check if there's a pending resume and if the file matches
          if (pendingResume && selectedFile.name !== pendingResume.filename) {
              // If names don't match, show warning but allow selection. Verification happens on submit.
              showMessage(`Warning: Selected file '${selectedFile.name}' differs from pending resume '${pendingResume.filename}'. Verification will occur upon resuming.`);
          } else if (pendingResume) {
              // If names match, clear any previous warning
              showMessage(`Selected matching file '${selectedFile.name}'. Click 'Resume Upload' to continue.`);
          } else {
              // No pending resume, just show selected file
              setMessage(''); // Clear previous messages
          }

          setFile(selectedFile);
          setProgress(0); // Reset progress for the new file selection
          setEstimatedTime(null);
          setUploadSpeed(0);
          // Do NOT clear pendingResume state here, let handleSubmit verify
      } else {
          setFile(null); // Clear file if selection was cancelled
          setProgress(0);
          setEstimatedTime(null);
          setUploadSpeed(0);
          setMessage('');
      }
  };

  // --- Drag & Drop Handlers (Maintain existing logic) ---
  const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
           // Similar logic as handleFileChange for pending resume check
           if (pendingResume && droppedFile.name !== pendingResume.filename) {
                showMessage(`Warning: Dropped file '${droppedFile.name}' differs from pending resume '${pendingResume.filename}'. Verification will occur upon resuming.`);
           } else if (pendingResume) {
                showMessage(`Dropped matching file '${droppedFile.name}'. Click 'Resume Upload' to continue.`);
           } else {
                setMessage('');
           }
          setFile(droppedFile);
          setProgress(0);
          setEstimatedTime(null);
          setUploadSpeed(0);
      }
  };
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); };


  // 7. Modify Upload Submission Handler (Matches prompt)
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!file) {
        showMessage("Please select a file first.");
        return;
    }

    const token = getToken();
    if (!token) {
         showMessage("Login required to upload.");
         return; // Prevent upload if not logged in
    }

    // Check if we are resuming
    if (pendingResume) {
        setLoading(true); // Show loading indicator during verification
        const currentFileSignature = await calculateFileSignature(file);
        setLoading(false); // Hide loading indicator

        // Verify signature AND size
        if (!currentFileSignature || currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize) {
            showMessage("Selected file does not match the file associated with the pending upload. Please select the correct file or clear the pending upload state.", 10000);
            // Optionally add a button/link here to clear the state if needed
            return; // Stop if verification fails
        }
        // Verification passed
        showMessage("File verified. Preparing to resume upload...");

    } else {
        // Not resuming, starting a new upload
        showMessage("Preparing upload...");
    }

    // Use setTimeout to introduce a delay before starting the actual upload
    setLoading(true); // Show loading during the delay
    uploadTimeoutRef.current = setTimeout(() => {
         // Use pending upload ID if resuming, otherwise generate a new one
         const uploadId = pendingResume?.uploadId || uuidv4();
         // Calculate start byte based on pending progress, default to 0 if not resuming
         const startByte = pendingResume ? Math.round((pendingResume.uploadedProgress / 100) * file.size) : 0;

         console.log(`Starting upload: ID=${uploadId}, Resume=${!!pendingResume}, StartByte=${startByte}`);
         performUpload(file, uploadId, startByte);

         // Clear pending state once upload/resume process begins
         setPendingResume(null); // Moved from performUpload start for clarity
         // setLoading(false); // setLoading is handled within performUpload now

    }, UPLOAD_DELAY); // Use the defined delay

  }, [file, pendingResume, performUpload, showMessage, clearUploadState, calculateFileSignature]); // Add dependencies


  // 9. Add handleCancel and handleRemove (Matches prompt)
  const handleCancel = useCallback(() => {
    // If the upload delay timeout is active, clear it
    if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
        setLoading(false); // Turn off loading state
        setIsUploading(false); // Ensure uploading state is off
        showMessage("Upload preparation cancelled.");
        // Decide whether to keep or clear pending state on pre-upload cancel
        // Keeping it allows user to click Resume/Upload again.
        // Clearing it requires re-selecting the file.
        // clearUploadState(pendingResume?.uploadId); // Optional: clear state
    }
    // If an upload is actively in progress via Axios
    else if (isUploading && controllerRef.current) {
        controllerRef.current.abort(); // Abort the Axios request
        // The catch block in performUpload will handle state saving and message
        // No need to call showMessage or saveUploadState here explicitly for this case
    } else {
        // No active preparation or upload
        showMessage("Nothing to cancel.");
    }
  }, [isUploading, showMessage]); // Dependencies

  const handleRemove = useCallback(() => {
    if (isUploading) {
        showMessage("Cannot remove file while uploading. Please cancel the upload first.");
        return;
    }
      // If the upload delay timeout is active, clear it
     if (uploadTimeoutRef.current) {
        clearTimeout(uploadTimeoutRef.current);
        uploadTimeoutRef.current = null;
        setLoading(false);
    }

    setFile(null); // Clear the file state
    setProgress(0); // Reset progress
    setEstimatedTime(null);
    setUploadSpeed(0);
    setMessage(''); // Clear any messages
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset the file input UI element
    }

    // Clear any saved state associated with the pending resume, if applicable
    clearUploadState(pendingResume?.uploadId); // Pass ID for potential backend cleanup
    // setPendingResume(null) is handled within clearUploadState

  }, [isUploading, pendingResume, showMessage, clearUploadState]); // Dependencies


  // --- Helper Functions for UI --- (Keep existing helpers)
  const formatBytes = (bytes, decimals = 2) => { /* ... keep existing ... */ };
  const formatTime = (seconds) => { /* ... keep existing ... */ };
  const getMessageColor = (msg) => { /* ... keep existing ... */ };
  const truncateFilename = (name, length) => { /* ... keep existing ... */ };

  // --- Update UI Logic (Step 10) ---
  const isAuth = !!getToken(); // Check if authenticated

  return (
    <div className={`mb-8 p-6 rounded-xl shadow-md border transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
      <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Upload Files</h2>

      {!isAuth && (
          <p className={`text-center font-medium mb-4 ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`}>
              You must be logged in to upload files.
          </p>
      )}

      {/* Drag and Drop Area / File Input */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300
                   ${darkMode ? 'border-gray-600' : 'border-gray-300'}
                   ${!isAuth ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:border-blue-500'}
                   ${file ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
        // Add event handlers only if authenticated
        {...(isAuth && {
            onDrop: handleDrop,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onClick: () => {
                 if (!isUploading && !loading) {
                     fileInputRef.current?.click();
                 } else {
                    showMessage(isUploading ? 'Cannot select a new file during upload.' : 'Upload is preparing...');
                 }
            }
        })}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={!isAuth || isUploading || loading} // Disable if not auth, uploading, or loading
        />
        {file ? (
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Selected: {truncateFilename(file.name, truncateLength)} ({formatBytes(file.size)})
          </p>
        ) : pendingResume ? ( // Show pending resume info if no file selected yet
          <p className={`${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
             Pending resume for: {truncateFilename(pendingResume.filename, truncateLength)} ({pendingResume.uploadedProgress}%)
             <br /> Select the same file to continue.
          </p>
        ) : (
          <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {isAuth ? 'Drag & Drop files here, or click to browse' : 'Login required to upload'}
          </p>
        )}
      </div>

      {/* Progress Bar and Info */}
      {/* Keep existing progress display logic */}
      {/* Show Cancel button logic also remains similar */}
       {(isUploading || loading || (file && progress > 0 && progress < 100 && !message.includes('completed'))) && (
        <div className="mt-4">
           <div className="flex flex-col sm:flex-row sm:justify-between mb-1 text-sm font-medium">
               <span className={`truncate sm:w-1/2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {loading ? 'Preparing: ' : (isUploading ? 'Uploading: ' : '')}{truncateFilename(file?.name || pendingResume?.filename || '', truncateLength)}
               </span>
               <span className={`text-right sm:w-1/2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {isUploading || (file && progress > 0) ? `${progress}%` : ''}
               </span>
           </div>
            {(isUploading || (file && progress > 0)) && (
               <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                   <div
                       className="h-2.5 rounded-full bg-blue-600 transition-all duration-100"
                       style={{ width: `${progress}%` }}
                   ></div>
               </div>
           )}
           {(isUploading || (file && progress > 0 && progress < 100)) && uploadSpeed > 0 && (
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                     <span>Speed: {formatBytes(uploadSpeed)}/s</span>
                     <span>Time Left: {formatTime(estimatedTime)}</span>
                </div>
           )}
           {(isUploading || loading) && (
              <div className="mt-4">
                 <button
                  type="button"
                  onClick={handleCancel}
                  className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                  >
                     {loading && !isUploading && ( /* Show spinner only during preparation delay */
                         <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                     )}
                     Cancel
                 </button>
              </div>
          )}
        </div>
      )}


      {/* Action buttons */}
      {/* Show buttons only if authenticated AND a file is selected AND not currently uploading/loading */}
      {isAuth && file && !isUploading && !loading && (
        <div className="flex gap-3 mt-4">
          <button
            type="button" // Use type="button" for clarity, handled by onClick
            onClick={handleSubmit}
            className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors disabled:opacity-50 ${
               pendingResume // Check if pendingResume state is active
                ? (darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700') // Blue for Resume
                : (darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700') // Green for Upload
            }`}
            disabled={!file || loading || isUploading} // Disable if no file, loading, or uploading
          >
             {/* Button label changes based on pendingResume */}
             {pendingResume ? 'Resume Upload' : 'Upload'}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
            disabled={loading || isUploading} // Disable remove if loading or uploading
          >
            Remove
          </button>
        </div>
      )}

       {/* Pending Resume notice and Clear option (Show even if no file is selected yet) */}
       {isAuth && pendingResume && !file && !isUploading && !loading && (
           <div className="mt-4 text-center">
               <button
                   type="button"
                   onClick={() => {
                       clearUploadState(pendingResume?.uploadId);
                       showMessage('Pending upload state cleared.');
                   }}
                   className={`text-sm underline ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
               >
                   Clear Pending Upload
               </button>
           </div>
       )}

      {/* Status message area */}
      {message && (
        <p className={`mt-4 text-center font-medium text-base ${getMessageColor(message)}`}>
          {message}
          {/* Add clear button specifically for mismatch error */}
          {pendingResume && message.includes('does not match') && (
              <button
                className={`ml-2 text-sm underline ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                onClick={() => {
                    clearUploadState(pendingResume?.uploadId);
                    showMessage('Pending upload state cleared.');
                }}
              >
                 Clear Pending
              </button>
           )}
        </p>
      )}

      {/* Keep existing CSS styles */}
      <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
         @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }
        .animate-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        /* .drag-over { border-color: #3b82f6; } */
      `}</style>
    </div>
  );
};

export default UploadForm;
