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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getFileTypeIcon = () => {
    const ext = file.filename.split('.').pop().toLowerCase();
    
    switch (ext) {
      case 'pdf':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 16h1v-3h-1v3zm-5-3v3h1v-3h-1zm9 0v3h1v-3h-1zm5-10H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-6-6h-7v1h7v-1z" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
          </svg>
        );
      case 'xls':
      case 'xlsx':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14zm-7-7.5c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5.67 1.5 1.5 1.5 1.5-.67 1.5-1.5z" />
          </svg>
        );
      case 'zip':
      case 'rar':
      case '7z':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 2c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6H6zm7 7V3.5L18.5 9H13z" />
          </svg>
        );
    }
  };

  const renderPreview = () => {
    const url = `${backendUrl}/api/files/download/${file._id}`;
    const type = file.metadata?.type;
    const previewClass = 'rounded-md mb-2 w-full h-32 object-contain transition-all duration-300 hover:opacity-90';

    if (type === 'image') {
      return (
        <div className="relative h-32 mb-2 overflow-hidden rounded-md group">
          <img src={url} alt={file.filename} className={`${previewClass} group-hover:scale-105 transition-transform duration-300`} />
          <div className={`absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center`}>
            <span className="text-white text-xs font-medium pb-1">Preview Image</span>
          </div>
        </div>
      );
    }
    
    if (type === 'video') {
      return (
        <div className="relative h-32 mb-2 rounded-md overflow-hidden group">
          <video src={url} className={`${previewClass} object-cover`} />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      );
    }
    
    if (type === 'audio') {
      return (
        <div className={`flex flex-col items-center justify-center h-32 mb-2 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} group hover:bg-opacity-80 transition-all duration-300`}>
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2 group-hover:scale-110 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
          </svg>
          <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Audio File</span>
        </div>
      );
    }

    // Default file icon based on extension
    return (
      <div className={`flex flex-col items-center justify-center h-32 mb-2 rounded-md group hover:bg-opacity-80 transition-all duration-300 ${darkMode ? 'bg-gray-700/70' : 'bg-gray-100/90'}`}>
        <div className={`text-center p-2 group-hover:scale-105 transition-transform duration-300`}>
          <div className={`mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {getFileTypeIcon()}
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
          ${showMetadata ? 'h-auto' : 'h-[200px]'}
          flex flex-col justify-between p-3 sm:p-4 text-sm rounded-xl shadow-md overflow-hidden
          ${isSelected 
            ? `ring-2 ring-blue-500 ${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border border-blue-500` 
            : `border ${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-300'}`}
          ${darkMode ? 'text-white' : 'text-gray-900'}
          ${selectionMode ? 'cursor-pointer' : ''}
          transform hover:translate-y-[-2px] hover:shadow-lg`}
        onClick={handleItemClick}
      >
        {/* Selection Indicator - Just the highlight, no checkbox */}
        {selectionMode && isSelected && (
          <div className="absolute top-2 right-2 z-10">
            <div className={`w-4 h-4 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-blue-500'} shadow-md`}></div>
          </div>
        )}

        {/* Loading Progress Indicator */}
        {isLoading && downloadProgress > 0 && (
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10">
            <div className="w-4/5 max-w-xs">
              <div className="mb-2 flex justify-between items-center">
                <span className="text-xs font-medium text-white">Downloading...</span>
                <span className="text-xs font-medium text-white">{downloadProgress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
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
            className={`p-1.5 rounded-full hover:bg-opacity-20 ${darkMode ? 'hover:bg-gray-400' : 'hover:bg-gray-300'} transition-colors duration-150`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>
          
          {/* Dropdown Menu */}
          {showMenu && (
            <div 
              ref={menuRef}
              className={`absolute right-0 mt-1 py-1 w-36 rounded-md shadow-lg z-50 border backdrop-blur-sm
                ${darkMode ? 'bg-gray-800/95 border-gray-600' : 'bg-white/95 border-gray-200'}`}
            >
              <button 
                onClick={download}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download
              </button>
              <button 
                onClick={share}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  ${darkMode ? 'hover:bg-gray-700 text-white' : 'hover:bg-gray-100 text-gray-700'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
              <div className="border-b my-1 opacity-50"></div>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setShowDeleteConfirm(true);
                }}
                className={`w-full text-left px-4 py-2 text-sm flex items-center gap-2
                  ${darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          )}
        </div>

        {renderPreview()}
        
        {/* Filename with tooltip */}
        <h3 
          title={file.filename} 
          className={`font-medium text-sm truncate mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}
        >
          {file.filename}
        </h3>

        {/* Always show basic metadata */}
        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="truncate">{formatSize(file.length)}</p>
        </div>

        {/* Extended metadata when showMetadata is true */}
        {showMetadata && (
          <div className={`mt-2 text-xs space-y-1 pt-2 border-t ${darkMode ? 'text-gray-400 border-gray-700' : 'text-gray-500 border-gray-200'}`}>
            <p><span className="font-medium">Type:</span> {file.metadata?.type || 'Unknown'}</p>
            <p><span className="font-medium">Size:</span> {formatSize(file.length)}</p>
            <p><span className="font-medium">Uploaded:</span> {formatDate(file.uploadDate)}</p>
            {file.metadata?.dimensions && (
              <p><span className="font-medium">Dimensions:</span> {file.metadata.dimensions}</p>
            )}
          </div>
        )}
      </div>

      {/* Share Modal with QR Code */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg border
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <button
              onClick={() => setShowShare(false)}
              className={`absolute top-3 right-3 p-1.5 rounded-full transition-colors ${darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h2 className={`font-bold mb-4 text-lg text-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>Share "{file.filename}"</h2>

            {shareLink ? (
              <div className="flex justify-center mb-4">
                <div className={`p-4 border-2 border-dashed rounded-xl ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`}>
                  <QRCodeSVG
                    value={shareLink}
                    size={160}
                    fgColor={darkMode ? "#ffffff" : "#000000"}
                    bgColor="transparent"
                    level="H"
                    className="w-40 h-40"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center items-center h-40 mb-4">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            )}

            <div className="relative mb-4">
              <input
                value={shareLink}
                readOnly
                className={`w-full px-3 py-2 rounded font-mono text-sm border ${darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-100 border-gray-200 text-gray-800'}`}
              />
            </div>

            <div className="mb-2">
              <button
                onClick={copyToClipboard}
                className={`w-full px-3 py-2 rounded-md font-medium text-sm transition-colors ${ 
                  darkMode 
                    ? copied ? 'bg-green-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    : copied ? 'bg-green-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
            
            <p className={`text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Anyone with this link can download this file.
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm">
          <div className={`p-6 rounded-xl max-w-sm w-full relative shadow-lg border
            ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h2 className={`font-bold mb-4 text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>Confirm Delete</h2>
            <p className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Are you sure you want to delete?
            </p>
            <div className={`font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-2 p-2 rounded
              ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
              {file.filename}
            </div>
            <p className={`text-sm mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              This action cannot be undone.
            </p>
            <div className="flex w-full justify-between gap-3 mt-4">
              <button 
                onClick={() => setShowDeleteConfirm(false)} 
                className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors
                  ${darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button 
                onClick={deleteFile} 
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
              >
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
