import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const FileItem = ({ file, refresh, showMetadata, darkMode }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' || e.key === 'Cancel') {
        if (showShare) setShowShare(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
      }
    },
    [showShare, showDeleteConfirm]
  );

  useEffect(() => {
    if (showShare || showDeleteConfirm) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShare, showDeleteConfirm, handleKeyDown]);

  const download = () => {
    window.open(`${backendUrl}/api/files/download/${file._id}`, '_blank');
  };

  const deleteFile = async () => {
    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`);
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const share = async () => {
    setIsLoading(true);
    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
      setShareLink(res.data.url);
      setCopied(false);
      setShowShare(true);
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(2)} MB`;
  };

  const renderPreview = () => {
    const url = `${backendUrl}/api/files/download/${file._id}`;
    const type = file.metadata?.type;
    const previewClass = 'rounded-md mb-2 w-full h-28 object-contain';

    if (type === 'image') return <img src={url} alt={file.filename} className={previewClass} />;
    if (type === 'video') return <video src={url} controls className={previewClass} />;
    if (type === 'audio') return <audio src={url} controls className="w-full mb-2" />;

    return (
      <div className={`flex items-center justify-center h-28 mb-2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
        <div className="text-center p-2">
          <div className={`text-2xl mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {(() => {
              const ext = file.filename.split('.').pop().toLowerCase();
              switch (ext) {
                case 'pdf': return 'PDF';
                case 'doc': case 'docx': return 'DOC';
                case 'xls': case 'xlsx': return 'XLS';
                case 'ppt': case 'pptx': return 'PPT';
                case 'zip': case 'rar': case '7z': return 'ZIP';
                case 'txt': return 'TXT';
                default: return 'FILE';
              }
            })()}
          </div>
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            {file.filename.split('.').pop().toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className={`w-full transition-all duration-300 ease-in-out
        ${showMetadata ? 'h-auto' : 'h-[180px]'}
        flex flex-col justify-between p-3 sm:p-4 text-sm sm:text-base rounded-xl shadow-md overflow-hidden border
        ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>

        {renderPreview()}
        {/* Tooltip added on filename */}
        <h3 title={file.filename} className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {file.filename}
        </h3>

        {showMetadata && (
          <>
            <div className={`mt-2 text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              <p>Type: {file.metadata?.type || 'Unknown'}</p>
              <p>Size: {formatSize(file.length)}</p>
              <p>Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={download} className={`px-3 py-1 rounded-md font-medium transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                Download
              </button>
              <button onClick={share} disabled={isLoading} className={`px-3 py-1 rounded-md font-medium transition-colors ${darkMode ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                {isLoading ? 'Making' : 'Share'}
              </button>
              <button onClick={() => setShowDeleteConfirm(true)} className={`px-3 py-1 rounded-md font-medium transition-colors ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}>
                Delete
              </button>
            </div>
          </>
        )}
      </div>

      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <button
              onClick={() => setShowShare(false)}
              className={`absolute top-3 right-3 p-1 text-lg font-bold hover:text-blue-600 transition-colors ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}
              title="Close"
            >
               ×
            </button>
            <h2 className={`font-bold mb-4 text-lg text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>Shareable Link</h2>

            {shareLink ? (
              <div className="flex justify-center mb-4">
                <div className={`p-4 border-2 border-dashed rounded-xl ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>
                  <QRCodeSVG
                    value={shareLink}
                    size={128}
                    fgColor={darkMode ? "#ffffff" : "#000000"}
                    bgColor="transparent"
                    level="H"
                    className="w-32 h-32"
                  />
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500 mb-4">Failed to generate QR code.</p>
            )}

            <div className="relative mb-2">
              <input
                value={shareLink}
                readOnly
                className={`w-full px-3 py-2 rounded font-mono text-sm border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-800'}`}
              />
            </div>

            <div className="mb-4">
              <button
                onClick={copyToClipboard}
                className={`w-full px-3 py-2 rounded font-medium text-sm transition-colors ${ 
                  darkMode 
                    ? copied ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>Confirm Delete</h2>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete
              <div className="font-bold max-w-full truncate overflow-hidden whitespace-nowrap my-1">
                {file.filename}
              </div>
              This action cannot be undone.
            </p>
            <div className="flex w-full justify-between gap-3 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 px-4 py-2 rounded-md font-medium transition-colors text-gray-800 bg-gray-200 hover:bg-gray-300">
                Cancel
              </button>
              <button onClick={deleteFile} className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FileItem;
