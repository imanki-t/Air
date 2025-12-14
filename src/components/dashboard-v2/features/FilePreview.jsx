import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { IconButton } from '../ui/buttons/IconButton';

export const FilePreview = ({ file, isOpen, onClose }) => {
  const { colors } = useTheme();

  if (!isOpen || !file) return null;

  const isImage = file.contentType?.startsWith('image/');
  const isVideo = file.contentType?.startsWith('video/');
  const isAudio = file.contentType?.startsWith('audio/');
  const isPDF = file.contentType?.includes('pdf');

  const previewUrl = `/api/files/preview/${file._id}`; // Or download endpoint

  return (
    <AnimatePresence>
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm">
             {/* Toolbar */}
             <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center text-white z-10">
                 <div className="flex items-center gap-3">
                     <IconButton
                        icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>}
                        onClick={onClose}
                        className="text-white hover:bg-white/10"
                     />
                     <span className="font-medium truncate max-w-md">{file.filename}</span>
                 </div>
                 <div className="flex items-center gap-2">
                     <IconButton
                         icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>}
                         className="text-white hover:bg-white/10"
                         tooltip="Download"
                         onClick={() => window.open(`/api/files/download/${file._id}`)}
                     />
                 </div>
             </div>

             {/* Content */}
             <div className="w-full h-full flex items-center justify-center p-4 md:p-10">
                 {isImage && (
                     <img src={previewUrl} alt={file.filename} className="max-w-full max-h-full object-contain rounded shadow-2xl" />
                 )}
                 {isVideo && (
                     <video src={previewUrl} controls className="max-w-full max-h-full rounded shadow-2xl" />
                 )}
                 {isAudio && (
                     <div className="bg-surface p-8 rounded-xl shadow-2xl min-w-[300px] flex flex-col items-center gap-4">
                          <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center text-primary">
                               <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>
                          </div>
                          <audio src={previewUrl} controls className="w-full" />
                     </div>
                 )}
                 {isPDF && (
                     <iframe src={previewUrl} className="w-full h-full rounded shadow-2xl bg-white" />
                 )}
                 {!isImage && !isVideo && !isAudio && !isPDF && (
                     <div className="text-white text-center">
                         <div className="mb-4">
                            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="mx-auto opacity-50"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                         </div>
                         <p className="text-lg">Preview not available</p>
                         <p className="text-sm opacity-60 mt-2">Download the file to view it.</p>
                         <button
                            className="mt-6 px-6 py-2 bg-primary text-onPrimary rounded-full font-medium hover:bg-opacity-90 transition-colors"
                            onClick={() => window.open(`/api/files/download/${file._id}`)}
                         >
                             Download File
                         </button>
                     </div>
                 )}
             </div>
         </div>
    </AnimatePresence>
  );
};
