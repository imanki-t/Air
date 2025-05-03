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
    const [loading, setLoading] = useState(false); // Add loading state
    const [truncateLength, setTruncateLength] = useState(15);
    const [estimatedTime, setEstimatedTime] = useState(null);
    const [uploadSpeed, setUploadSpeed] = useState(0);
    const [pendingResume, setPendingResume] = useState(null);
    const [messageTimer, setMessageTimer] = useState(null);

    const controllerRef = useRef(null);
    const fileInputRef = useRef(null);
    const uploadTimeoutRef = useRef(null);
    const lastProgressUpdateRef = useRef({ time: 0, loaded: 0 });


    const showMessage = (msg, timeout = STATUS_MESSAGE_TIMEOUT) => {
        setMessage(msg);
        if (messageTimer) {
            clearTimeout(messageTimer);
        }
        const timer = setTimeout(() => {
            setMessage('');
        }, timeout);
        setMessageTimer(timer);
    };


    const saveUploadState = useCallback(async (uploadId, file, progress, uploadStreamId = null) => {
        if (!file) return;
        const signature = await calculateFileSignature(file);
        if (signature === null) return;

        const state = {
            uploadId,
            filename: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileSignature: signature,
            uploadedProgress: progress,
            lastSaved: Date.now(),
            uploadStreamId // Although not used in this client logic, useful for server context
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


    useEffect(() => {
        const checkPendingUpload = async () => {
            const savedState = localStorage.getItem(STORAGE_KEY);
            if (savedState) {
                try {
                    const state = JSON.parse(savedState);
                    const now = Date.now();
                    if (now - state.lastSaved < UPLOAD_EXPIRY_TIME && state.filename && state.fileSize > 0 && state.uploadedProgress < 100) {
                        setPendingResume(state);
                        // Only show message if no file is selected yet
                        if (!file) {
                           showMessage(`Found incomplete upload: '${state.filename}' (${state.uploadedProgress}% completed). Select the same file to resume.`);
                        }
                    } else {
                        clearUploadState(state?.uploadId);
                    }
                } catch (e) {
                    console.error("Error checking saved upload state:", e);
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
    }, [clearUploadState, file]); // Added file to dependency array


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


    // The actual upload implementation with resume support
    const performUpload = useCallback(async (file, uploadId, startByte = 0) => {
        setIsUploading(true);
        setLoading(true);
        setProgress(Math.round((startByte / file.size) * 100)); // Set initial progress from startByte
        setEstimatedTime('Calculating...');
        setUploadSpeed(0);
        lastProgressUpdateRef.current = { time: Date.now(), loaded: startByte }; // Initialize with startByte

        const token = getToken();
        if (!token) {
            showMessage("Authentication required.");
            setIsUploading(false);
            setLoading(false);
            setProgress(0);
            return;
        }

        const fileSlice = file.slice(startByte);
        const formData = new FormData();
        formData.append('file', fileSlice);
        formData.append('resumableUploadId', uploadId);
        formData.append('resumableProgress', startByte);

        const controller = new AbortController();
        controllerRef.current = controller;

        // Add event listener for unload only during active upload
        const handleUnload = () => {
            // Save upload state when page is closed/refreshed
            if (progress < 100) {
               saveUploadState(uploadId, file, progress);
            }
        };

        // Add the event listener
        window.addEventListener('unload', handleUnload);
        window.addEventListener('beforeunload', handleUnload);

        try {
            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/upload`, formData, {
                signal: controller.signal,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${token}`
                },
                onUploadProgress: (event) => {
                    // Ensure we have total size (may not be available in some browsers)
                    if (!event.total) {
                       showMessage('Unable to calculate upload progress. Upload is continuing...');
                        // Still attempt to save state based on rough intervals if total is not available
                        if (Date.now() - lastProgressUpdateRef.current.time > 5000) { // Save every 5 seconds
                            saveUploadState(uploadId, file, progress);
                            lastProgressUpdateRef.current.time = Date.now();
                        }
                        return;
                    }

                    const totalBytes = startByte + event.loaded;
                    const percent = Math.round((totalBytes / file.size) * 100);
                    setProgress(percent);

                    // Speed/ETA logic
                    const now = Date.now();
                    const timeDiff = now - lastProgressUpdateRef.current.time;
                     // Update speed every 500ms or if progress is updated significantly
                    if (timeDiff > 500 || (event.loaded > lastProgressUpdateRef.current.loaded && (percent - Math.round((lastProgressUpdateRef.current.loaded / file.size) * 100) > 1))) {
                        const loadedDiff = event.loaded - (lastProgressUpdateRef.current.loaded - startByte); // Difference in bytes uploaded *in the current chunk*
                        const speedBps = (loadedDiff / timeDiff) * 1000; // bytes per second
                        setUploadSpeed(speedBps);
                        lastProgressUpdateRef.current = { time: now, loaded: event.loaded + startByte }; // Store total loaded bytes


                        // Calculate estimated time remaining based on current speed
                        if (speedBps > 0) {
                            const remaining = calculateTimeRemaining(totalBytes, file.size, speedBps);
                            setEstimatedTime(remaining);
                        }
                    }


                    if (percent < 100 && percent % 5 === 0 && (Date.now() - lastProgressUpdateRef.current.time > 1000)) { // Save state every 5% and at least every 1 second
                       saveUploadState(uploadId, file, percent);
                       lastProgressUpdateRef.current.time = Date.now(); // Reset timer after saving
                    }
                }
            });

            // Remove the event listeners after upload completes
            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);

            setProgress(100);
            showMessage(`Upload completed: '${file.name}'`);
            clearUploadState(uploadId);
            setFile(null); // Clear file after successful upload
            refresh(); // Call the refresh function provided as prop

        } catch (err) {
             // Remove the event listeners if there's an error
            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);

            if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
                showMessage(`Upload cancelled.`);
                // Save state on cancel
                 saveUploadState(uploadId, file, progress);
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

                showMessage(errorMessage);
                // Save state on error
                saveUploadState(uploadId, file, progress);
            }
        } finally {
            setIsUploading(false);
            setLoading(false);
            setEstimatedTime(null);
            setUploadSpeed(0);
            controllerRef.current = null;
            uploadTimeoutRef.current = null;
        }
    }, [saveUploadState, clearUploadState, progress]); // Added progress to dependency array


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

    // Update File Selection Handlers
    const handleFileInputChange = useCallback(async (e) => {
        if (!e.target.files || e.target.files.length === 0) {
            return;
        }

        const selectedFile = e.target.files[0];
        if (selectedFile) {
            clearUploadState(); // Clear any pending state on new file selection
            setMessage('');
            setFile(selectedFile);

            // Reset input value to allow selecting the same file again after removal
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    }, [clearUploadState]);

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
            setMessage('');
            setFile(droppedFile);
        }
    }, [clearUploadState]);


    // Submit Logic (Resume Verification)
    const handleSubmit = useCallback(async (e) => {
        e.preventDefault();
        if (!file) return showMessage('Please select a file to upload.');

        if (pendingResume) {
            setLoading(true);
            showMessage('Verifying file for resume...');
            const currentFileSignature = await calculateFileSignature(file);
            setLoading(false);

            if (currentFileSignature !== pendingResume.fileSignature || file.size !== pendingResume.fileSize) {
                return showMessage('Selected file does not match the pending incomplete upload.');
            }
            showMessage('File verified. Preparing to resume upload...');
        } else {
             showMessage('Preparing upload...');
        }

        setLoading(true);
        uploadTimeoutRef.current = setTimeout(() => {
            const uploadId = pendingResume?.uploadId || uuidv4();
            const startByte = pendingResume ? Math.round((pendingResume.uploadedProgress / 100) * file.size) : 0;
            performUpload(file, uploadId, startByte);
            // pendingResume is cleared inside performUpload on success/error
        }, UPLOAD_DELAY);
    }, [file, performUpload, pendingResume, showMessage]); // Added showMessage to dependencies


    // Add Cancel and Remove Logic
    const handleCancel = useCallback(() => {
        if (uploadTimeoutRef.current) {
            clearTimeout(uploadTimeoutRef.current);
            uploadTimeoutRef.current = null;
            setIsUploading(false);
            setLoading(false);
            showMessage('Upload preparation cancelled.');
            // Note: State is saved in performUpload's catch block on cancellation via controller abort
        } else if (controllerRef.current) {
            controllerRef.current.abort();
        } else {
             showMessage('No active upload to cancel.');
        }
    }, []); // Dependencies removed as they are not needed

    const handleRemove = useCallback(() => {
        if (isUploading) return showMessage("Cancel upload before removing the file.");
        if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
        setFile(null);
        setProgress(0); // Reset progress on remove
        clearUploadState(pendingResume?.uploadId); // Cleanup backend on remove if pending
         showMessage('File removed.');
    }, [isUploading, pendingResume, clearUploadState, showMessage]);


    // Determine message color based on content
    const getMessageColor = (messageText) => {
        if (messageText.includes('successfully') || messageText.includes('completed')) {
            return darkMode ?
            'text-blue-400' : 'text-blue-600'; // Changed from green to blue
        } else if (messageText.includes('verified') || messageText.includes('Preparing to resume') || messageText.includes('Found incomplete')) {
            return darkMode ?
            'text-blue-400' : 'text-blue-600'; // Changed from green to blue
        } else if (messageText.includes('Selected file does not match')) {
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
            onSubmit={handleSubmit} // Changed to handleSubmit
            className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}
        >
            <h3 className={`text-xl font-medium mb-4 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Upload File
            </h3>

             {/* Loading Indicator */}
             {loading && (
                <div className={`mb-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                   {message.includes('Verifying file') ? 'Verifying file...' : 'Loading...'}
                </div>
             )}


              {/* Resume Notice (only show if pendingResume exists and no file selected yet, and not loading) */}
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
                            onClick={() => clearUploadState(pendingResume?.uploadId)} // Clear pending state
                            className={`px-4 py-2.5 rounded-md font-medium transition-colors ${
                                darkMode
                                ?
                                'bg-gray-700 hover:bg-gray-600 text-white'
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

            {/* Action buttons - only show when file is selected and not uploading or loading */}
            {file && !isUploading && !loading && (
                <div className="flex gap-3 mt-2">
                    <button
                        type="submit"
                        className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors ${
                            message.includes('does not match')
                                ? 'bg-blue-400 cursor-not-allowed'
                                : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                        disabled={message.includes('does not match')}
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
                     {message.includes('does not match') && (
                        <button
                            type="button"
                            onClick={() => clearUploadState(pendingResume?.uploadId)}
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
