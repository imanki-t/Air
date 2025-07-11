import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import JSZip from 'jszip';
import { io } from 'socket.io-client';
import { saveAs } from 'file-saver';
import FileListHeader from './filelist/FileListHeader';
import FileListControls from './filelist/FileListControls';
import BatchActionBar from './filelist/BatchActionBar';
import FilesDisplay from './filelist/FilesDisplay';
import Pagination from './filelist/Pagination';
import Modals from './filelist/Modals';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileList = ({ files = [], refresh, darkMode, isLoading }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    const [filter, setFilter] = useState('all');
    const [view, setView] = useState('grid');
    const [searchInput, setSearchInput] = useState('');
    const [showMetadata, setShowMetadata] = useState(false);
    const [sortOption, setSortOption] = useState('default');
    const [showSortOptions, setShowSortOptions] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isPaginationEnabled, setIsPaginationEnabled] = useState(true);
    const [isEditingPage, setIsEditingPage] = useState(false);
    const [editPageValue, setEditPageValue] = useState('');

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [batchOperationLoading, setBatchOperationLoading] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showBatchShareModal, setShowBatchShareModal] = useState(false);
    const [batchShareLink, setBatchShareLink] = useState('');
    const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
    const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    const sortOptionsRef = useRef(null);
    const deleteConfirmModalRef = useRef(null);
    const batchShareModalRef = useRef(null);
    const sortButtonRef = useRef(null);
    const batchDownloadModalRef = useRef(null);
    const pageInputRef = useRef(null);

    useEffect(() => {
        const socket = io(import.meta.env.VITE_BACKEND_URL);
        socket.on("connect", () => {});
        socket.on("refreshFileList", () => {
            refresh();
        });
        return () => {
            socket.disconnect();
        };
    }, [refresh]);

    useEffect(() => {
        const handleResize = () => {
            const mobileBreakpoint = 768;
            if (window.innerWidth < mobileBreakpoint) {
                setItemsPerPage(10);
            } else if (window.innerWidth >= mobileBreakpoint && window.innerWidth < 1024) {
                setItemsPerPage(15);
            } else {
                setItemsPerPage(20);
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (!selectionMode) {
            setSelectedFiles([]);
        }
    }, [selectionMode]);

    useEffect(() => {
        setSelectedFiles([]);
    }, [files]);

    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortOption, searchInput, itemsPerPage]);

    useEffect(() => {
        const handleClickOutside = e => {
            if (sortOptionsRef.current && !sortOptionsRef.current.contains(e.target) && !sortButtonRef.current?.contains(e.target)) {
                setShowSortOptions(false);
            }
            if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(e.target)) {
                setShowDeleteConfirmModal(false);
            }
            if (batchShareModalRef.current && !batchShareModalRef.current.contains(e.target) && !batchOperationLoading) {
                setShowBatchShareModal(false);
            }
            if (isEditingPage && pageInputRef.current && !pageInputRef.current.contains(e.target)) {
                setIsEditingPage(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [batchOperationLoading, isEditingPage]);

    useEffect(() => {
        if (isEditingPage && pageInputRef.current) {
            pageInputRef.current.focus();
            pageInputRef.current.select();
        }
    }, [isEditingPage]);

    const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);
    const visible = filtered.filter(f =>
        f.filename.toLowerCase().includes(searchInput.toLowerCase())
    );

    const totalPages = Math.ceil(visible.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    let filesToActuallySort = isPaginationEnabled ? visible.slice(startIndex, endIndex) : [...visible];

    const displayFiles = [...filesToActuallySort].sort((a, b) => {
        switch (sortOption) {
            case 'name-asc': return a.filename.localeCompare(b.filename);
            case 'name-desc': return b.filename.localeCompare(a.filename);
            case 'size-asc': return (a.length || 0) - (b.length || 0);
            case 'size-desc': return (b.length || 0) - (a.length || 0);
            case 'date': return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'default':
            default:
                return new Date(b.uploadDate) - new Date(a.uploadDate);
        }
    });

    const paginatedFiles = displayFiles;

    const handlePageNavigation = (page) => {
        if (page >= 1 && page <= totalPages) {
            setCurrentPage(page);
        }
    };

    const handlePageEdit = () => {
        if (isPaginationEnabled && totalPages > 0) {
            setIsEditingPage(true);
            setEditPageValue(currentPage.toString());
        }
    };

    const handlePageInput = (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(editPageValue, 10);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                setCurrentPage(page);
            }
            setIsEditingPage(false);
        } else if (e.key === 'Escape') {
            setIsEditingPage(false);
        }
    };
    
    const handlePageInputBlur = () => {
        const page = parseInt(editPageValue, 10);
        if (isNaN(page) || page < 1 || page > totalPages || editPageValue === '') {
            setEditPageValue(currentPage.toString());
        } else {
            setCurrentPage(page);
        }
        setIsEditingPage(false);
    };

    const toggleSelectionMode = () => {
        setSelectionMode(prev => !prev);
    };

    const handleSelectFile = id => {
        if (!selectionMode) return;
        setSelectedFiles(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        const filesToConsider = isPaginationEnabled ? paginatedFiles : displayFiles;
        const allRelevantSelected = filesToConsider.every(file => selectedFiles.includes(file._id));

        if (allRelevantSelected && selectedFiles.length >= filesToConsider.length && filesToConsider.length > 0) {
            setSelectedFiles(prevSelected => prevSelected.filter(id => !filesToConsider.some(file => file._id === id)));
        } else {
            setSelectedFiles(prevSelected => {
                const newSelections = filesToConsider.map(file => file._id);
                const combinedSelections = new Set([...prevSelected, ...newSelections]);
                return Array.from(combinedSelections);
            });
        }
    };

    const batchDelete = async () => {
        setBatchOperationLoading(true);
        try {
            await Promise.allSettled(selectedFiles.map(id =>
                axios.delete(`${backendUrl}/api/files/${id}`)
            ));
            refresh();
            setShowDeleteConfirmModal(false);
            setSelectionMode(false);
        } catch (err) {
            console.error('Error deleting files:', err);
        } finally {
            setBatchOperationLoading(false);
        }
    };

    const batchDownload = async () => {
        if (selectedFiles.length === 0) return;
        setBatchOperationLoading(true);
        setShowBatchDownloadProgress(true);
        setBatchDownloadProgress(0);
        const zip = new JSZip();
        let done = 0;
        const toDownload = selectedFiles
            .map(id => files.find(f => f._id === id))
            .filter(Boolean);

        try {
            for (const file of toDownload) {
                if (!file) continue;
                const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
                    responseType: 'blob'
                });
                zip.file(file.filename, res.data);
                done++;
                setBatchDownloadProgress(Math.round((done / toDownload.length) * 100));
            }
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            
            const getWeekNumber = (d) => {
                d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
                d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
                var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
                var weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
                return weekNo;
            }

            const getRandomChar = (type) => {
                let characters = '';
                if (type === 'alphabet') {
                    characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                } else if (type === 'number') {
                    characters = '0123456789';
                }
                return characters.charAt(Math.floor(Math.random() * characters.length));
            }

            const shuffleArray = (array) => {
                for (let i = array.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [array[i], array[j]] = [array[j], array[i]];
                }
                return array;
            }

            const generateMixedRandom = (numAlphabets, numNumbers) => {
                let chars = [];
                for (let i = 0; i < numAlphabets; i++) {
                    chars.push(getRandomChar('alphabet'));
                }
                for (let i = 0; i < numNumbers; i++) {
                    chars.push(getRandomChar('number'));
                }
                return shuffleArray(chars).join('');
            }

            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            const formattedDate = `${day}${month}${year}`;
            const weekNumber = getWeekNumber(now);
            const mixedRandomString = generateMixedRandom(3, 3);
            const filename = `AIR${formattedDate}${weekNumber}${mixedRandomString}.zip`;

            saveAs(blob, filename);
            setSelectionMode(false);
            setSelectedFiles([]);
        } catch (err) {
            console.error('Error preparing batch download:', err);
        } finally {
            setBatchOperationLoading(false);
            setTimeout(() => {
                setShowBatchDownloadProgress(false);
                setBatchDownloadProgress(0);
            }, 1500);
        }
    };

    const batchShare = async () => {
        if (selectedFiles.length === 0) return;
        setBatchOperationLoading(true);
        setShowBatchShareModal(true);
        setBatchShareLink('');
        setCopied(false);
        try {
            const zip = new JSZip();
            const filesToZip = selectedFiles
                .map(id => files.find(f => f._id === id))
                .filter(Boolean);

            if (filesToZip.length === 0) {
                throw new Error("No valid files selected for zipping.");
            }

            for (const file of filesToZip) {
                const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
                    responseType: 'blob'
                });
                zip.file(file.filename, res.data);
            }

            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            const formData = new FormData();
            const generateRandomString = (length) => {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let result = '';
                for (let i = 0; i < length; i++) {
                    result += characters.charAt(Math.floor(Math.random() * characters.length));
                }
                return result;
            };

            const timestamp = Date.now();
            const randomCombo = generateRandomString(6);
            const zipFilename = `AIRSTREAM${timestamp}${randomCombo}.zip`;
            formData.append('zipFile', zipBlob, zipFilename);

            const uploadResponse = await axios.post(`${backendUrl}/api/files/share-zip`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            const shareUrl = uploadResponse.data?.url;
            if (!shareUrl) {
                throw new Error("Failed to generate the link.");
            }
            setBatchShareLink(shareUrl);
        } catch (err) {
            console.error('Error creating or sharing ZIP file:', err.response ? err.response.data : err.stack);
            setShowBatchShareModal(false);
        } finally {
            setBatchOperationLoading(false);
        }
    };

    const copyToClipboard = async () => {
        if (!batchShareLink) return;
        try {
            await navigator.clipboard.writeText(batchShareLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy batch link:', err);
        }
    };

    return (
        <div className={cn(
            'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
            darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
        )}>
            <FileListHeader visibleFiles={visible} filter={filter} darkMode={darkMode} />
            <FileListControls
                searchInput={searchInput}
                setSearchInput={setSearchInput}
                isPaginationEnabled={isPaginationEnabled}
                setIsPaginationEnabled={setIsPaginationEnabled}
                selectionMode={selectionMode}
                toggleSelectionMode={toggleSelectionMode}
                showMetadata={showMetadata}
                setShowMetadata={setShowMetadata}
                sortOption={sortOption}
                filter={filter}
                showSortOptions={showSortOptions}
                setShowSortOptions={setShowSortOptions}
                setSortOption={setSortOption}
                setFilter={setFilter}
                view={view}
                setView={setView}
                darkMode={darkMode}
                sortButtonRef={sortButtonRef}
                sortOptionsRef={sortOptionsRef}
            />
            {selectionMode && (
                <BatchActionBar
                    toggleSelectAll={toggleSelectAll}
                    selectedFiles={selectedFiles}
                    paginatedFiles={paginatedFiles}
                    displayFiles={displayFiles}
                    isPaginationEnabled={isPaginationEnabled}
                    visible={visible}
                    batchDownload={batchDownload}
                    batchShare={batchShare}
                    setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                    batchOperationLoading={batchOperationLoading}
                    darkMode={darkMode}
                />
            )}
            <FilesDisplay
                isLoading={isLoading}
                paginatedFiles={paginatedFiles}
                view={view}
                darkMode={darkMode}
                showMetadata={showMetadata}
                handleSelectFile={handleSelectFile}
                selectedFiles={selectedFiles}
                selectionMode={selectionMode}
                refresh={refresh}
                searchInput={searchInput}
            />
            <Pagination
                isPaginationEnabled={isPaginationEnabled}
                visibleFiles={visible}
                currentPage={currentPage}
                totalPages={totalPages}
                handlePageNavigation={handlePageNavigation}
                isEditingPage={isEditingPage}
                editPageValue={editPageValue}
                setEditPageValue={setEditPageValue}
                handlePageInput={handlePageInput}
                handlePageInputBlur={handlePageInputBlur}
                handlePageEdit={handlePageEdit}
                pageInputRef={pageInputRef}
                darkMode={darkMode}
                isLoading={isLoading}
            />
            <Modals
                showDeleteConfirmModal={showDeleteConfirmModal}
                setShowDeleteConfirmModal={setShowDeleteConfirmModal}
                deleteConfirmModalRef={deleteConfirmModalRef}
                selectedFiles={selectedFiles}
                batchDelete={batchDelete}
                batchOperationLoading={batchOperationLoading}
                showBatchDownloadProgress={showBatchDownloadProgress}
                batchDownloadModalRef={batchDownloadModalRef}
                batchDownloadProgress={batchDownloadProgress}
                showBatchShareModal={showBatchShareModal}
                setShowBatchShareModal={setShowBatchShareModal}
                batchShareModalRef={batchShareModalRef}
                batchShareLink={batchShareLink}
                copyToClipboard={copyToClipboard}
                copied={copied}
                darkMode={darkMode}
                refresh={refresh}
                setSelectedFiles={setSelectedFiles}
            />
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
                @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }
                .dark .bg-gray-750 { background-color: #303742; }
            `}</style>
        </div>
    );
};

export default FileList;
