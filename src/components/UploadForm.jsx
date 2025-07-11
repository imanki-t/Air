import React, { useState, useRef, useCallback, useEffect } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import ResumeNotice from './uploadform/ResumeNotice';
import Dropzone from './uploadform/Dropzone';
import UploadProgress from './uploadform/UploadProgress';
import ActionButtons from './uploadform/ActionButtons';

const UPLOAD_EXPIRY_TIME = 5 * 60 * 1000;
const STORAGE_KEY = 'fileUploadState';
const STATUS_MESSAGE_TIMEOUT = 15 * 1000;
const UPLOAD_DELAY = 2000;

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

    useEffect(() => {
        checkForSavedUploads();
        const handleFocus = () => checkForSavedUploads();
        window.addEventListener('focus', handleFocus);
        return () => {
            window.removeEventListener('focus', handleFocus);
            if (messageTimer) clearTimeout(messageTimer);
            if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
        };
    }, []);

    const checkForSavedUploads = () => {
        try {
            const savedUploadState = localStorage.getItem(STORAGE_KEY);
            if (!savedUploadState) return false;

            const parsedState = JSON.parse(savedUploadState);
            const now = Date.now();
            if (parsedState?.timestamp && (now - parsedState.timestamp) < UPLOAD_EXPIRY_TIME) {
                setPendingResume(parsedState);
                return true;
            } else {
                localStorage.removeItem(STORAGE_KEY);
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

    useEffect(() => {
        const updateTruncateLength = () => setTruncateLength(window.innerWidth >= 768 ? 50 : 25);
        updateTruncateLength();
        window.addEventListener('resize', updateTruncateLength);
        return () => window.removeEventListener('resize', updateTruncateLength);
    }, []);

    const saveUploadState = (uploadData = null) => {
        const dataToSave = uploadData || (file && {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            progress: progress,
            fileId: file.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
        });
        if (!dataToSave) return;

        dataToSave.timestamp = Date.now();
        if (uploadFileRef.current) {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fullResult = event.target.result;
                const truncatedResult = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));
                dataToSave.fileSignature = truncatedResult;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
            };
            const fileSlice = uploadFileRef.current.slice(0, Math.min(1024 * 1024, uploadFileRef.current.size));
            reader.readAsDataURL(fileSlice);
        } else {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
        }
    };

    useEffect(() => {
        if (message) {
            if (messageTimer) clearTimeout(messageTimer);
            const timer = setTimeout(() => setMessage(''), STATUS_MESSAGE_TIMEOUT);
            setMessageTimer(timer);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const cleanupIncompleteUpload = async (fileId) => {
        try {
            await axios.delete(`${import.meta.env.VITE_BACKEND_URL}/api/files/cleanup/${fileId}`);
        } catch (error) {
            console.error('Error cleaning up incomplete upload:', error);
        }
    };

    const getTruncatedFileName = (name) => {
        if (!name) return '';
        return name.length > truncateLength ? name.slice(0, truncateLength) + '...' : name;
    };

    const formatBytes = (bytes, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const verifyFileSignature = async (selectedFile, fileSignature) => {
        if (!selectedFile || !fileSignature) return false;
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = function (event) {
                const fullResult = event.target.result;
                const selectedSignature = fullResult.slice(0, Math.min(fullResult.length, 1024 * 1024));
                resolve(selectedSignature === fileSignature);
            };
            const fileSlice = selectedFile.slice(0, Math.min(1024 * 1024, selectedFile.size));
            reader.readAsDataURL(fileSlice);
        });
    };

    const performUpload = async (fileToUpload) => {
        const formData = new FormData();
        formData.append('file', fileToUpload);

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

            const handleUnload = () => {
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

            window.addEventListener('unload', handleUnload);
            window.addEventListener('beforeunload', handleUnload);

            await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/files/upload`, formData, {
                signal: controller.signal,
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (event) => {
                    if (!event.total) {
                        setMessage('Unable to calculate upload progress. Upload is continuing...');
                        return;
                    }
                    const percent = Math.round((event.loaded * 100) / event.total);
                    setProgress(percent);

                    const now = Date.now();
                    const timeDiff = now - lastProgressUpdateRef.current.time;
                    if (timeDiff > 500) {
                        const loadedDiff = event.loaded - lastProgressUpdateRef.current.loaded;
                        const speedBps = (loadedDiff / timeDiff) * 1000;
                        setUploadSpeed(speedBps);
                        lastProgressUpdateRef.current = { time: now, loaded: event.loaded };

                        if (speedBps > 0) {
                            const remainingBytes = event.total - event.loaded;
                            const remainingTimeSeconds = remainingBytes / speedBps;
                            const formatTimeRemaining = (seconds) => {
                                if (!seconds && seconds !== 0) return 'Calculating...';
                                if (seconds < 60) return `${Math.round(seconds)} second${Math.round(seconds) !== 1 ? 's' : ''}`;
                                if (seconds < 3600) {
                                    const minutes = Math.floor(seconds / 60);
                                    const remainingSeconds = Math.round(seconds % 60);
                                    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
                                }
                                const hours = Math.floor(seconds / 3600);
                                const minutes = Math.floor((seconds % 3600) / 60);
                                return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes} minute${minutes !== 1 ? 's' : ''}`;
                            };
                            setEstimatedTime(formatTimeRemaining(remainingTimeSeconds));
                        }
                    }
                    if (percent === 100) setEstimatedTime('Finalizing...');
                    if (percent < 100 && percent % 5 === 0) {
                        saveUploadState({
                            fileName: fileToUpload.name,
                            fileSize: fileToUpload.size,
                            fileType: fileToUpload.type,
                            progress: percent,
                            fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now()
                        });
                    }
                }
            });

            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);
            localStorage.removeItem(STORAGE_KEY);
            setPendingResume(null);
            uploadFileRef.current = null;
            setMessage('File uploaded successfully.');
            if (socketRef.current) socketRef.current.emit('fileUploaded');
            setFile(null);
            refresh();
        } catch (err) {
            window.removeEventListener('unload', handleUnload);
            window.removeEventListener('beforeunload', handleUnload);

            if (axios.isCancel(err) || err.code === 'ERR_CANCELED') {
                setMessage('Upload cancelled.');
                setFile(null);
                uploadFileRef.current = null;
            } else {
                const errorMessage = err.response?.status === 413 ? 'File too large.' : err.response?.status === 415 ? 'Unsupported file type.' : err.response?.status >= 500 ? 'Server error.' : 'Upload failed.';
                setMessage(errorMessage);
                const resumeState = {
                    fileName: fileToUpload.name,
                    fileSize: fileToUpload.size,
                    fileType: fileToUpload.type,
                    progress: progress,
                    fileId: fileToUpload.name.replace(/[^a-zA-Z0-9]/g, '_') + Date.now(),
                    timestamp: Date.now()
                };
                saveUploadState(resumeState);
                setPendingResume(resumeState);
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

    const handleUpload = (e) => {
        if (e) e.preventDefault();
        const fileToUpload = uploadFileRef.current || file;
        if (!fileToUpload) {
            setMessage('Error: Please select a file to upload');
            return;
        }
        setIsUploading(true);
        setMessage('');
        setProgress(pendingResume ? pendingResume.progress : 0);
        uploadTimeoutRef.current = setTimeout(() => performUpload(fileToUpload), UPLOAD_DELAY);
    };

    const handleCancel = () => {
        if (uploadTimeoutRef.current) clearTimeout(uploadTimeoutRef.current);
        if (controllerRef.current) controllerRef.current.abort();
        localStorage.removeItem(STORAGE_KEY);
        setPendingResume(null);
        uploadFileRef.current = null;
        setIsUploading(false);
        setFile(null);
        if (pendingResume?.fileId) cleanupIncompleteUpload(pendingResume.fileId);
        setMessage('Upload cancelled.');
    };

    const handleRemove = () => {
        setFile(null);
        setMessage('');
        setProgress(0);
        setPendingResume(null);
        uploadFileRef.current = null;
        localStorage.removeItem(STORAGE_KEY);
        if (pendingResume?.fileId) cleanupIncompleteUpload(pendingResume.fileId);
    };

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
            setMessage('No valid file detected.');
            return;
        }
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            setMessage('');
            setFile(droppedFile);
            uploadFileRef.current = droppedFile;
            if (pendingResume) {
                if (pendingResume.fileName === droppedFile.name && pendingResume.fileSize === droppedFile.size) {
                    if (pendingResume.fileSignature) {
                        const isMatchingFile = await verifyFileSignature(droppedFile, pendingResume.fileSignature);
                        if (isMatchingFile) {
                            setMessage('Resume file verified. Ready to resume upload.');
                            setTimeout(() => handleUpload(), 500);
                        } else {
                            setMessage('Different file detected. Starting new upload.');
                            setPendingResume(null);
                            localStorage.removeItem(STORAGE_KEY);
                        }
                    } else {
                        setMessage('Ready to resume upload.');
                        setTimeout(() => handleUpload(), 500);
                    }
                } else {
                    setMessage('Different file detected. Please select the correct file.');
                    setFile(null);
                    uploadFileRef.current = null;
                }
            }
        }
    }, [pendingResume]);

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleFileInputChange = async (e) => {
        if (!e.target.files || e.target.files.length === 0) return;
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setMessage('');
            setFile(selectedFile);
            uploadFileRef.current = selectedFile;
            if (pendingResume) {
                if (pendingResume.fileName === selectedFile.name && pendingResume.fileSize === selectedFile.size) {
                    if (pendingResume.fileSignature) {
                        const isMatchingFile = await verifyFileSignature(selectedFile, pendingResume.fileSignature);
                        if (isMatchingFile) {
                            setMessage('Resume file verified. Ready to resume upload.');
                            setTimeout(() => handleUpload(), 500);
                        } else {
                            setMessage('Different file detected. Starting new upload.');
                            setPendingResume(null);
                            localStorage.removeItem(STORAGE_KEY);
                        }
                    } else {
                        setMessage('Ready to resume upload.');
                        setTimeout(() => handleUpload(), 500);
                    }
                } else {
                    setMessage('Different file detected. Please select the correct file.');
                    setFile(null);
                    uploadFileRef.current = null;
                }
            }
        }
    };

    const handleResumeUpload = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleCancelResume = () => {
        localStorage.removeItem(STORAGE_KEY);
        setPendingResume(null);
        setMessage('');
        if (pendingResume?.fileId) cleanupIncompleteUpload(pendingResume.fileId);
    };

    const getMessageColor = (messageText) => {
        if (messageText.includes('successfully') || messageText.includes('verified') || messageText.includes('cancelled')) {
            return darkMode ? 'text-blue-400' : 'text-blue-600';
        }
        if (messageText.includes('Different file')) {
            return darkMode ? 'text-amber-400' : 'text-amber-600';
        }
        return darkMode ? 'text-red-400' : 'text-red-600';
    };

    return (
        <form
            onSubmit={handleUpload}
            className={`mb-6 p-6 rounded-xl shadow-md transition-colors duration-300 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                }`}
        >
            <h3 className={`text-2xl font-semibold mb-2 text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                ‎
            </h3>

            {pendingResume && !isUploading && !file && (
                <ResumeNotice
                    pendingResume={pendingResume}
                    getTruncatedFileName={getTruncatedFileName}
                    handleResumeUpload={handleResumeUpload}
                    handleCancelResume={handleCancelResume}
                    darkMode={darkMode}
                />
            )}

            {!isUploading && (!pendingResume || file) && (
                <Dropzone
                    file={file}
                    darkMode={darkMode}
                    handleDrop={handleDrop}
                    handleDragOver={handleDragOver}
                    getTruncatedFileName={getTruncatedFileName}
                    formatBytes={formatBytes}
                    pendingResume={pendingResume}
                    fileInputRef={fileInputRef}
                    handleFileInputChange={handleFileInputChange}
                />
            )}

            {isUploading && (
                <UploadProgress
                    progress={progress}
                    uploadSpeed={uploadSpeed}
                    estimatedTime={estimatedTime}
                    formatBytes={formatBytes}
                    darkMode={darkMode}
                    handleCancel={handleCancel}
                />
            )}

            {file && !isUploading && (
                <ActionButtons
                    handleUpload={handleUpload}
                    handleRemove={handleRemove}
                    message={message}
                    pendingResume={pendingResume}
                />
            )}

            {message && (
                <p className={`mt-4 text-center font-medium text-base ${getMessageColor(message)}`}>
                    {message}
                </p>
            )}
        </form>
    );
};

export default UploadForm;          
