// FileItem.jsx - Updated with kebab menu
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const FileItem = ({ file, refresh, showMetadata, darkMode, isSelected, onSelect, selectionMode }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  const menuRef = React.useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    
    if (showMenu) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [showMenu]);

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape' || e.key === 'Cancel') {
        if (showShare) setShowShare(false);
        if (showDeleteConfirm) setShowDeleteConfirm(false);
        if (showMenu) setShowMenu(false);
      }
    },
    [showShare, showDeleteConfirm, showMenu]
  );

  useEffect(() => {
    if (showShare || showDeleteConfirm || showMenu) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShare, showDeleteConfirm, showMenu, handleKeyDown]);

  const download = async () => {
    setShowMenu(false);
    setIsLoading(true);
    setDownloadProgress(0);
    
    try {
      const response = await axios({
        url: `${backendUrl}/api/files/download/${file._id}`,
        method: 'GET',
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setDownloadProgress(percentCompleted);
        },
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsLoading(false);
      setDownloadProgress(0);
    }
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
    setShowMenu(false);
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

  // For file selection in batch operations
  const handleItemClick = (e) => {
    if (selectionMode) {
      e.preventDefault();
      onSelect(file._id);
    }
  };

  return (
    <>
      <div 
        className={`w-full relative transition-all duration-300 ease-in-out
          ${showMetadata ? 'h-auto' : 'h-[180px]'}
          flex flex-col justify-between p-3 sm:p-4 text-sm sm:text-base rounded-xl shadow-md overflow-hidden border
          ${isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''}
          ${darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
        onClick={handleItemClick}
      >
        {/* Selection Checkbox (Shown only in selection mode) */}
        {selectionMode && (
          <div className="absolute top-2 left-2 z-10">
            <input 
              type="checkbox" 
              checked={isSelected} 
              onChange={() => onSelect(file._id)}
              className="w-4 h-4 accent-blue-600"
            />
          </div>
        )}

        {/* Loading Progress Indicator */}
        {isLoading && downloadProgress > 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
            <div className="w-4/5 bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Kebab Menu Button (Always visible in top-right) */}
        <div className="absolute top-2 right-2 z-10">
          <button 
            onClick={(e) => {
              e.stopPropagation(); 
              setShowMenu(!showMenu);
            }} 
            className={`p-1 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-gray-400' : 'hover:bg-gray-300'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div 
              ref={menuRef}
              className={`absolute right-0 mt-1 py-1 w-36 rounded-md shadow-lg z-50 ${darkMode ? 'bg-gray-700' : 'bg-white'} border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
            >
              <button 
                onClick={download}
                className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                Download
              </button>
              <button 
                onClick={share}
                className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                Share
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className={`w-full text-left px-4 py-2 text-sm ${darkMode ? 'hover:bg-gray-600 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {renderPreview()}
        {/* Tooltip added on filename */}
        <h3 title={file.filename} className={`font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {file.filename}
        </h3>

        {showMetadata && (
          <div className={`mt-2 text-xs space-y-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>Type: {file.metadata?.type || 'Unknown'}</p>
            <p>Size: {formatSize(file.length)}</p>
            <p>Uploaded: {new Date(file.uploadDate).toLocaleString()}</p>
          </div>
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
