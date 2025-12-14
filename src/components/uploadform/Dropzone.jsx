import React from 'react';

const Dropzone = ({ file, darkMode, handleDrop, handleDragOver, getTruncatedFileName, formatBytes, pendingResume, fileInputRef, handleFileInputChange }) => {
    return (
        <>
            <label
                htmlFor="fileInput"
                className={`block w-full cursor-pointer px-4 py-8 rounded-lg mb-5 text-center transition-colors ${darkMode
                    ? 'bg-gray-700 hover:bg-gray-600 border-2 border-dashed border-gray-600'
                    : 'bg-gray-100 hover:bg-gray-200 border-2 border-dashed border-gray-300'
                    } ${file ? (darkMode ? 'border-blue-500' : 'border-blue-400') : ''}`}
                title={file ? file.name : 'Drag and drop file or click to browse'}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
            >
                <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-12 w-12 mb-3 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    {file ? (
                        <div>
                            <span className={`font-medium break-words ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                                {getTruncatedFileName(file.name)}
                            </span>
                            {file.size && (
                                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                    {formatBytes(file.size)}
                                </p>
                            )}
                        </div>
                    ) : (
                        <span className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {pendingResume ? `Select "${getTruncatedFileName(pendingResume.fileName)}" to resume` : "Drag and drop file or click to browse"}
                        </span>
                    )}
                </div>
            </label>
            <input
                id="fileInput"
                type="file"
                ref={fileInputRef}
                onChange={handleFileInputChange}
                className="hidden"
            />
        </>
    );
};

export default Dropzone;
