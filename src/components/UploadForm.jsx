// components/UploadForm_with_Resume.jsx
// Refactored version implementing localStorage resume, JWT auth, and cleanup.

import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import uuidv4 for unique upload IDs

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 1000; // 1 second delay before actual upload starts (Reduced from 2s)

// 1. Add Token Helper Function (Already present in original, kept here)
const getToken = () => localStorage.getItem('token');

// Function to calculate SHA-256 hash of a file slice for resume verification
// 3. Add File Signature Calculation
const calculateFileSignature = async (file) => {
    if (!file) return null;
    try {
        // Read a slice of the file as ArrayBuffer (first 1MB)
        const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        // Use SubtleCrypto to digest the buffer
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        // Convert ArrayBuffer to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (err) {
        console.error("Error calculating file signature:", err);
        return null; // Return null if hashing fails
    }
};

const UploadForm = ({ refresh, darkMode }) => {
    const [file, setFile] = useState(null);
    const [message, setMessage] = useState('');
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [truncateLength, setTruncateLength] = useState(25); // Default truncate length
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [pendingResume, setPendingResume] = useState(null); // Stores state if a resume is pending
    const [messageTimer, setMessageTimer] = useState(null); // Timer for status messages
    const [loading, setLoading] = useState(false); // State for preparation/verification loading

    const controllerRef = useRef(null); // For cancelling Axios request
    const fileInputRef = useRef(null); // Reference to the hidden file input
    const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 }); // For speed/time calculation
    const uploadTimeoutRef = useRef(null); // Timeout ID for the upload delay

    // --- Utility Functions ---

    const showMessage = useCallback((msg, timeout = STATUS_MESSAGE_TIMEOUT) => {
        setMessage(msg);
        if (messageTimer) clearTimeout(messageTimer);
        const timer = setTimeout(() => setMessage(''), timeout);
        setMessageTimer(timer);
    }, [messageTimer]); // Include messageTimer dependency

    // 4. Save Upload State to localStorage
    const saveUploadState = async (uploadId, file, progress, uploadStreamId = null) => {
        if (!file) return;
        const signature = await calculateFileSignature(file);
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
            uploadStreamId // Optional: backend-provided ID if needed
        };

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
            // console.log('Upload state saved:', state); // Optional: uncomment for debugging
        } catch (err) {
            console.error("Failed to save upload state:", err);
            // Handle potential storage quota errors if necessary
        }
    };

    // 5. Clear Upload State & Clean Up (with JWT)
    const clearUploadState = useCallback(async (uploadIdToCleanup = null) => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            let shouldRemoveLocalStorage = true; // Assume we'll remove it unless cleanup fails critically
            try {
                const state = JSON.parse(savedState);
                // Only attempt cleanup if a specific uploadId matches the one in storage
                if (uploadIdToCleanup && state.uploadId === uploadIdToCleanup) {
                    const token = getToken(); // Get token for auth
                    if (!token) {
                        console.warn("No authentication token available for cleanup. Skipping backend call.");
                        // Still remove local state as the upload is considered done/cleared locally
                    } else {
                        console.log(`Notifying backend to cleanup incomplete upload ${uploadIdToCleanup}`);
                        try {
                            await axios.delete(
                                `${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${uploadIdToCleanup}`,
                                { headers: { Authorization: `Bearer ${token}` } } // Add Auth header
                            );
                            console.log(`Backend cleanup notification sent successfully for ${uploadIdToCleanup}`);
                        } catch (err) {
                            // Decide how to handle cleanup failure
                            if (err.response && err.response.status === 404) {
                                console.log(`Backend cleanup for ${uploadIdToCleanup} returned 404 (already cleaned up or never existed).`);
                                // Safe to remove local state
                            } else {
                                console.error(`Failed to notify backend for cleanup ${uploadIdToCleanup}:`, err);
                                // Potentially keep local state if backend cleanup failed? Or log and remove anyway.
                                // For simplicity here, we'll still remove local state, but log the error.
                                // If backend cleanup is critical, set shouldRemoveLocalStorage = false here.
                            }
                        }
                    }
                } else if (uploadIdToCleanup && state.uploadId !== uploadIdToCleanup) {
                    // This case means clearUploadState was called with an ID, but it doesn't match storage.
                    // This might happen if the user selects a new file *before* a previous cleanup completes.
                    // We probably don't want to clear the *existing* different state in localStorage here.
                    console.warn(`Cleanup requested for ${uploadIdToCleanup}, but stored state is for ${state.uploadId}. Skipping localStorage removal.`);
                    shouldRemoveLocalStorage = false;
                }
            } catch (err) {
                console.error("Error parsing saved state during cleanup or during cleanup itself:", err);
                // Corrupted state? Remove it anyway.
            } finally {
                if (shouldRemoveLocalStorage) {
                    localStorage.removeItem(STORAGE_KEY);
                    setPendingResume(null); // Also clear pending resume state in component
                    console.log('Upload state cleared from localStorage.');
                }
            }
        } else {
            // No state in localStorage, ensure pendingResume is null
            setPendingResume(null);
        }
    }, []); // No external state dependencies


    // 8. Modify performUpload with JWT
    const performUpload = useCallback(async (fileToUpload, uploadId, startByte = 0) => {
        setIsUploading(true);
        setLoading(false); // Turn off preparation loading
        setProgress(Math.round((startByte / fileToUpload.size) * 100)); // Set initial progress
        setEstimatedTime(null);
        setUploadSpeed(0);
        lastProgressUpdateRef.current = { time: Date.now(), loaded: startByte }; // Initialize with startByte
        // setError(''); // Assuming error state is handled by 'message'

        controllerRef.current = new AbortController(); // Create a new AbortController

        const token = getToken(); // Get token for auth
        if (!token) {
            showMessage("Authentication required. Please log in to upload.");
            setIsUploading(false);
            setLoading(false);
            setFile(null); // Clear selection if unauthenticated
            if (fileInputRef.current) fileInputRef.current.value = '';
             // Potentially trigger global logout or redirect here
             // window.dispatchEvent(new CustomEvent('unauthorized'));
            return; // Stop upload if no token
        }

        // Slice the file to send only the remaining part
        const fileSlice = fileToUpload.slice(startByte);

        const formData = new FormData();
        formData.append('file', fileSlice); // Append the sliced file data

        // Add metadata for resumable upload
        formData.append('resumableUploadId', uploadId);
        formData.append('resumableProgress', startByte); // Tell backend where to resume from

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
                        const totalBytesUploadedSoFar = startByte + event.loaded;
                        const totalOverallSize = fileToUpload.size;
                        const percent = Math.round((totalBytesUploadedSoFar / totalOverallSize) * 100);
                        setProgress(percent);

                        // Calculate speed and estimated time
                        const now = Date.now();
                        const timeElapsed = (now - lastProgressUpdateRef.current.time) / 1000; // in seconds
                        const bytesLoadedThisUpdate = totalBytesUploadedSoFar - lastProgressUpdateRef.current.loaded;

                        if (timeElapsed > 0.1 && bytesLoadedThisUpdate > 0) { // Update more frequently, avoid division by zero
                            const speed = bytesLoadedThisUpdate / timeElapsed; // bytes per second
                            setUploadSpeed(speed);
                            const remainingBytesOverall = totalOverallSize - totalBytesUploadedSoFar;
                            const estimatedTimeSec = speed > 0 ? remainingBytesOverall / speed : null; // Avoid division by zero
                            setEstimatedTime(estimatedTimeSec);
                            lastProgressUpdateRef.current = { time: now, loaded: totalBytesUploadedSoFar };
                        }


                        // Save state periodically (e.g., every 5%)
                        if (percent < 100 && percent % 5 === 0 && percent > Math.round((startByte / totalOverallSize) * 100)) {
                           // Save state only if progress actually increased since last save interval check
                            // Pass the overall progress percentage
                            // We don't get uploadStreamId during progress typically, so pass null or manage separately if needed
                             saveUploadState(uploadId, fileToUpload, percent, null); // Save progress
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
            showMessage(`Upload complete: '${fileToUpload.name}'`);
            clearUploadState(uploadId); // Clear state on successful upload, pass ID for backend cleanup
            setFile(null); // Clear the selected file from the form
            if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input element

            if (refresh) refresh(); // Refresh the file list

        } catch (err) {
            setIsUploading(false);
            setLoading(false);
            setEstimatedTime(null);
            setUploadSpeed(0);
            controllerRef.current = null; // Clear controller ref

            if (axios.isCancel(err)) {
                showMessage(`Upload of '${fileToUpload.name}' cancelled.`);
                // Save state on cancel, passing the current progress and uploadId
                // Ensure 'progress' state is accurate here or recalculate
                const cancelledProgress = progress // Use the last known progress state
                saveUploadState(uploadId, fileToUpload, cancelledProgress, null);
                console.log('Upload cancelled, state saved for resume at progress:', cancelledProgress);
            } else {
                 console.error('Upload error:', err);
                 let errorMsg = `Upload of '${fileToUpload.name}' failed.`;
                if (err.response) {
                    // Handle specific HTTP errors
                    if (err.response.status === 401) {
                        errorMsg = 'Upload failed: Unauthorized. Please log in again.';
                        // Potentially trigger a global logout or redirect
                        // window.dispatchEvent(new CustomEvent('unauthorized'));
                    } else if (err.response.status === 413) {
                         errorMsg = `Upload failed: File is too large.`;
                    } else if (err.response.data && err.response.data.error) {
                         errorMsg = `Upload failed: ${err.response.data.error}`;
                     } else {
                         errorMsg = `Upload failed with server error: ${err.response.status}`;
                     }
                } else if (err.request) {
                    errorMsg = 'Upload failed: No response from server. Check network connection.';
                } else {
                     errorMsg = `Upload failed: ${err.message}`;
                 }
                 showMessage(errorMsg, 10000); // Longer timeout for errors

                 // On fatal error, decide whether to clear state. Leaving it allows manual retry.
                 // For now, let's NOT clear state on error, allowing potential resume.
                 // clearUploadState(uploadId); // Optional: Clear state on fatal error
                 // If we keep the state, we might need to save the current (failed) progress
                 saveUploadState(uploadId, fileToUpload, progress, null) // Save potentially partial progress on error
             }
         }
     }, [refresh, showMessage, clearUploadState, progress]); // Added dependencies


    // --- Event Handlers ---

    const handleFileChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
             if (pendingResume) {
                 // If resuming, don't clear state immediately. Let handleSubmit verify.
                 console.log("New file selected while resume pending. Verification needed on submit.");
             } else {
                 // If not resuming, clear any old unrelated state.
                 clearUploadState();
             }
            setFile(selectedFile);
            setProgress(0);
            setEstimatedTime(null);
            setUploadSpeed(0);
            setMessage(''); // Clear messages on new file selection
        } else {
            // No file selected (e.g., user cancelled file dialog)
            // Don't change existing file state or pendingResume state here
        }
    };

     const handleDrop = (e) => {
         e.preventDefault();
         e.stopPropagation();
         const droppedFile = e.dataTransfer.files?.[0];
         if (droppedFile) {
             if (pendingResume) {
                 console.log("File dropped while resume pending. Verification needed on submit.");
             } else {
                 clearUploadState();
             }
             setFile(droppedFile);
             setProgress(0);
             setEstimatedTime(null);
             setUploadSpeed(0);
             setMessage(''); // Clear messages on drop
         }
     };

     const handleDragOver = (e) => {
         e.preventDefault();
         e.stopPropagation();
     };

     const handleDragLeave = (e) => {
         e.preventDefault();
         e.stopPropagation();
     };

     // 7. Modify Upload Submission Handler
     const handleSubmit = useCallback(async (e) => {
         e.preventDefault();
         if (!file) {
             return showMessage("Please select a file first.");
         }

         const token = getToken();
         if (!token) {
             return showMessage("Login required to upload files.");
         }

         setLoading(true); // Start loading indicator for verification/preparation

         let startByte = 0;
         let uploadId = uuidv4(); // Generate new ID by default

         if (pendingResume) {
             showMessage("Verifying selected file for resume...");
             const currentFileSignature = await calculateFileSignature(file);

             if (currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize || file.name !== pendingResume.filename) {
                setLoading(false); // Stop loading
                return showMessage("Selected file does not match the pending resume file. Clear pending state or select the correct file.", 10000);
             }

             // File matches, prepare for resume
             showMessage("File verified. Preparing to resume upload...");
             uploadId = pendingResume.uploadId; // Use the existing ID
             startByte = Math.round((pendingResume.uploadedProgress / 100) * file.size);
             // Ensure startByte doesn't exceed file size (sanity check)
             startByte = Math.min(startByte, file.size);

         } else {
             // No pending resume, prepare for new upload
             showMessage("Preparing new upload...");
         }

         // Clear any previous timeout just in case
         if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);

         // Start the actual upload after the delay
         uploadTimeoutRef.current = setTimeout(() => {
             console.log(`Starting upload (ID: ${uploadId}) ${pendingResume ? 'RESUME' : 'NEW'} from byte ${startByte}`);
             performUpload(file, uploadId, startByte);
             setPendingResume(null); // Clear the pending state *after* starting the upload
             setLoading(false); // Loading will be managed by isUploading now
             uploadTimeoutRef.current = null; // Clear the timeout ref
         }, UPLOAD_DELAY);

     }, [file, pendingResume, performUpload, showMessage, clearUploadState]); // Dependencies


     // 9. Add handleCancel
     const handleCancel = useCallback(() => {
         // If the delay timeout is active, clear it
         if (uploadTimeoutRef.current) {
             clearTimeout(uploadTimeoutRef.current);
             uploadTimeoutRef.current = null;
             setLoading(false); // Turn off preparation loading
             setIsUploading(false); // Ensure this is false too
             showMessage("Upload preparation cancelled.");
             // Don't save state here as upload didn't start. Keep pendingResume if it existed.
         }
         // If upload is actually in progress, abort the Axios request
         else if (isUploading && controllerRef.current) {
             controllerRef.current.abort();
             // State saving on cancel is handled within performUpload's catch block
         } else {
             showMessage("No upload in progress to cancel.");
         }
     }, [isUploading, showMessage]); // Dependencies

     // 9. Add handleRemove
     const handleRemove = useCallback(() => {
         if (isUploading) {
             return showMessage("Cancel the current upload before removing the file.");
         }
          // Clear the preparation timeout if it's active
         if (uploadTimeoutRef.current) {
             clearTimeout(uploadTimeoutRef.current);
             uploadTimeoutRef.current = null;
             setLoading(false);
         }

         setFile(null);
         setProgress(0);
         setEstimatedTime(null);
         setUploadSpeed(0);
         setMessage(''); // Clear any status message
         if (fileInputRef.current) {
             fileInputRef.current.value = ''; // Reset the file input element
         }

         // If there was a pending resume state associated with the file being removed, clear it.
         // Pass the pending ID to potentially trigger backend cleanup.
         clearUploadState(pendingResume?.uploadId);
         // Note: pendingResume itself is cleared within clearUploadState

     }, [isUploading, showMessage, clearUploadState, pendingResume]); // Dependencies


    // 6. Restore Resume State on Mount (and window focus)
    useEffect(() => {
        // This function checks localStorage for resumable state
        const checkPendingUpload = async () => {
            const token = getToken(); // Check token status each time
            if (!token) {
                 // If user logs out while resume state exists, clear it? Or just disable upload?
                 // Let's clear it to avoid confusion. The user needs to log in anyway.
                 const savedState = localStorage.getItem(STORAGE_KEY);
                 if (savedState) {
                     try {
                        const state = JSON.parse(savedState);
                         console.log("User not logged in, clearing potentially stale upload state.");
                         clearUploadState(state?.uploadId); // Attempt cleanup if ID exists
                     } catch {
                         clearUploadState(); // Clear invalid state too
                     }
                 }
                 setPendingResume(null); // Ensure component state is clear
                 // Optionally show a persistent login message if the form should be visible but disabled
                 // showMessage("You must be logged in to upload files.");
                 return; // Don't proceed if not logged in
            }

            // console.log("Checking for pending upload state..."); // Debug log
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const now = Date.now();

                    // Check if state is valid, recent, and incomplete
                    if (state.uploadId && state.filename && state.fileSize > 0 && state.fileSignature && state.uploadedProgress < 100 && (now - state.lastSaved < UPLOAD_EXPIRY_TIME)) {
                        // Found valid resumable state
                        setPendingResume(state);
                        showMessage(`Resume available for '${state.filename}' (${state.uploadedProgress}% complete). Select the same file again.`, 10000);
                        // console.log("Found resumable state:", state); // Debug log
                    } else {
                        // State is expired, invalid, or already completed - clear it
                        console.log("Pending upload state is expired, invalid, or completed. Clearing.");
                        clearUploadState(state?.uploadId); // Pass ID for potential cleanup
                    }
                } catch (e) {
                    console.error("Error parsing saved upload state:", e);
                    // Clear corrupted/invalid state from localStorage
                    clearUploadState(); // Don't pass ID if parse failed
                }
            } else {
                 // console.log("No pending upload state found."); // Debug log
                 setPendingResume(null); // Ensure component state is clear if nothing in storage
             }
         };

        // Run check on mount
        checkPendingUpload();

        // Add listener to re-check when window gains focus
        window.addEventListener('focus', checkPendingUpload);

        // Cleanup function
        return () => {
            window.removeEventListener('focus', checkPendingUpload);
            // Cleanup the message timer if the component unmounts
            if (messageTimer) clearTimeout(messageTimer);
            // Cleanup any pending upload timeout (important if component unmounts during delay)
            if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
        };

    }, [clearUploadState, showMessage, messageTimer]); // Dependencies

    // --- UI Helper Functions ---

     useEffect(() => {
         // Recalculate truncate length based on container width
         const calculateTruncateLength = () => {
             const container = fileInputRef.current?.closest('.file-display-container'); // Find a parent container
             const containerWidth = container?.offsetWidth;
             if (file && containerWidth) {
                 const charWidthEstimate = 8; // Average pixel width per char
                 const paddingAndInfoSpace = 150; // Estimate space for padding, file size, icons etc.
                 const maxChars = Math.max(10, Math.floor((containerWidth - paddingAndInfoSpace) / charWidthEstimate));
                 setTruncateLength(maxChars);
             } else {
                 setTruncateLength(25); // Default
             }
         };

         calculateTruncateLength(); // Initial calculation
         window.addEventListener('resize', calculateTruncateLength);
         return () => window.removeEventListener('resize', calculateTruncateLength);
     }, [file]); // Recalculate when file changes or on resize

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0 || !bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const formatTime = (seconds) => {
        if (seconds === null || seconds === Infinity || isNaN(seconds) || seconds < 0) return '--:--';
        const s = Math.floor(seconds % 60);
        const m = Math.floor((seconds / 60) % 60);
        const h = Math.floor(seconds / 3600);
        const formattedS = String(s).padStart(2, '0');
        const formattedM = String(m).padStart(2, '0');
        return h > 0 ? `${h}:${formattedM}:${formattedS}` : `${formattedM}:${formattedS}`;
    };

    const getMessageColor = (msg) => {
        if (!msg) return darkMode ? 'text-gray-400' : 'text-gray-600'; // Default
        const lowerMsg = msg.toLowerCase();
        if (lowerMsg.includes('complete') || lowerMsg.includes('success') || lowerMsg.includes('uploaded')) return 'text-green-500';
        if (lowerMsg.includes('fail') || lowerMsg.includes('error') || lowerMsg.includes('unauthorized') || lowerMsg.includes('match') || lowerMsg.includes('required')) return 'text-red-500';
        if (lowerMsg.includes('cancel')) return 'text-yellow-500';
        if (lowerMsg.includes('resume') || lowerMsg.includes('pending') || lowerMsg.includes('preparing') || lowerMsg.includes('verifying')) return 'text-blue-500';
        return darkMode ? 'text-gray-300' : 'text-gray-700'; // Default info color
    };

    const truncateFilename = (name, length) => {
        if (!name) return '';
        if (name.length <= length) return name;
        const extDotIndex = name.lastIndexOf('.');
        if (extDotIndex === -1 || extDotIndex < length / 3) { // No extension or it's very short/early
            return name.slice(0, length - 3) + '...';
        }
        const baseName = name.slice(0, extDotIndex);
        const extension = name.slice(extDotIndex); // Includes the dot
        const maxBaseLength = length - extension.length - 3; // Space for base, '...', and extension
        if (maxBaseLength < 1) { // Not enough space even for '...' + ext
             return name.slice(0, length-3) + '...' // Fallback: just truncate
        }
        return baseName.slice(0, maxBaseLength) + '...' + extension;
    };

    // Determine if the form should be disabled (e.g., not logged in)
    const isFormDisabled = !getToken(); // Simple check based on token presence


    // --- Render ---
    return (
        <div className={`mb-8 p-6 rounded-xl shadow-md border transition-colors duration-300 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} ${isFormDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
            <h2 className={`text-2xl font-bold mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>Upload Files</h2>

             {isFormDisabled && (
                <p className={`mb-4 text-center font-medium ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    Please log in to upload files.
                </p>
             )}

            {/* Drag and Drop Area / File Input */}
            {/* Added file-display-container class for width calculation */}
            <div
                className={`file-display-container border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-300
                           ${isUploading || loading || isFormDisabled ? 'cursor-not-allowed bg-opacity-70' : 'cursor-pointer'}
                           ${darkMode ? 'border-gray-600 hover:border-blue-500' : 'border-gray-300 hover:border-blue-500'}
                           ${file ? (darkMode ? 'bg-gray-700' : 'bg-gray-100') : ''}`}
                onDrop={!isUploading && !loading && !isFormDisabled ? handleDrop : undefined}
                onDragOver={!isUploading && !loading && !isFormDisabled ? handleDragOver : undefined}
                onDragLeave={handleDragLeave}
                onClick={() => {
                    if (!isUploading && !loading && !isFormDisabled) {
                        fileInputRef.current?.click();
                    } else if (isFormDisabled) {
                         showMessage("Login required.");
                    } else {
                        showMessage(isUploading ? 'Cannot change file during upload.' : 'Upload is preparing...');
                    }
                }}
                aria-disabled={isUploading || loading || isFormDisabled}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={isUploading || loading || isFormDisabled}
                />
                {file ? (
                    <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Selected: {truncateFilename(file.name, truncateLength)} ({formatBytes(file.size)})
                    </p>
                ) : pendingResume ? (
                     <p className={`${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                        Resume available: {truncateFilename(pendingResume.filename, truncateLength)} ({pendingResume.uploadedProgress}%)<br/> Select the file again to continue.
                     </p>
                ) : (
                    <p className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        Drag & Drop files here, or click to browse
                    </p>
                )}
            </div>

            {/* 10. Update UI Logic: Pending Resume Notice & Clear Button */}
             {pendingResume && !file && ( // Show only if resume pending AND no file selected yet
                 <div className="mt-3 text-center">
                     <button
                         type="button"
                         onClick={() => clearUploadState(pendingResume.uploadId)}
                         className={`text-sm underline ${darkMode ? 'text-red-400 hover:text-red-300' : 'text-red-600 hover:text-red-700'}`}
                         disabled={isUploading || loading}
                     >
                         Clear Pending Resume State
                     </button>
                 </div>
             )}

            {/* Upload progress bar and info */}
            {(isUploading || loading || (file && progress > 0 && progress < 100)) && (
                 <div className="mt-4">
                     <div className="flex flex-col sm:flex-row sm:justify-between mb-1 text-sm font-medium">
                         <span className={`truncate sm:w-1/2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                             {loading ? 'Preparing: ' : (isUploading ? 'Uploading: ' : 'File: ')}
                             {truncateFilename(file?.name || pendingResume?.filename || '', truncateLength)}
                         </span>
                         <span className={`text-right sm:w-1/2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                             {isUploading || progress > 0 ? `${progress}%` : ''}
                         </span>
                     </div>

                     {/* Progress Bar */}
                     <div className={`w-full rounded-full h-2.5 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                         <div
                             className={`h-2.5 rounded-full transition-all duration-150 ${loading ? 'bg-yellow-500 animate-pulse' : 'bg-blue-600'}`}
                             style={{ width: `${loading ? 100 : progress}%` }} // Show pulsing bar during loading
                         ></div>
                     </div>

                     {/* Speed and Time Left */}
                     {isUploading && uploadSpeed > 0 && (
                         <div className="flex justify-between mt-2 text-xs text-gray-500">
                             <span>Speed: {formatBytes(uploadSpeed)}/s</span>
                             <span>Time Left: {formatTime(estimatedTime)}</span>
                         </div>
                     )}

                     {/* Cancel button */}
                     {(isUploading || loading) && (
                         <div className="mt-4">
                             <button
                                 type="button"
                                 onClick={handleCancel}
                                 className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                                 disabled={!isUploading && !loading} // Should only be clickable if uploading or loading
                             >
                                 {loading && ( // Show spinner if preparing/verifying
                                     <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                 )}
                                 Cancel
                             </button>
                         </div>
                     )}
                 </div>
             )}


            {/* Action buttons */}
            {/* Show only if a file is selected and not currently uploading or preparing (loading) */}
            {file && !isUploading && !loading && !isFormDisabled && (
                <div className="flex gap-3 mt-4">
                     {/* 10. Update UI Logic: Button label */}
                     <button
                         type="button"
                         onClick={handleSubmit}
                         className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                           ${pendingResume && file?.name === pendingResume?.filename // Check if selected file matches pending
                             ? (darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700') // Blue for Resume
                             : (darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700') // Green for Upload
                           }`}
                         disabled={loading || isUploading} // Should be redundant due to outer check, but safe
                     >
                         {pendingResume && file?.name === pendingResume?.filename ? 'Resume Upload' : 'Upload'}
                     </button>
                    <button
                        type="button"
                        onClick={handleRemove}
                        className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                        disabled={isUploading || loading} // Cannot remove while busy
                    >
                        Remove
                    </button>
                </div>
            )}

            {/* Status message area */}
            {message && (
                 <p className={`mt-4 text-center font-medium text-base ${getMessageColor(message)} transition-opacity duration-300`}>
                     {message}
                     {/* Add Clear button specifically for mismatch error */}
                     {pendingResume && message.includes('does not match') && (
                        <button
                             type="button"
                             onClick={() => {
                                 clearUploadState(pendingResume.uploadId); // Clear the specific pending state
                                 showMessage('Pending upload state cleared.');
                             }}
                             className="ml-2 text-sm underline text-blue-500 hover:text-blue-700"
                        >
                             Clear Pending State
                         </button>
                     )}
                 </p>
            )}

        </div>
    );
};

export default UploadForm;
                       
