import React, { useRef, useState } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { Button, Spinner } from '../ui';
import { FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import api from '../../api/axios';
import { toast } from 'react-hot-toast';

const UploadManager = () => {
  const { currentFolder, refresh } = useFileSystem();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);

    // Upload one by one or Promise.all
    // For simplicity, one by one to show progress
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolder) {
            formData.append('folderId', currentFolder._id);
        }

        try {
            await api.post('/api/files/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    // Adjust progress based on total files
                    const totalProgress = ((i * 100) + percentCompleted) / files.length;
                    setProgress(totalProgress);
                }
            });
            toast.success(`Uploaded ${file.name}`);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to upload ${file.name}`);
        }
    }

    setUploading(false);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    refresh();
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end space-y-4">
       {uploading && (
           <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-64">
               <div className="flex justify-between items-center mb-2">
                   <span className="text-sm font-medium dark:text-white">Uploading...</span>
                   <span className="text-xs text-blue-600">{Math.round(progress)}%</span>
               </div>
               <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                   <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                   ></div>
               </div>
           </div>
       )}

       <button
         onClick={() => fileInputRef.current?.click()}
         className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center"
         title="Upload File"
       >
          {uploading ? <Spinner size="sm" className="border-white" /> : <FaCloudUploadAlt className="text-2xl" />}
       </button>

       <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
       />
    </div>
  );
};

export default UploadManager;
