import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import FilePreview from './fileitem/FilePreview';
import FileDetails from './fileitem/FileDetails';
import FileActions from './fileitem/FileActions';
import SelectionIndicator from './fileitem/SelectionIndicator';
import ItemModals from './fileitem/ItemModals';
import DownloadProgressOverlay from './fileitem/DownloadProgressOverlay';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [showShare, setShowShare] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [copied, setCopied] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    const menuRef = useRef(null);
    const shareModalRef = useRef(null);
    const deleteModalRef = useRef(null);

    const handleOutsideClick = useCallback((event) => {
        if (menuRef.current && !menuRef.current.contains(event.target)) {
            const menuButton = menuRef.current.previousElementSibling;
            if (!menuButton || !menuButton.contains(event.target)) {
                setShowMenu(false);
            }
        }
        if (shareModalRef.current && !shareModalRef.current.contains(event.target)) setShowShare(false);
        if (deleteModalRef.current && !deleteModalRef.current.contains(event.target)) setShowDeleteConfirm(false);
    }, []);

    useEffect(() => {
        if (showMenu || showShare || showDeleteConfirm) {
            document.addEventListener('mousedown', handleOutsideClick);
        }
        return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [showMenu, showShare, showDeleteConfirm, handleOutsideClick]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === 'Escape') {
            if (showShare) setShowShare(false);
            if (showDeleteConfirm) setShowDeleteConfirm(false);
            if (showMenu) setShowMenu(false);
        }
    }, [showShare, showDeleteConfirm, showMenu]);

    useEffect(() => {
        if (showShare || showDeleteConfirm || showMenu) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showShare, showDeleteConfirm, showMenu, handleKeyDown]);

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

    const commonProps = { file, darkMode };
    const detailsProps = { ...commonProps, showDetails };
    const actionProps = { ...commonProps, menuRef, showMenu, setShowMenu, download, share, setShowDeleteConfirm };

    return (
        <>
            <div
                className={cn(
                    `relative text-sm rounded-xl shadow-md border transition-all duration-200 ease-in-out`,
                    isSelected ? `ring-2 ring-offset-1 ${darkMode ? 'ring-blue-500 bg-gray-750 border-blue-700' : 'ring-blue-600 bg-blue-50 border-blue-400'}`
                        : `${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`,
                    darkMode ? 'text-white' : 'text-gray-900',
                    selectionMode ? 'cursor-pointer' : '',
                    'transform hover:-translate-y-0.5 hover:shadow-lg',
                    viewType === 'list' ? 'flex items-center p-3 gap-3 min-h-[90px] sm:min-h-[110px]' : 'flex flex-col justify-between h-full min-h-[200px]',
                    showMenu ? 'z-30' : 'z-10'
                )}
                onClick={handleItemClick}
                role="listitem" aria-selected={isSelected}
            >
                {viewType === 'list' ? (
                    <>
                        <FilePreview file={file} darkMode={darkMode} viewType={viewType} backendUrl={backendUrl} />
                        <div className="flex flex-col flex-grow min-w-0">
                            <FileDetails {...detailsProps} />
                        </div>
                        <div className="flex-shrink-0 ml-auto self-start pt-1">
                            {selectionMode ? <SelectionIndicator isSelected={isSelected} darkMode={darkMode} /> : <FileActions {...actionProps} />}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col h-full">
                        <FilePreview file={file} darkMode={darkMode} viewType={viewType} backendUrl={backendUrl} />
                        <div className="p-3 pt-2 flex flex-col flex-grow">
                            <FileDetails {...detailsProps} />
                        </div>
                        <div className="absolute top-1.5 right-1.5 z-10">
                            {selectionMode ? <SelectionIndicator isSelected={isSelected} darkMode={darkMode} /> : <FileActions {...actionProps} />}
                        </div>
                    </div>
                )}
                 {isActionLoading && downloadProgress > 0 && (
                    <DownloadProgressOverlay progress={downloadProgress} />
                )}
            </div>
            <ItemModals
                showShare={showShare}
                setShowShare={setShowShare}
                shareModalRef={shareModalRef}
                isActionLoading={isActionLoading}
                shareLink={shareLink}
                copied={copied}
                setCopied={setCopied}
                showDeleteConfirm={showDeleteConfirm}
                setShowDeleteConfirm={setShowDeleteConfirm}
                deleteModalRef={deleteModalRef}
                deleteFile={deleteFile}
                file={file}
                darkMode={darkMode}
            />
        </>
    );
};

export default FileItem;
