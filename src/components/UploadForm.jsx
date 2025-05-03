import React, { useState, useRef, useCallback, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid'; // Import UUID

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000; // 15 seconds for status messages to disappear
const UPLOAD_DELAY = 2000; // 2 second delay before actual upload starts

// Helper function to get the JWT token from localStorage
const getToken = () => localStorage.getItem('token');

// SHA-256 file signature function
const calculateFileSignature = async (file) => {
    if (!file) return null;
    try {
        // Read the first 1MB of the file
        const arrayBuffer = await file.slice(0, Math.min(file.size, 1024 * 1024)).arrayBuffer();
        const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        // Convert bytes to hex string
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
    const [loading, setLoading] = useState(false); // Add loading state
    const [truncateLength, setTruncateLength] = useState(15);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [pendingResume, setPendingResume] = useState(null);
    const [messageTimer, setMessageTimer] = useState(null);

    const controllerRef = useRef(null);
    const fileInputRef = useRef(null);
    // uploadFileRef is no longer strictly necessary with the new state management but can be kept for clarity
    // const uploadFileRef = useRef(null);
    const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 });
    const uploadTimeoutRef = useRef(null);


    // Helper to set message and clear it after a timeout
    const showMessage = useCallback((msg, timeout = STATUS_MESSAGE_TIMEOUT) => {
        setMessage(msg);
        if (messageTimer) {
            clearTimeout(messageTimer);
        }
        const timer = setTimeout(() => {
            setMessage('');
        }, timeout);
        setMessageTimer(timer);
    }, [messageTimer]); // messageTimer is a dependency because the effect clears it


    const saveUploadState = useCallback(async (uploadId, fileToSave, progressToSave) => {
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
            // uploadStreamId is handled server-side, not needed in client state
        };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        } catch (error) {
            console.error("Error saving upload state:", error);
        }
    }, []); // No dependencies needed as fileToSave and progressToSave are passed


    const clearUploadState = useCallback(async (uploadIdToCleanup = null) => {
        const savedState = localStorage.getItem(STORAGE_KEY);
        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                 // If an uploadIdToCleanup is provided, only clean up if it matches the saved state
                if (!uploadIdToCleanup || (state && state.uploadId === uploadIdToCleanup)) {
                     const token = getToken();
                    if (token && state?.uploadId) { // Ensure we have a token and an uploadId to clean up on backend
                        console.log(`Attempting backend cleanup for uploadId: ${state.uploadId}`);
                        await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${state.uploadId}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        console.log(`Backend cleanup successful for uploadId: ${state.uploadId}`);
                    } else if (!token) {
                         console.warn('No authentication token available for backend cleanup.');
                    }
                }
            } catch (err) {
                console.error("Error during backend cleanup:", err);
                // Continue to clear local state even if backend cleanup fails
            } finally {
                 // Always clear local storage state
                localStorage.removeItem(STORAGE_KEY);
                setPendingResume(null); // Clear pending resume state
            }
        } else {
            // If no saved state, just ensure pendingResume is null
            setPendingResume(null);
        }
    }, []); // No dependencies needed


    // Restore on Mount (useEffect)
    useEffect(() => {
        const checkPendingUpload = async () => {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const now = Date.now();
                    // Check if the saved state is recent, has file info, and is not 100% complete
                    if (state?.lastSaved && (now - state.lastSaved < UPLOAD_EXPIRY_TIME) && state.filename && state.fileSize > 0 && state.uploadedProgress < 100) {
                        setPendingResume(state);
                        // Only show message if no file is selected yet
                        if (!file) {
                           showMessage(`Found incomplete upload: '${state.filename}' (${state.uploadedProgress}% completed). Select the same file to resume.`);
                        }
                    } else {
                        // Clear expired or invalid state, optionally cleaning up the backend if uploadId exists
                        clearUploadState(state?.uploadId);
                    }
                } catch (e) {
                    console.error("Error parsing saved upload state:", e);
                    // Clear state if parsing fails
                    clearUploadState();
                }
            }
             // Check authentication status on mount
             const token = getToken();
             if (!token) {
                 showMessage('You must be logged in to upload files.');
                 // Optionally disable form or redirect to login here
             }
        };

        checkPendingUpload();

        // Add event listener for window focus to check for resume opportunities
        window.addEventListener('focus', checkPendingUpload);

        // Cleanup listeners on component unmount
        return () => {
            window.removeEventListener('focus', checkPendingUpload);
            if (messageTimer) clearTimeout(messageTimer);
            if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
             // Clean up any active upload state if component unmounts unexpectedly?
             // This might be redundant with the unload/beforeunload listeners in performUpload,
             // but good practice for other cases.
             if (isUploading && controllerRef.current) {
                 // controllerRef.current.abort(); // Aborting here might show cancel message on unmount
                 // Let's rely on the unload handler for saving state
             }
        };
    }, [clearUploadState, file, showMessage, isUploading, messageTimer]); // Added isUploading, messageTimer


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


    // The actual upload implementation with resume support and authentication
    const performUpload = useCallback(async (fileToUpload, uploadId, startByte = 0) => {
        setIsUploading(true);
        setLoading(true); // Keep loading true until the actual upload starts or fails
        // Set initial progress from startByte
        setProgress(Math.round((startByte / fileToUpload.size) * 100));
        setEstimatedTime('Calculating...');
        setUploadSpeed(0);
        // Initialize loaded with startByte for accurate speed calculation
        lastProgressUpdateRef.current = { time: Date.now(), loaded: startByte };


        const token = getToken();
        if (!token) {
            showMessage("Authentication required.");
            setIsUploading(false);
            setLoading(false);
            setProgress(0);
            return;
        }

        // Create a slice of the file starting from the resume point
        const fileSlice = fileToUpload.slice(startByte);
        const formData = new FormData();
        formData.append('file', fileSlice); // Send only the remaining chunk
        formData.append('resumableUploadId', uploadId);
        formData.append('resumableProgress', startByte); // Send the start byte


        const controller = new AbortController();
        controllerRef.current = controller;

        // Add event listener for unload only during active upload
        const handleUnload = () => {
            // Save upload state when page is closed/refreshed, only if not 100% complete
            if (progress < 100) {
                saveUploadState(uploadId, fileToUpload, progress);
            }
        };

        // Add the event listener
        window.addEventListener('unload', handleUnload);
        window.addEventListener('beforeunload', handleUnload);


        try {
            console.log(`Starting upload for uploadId: ${uploadId} from byte: ${startByte}`);
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/upload`, formData, {
                signal: controller.signal, // Associate the signal with the request
                headers: {
                    // 'Content-Type': 'multipart/form-data', // Axios sets this automatically with FormData
                    Authorization: `Bearer ${token}`
                },
                onUploadProgress: (event) => {
                     // Ensure we have total size (may not be available in some browsers)
                    if (!event.total) {
                       showMessage('Unable to calculate upload progress. Upload is continuing...');
                       // Still attempt to save state based on rough intervals if total is not available
                       if (Date.now() - lastProgressUpdateRef.current.time > 5000 && progress < 100) { // Save every 5 seconds if progress is not 100
                           saveUploadState(uploadId, fileToUpload, progress);
                           lastProgressUpdateRef.current.time = Date.now(); // Reset timer after saving
                       }
                       return;
                    }

                    // Calculate total loaded bytes from the start of the original file
                    const totalBytes = startByte + event.loaded;
                    const percent = Math.round((totalBytes / fileToUpload.size) * 100);
                    setProgress(percent);

                    // Speed/ETA logic
                    const now = Date.now();
                    const timeDiff = now - lastProgressUpdateRef.current.time;

                    // Update speed every 500ms or if at least 1% progress difference since last update
                     if (timeDiff > 500 || (percent > progress && (percent - progress >= 1))) {
                        // Calculate loaded difference based on the current chunk's progress
                        const loadedDiff = event.loaded - (lastProgressUpdateRef.current.loaded - startByte);
                        const speedBps = (loadedDiff / timeDiff) * 1000; // bytes per second
                        setUploadSpeed(speedBps);
                        // Store total loaded bytes from the original file's perspective
                        lastProgressUpdateRef.current = { time: now, loaded: totalBytes };


                        // Calculate estimated time remaining based on current speed
                        if (speedBps > 0) {
                            const remaining = calculateTimeRemaining(totalBytes, fileToUpload.size, speedBps);
                            setEstimatedTime(remaining);
                        }
                    }


                    // Continuously update the saved state during upload
                    // Save state every 5% progress AND at least every 1 second
                    if (percent < 100 && percent % 5 === 0 && (Date.now() - lastProgressUpdateRef.current.time > 1000)) {
                        saveUploadState(uploadId, fileToUpload, percent);
                         // Note: lastProgressUpdateRef.current.time is already updated in the speed calculation block
                    }
                }
            });

            // If upload completes successfully
            console.log(`Upload successful for uploadId: ${uploadId}`);
            setProgress(100);
            showMessage(`Upload completed: '${fileToUpload.name}'`);
            clearUploadState(uploadId); // Clear local and backend state for this uploadId
            setFile(null); // Clear the selected file after successful upload
            // uploadFileRef.current = null; // Also clear the ref if used
            refresh(); // Call the refresh function provided as prop

        } catch (err) {
            console.error('Upload error:', err);

            if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
                showMessage(`Upload cancelled.`);
                 // Save state on manual cancel
                 saveUploadState(uploadId, fileToUpload, progress);
            } else {
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
                            : err.response?.data?.message || 'Upload failed. Please try again.'; // Use backend message if available

                showMessage(errorMessage);
                // Save state on other errors for potential resume
                saveUploadState(uploadId, fileToUpload, progress);
            }
        } finally {
             // Remove the unload listeners regardless of success or failure
            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);

            setIsUploading(false);
            setLoading(false);
            setEstimatedTime(null);
            setUploadSpeed(0);
            controllerRef.current = null; // Clear the abort controller ref
            uploadTimeoutRef.current = null; // Clear the timeout ref
        }
    }, [saveUploadState, clearUploadState, progress, showMessage, refresh]); // Added dependencies


    // Format time remaining with units (Keep existing helper function)
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

    // Calculate estimated time remaining (Keep existing helper function)
    const calculateTimeRemaining = (loaded, total, uploadSpeed) => {
        if (uploadSpeed <= 0) return null;
        const remainingBytes = total - loaded;
        const remainingTimeSeconds = remainingBytes / uploadSpeed;

        return formatTimeRemaining(remainingTimeSeconds);
    };

    // Format bytes to readable size (Keep existing helper function)
    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };


    // Update File Selection Handlers to clear state and set file
    const handleFileInputChange = useCallback(async (e) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const selectedFile = e.target.files[0];
        if (selectedFile) {
            clearUploadState(); // Clear any pending state on new file selection
            setMessage(''); // Clear any existing message
            setFile(selectedFile); // Set the new file

            // Reset input value to allow selecting the same file again after removal
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [clearUploadState]); // clearUploadState is a dependency

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
            showMessage('No valid file detected. Please try again.');
            return;
        }

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            clearUploadState(); // Clear any pending state on new file drop
            setMessage(''); // Clear any existing message
            setFile(droppedFile); // Set the new file
        }
    }, [clearUploadState, showMessage]); // clearUploadState and showMessage are dependencies


    // Submit Logic (Resume Verification)
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!file) return showMessage('Please select a file to upload.');

        // If there's a pending resume state, verify the selected file
        if (pendingResume) {
            setLoading(true); // Start loading indicator during verification
            showMessage('Verifying file for resume...');
            const currentFileSignature = await calculateFileSignature(file);
            setLoading(false); // Stop loading after signature calculation

            // Check if signature or file size don't match the pending resume state
            if (currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize) {
                // If mismatch, show error and keep pendingResume state to allow clearing it
                return showMessage('Selected file does not match the pending incomplete upload. Please select the correct file or clear the pending upload.');
            }
            // If match, proceed to prepare for resume
            showMessage('File verified. Preparing to resume upload...');
        } else {
             // If no pending resume, just prepare for a new upload
             showMessage('Preparing upload...');
        }

        setLoading(true); // Start loading indicator during the delay period
        uploadTimeoutRef.current = setTimeout(() => {
            // Determine uploadId: use pending one or generate a new one
            const uploadId = pendingResume?.uploadId || uuidv4();
            // Determine startByte: based on pending progress or 0 for new upload
            const startByte = pendingResume ? Math.round((pendingResume.uploadedProgress / 100) * file.size) : 0;

            // Call the actual upload function
            performUpload(file, uploadId, startByte);

             // pendingResume is cleared inside performUpload on success/error,
             // or explicitly cleared by clearUploadState handler buttons.
        }, UPLOAD_DELAY);
    }, [file, performUpload, pendingResume, showMessage]); // Added file, performUpload, pendingResume, showMessage dependencies


    // Handle drag over (Keep existing function)
    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);


    // Add Cancel and Remove Logic using useCallback
    const handleCancel = useCallback(() => {
        // If the upload hasn't started yet (still in the delay timeout)
        if (uploadTimeoutRef.current) {
            clearTimeout(uploadTimeoutRef.current);
            uploadTimeoutRef.current = null; // Clear the ref
            setIsUploading(false); // Stop uploading indicator
            setLoading(false); // Stop loading indicator
            showMessage('Upload preparation cancelled.'); // Show message
            // Note: State is saved in performUpload's catch block on cancellation via controller abort
        }
        // If the upload is active (controller is set)
        else if (controllerRef.current) {
            controllerRef.current.abort(); // Abort the axios request
            // The rest of the state cleanup (setIsUploading, setLoading, etc.) happens in performUpload's finally block
        } else {
             // If no active upload or pending timeout
             showMessage('No active upload to cancel.');
        }
    }, [showMessage]); // showMessage is a dependency


    const handleRemove = useCallback(() => {
        // Prevent removal if an upload is currently in progress
        if (isUploading) {
            showMessage("Cancel the ongoing upload before removing the file.");
            return;
        }

        // If there's a pending upload timeout, clear it
        if (uploadTimeoutRef.current) {
            clearTimeout(uploadTimeoutRef.current);
            uploadTimeoutRef.current = null;
        }

        // Clear the selected file state
        setFile(null);
        // Reset progress display
        setProgress(0);

        // Clear the pending resume state and perform backend cleanup if necessary
        clearUploadState(pendingResume?.uploadId);

        // Show confirmation message
        showMessage('File removed.');
    }, [isUploading, pendingResume, clearUploadState, showMessage]); // Added dependencies


    // Determine message color based on content (Keep existing function)
    const getMessageColor = (messageText) => {
        if (messageText.includes('successfully') || messageText.includes('completed')) {
            return darkMode ?
            'text-blue-400' : 'text-blue-600'; // Changed from green to blue
        } else if (messageText.includes('verified') || messageText.includes('Preparing to resume') || messageText.includes('Found incomplete') || messageText.includes('Authentication required')) { // Added Authentication required
            return darkMode ?
            'text-blue-400' : 'text-blue-600'; // Changed from green to blue
        } else if (messageText.includes('does not match')) { // Changed from 'Different file'
            return darkMode ?
            'text-amber-400' : 'text-amber-600';
        } else if (messageText.includes('cancelled')) {
            return darkMode ? 'text-blue-400' : 'text-blue-600';
        } else {
            return darkMode ? 'text-red-400' : 'text-red-600';
        }
    };


    // Get truncated filename (Keep existing function)
    const getTruncatedFileName = (name) => {
        if (!name) return '';
        return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
    };


    return (
        <form
            onSubmit={handleSubmit} // Changed to handleSubmit
            className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
        >
            <h3 className={`text-xl font-medium mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Upload File
            </h3>

             {/* Loading Indicator (Show during file verification or upload preparation delay) */}
             {loading && (
                <div className={`mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                   {message.includes('Verifying file') ? 'Verifying file...' : 'Preparing upload...'}
                </div>
             )}


            {/* Resume Notice (only show if pendingResume exists, no file selected yet, not uploading, and not loading) */}
            {pendingResume && !isUploading && !file && !loading && (
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
                         {/* Clicking the label below handles resume by opening file picker */}
                        <label
                             htmlFor="fileInput"
                            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors cursor-pointer"
                        >
                           Select File to Resume
                        </label>
                        <button
                            type="button"
                            onClick={() => clearUploadState(pendingResume?.uploadId)} // Clear pending state and backend
                             className={`px-4 py-2.5 rounded-md font-medium transition-colors ${
                                darkMode
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                             }`}
                        >
                            Start New Upload
                        </button>
                    </div>
                </div>
            )}


            {/* Upload area - show if not currently uploading, not loading, AND (no pending resume OR a file IS selected) */}
            {(!isUploading && !loading && (!pendingResume || file)) && (
                <label
                    htmlFor="fileInput"
                    className={`block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors ${
                        darkMode
                            ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'
                            : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
                    } ${file ? (darkMode ? 'border-blue-500' : 'border-blue-400') : ''}`}
                    title={file ? file.name : (pendingResume ? `Select "${pendingResume.filename}" to resume` : 'Drag and drop file or click to browse')}
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
                            `Select "${getTruncatedFileName(pendingResume.filename)}" to resume upload`
                                    : "Drag and drop file or click to browse"}
                            </span>}
                    </div>
                </label>
            )}

            {/* Hidden file input */}
            <input
                id="fileInput"
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
            />

            {/* Upload progress - show only when uploading */}
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

            {/* Action buttons - show when file is selected and not uploading or loading */}
            {file && !isUploading && !loading && (
                <div className="flex gap-3 mt-2">
                    <button
                        type="submit"
                        className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors ${
                             message.includes('does not match') || !getToken() // Disable if mismatch or not authenticated
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={message.includes('does not match') || !getToken()} // Disable if mismatch or not authenticated
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
                 <div className={`mt-4 text-center font-medium text-base ${getMessageColor(message)}`}>
                    <p>{message}</p>
                     {/* Add Clear Pending button if file mismatch */}
                     {message.includes('does not match') && pendingResume && ( // Only show if mismatch message AND there's pending state
                        <button
                            type="button"
                            onClick={() => clearUploadState(pendingResume?.uploadId)} // Clear the specific pending upload
                             className={`ml-4 px-3 py-1 mt-2 text-sm rounded-md font-medium transition-colors ${
                                darkMode
                                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                             }`}
                        >
                            Clear Pending
                        </button>
                     )}
                 </div>
            )}
        </form>
    );
};

export default UploadForm;
