// src/components/dashboard/EnhancedUploadModal.jsx - MULTIPLE FILE UPLOAD WITH PREVIEWS
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import { X, Upload, FileText, Image as ImageIcon, Video, Music, File as FileIcon } from 'lucide-react';
import { showToast } from '../Toast';

const MAX_FILES = 25;
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB per file

const getFileIcon = (type) => {
  if (type.startsWith('image/')) return ImageIcon;
  if (type.startsWith('video/')) return Video;
  if (type.startsWith('audio/')) return Music;
  if (type.startsWith('text/')) return FileText;
  return FileIcon;
};

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const FilePreviewCard = ({ file, onRemove, progress, status }) => {
  const [preview, setPreview] = useState(null);
  const Icon = getFileIcon(file.type);

  React.useEffect(() => {
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result);
      reader.readAsDataURL(file);
    }
  }, [file]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="relative bg-surface-container rounded-lg p-3 border border-outline-variant"
    >
      {/* Remove Button */}
      {status === 'pending' && (
        <button
          onClick={() => onRemove(file)}
          className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors z-10 shadow-md"
        >
          <X size={14} />
        </button>
      )}

      {/* Preview/Icon */}
      <div className="w-full aspect-square bg-surface-container-high rounded-md mb-2 overflow-hidden flex items-center justify-center">
        {preview ? (
          <img src={preview} alt={file.name} className="w-full h-full object-cover" />
        ) : (
          <Icon size={32} className="text-on-surface-variant" />
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <p className="text-xs font-medium text-on-surface truncate" title={file.name}>
          {file.name}
        </p>
        <p className="text-xs text-on-surface-variant">{formatBytes(file.size)}</p>

        {/* Progress Bar */}
        {status === 'uploading' && (
          <div className="w-full bg-surface-container-highest rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        )}

        {/* Status */}
        {status === 'completed' && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-xs">Uploaded</span>
          </div>
        )}

        {status === 'error' && (
          <div className="flex items-center gap-1 text-destructive">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="text-xs">Failed</span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const EnhancedUploadModal = ({ folderId, onClose, onComplete }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadStatus, setUploadStatus] = useState({});
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) {
      showToast(`${file.name} is too large (max 100MB)`, 'error');
      return false;
    }
    return true;
  };

  const handleFiles = (newFiles) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(validateFile);

    if (files.length + validFiles.length > MAX_FILES) {
      showToast(`Maximum ${MAX_FILES} files allowed`, 'warning');
      return;
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleFileInput = (e) => {
    handleFiles(e.target.files);
  };

  const removeFile = (fileToRemove) => {
    setFiles(files.filter(f => f !== fileToRemove));
  };

  const uploadFile = async (file, index) => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) formData.append('folderId', folderId);

    try {
      await axios.post(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/upload`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(prev => ({ ...prev, [index]: percent }));
          }
        }
      );
      setUploadStatus(prev => ({ ...prev, [index]: 'completed' }));
    } catch (error) {
      setUploadStatus(prev => ({ ...prev, [index]: 'error' }));
      throw error;
    }
  };

  const handleUploadAll = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const initialStatus = {};
    const initialProgress = {};
    files.forEach((_, index) => {
      initialStatus[index] = 'uploading';
      initialProgress[index] = 0;
    });
    setUploadStatus(initialStatus);
    setUploadProgress(initialProgress);

    try {
      await Promise.all(files.map((file, index) => uploadFile(file, index)));
      showToast('All files uploaded successfully', 'success');
      setTimeout(() => {
        onComplete();
      }, 1000);
    } catch (error) {
      showToast('Some files failed to upload', 'error');
    } finally {
      setUploading(false);
    }
  };

  const allCompleted = Object.values(uploadStatus).every(status => status === 'completed');
  const hasFiles = files.length > 0;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card text-card-foreground border border-border rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* Drop Zone */}
          {!hasFiles && (
            <div
              onDrop={handleDrop}
              onDragOver={handleDrag}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              className={`border-2 border-dashed rounded-lg p-8 sm:p-12 text-center transition-colors ${
                dragActive
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <Upload size={48} className="mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Upload up to {MAX_FILES} files (max 100MB each)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Select Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
            </div>
          )}

          {/* File Grid */}
          {hasFiles && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {files.length} file{files.length !== 1 ? 's' : ''} selected
                </p>
                {!uploading && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Add More
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={handleFileInput}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                <AnimatePresence>
                  {files.map((file, index) => (
                    <FilePreviewCard
                      key={`${file.name}-${index}`}
                      file={file}
                      onRemove={removeFile}
                      progress={uploadProgress[index] || 0}
                      status={uploadStatus[index] || 'pending'}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasFiles && (
          <div className="p-4 sm:p-6 border-t border-border flex gap-3">
            <button
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUploadAll}
              disabled={uploading || allCompleted}
              className="flex-1 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 shadow-sm"
            >
              {uploading ? 'Uploading...' : allCompleted ? 'All Uploaded' : `Upload ${files.length} File${files.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
