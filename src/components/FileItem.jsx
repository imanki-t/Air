import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');


// ─── Main FileItem Component ──────────────────────────────────────────────────
const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [mediaError, setMediaError] = useState(false);

  const menuRef = useRef(null);
  const shareModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const shareLinkInputRef = useRef(null);

  // Close modals & overlays on outside clicks
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        const menuButton = menuRef.current.previousElementSibling;
        if (!menuButton || !menuButton.contains(event.target)) {
          setShowMenu(false);
        }
      }
      if (shareModalRef.current && !shareModalRef.current.contains(event.target)) {
        setShowShare(false);
      }
      if (deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
        setShowDeleteConfirm(false);
      }
    };

    if (showMenu || showShare || showDeleteConfirm || showViewer) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu, showShare, showDeleteConfirm, showViewer]);

  // Close dynamic dropdown on scroll
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [showMenu]);

  // Escape key events
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (showViewer) { setShowViewer(false); return; }
      if (showShare) setShowShare(false);
      if (showDeleteConfirm) setShowDeleteConfirm(false);
      if (showMenu) setShowMenu(false);
    }
  }, [showShare, showDeleteConfirm, showMenu, showViewer]);

  useEffect(() => {
    if (showShare || showDeleteConfirm || showMenu || showViewer) {
      window.addEventListener('keydown', handleKeyDown);
    } else {
      window.removeEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showShare, showDeleteConfirm, showMenu, showViewer, handleKeyDown]);

  const download = async () => {
    setShowMenu(false);
    setIsActionLoading(true);
    setDownloadProgress(0);
    try {
      const response = await axios({
        url: `${backendUrl}/api/files/download/${file._id}`,
        method: 'GET',
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && progressEvent.total > 0) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percentCompleted);
          }
        },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setDownloadProgress(0), 1200);
    }
  };

  const deleteFile = async () => {
    setIsActionLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`);
      setShowDeleteConfirm(false);
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
      setIsActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const share = async () => {
    setShowMenu(false);
    setIsActionLoading(true);
    setShareLink('');
    setCopied(false);
    setShowShare(true);
    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
      setShareLink(res.data.url);
    } catch (err) {
      console.error('Share failed:', err);
      setShowShare(false);
    } finally {
      setIsActionLoading(false);
    }
  };

  const copyToClipboard = async (link) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const openViewer = async () => {
    setShowMenu(false);
    setStreamUrl(null);
    setMediaError(false);
    setShowViewer(true);
    const type = file.metadata?.type;
    if (type === 'video' || type === 'audio') {
      try {
        const res = await axios.get(`${backendUrl}/api/files/stream-url/${file._id}`);
        if (res.data?.url) setStreamUrl(res.data.url);
      } catch (err) {
        console.warn('Could not retrieve direct stream URL, falling back to secure preview proxy:', err.message);
      }
    }
  };

  const handleMediaFailure = () => {
    if (!mediaError && streamUrl) setMediaError(true);
  };

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
      const date = new Date(dateString);
      return date.toLocaleString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  const FileTypeIcon = ({ type, darkMode, size = "h-10 w-10" }) => {
    const iconColor = darkMode ? "text-gray-400" : "text-gray-500";
    const icons = {
      image: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      video: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      audio: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
      document: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      other: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    };
    return <div className={iconColor}>{icons[type] || icons['other']}</div>;
  };

  const renderPreview = (isListView) => {
    const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
    const type = file.metadata?.type || 'other';
    const imageVideoPreviewClasses = 'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';
    let containerBaseClasses = `relative overflow-hidden group ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`;

    if (isListView) {
      containerBaseClasses += ' w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0';
    } else {
      containerBaseClasses += ' h-32 mb-2 rounded-t-xl';
    }

    if (type === 'image') {
      return (
        <div className={containerBaseClasses}>
          <img
            src={previewUrl}
            crossOrigin="use-credentials"
            alt={`Preview of ${file.filename}`}
            className={imageVideoPreviewClasses}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      );
    }

    if (type === 'video') {
      return (
        <div className={containerBaseClasses}>
          <video
            src={`${previewUrl}#t=0.5`}
            crossOrigin="use-credentials"
            preload="metadata"
            className={`${imageVideoPreviewClasses} bg-black`}
          />
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
        <FileTypeIcon type={type} darkMode={darkMode} size={isListView ? "h-8 w-8 sm:h-10 w-10" : "h-10 w-10"} />
        {type !== 'audio' && (
          <span className={`mt-1 text-xs font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {fileExtension}
          </span>
        )}
      </div>
    );
  };

  const handleItemClick = (e) => {
    const menuButton = e.currentTarget.querySelector('[aria-label="File options"]');
    if (menuButton && menuButton.contains(e.target)) {
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      onSelect(file._id);
    }
  };

  return (
    <>
      {/* ── File Card Container ── */}
      <div
        className={cn(
          "relative text-sm rounded-xl shadow-md border transition-all duration-200 ease-in-out",
          isSelected
            ? `ring-2 ring-offset-1 ${darkMode ? 'ring-blue-500 bg-gray-750 border-blue-700' : 'ring-blue-600 bg-blue-50 border-blue-400'}`
            : `${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`,
          darkMode ? 'text-white' : 'text-gray-900',
          selectionMode ? 'cursor-pointer' : '',
          'transform hover:-translate-y-0.5 hover:shadow-lg',
          viewType === 'list'
            ? 'flex items-center p-3 gap-3 min-h-[90px] sm:min-h-[110px]'
            : 'flex flex-col justify-between h-full min-h-[200px]',
          showMenu ? 'z-30' : 'z-10'
        )}
        onClick={handleItemClick}
        role="listitem"
        aria-selected={isSelected}
      >
        {viewType === 'list' && (
          <>
            {renderPreview(true)}
            <div className="flex flex-col flex-grow min-w-0">
              <h3 title={file.filename} className={cn("font-medium text-sm truncate mb-1", darkMode ? 'text-gray-100' : 'text-gray-800')}>
                {file.filename}
              </h3>
              <div className={cn("text-xs mt-0.5", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
              </div>
              {showDetails && (
                <div className={cn("mt-2 text-xs space-y-1 pt-2 border-t", darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200')}>
                  {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                  <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                  {file.metadata?.dimensions && <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 ml-auto self-start pt-1">
              {selectionMode ? (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150", isSelected ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500') : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80'))}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              ) : (
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }} className={cn("p-1.5 rounded-full transition-colors duration-150", showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700') : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'), 'backdrop-blur-sm bg-opacity-50')} aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {showMenu && (
                    <div ref={menuRef} className={cn("absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border backdrop-blur-md", darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200')} role="menu">
                      {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                        <>
                          <button onClick={openViewer} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                        </>
                      )}
                      <button onClick={download} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                        Get
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={share} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400' : 'text-red-600')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {viewType === 'grid' && (
          <div className="flex flex-col h-full">
            {renderPreview(false)}
            <div className="p-3 pt-2 flex flex-col flex-grow">
              <h3 title={file.filename} className={cn("font-medium text-sm truncate mb-1", darkMode ? 'text-gray-100' : 'text-gray-800')}>
                {file.filename}
              </h3>
              <div className={cn("text-xs mt-0.5", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
              </div>
              {showDetails && <div className="flex-grow min-h-[1rem]" />}
              {showDetails && (
                <div className={cn("mt-2 text-xs space-y-1 pt-2 border-t", darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200')}>
                  {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                  <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                  {file.metadata?.dimensions && <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>}
                </div>
              )}
            </div>

            <div className="absolute top-1.5 right-1.5 z-10">
              {selectionMode ? (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150", isSelected ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500') : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80'))}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              ) : (
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }} className={cn("p-1.5 rounded-full transition-colors duration-150", showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700') : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'), 'backdrop-blur-sm bg-opacity-50')} aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {showMenu && (
                    <div ref={menuRef} className={cn("absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border backdrop-blur-md", darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200')} role="menu">
                      {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                        <>
                          <button onClick={openViewer} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                        </>
                      )}
                      <button onClick={download} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                        Get
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={share} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400' : 'text-red-600')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isActionLoading && downloadProgress > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg backdrop-blur-sm animate-fadeIn">
            <div className="w-4/5 max-w-xs text-center">
              <div className="mb-1.5 text-xs font-medium text-white">Downloading... {downloadProgress}%</div>
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Share Modal ── */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] px-4 backdrop-blur-sm animate-fadeIn">
          <div ref={shareModalRef} className={cn("p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn", darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')} role="dialog" aria-modal="true" aria-labelledby="share-file-title">
            <button onClick={() => setShowShare(false)} className={cn("absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50", isActionLoading ? "cursor-not-allowed" : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'))} disabled={isActionLoading} title="Close" aria-label="Close share dialog">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 id="share-file-title" className={cn("font-semibold mb-5 text-lg text-center truncate px-8", darkMode ? 'text-white' : 'text-gray-800')}>Share</h2>
            <div className="flex justify-center mb-5">
              <div className={cn("p-2 border rounded-lg", darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50')}>
                {isActionLoading && !shareLink ? (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                ) : shareLink ? (
                  <QRCodeSVG value={shareLink} size={160} bgColor="transparent" fgColor={darkMode ? "#FFFFFF" : "#000000"} level="M" includeMargin={false} className="block" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-500 p-2">Failed to load QR Code.</div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 mb-4">
              <input ref={shareLinkInputRef} value={isActionLoading ? 'Generating...' : shareLink || 'Error generating link'} readOnly className={cn("w-full px-3 py-2 rounded font-mono text-xs border overflow-x-auto whitespace-nowrap", darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-800', 'disabled:opacity-70')} disabled={isActionLoading} aria-label="Shareable link" onClick={(e) => e.target.select()} />
              <button onClick={() => copyToClipboard(shareLink)} disabled={!shareLink || copied || isActionLoading} className={cn("w-full px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2", copied ? 'bg-green-600 text-white cursor-default' : !shareLink || isActionLoading ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {copied ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> : 'Copy Link'}
              </button>
            </div>
            <p className={cn("text-xs text-center", darkMode ? 'text-gray-400' : 'text-gray-500')}>Anyone with this link can view or download this file.</p>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] px-4 backdrop-blur-sm animate-fadeIn">
          <div ref={deleteModalRef} className={cn("p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn", darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" aria-describedby="delete-file-desc">
            <h2 id="delete-file-title" className={cn("font-semibold mb-2 text-lg", darkMode ? 'text-white' : 'text-gray-800')}>Confirm Delete</h2>
            <p id="delete-file-desc" className={cn("text-sm mb-3", darkMode ? 'text-gray-300' : 'text-gray-600')}>Are you sure you want to permanently delete this file?</p>
            <div className={cn("font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-3 p-2 rounded text-sm", darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200')}>{file.filename}</div>
            <p className={cn("text-sm mb-5", darkMode ? 'text-gray-400' : 'text-gray-600')}>This action cannot be undone.</p>
            <div className="flex w-full justify-between gap-3 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isActionLoading} className={cn("flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm", isActionLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') : (darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'))}>Cancel</button>
              <button onClick={deleteFile} disabled={isActionLoading} className={cn("flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm text-white flex items-center justify-center gap-2", isActionLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700')}>
                {isActionLoading && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Media Viewer Overlays ── */}
      {showViewer && (file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (() => {
        const type = file.metadata.type;
        const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
        return (
          <div className="fixed inset-0 z-[80] animate-fadeIn flex flex-col" style={{ background: 'rgba(8,14,28,0.96)', backdropFilter: 'blur(10px)' }} onClick={() => setShowViewer(false)} role="dialog" aria-modal="true" aria-label={`Viewing ${file.filename}`}>
            <div className="flex flex-col h-full w-full" onClick={e => e.stopPropagation()}>
              <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={cn('flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border', type === 'image' ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : type === 'video' ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-sky-600/20 border-sky-500/40 text-sky-300')}>
                    {type}
                  </span>
                  <h2 className="text-white/90 text-sm font-semibold truncate" title={file.filename}>{file.filename}</h2>
                </div>
                <button onClick={() => setShowViewer(false)} className="flex-shrink-0 ml-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all" aria-label="Close viewer" title="Close (Esc)">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex-1 flex items-center justify-center overflow-hidden p-6" onClick={() => setShowViewer(false)}>
                <div onClick={e => e.stopPropagation()} className="w-full flex items-center justify-center">
                  {type === 'image' && (
                    <div className="max-w-[92vw] max-h-[78vh] rounded-2xl border border-white/5 overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                      <img src={previewUrl} crossOrigin="use-credentials" alt={file.filename} className="max-w-full max-h-full object-contain select-none" draggable={false} />
                    </div>
                  )}
                  {type === 'video' && (
                    <video
                      src={mediaError ? previewUrl : (streamUrl || previewUrl)}
                      controls
                      autoPlay
                      preload="metadata"
                      playsInline
                      crossOrigin={(!streamUrl || mediaError) ? 'use-credentials' : undefined}
                      className="max-w-[92vw] max-h-[78vh] rounded-2xl bg-black shadow-2xl"
                    >
                      Your browser does not support the video tag.
                    </video>
                  )}
                  {type === 'audio' && (
                    <div className="w-full max-w-[420px] bg-slate-900/90 border border-white/10 rounded-2xl p-6 shadow-2xl">
                      <p className="text-white text-sm font-semibold truncate mb-4" title={file.filename}>{file.filename}</p>
                      <audio
                        src={mediaError ? previewUrl : (streamUrl || previewUrl)}
                        controls
                        autoPlay
                        preload="metadata"
                        crossOrigin={(!streamUrl || mediaError) ? 'use-credentials' : undefined}
                        className="w-full"
                      >
                        Your browser does not support the audio tag.
                      </audio>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-shrink-0 pb-4 text-center pointer-events-none">
                <p className="text-white/20 text-xs tracking-wide">Press ESC or click outside to close</p>
              </div>
            </div>
          </div>
        );
      })()}

      <style jsx="true">{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modalIn { animation: modalIn 0.25s ease-out; }
      `}</style>
    </>
  );
};

export default FileItem;
