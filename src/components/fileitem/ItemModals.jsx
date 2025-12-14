import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const ItemModals = ({
    showShare, setShowShare, shareModalRef, isActionLoading, shareLink, copied, setCopied,
    showDeleteConfirm, setShowDeleteConfirm, deleteModalRef, deleteFile, file, darkMode
}) => {

    const copyToClipboard = async (link) => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <>
            {showShare && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
                    <div ref={shareModalRef} className={cn(`p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`, darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')} role="dialog" aria-modal="true" aria-labelledby="share-file-title">
                        <button onClick={() => setShowShare(false)} className={cn(`absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50`, isActionLoading ? "cursor-not-allowed" : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'))} disabled={isActionLoading} title="Close" aria-label="Close share dialog">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                        <h2 id="share-file-title" className={cn(`font-semibold mb-5 text-lg text-center truncate px-8`, darkMode ? 'text-white' : 'text-gray-800')}>Share</h2>
                        <div className="flex justify-center mb-5">
                            <div className={cn("p-2 border rounded-lg", darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50')}>
                                {isActionLoading && !shareLink ? (
                                    <div className="w-40 h-40 flex items-center justify-center"><svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg></div>
                                ) : shareLink ? (
                                    <QRCodeSVG value={shareLink} size={160} bgColor="transparent" fgColor={darkMode ? "#FFFFFF" : "#000000"} level="M" includeMargin={false} className="block" />
                                ) : (
                                    <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-500 p-2">Failed to load QR Code.</div>
                                )}
                            </div>
                        </div>
                        <div className="flex flex-col gap-2.5 mb-4">
                            <input value={isActionLoading ? 'Generating...' : shareLink || 'Error generating link'} readOnly className={cn(`w-full px-3 py-2 rounded font-mono text-xs border`, `overflow-x-auto whitespace-nowrap`, darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-800', 'disabled:opacity-70')} disabled={isActionLoading} aria-label="Shareable link" onClick={(e) => e.target.select()} />
                            <button onClick={() => copyToClipboard(shareLink)} disabled={!shareLink || copied || isActionLoading} className={cn(`w-full px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2`, copied ? 'bg-green-600 text-white cursor-default' : !shareLink || isActionLoading ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))}>
                                {copied ? (<><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>) : ('Copy Link')}
                            </button>
                        </div>
                        <p className={cn(`text-xs text-center`, darkMode ? 'text-gray-400' : 'text-gray-500')}>Anyone with this link can view or download this file.</p>
                    </div>
                </div>
            )}
            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
                    <div ref={deleteModalRef} className={cn(`p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`, darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" aria-describedby="delete-file-desc">
                        <h2 id="delete-file-title" className={cn(`font-semibold mb-2 text-lg`, darkMode ? 'text-white' : 'text-gray-800')}>Confirm Delete</h2>
                        <p id="delete-file-desc" className={cn(`text-sm mb-3`, darkMode ? 'text-gray-300' : 'text-gray-600')}>Are you sure you want to permanently delete this file?</p>
                        <div className={cn(`font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-3 p-2 rounded text-sm`, darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200')}>{file.filename}</div>
                        <p className={cn(`text-sm mb-5`, darkMode ? 'text-gray-400' : 'text-gray-600')}>This action cannot be undone.</p>
                        <div className="flex w-full justify-between gap-3 mt-4">
                            <button onClick={() => setShowDeleteConfirm(false)} disabled={isActionLoading} className={cn(`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm`, isActionLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') : (darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'))}>Cancel</button>
                            <button onClick={deleteFile} disabled={isActionLoading} className={cn(`flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm text-white flex items-center justify-center gap-2`, isActionLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700')}>
                                {isActionLoading && (<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>)} Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
                @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }
            `}</style>
        </>
    );
};

export default ItemModals;
