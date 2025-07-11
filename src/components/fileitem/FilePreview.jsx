import React from 'react';
import FileTypeIcon from './FileTypeIcon';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FilePreview = ({ file, darkMode, viewType, backendUrl }) => {
    const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
    const type = file.metadata?.type || 'other';

    const imageVideoPreviewClasses = 'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';
    let containerBaseClasses = `relative overflow-hidden group ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`;

    if (viewType === 'list') {
        containerBaseClasses += ' w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0';
    } else {
        containerBaseClasses += ' h-32 mb-2 rounded-t-xl';
    }

    if (type === 'image') {
        return (
            <div className={containerBaseClasses}>
                <img src={previewUrl} alt={`Preview of ${file.filename}`} className={imageVideoPreviewClasses} loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </div>
        );
    }

    if (type === 'video') {
        return (
            <div className={containerBaseClasses}>
                <video src={`${previewUrl}#t=0.5`} preload="metadata" className={`${imageVideoPreviewClasses} bg-black`} />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>
        );
    }

    const fileExtension = file.filename.split('.').pop().toUpperCase();
    return (
        <div className={`${containerBaseClasses} flex flex-col items-center justify-center`}>
            <FileTypeIcon type={type} darkMode={darkMode} size={viewType === 'list' ? "h-8 w-8 sm:h-10 w-10" : "h-10 w-10"} />
            {type !== 'audio' && (
                <span className={`mt-1 text-xs font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {fileExtension}
                </span>
            )}
        </div>
    );
};

export default FilePreview;
