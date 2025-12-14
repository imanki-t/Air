import { useState, useCallback } from 'react';
import fileService from '../../../services/fileService';

/**
 * Hook for managing file uploads
 */
export const useUploader = (onSuccess) => {
  const [uploads, setUploads] = useState({}); // { id: { file, progress, status, error } }
  const [isUploading, setIsUploading] = useState(false);

  const startUpload = useCallback(async (file, folderId) => {
    const uploadId = Date.now() + Math.random().toString(36).substr(2, 9);

    setUploads(prev => ({
      ...prev,
      [uploadId]: {
        id: uploadId,
        filename: file.name,
        progress: 0,
        status: 'uploading', // uploading, completed, error
        error: null
      }
    }));

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      const result = await fileService.uploadFile(formData, (progressEvent) => {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploads(prev => ({
          ...prev,
          [uploadId]: {
            ...prev[uploadId],
            progress: percent
          }
        }));
      });

      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'completed',
          progress: 100
        }
      }));

      if (onSuccess) onSuccess(result);

    } catch (err) {
      console.error('Upload Error:', err);
      setUploads(prev => ({
        ...prev,
        [uploadId]: {
          ...prev[uploadId],
          status: 'error',
          error: err.message || 'Upload failed'
        }
      }));
    } finally {
      // Check if all active uploads are done
      // We'll leave the isUploading true until the user clears the list or we auto-hide
      // For now, simple check
      // setIsUploading(false);
    }
  }, [onSuccess]);

  const clearCompleted = useCallback(() => {
    setUploads(prev => {
      const newUploads = { ...prev };
      Object.keys(newUploads).forEach(key => {
        if (newUploads[key].status === 'completed') {
          delete newUploads[key];
        }
      });
      return newUploads;
    });
  }, []);

  const cancelUpload = useCallback((uploadId) => {
    setUploads(prev => {
        const newUploads = { ...prev };
        delete newUploads[uploadId];
        return newUploads;
    });
  }, []);

  return {
    uploads,
    isUploading,
    startUpload,
    clearCompleted,
    cancelUpload
  };
};
