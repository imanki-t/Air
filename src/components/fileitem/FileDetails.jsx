import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const formatSize = (bytes) => {
    if (bytes === null || bytes === undefined || bytes < 0) return 'N/A';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    try {
        return new Date(dateString).toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    } catch (e) {
        return 'Invalid date';
    }
};

const FileDetails = ({ file, darkMode, showDetails }) => {
    return (
        <>
            <h3
                title={file.filename}
                className={cn(`font-medium text-sm truncate mb-1`, darkMode ? 'text-gray-100' : 'text-gray-800')}
            >
                {file.filename}
            </h3>
            <div className={cn(`text-xs mt-0.5`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
            </div>
            {showDetails && <div className="flex-grow min-h-[1rem]"></div>}
            {showDetails && (
                <div className={cn(`mt-2 text-xs space-y-1 pt-2 border-t`, darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200')}>
                    {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                    <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                    {file.metadata?.dimensions && (
                        <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>
                    )}
                </div>
            )}
        </>
    );
};

export default FileDetails;
