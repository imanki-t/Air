import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const Modals = ({
    showDeleteConfirmModal,
    setShowDeleteConfirmModal,
    deleteConfirmModalRef,
    selectedFiles,
    batchDelete,
    batchOperationLoading,
    showBatchDownloadProgress,
    batchDownloadModalRef,
    batchDownloadProgress,
    showBatchShareModal,
    setShowBatchShareModal,
    batchShareModalRef,
    batchShareLink,
    copyToClipboard,
    copied,
    darkMode,
    refresh,
    setSelectedFiles
}) => {
    return (
        <>
            {showDeleteConfirmModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
                    <div
                        ref={deleteConfirmModalRef}
                        className={cn(
                            'p-6 rounded-lg shadow-xl max-w-md w-full border animate-modalIn',
                            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                        )}
                        role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"
                    >
                        <h2 id="delete-modal-title" className="font-semibold text-lg mb-4">
                            Confirm Deletion
                        </h2>
                        <p id="delete-modal-description" className="text-sm mb-6">
                            Are you sure you want to permanently delete {selectedFiles.length} selected {selectedFiles.length === 1 ? 'item' : 'items'}? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirmModal(false)}
                                disabled={batchOperationLoading}
                                className={cn(
                                    'flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm',
                                    darkMode
                                        ? 'bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400'
                                )}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={batchDelete}
                                disabled={batchOperationLoading}
                                className={cn(
                                    'flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm text-white flex items-center justify-center gap-2',
                                    batchOperationLoading
                                        ? 'bg-red-500 cursor-wait'
                                        : 'bg-red-600 hover:bg-red-700'
                                )}
                            >
                                {batchOperationLoading && (
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                )}
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showBatchDownloadProgress && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
                    <div
                        ref={batchDownloadModalRef}
                        className={cn(
                            'p-6 rounded-lg shadow-xl max-w-sm w-full border animate-modalIn',
                            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                        )}
                        role="alertdialog" aria-modal="true" aria-labelledby="download-progress-title"
                    >
                        <h2 id="download-progress-title" className="text-center font-semibold text-lg mb-5">Preparing Download</h2>
                        <div className="my-6 px-2">
                            <div className="flex justify-between mb-1 text-sm font-medium">
                                <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Compressing files...</span>
                                <span className={darkMode ? 'text-gray-100' : 'text-gray-800'}>{batchDownloadProgress}%</span>
                            </div>
                            <div className={cn('h-2.5 rounded-full overflow-hidden w-full', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                                <div className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full" style={{ width: `${batchDownloadProgress}%` }} />
                            </div>
                        </div>
                        <p className={cn("text-sm text-center mt-5", darkMode ? "text-gray-400" : "text-gray-500")}>
                            Creating ZIP archive ({selectedFiles.length} {selectedFiles.length !== 1 ? 'items' : 'item'}).
                        </p>
                    </div>
                </div>
            )}

            {showBatchShareModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm">
                    <div
                        ref={batchShareModalRef}
                        className={cn(
                            'p-6 rounded-lg shadow-xl max-w-md w-full relative border animate-modalIn',
                            darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
                        )}
                        role="dialog" aria-modal="true" aria-labelledby="share-modal-title"
                    >
                        <button
                            onClick={() => {
                                if (!batchOperationLoading) {
                                    setShowBatchShareModal(false);
                                    refresh();
                                    setSelectedFiles([]);
                                }
                            }}
                            className={cn(
                                "absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50",
                                batchOperationLoading ? "cursor-not-allowed" : (darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500")
                            )}
                            disabled={batchOperationLoading} aria-label="Close share dialog"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /> </svg>
                        </button>

                        <h2 id="share-modal-title" className="text-center font-semibold text-lg mb-5">Share</h2>

                        <div className="flex justify-center mb-5">
                            <div className={cn("p-2 rounded-lg border", darkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-gray-50")}>
                                {batchOperationLoading && !batchShareLink ? (
                                    <div className="w-[150px] h-[150px] flex items-center justify-center">
                                        <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                                    </div>
                                ) : batchShareLink ? (
                                    <QRCodeSVG
                                        value={batchShareLink}
                                        size={150}
                                        bgColor="transparent"
                                        fgColor={darkMode ? '#FFFFFF' : '#000000'}
                                        level="M"
                                        includeMargin={false}
                                    />
                                ) : (
                                    <div className="w-[150px] h-[150px] flex items-center justify-center text-center text-xs text-red-500 p-2">Error generating QR code. Link might be invalid or too long.</div>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5">
                            <input
                                type="text"
                                value={batchOperationLoading ? 'Generating link...' : batchShareLink || 'Error - No link generated'}
                                readOnly
                                className={cn(
                                    'w-full p-2 rounded-md border text-xs font-mono',
                                    'overflow-x-auto',
                                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700'
                                )}
                                aria-label="Shareable link"
                                onClick={(e) => e.target.select()}
                            />
                            <button
                                onClick={copyToClipboard}
                                disabled={!batchShareLink || copied || batchOperationLoading}
                                className={cn(
                                    'w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2',
                                    copied
                                        ? 'bg-green-600 text-white cursor-default'
                                        : !batchShareLink || batchOperationLoading
                                            ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                            : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                                )}
                            >
                                {copied ? (
                                    <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
                                ) : (
                                    'Copy Link'
                                )}
                            </button>
                        </div>

                        {batchShareLink && (
                            <div className="mt-4 text-center">
                                <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>
                                    Anyone with the link can access the selected file{selectedFiles.length > 1 ? 's' : ''}.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default Modals;
