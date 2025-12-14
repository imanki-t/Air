import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const BatchActionBar = ({
    toggleSelectAll,
    selectedFiles,
    paginatedFiles,
    displayFiles,
    isPaginationEnabled,
    visible,
    batchDownload,
    batchShare,
    setShowDeleteConfirmModal,
    batchOperationLoading,
    darkMode
}) => {
    const allOnPageSelected = isPaginationEnabled
        ? paginatedFiles.every(file => selectedFiles.includes(file._id)) && paginatedFiles.length > 0
        : displayFiles.every(file => selectedFiles.includes(file._id)) && displayFiles.length > 0;

    return (
        <div className={cn(
            'mb-6 p-3 rounded-lg border transition-all duration-300 ease-in-out',
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
        )}>
            <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 flex-wrap">
                <div className="w-full md:w-auto">
                    <button
                        onClick={toggleSelectAll}
                        className={cn(
                            'w-full md:w-auto py-2 px-4 rounded-md text-sm font-medium text-center transition-colors duration-200 border',
                            allOnPageSelected
                                ? `border-red-400 ${darkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-white hover:bg-red-50'}`
                                : `border-blue-400 ${darkMode ? 'text-blue-300 bg-gray-700 hover:bg-gray-600' : 'text-blue-600 bg-white hover:bg-blue-50'}`
                        )}
                    >
                        {allOnPageSelected ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                <div className={cn('text-sm flex-grow text-center md:text-left order-last md:order-none w-full md:w-auto pt-2 md:pt-0', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {selectedFiles.length > 0 && isPaginationEnabled ? `${selectedFiles.length} of ${visible.length} total items selected.`
                        : `${selectedFiles.length} of ${isPaginationEnabled ? paginatedFiles.length : displayFiles.length} selected.`
                    }
                </div>

                <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-2">
                    <button
                        onClick={batchDownload}
                        disabled={selectedFiles.length === 0 || batchOperationLoading}
                        className={cn(
                            'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                            selectedFiles.length === 0 || batchOperationLoading
                                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                        )}
                        title={selectedFiles.length > 0 ? `Download ${selectedFiles.length} items` : "Select files to download"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        <span className="hidden sm:inline">Download</span> ({selectedFiles.length})
                    </button>
                    <button
                        onClick={batchShare}
                        disabled={selectedFiles.length === 0 || batchOperationLoading}
                        className={cn(
                            'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                            selectedFiles.length === 0 || batchOperationLoading
                                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                : (darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white')
                        )}
                        title={selectedFiles.length > 0 ? `Share ${selectedFiles.length} items` : "Select files to share"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        <span className="hidden sm:inline">Share</span> ({selectedFiles.length})
                    </button>
                    <button
                        onClick={() => setShowDeleteConfirmModal(true)}
                        disabled={selectedFiles.length === 0 || batchOperationLoading}
                        className={cn(
                            'flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1',
                            selectedFiles.length === 0 || batchOperationLoading
                                ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                : (darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white')
                        )}
                        title={selectedFiles.length > 0 ? `Delete ${selectedFiles.length} items` : "Select files to delete"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span className="hidden sm:inline">Delete</span> ({selectedFiles.length})
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BatchActionBar;
