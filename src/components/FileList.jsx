import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// --- Custom Hook for Scrollbar Logic ---
const useCustomScrollbar = (containerRef, trackRef, isEnabled) => {
    const [thumbHeight, setThumbHeight] = useState(20); // Min height
    const [thumbTop, setThumbTop] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isVisible, setIsVisible] = useState(false); // Scrollbar visibility
    const dragStartRef = useRef({ y: 0, top: 0 });

    // Calculate scrollbar metrics (thumb size and position)
    const calculateMetrics = useCallback(() => {
        const container = containerRef.current;
        const track = trackRef.current;

        if (container && track && isEnabled) {
            const { scrollHeight, clientHeight } = container;
            const trackHeight = track.clientHeight;

            // Determine visibility
            const contentOverflows = scrollHeight > clientHeight;
            setIsVisible(contentOverflows);

            if (contentOverflows) {
                const minThumbHeight = 30; // Minimum thumb height for usability
                const calculatedThumbHeight = Math.max((clientHeight / scrollHeight) * trackHeight, minThumbHeight);
                setThumbHeight(calculatedThumbHeight);

                const maxScrollTop = scrollHeight - clientHeight;
                const maxThumbTop = trackHeight - calculatedThumbHeight;
                const currentThumbTop = (container.scrollTop / maxScrollTop) * maxThumbTop;
                setThumbTop(Math.min(Math.max(0, currentThumbTop), maxThumbTop)); // Clamp position
            } else {
                setThumbTop(0);
                setThumbHeight(0); // Hide thumb if no overflow
            }
        } else {
            setIsVisible(false);
            setThumbTop(0);
            setThumbHeight(0);
        }
    }, [containerRef, trackRef, isEnabled]);

    // Update thumb position on container scroll
    const handleScroll = useCallback(() => {
        if (!isDragging) { // Only update if not actively dragging
            calculateMetrics();
        }
    }, [isDragging, calculateMetrics]);

    // --- Drag Handlers (Mouse & Touch) ---
    const handleDragStart = useCallback((clientY) => {
        if (!isEnabled || !isVisible) return;
        setIsDragging(true);
        dragStartRef.current = { y: clientY, top: thumbTop };
        document.body.style.userSelect = 'none'; // Prevent text selection during drag
        document.body.style.cursor = 'grabbing'; // Change cursor
    }, [isEnabled, isVisible, thumbTop]);

    const handleDragMove = useCallback((clientY) => {
        if (!isDragging || !isEnabled || !isVisible) return;

        const container = containerRef.current;
        const track = trackRef.current;
        if (!container || !track) return;

        const deltaY = clientY - dragStartRef.current.y;
        const trackHeight = track.clientHeight;
        const { scrollHeight, clientHeight } = container;
        const maxScrollTop = scrollHeight - clientHeight;
        const maxThumbTop = trackHeight - thumbHeight;

        if (maxScrollTop <= 0) return; // No scrolling needed

        const newThumbTop = dragStartRef.current.top + deltaY;
        const clampedThumbTop = Math.max(0, Math.min(maxThumbTop, newThumbTop));

        setThumbTop(clampedThumbTop); // Update thumb visually immediately

        // Calculate corresponding scroll position for the content
        const scrollRatio = clampedThumbTop / maxThumbTop;
        container.scrollTop = scrollRatio * maxScrollTop;

    }, [isDragging, isEnabled, isVisible, containerRef, trackRef, thumbHeight]);

    const handleDragEnd = useCallback(() => {
        if (!isDragging) return;
        setIsDragging(false);
        document.body.style.userSelect = ''; // Restore text selection
        document.body.style.cursor = ''; // Restore cursor
    }, [isDragging]);

    // Mouse Event Handlers
    const handleMouseDown = useCallback((e) => handleDragStart(e.clientY), [handleDragStart]);
    const handleMouseMove = useCallback((e) => handleDragMove(e.clientY), [handleDragMove]);
    const handleMouseUp = useCallback(() => handleDragEnd(), [handleDragEnd]);

    // Touch Event Handlers
    const handleTouchStart = useCallback((e) => {
        if (e.touches.length === 1) {
            // e.preventDefault(); // Prevent page scroll ONLY if dragging the thumb
            handleDragStart(e.touches[0].clientY);
        }
    }, [handleDragStart]);

    const handleTouchMove = useCallback((e) => {
        if (e.touches.length === 1) {
             // Prevent default scrolling behavior *while* dragging the thumb
             if (isDragging) {
                e.preventDefault();
             }
            handleDragMove(e.touches[0].clientY);
        }
    }, [handleDragMove, isDragging]); // Add isDragging dependency

    const handleTouchEnd = useCallback(() => handleDragEnd(), [handleDragEnd]);

    // Add/remove global listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.addEventListener('touchmove', handleTouchMove, { passive: false }); // Need passive:false to preventDefault
            document.addEventListener('touchend', handleTouchEnd);
            document.addEventListener('touchcancel', handleTouchEnd); // Handle cancellation
        } else {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
        }

        // Cleanup
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.removeEventListener('touchmove', handleTouchMove);
            document.removeEventListener('touchend', handleTouchEnd);
            document.removeEventListener('touchcancel', handleTouchEnd);
            document.body.style.userSelect = ''; // Ensure cleanup on unmount
            document.body.style.cursor = '';
        };
    }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

    // Add scroll listener to the container
    useEffect(() => {
        const container = containerRef.current;
        if (container && isEnabled) {
            container.addEventListener('scroll', handleScroll);
            // Initial calculation
            calculateMetrics();
        }
        return () => {
            container?.removeEventListener('scroll', handleScroll);
        };
    }, [containerRef, isEnabled, handleScroll, calculateMetrics]); // Add calculateMetrics

    // Recalculate on container resize
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !isEnabled) return;

        const resizeObserver = new ResizeObserver(calculateMetrics);
        resizeObserver.observe(container);

        return () => resizeObserver.disconnect();
    }, [containerRef, isEnabled, calculateMetrics]);

    // Return styles and event handlers for the thumb
    return {
        isVisible: isEnabled && isVisible,
        thumbStyle: {
            height: `${thumbHeight}px`,
            top: `${thumbTop}px`,
            cursor: isDragging ? 'grabbing' : 'grab',
            opacity: isDragging ? 1 : 0.8, // More opaque when dragging
        },
        thumbProps: {
            onMouseDown: handleMouseDown,
            onTouchStart: handleTouchStart,
            // TouchMove and TouchEnd are handled globally
        },
        trackStyle: {
             opacity: isDragging ? 0.7 : 0.5, // Slightly more visible when dragging
        }
    };
};


// Skeleton Loading Placeholder (Unchanged)
const FileItemSkeleton = ({ darkMode, viewType }) => (
    <div className={cn(
        'w-full flex rounded-xl shadow-md border animate-pulse',
        viewType === 'grid' ? 'h-[180px] flex-col p-3' : 'h-[80px] items-center p-2',
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    )}>
        {viewType === 'grid' ? (
            <>
                <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                <div className={cn('h-4 w-3/4 rounded-md mb-1', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                <div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
            </>
        ) : (
            <div className="flex items-center w-full h-full">
                <div className={cn('w-12 h-12 rounded-md mr-3', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                <div className="flex-grow space-y-2">
                    <div className={cn('h-4 w-full rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                    <div className={cn('h-3 w-2/3 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
                </div>
            </div>
        )}
    </div>
);


const FileList = ({ files = [], refresh, darkMode, isLoading }) => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    // --- UI State ---
    const [filter, setFilter] = useState('all');
    const [view, setView] = useState('grid');
    const [searchInput, setSearchInput] = useState('');
    const [showMetadata, setShowMetadata] = useState(false);
    const [sortOption, setSortOption] = useState('default');
    const [showSortOptions, setShowSortOptions] = useState(false);
    const [isCustomScrollbarEnabled, setIsCustomScrollbarEnabled] = useState(false); // Keep this toggle

    // --- Pagination State ---
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(20);
    const [isPaginationEnabled, setIsPaginationEnabled] = useState(true);
    const [isEditingPage, setIsEditingPage] = useState(false);
    const [editPageValue, setEditPageValue] = useState('');

    // --- Batch Operations State ---
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [batchOperationLoading, setBatchOperationLoading] = useState(false);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [showBatchShareModal, setShowBatchShareModal] = useState(false);
    const [batchShareLink, setBatchShareLink] = useState('');
    const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
    const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    // --- Refs ---
    const sortOptionsRef = useRef(null);
    const deleteConfirmModalRef = useRef(null);
    const batchShareModalRef = useRef(null);
    const sortButtonRef = useRef(null);
    const batchDownloadModalRef = useRef(null);
    const pageInputRef = useRef(null);
    const fileListContainerRef = useRef(null); // Ref for the scrollable content area
    const customScrollbarTrackRef = useRef(null); // Ref for the custom scrollbar track element

    // --- Custom Scrollbar Hook Integration ---
    const {
        isVisible: isScrollbarVisible,
        thumbStyle,
        thumbProps,
        trackStyle
    } = useCustomScrollbar(fileListContainerRef, customScrollbarTrackRef, isCustomScrollbarEnabled);

    // --- Screen Size Detection ---
    const [isMobileView, setIsMobileView] = useState(false);
    useEffect(() => {
        const handleResize = () => {
            const mobileBreakpoint = 768;
            const tabletBreakpoint = 1024;
            const isMobile = window.innerWidth < mobileBreakpoint;
            setIsMobileView(isMobile);
            if (isMobile) setItemsPerPage(10);
            else if (window.innerWidth < tabletBreakpoint) setItemsPerPage(15);
            else setItemsPerPage(20);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // --- Effects for State Resets and Outside Clicks (largely unchanged) ---
    useEffect(() => { if (!selectionMode) setSelectedFiles([]); }, [selectionMode]);
    useEffect(() => { setSelectedFiles([]); }, [files]);
    useEffect(() => { setCurrentPage(1); }, [filter, sortOption, searchInput, itemsPerPage]);
    useEffect(() => {
        const handleClickOutside = e => {
            if (sortOptionsRef.current && !sortOptionsRef.current.contains(e.target) && !sortButtonRef.current?.contains(e.target)) setShowSortOptions(false);
            if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(e.target)) setShowDeleteConfirmModal(false);
            if (batchShareModalRef.current && !batchShareModalRef.current.contains(e.target) && !batchOperationLoading) setShowBatchShareModal(false);
            if (isEditingPage && pageInputRef.current && !pageInputRef.current.contains(e.target)) setIsEditingPage(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [batchOperationLoading, isEditingPage]);
    useEffect(() => { if (isEditingPage && pageInputRef.current) { pageInputRef.current.focus(); pageInputRef.current.select(); } }, [isEditingPage]);

    // --- Filtering and Sorting (Unchanged) ---
    const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);
    const visible = filtered.filter(f => f.filename.toLowerCase().includes(searchInput.toLowerCase()));
    const sortedFiles = [...visible].sort((a, b) => {
        switch (sortOption) {
            case 'name': return a.filename.localeCompare(b.filename);
            case 'size': return (a.length || 0) - (b.length || 0);
            case 'date': return new Date(a.uploadDate) - new Date(b.uploadDate);
            default: return new Date(b.uploadDate) - new Date(a.uploadDate); // Default: Latest First
        }
    });

    // --- Pagination Logic (Adjusted for custom scrollbar interaction) ---
    const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // Display *all* files when custom scrollbar is on, otherwise paginate
    const displayFiles = isCustomScrollbarEnabled
        ? sortedFiles
        : sortedFiles.slice(startIndex, endIndex);

    // Pagination handlers (Unchanged)
    const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage(prev => prev + 1); };
    const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage(prev => prev - 1); };
    const handlePageClick = () => { if (isPaginationEnabled && totalPages > 0) { setIsEditingPage(true); setEditPageValue(currentPage.toString()); } };
    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(editPageValue, 10);
            if (!isNaN(page) && page >= 1 && page <= totalPages) setCurrentPage(page);
            setIsEditingPage(false);
        } else if (e.key === 'Escape') setIsEditingPage(false);
    };
    const handlePageInputBlur = () => {
        const page = parseInt(editPageValue, 10);
        if (isNaN(page) || page < 1 || page > totalPages || editPageValue === '') setEditPageValue(currentPage.toString());
        else setCurrentPage(page);
        setIsEditingPage(false);
    };

    // --- Selection Handlers (Adjusted for custom scrollbar) ---
    const toggleSelectionMode = () => setSelectionMode(prev => !prev);
    const handleSelectFile = id => { if (selectionMode) setSelectedFiles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); };
    const toggleSelectAll = () => {
        // When custom scrollbar is enabled, 'Select All' applies to the *entire* sorted list
        const filesToConsider = isCustomScrollbarEnabled ? sortedFiles : displayFiles;
        const allRelevantSelected = filesToConsider.length > 0 && filesToConsider.every(file => selectedFiles.includes(file._id));

        if (allRelevantSelected) {
            // Deselect only the relevant files
            setSelectedFiles(prevSelected => prevSelected.filter(id => !filesToConsider.some(file => file._id === id)));
        } else {
            // Select all relevant files, merging with any existing selections
            const newSelections = filesToConsider.map(file => file._id);
            setSelectedFiles(prevSelected => Array.from(new Set([...prevSelected, ...newSelections])));
        }
    };

    // --- Batch Operations (Unchanged Logic, just calling them) ---
    const batchDelete = async () => {
        setBatchOperationLoading(true);
        try {
            await Promise.allSettled(selectedFiles.map(id => axios.delete(`${backendUrl}/api/files/${id}`)));
            refresh();
            setShowDeleteConfirmModal(false);
            setSelectionMode(false);
            setSelectedFiles([]);
        } catch (err) { console.error('Error deleting files:', err); alert('Error deleting files.'); }
        finally { setBatchOperationLoading(false); }
    };
    const batchDownload = async () => {
        if (selectedFiles.length === 0) return;
        setBatchOperationLoading(true);
        setShowBatchDownloadProgress(true);
        setBatchDownloadProgress(0);
        const zip = new JSZip();
        let done = 0;
        const toDownload = selectedFiles.map(id => files.find(f => f._id === id)).filter(Boolean);
        try {
            for (const file of toDownload) {
                if (!file) continue;
                const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
                zip.file(file.filename, res.data);
                done++;
                setBatchDownloadProgress(Math.round((done / toDownload.length) * 100));
            }
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            saveAs(blob, `batch_download_${Date.now()}.zip`);
            setSelectionMode(false);
            setSelectedFiles([]);
        } catch (err) { console.error('Error preparing batch download:', err); alert('Error preparing batch download.'); }
        finally {
            setBatchOperationLoading(false);
            setTimeout(() => { setShowBatchDownloadProgress(false); setBatchDownloadProgress(0); }, 1500);
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
            const filesToZip = selectedFiles.map(id => files.find(f => f._id === id)).filter(Boolean);
            if (filesToZip.length === 0) throw new Error("No valid files selected.");

            for (const file of filesToZip) {
                const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
                zip.file(file.filename, res.data);
            }
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            const formData = new FormData();
            formData.append('zipFile', zipBlob, `shared_files_${Date.now()}.zip`);
            const uploadResponse = await axios.post(`${backendUrl}/api/files/share-zip`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            const shareUrl = uploadResponse.data?.url;
            if (!shareUrl) throw new Error("Failed to generate the link.");
            setBatchShareLink(shareUrl);
        } catch (err) {
            console.error('Error creating or sharing ZIP file:', err.response ? err.response.data : err.message);
            alert(`Error sharing files: ${err.response?.data?.error || err.message || 'Please try again.'}`);
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
        } catch (err) { console.error('Failed to copy batch link:', err); alert('Failed to copy link.'); }
    };

    // --- Reset scroll position when pagination page changes (only if not using custom scrollbar) ---
    useEffect(() => {
        if (fileListContainerRef.current && isPaginationEnabled && !isCustomScrollbarEnabled) {
            fileListContainerRef.current.scrollTop = 0;
        }
    }, [currentPage, isPaginationEnabled, isCustomScrollbarEnabled]);

    // --- Render ---
    return (
        <div className={cn(
            'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
            darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
        )}>
            {/* Header (Unchanged) */}
            <div className="text-center mb-6">
                <h2 className={cn('text-2xl font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                    Your Files
                </h2>
                <span className={cn('text-sm px-3 py-1 rounded-full inline-block transition-all duration-200',
                    darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                )}>
                    {visible.length} item{visible.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
                </span>
            </div>

            {/* Controls Row (Unchanged structure, only added scrollbar toggle) */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 items-center justify-between flex-wrap">
                {/* Search Input */}
                <div className="relative flex-grow w-full md:w-auto md:flex-grow-[2]">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', darkMode ? 'text-gray-400' : 'text-gray-500')} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className={cn('w-full pl-10 pr-4 py-2 rounded-lg transition-colors duration-200 border text-sm', darkMode ? 'bg-gray-800 text-white border-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500' : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-gray-400')}
                        aria-label="Search files"
                    />
                </div>

                {/* Action Buttons Group */}
                <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end flex-grow md:flex-grow-0">
                    {/* Pagination Toggle */}
                    <button onClick={() => setIsPaginationEnabled(prev => !prev)} className={cn('p-2 rounded-md transition-colors duration-200', isPaginationEnabled ? 'bg-blue-600 text-white hover:bg-blue-700' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')} aria-label={isPaginationEnabled ? "Disable pagination" : "Enable pagination"} aria-pressed={isPaginationEnabled} title={isPaginationEnabled ? "Disable Pagination" : "Enable Pagination"}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{isPaginationEnabled ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}</svg>
                    </button>
                    {/* Toggle Selection */}
                    <button onClick={toggleSelectionMode} className={cn('p-2 rounded-md transition-colors duration-200', selectionMode ? 'bg-blue-600 text-white hover:bg-blue-700' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')} aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"} aria-pressed={selectionMode} title={selectionMode ? "Exit selection mode" : "Select multiple files"}>
                        <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', selectionMode ? '' : (darkMode ? 'text-gray-300' : 'text-gray-600'))} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>{selectionMode ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" />}</svg>
                    </button>
                    {/* Toggle Custom Scrollbar */}
                    <button onClick={() => setIsCustomScrollbarEnabled(prev => !prev)} className={cn('p-2 rounded-md transition-colors duration-200', isCustomScrollbarEnabled ? 'bg-blue-600 text-white hover:bg-blue-700' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')} aria-label={isCustomScrollbarEnabled ? "Disable custom scrollbar" : "Enable custom scrollbar"} aria-pressed={isCustomScrollbarEnabled} title={isCustomScrollbarEnabled ? "Disable Custom Scrollbar" : "Enable Custom Scrollbar"}>
                        {/* Icon representing scroll */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h8m-4 10V7m-6 4h12" /></svg>
                    </button>
                    {/* Toggle Metadata */}
                    <button onClick={() => setShowMetadata(!showMetadata)} className={cn('p-2 rounded-md transition-colors duration-200', showMetadata ? 'bg-blue-600 text-white hover:bg-blue-700' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')} aria-label={showMetadata ? "Hide file details" : "Show file details"} aria-pressed={showMetadata} title={showMetadata ? "Hide details" : "Show details"}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </button>
                    {/* Sort & Filter Dropdown */}
                    <div className="relative">
                        <button ref={sortButtonRef} onClick={() => setShowSortOptions(prev => !prev)} className={cn('p-2 rounded-md transition-colors duration-200', sortOption !== 'default' || filter !== 'all' ? 'bg-blue-600 text-white hover:bg-blue-700' : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300')} aria-label="Sort and filter options" aria-haspopup="true" aria-expanded={showSortOptions} title="Sort & Filter">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h9m-9 4h9m5-4v.01M12 20h5.5a2.5 2.5 0 002.5-2.5V6.5A2.5 2.5 0 0017.5 4h-11" /></svg>
                        </button>
                        {showSortOptions && (
                            <div ref={sortOptionsRef} className={cn('absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-20 border overflow-hidden max-h-[40vh] sm:max-h-[75vh] overflow-y-auto divide-y', darkMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-200')} role="menu">
                                {/* Sort Section */}
                                <div>
                                    <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                                    {[{ label: 'Default', id: 'default' }, { label: 'Name', id: 'name' }, { label: 'Size', id: 'size' }, { label: 'Date', id: 'date' }].map(opt => (<button key={opt.id} onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }} className={cn('flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left', sortOption === opt.id ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'))} role="menuitemradio" aria-checked={sortOption === opt.id}>{opt.label}</button>))}
                                </div>
                                {/* Filter Section */}
                                <div>
                                    <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                                    {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (<button key={type} onClick={() => { setFilter(type); setShowSortOptions(false); }} className={cn('flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left', filter === type ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'))} role="menuitemradio" aria-checked={filter === type}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>))}
                                </div>
                            </div>
                        )}
                    </div>
                    {/* View Toggle */}
                    <div className={cn('flex items-center rounded-md overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                        <button onClick={() => setView('list')} className={cn('p-2 transition-colors duration-200', view === 'list' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300')} aria-label="List view" aria-pressed={view === 'list'} title="List View"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg></button>
                        <button onClick={() => setView('grid')} className={cn('p-2 transition-colors duration-200', view === 'grid' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300')} aria-label="Grid view" aria-pressed={view === 'grid'} title="Grid View"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg></button>
                    </div>
                </div>
            </div>

            {/* Batch Selection Bar (Logic Adjusted for custom scrollbar) */}
            {selectionMode && (
                <div className={cn('mb-6 p-3 rounded-lg border transition-all duration-300 ease-in-out', darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200')}>
                    <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 flex-wrap">
                        {/* Select/Deselect All Button */}
                        <div className="w-full md:w-auto">
                            <button onClick={toggleSelectAll} className={cn('w-full md:w-auto py-2 px-4 rounded-md text-sm font-medium text-center transition-colors duration-200 border', (isCustomScrollbarEnabled ? sortedFiles.length > 0 && sortedFiles.every(file => selectedFiles.includes(file._id)) : displayFiles.length > 0 && displayFiles.every(file => selectedFiles.includes(file._id))) ? `border-red-400 ${darkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-white hover:bg-red-50'}` : `border-blue-400 ${darkMode ? 'text-blue-300 bg-gray-700 hover:bg-gray-600' : 'text-blue-600 bg-white hover:bg-blue-50'}`)}>
                                {(isCustomScrollbarEnabled ? sortedFiles.length > 0 && sortedFiles.every(file => selectedFiles.includes(file._id)) : displayFiles.length > 0 && displayFiles.every(file => selectedFiles.includes(file._id))) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>
                        {/* Selected Count Indicator */}
                        <div className={cn('text-sm flex-grow text-center md:text-left order-last md:order-none w-full md:w-auto pt-2 md:pt-0', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                            {selectedFiles.length} of {isCustomScrollbarEnabled ? sortedFiles.length : displayFiles.length} selected {isPaginationEnabled && !isCustomScrollbarEnabled && `(Page ${currentPage})`}
                        </div>
                        {/* Batch Action Buttons */}
                        <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-2">
                            <button onClick={batchDownload} disabled={selectedFiles.length === 0 || batchOperationLoading} className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1', selectedFiles.length === 0 || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))} title={selectedFiles.length > 0 ? `Download ${selectedFiles.length} items` : "Select files to download"}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> <span className="hidden sm:inline">Download</span> ({selectedFiles.length}) </button>
                            <button onClick={batchShare} disabled={selectedFiles.length === 0 || batchOperationLoading} className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1', selectedFiles.length === 0 || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'))} title={selectedFiles.length > 0 ? `Share ${selectedFiles.length} items` : "Select files to share"}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> <span className="hidden sm:inline">Share</span> ({selectedFiles.length}) </button>
                            <button onClick={() => setShowDeleteConfirmModal(true)} disabled={selectedFiles.length === 0 || batchOperationLoading} className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-1', selectedFiles.length === 0 || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'))} title={selectedFiles.length > 0 ? `Delete ${selectedFiles.length} items` : "Select files to delete"}> <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> <span className="hidden sm:inline">Delete</span> ({selectedFiles.length}) </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Files Display Area with Custom Scrollbar Container */}
            <div className="relative min-h-[250px]"> {/* Container for list and scrollbar */}
                {isLoading ? (
                    // Loading Skeletons
                    <div className={cn('grid gap-4', view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1')}>
                        {Array(view === 'grid' ? 10 : 5).fill().map((_, i) => <FileItemSkeleton key={`skel-${i}`} darkMode={darkMode} viewType={view} />)}
                    </div>
                ) : displayFiles.length > 0 ? (
                    // File List Content Container (Scrollable)
                    <div
                        ref={fileListContainerRef}
                        className={cn(
                            'grid gap-4 custom-scrollbar-container', // Add a class for potential styling hook
                            view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1',
                            isCustomScrollbarEnabled ? 'overflow-y-scroll pr-3' : 'overflow-y-auto', // Enable scroll, add padding for custom scrollbar
                            // *** FIX: Add padding-bottom when pagination is on and custom scrollbar is off ***
                            isPaginationEnabled && !isCustomScrollbarEnabled ? 'pb-4' : ''
                        )}
                         style={{
                            // Set max height for scrolling to work, adjust as needed
                            maxHeight: isCustomScrollbarEnabled ? '55vh' : (isPaginationEnabled ? 'auto' : '70vh'), // Allow natural height with pagination, limit otherwise
                            // Hide native scrollbar if custom is enabled
                            scrollbarWidth: isCustomScrollbarEnabled ? 'none' : 'auto', /* Firefox */
                            msOverflowStyle: isCustomScrollbarEnabled ? 'none' : 'auto', /* IE 10+ */
                        }}
                    >
                        {/* Render File Items */}
                        {displayFiles.map(file => (
                            <FileItem key={file._id} file={file} darkMode={darkMode} showDetails={showMetadata} viewType={view} onSelect={handleSelectFile} isSelected={selectedFiles.includes(file._id)} selectionMode={selectionMode} refresh={refresh} />
                        ))}
                    </div>
                ) : (
                    // No Files Found Message (Unchanged)
                    <div className={cn('text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]', darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50')}>
                        <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                        <h3 className="text-lg font-medium mb-1 text-gray-500">No files found</h3>
                        <p className="text-sm text-gray-400">{searchInput ? 'Try adjusting your search or filter.' : 'Upload some files!'}</p>
                    </div>
                )}

                {/* Custom Scrollbar Track & Thumb */}
                {isScrollbarVisible && ( // Use isVisible from hook
                    <div
                        ref={customScrollbarTrackRef}
                        className={cn(
                            'absolute top-0 right-0 h-full w-[10px] rounded-full transition-opacity duration-200 ease-out',
                            // Modern look: semi-transparent track
                            darkMode ? 'bg-gray-700' : 'bg-gray-300'
                        )}
                        style={trackStyle} // Apply dynamic style (opacity)
                    >
                        {/* Custom Scrollbar Thumb */}
                        <div
                            className={cn(
                                'absolute left-1/2 transform -translate-x-1/2 w-[6px] rounded-full transition-all duration-150 ease-out',
                                // Modern look: Accent color, slightly thinner than track
                                darkMode ? 'bg-blue-500' : 'bg-blue-600'
                            )}
                            style={thumbStyle} // Apply dynamic style (height, top, cursor, opacity)
                            {...thumbProps} // Apply event handlers
                        />
                    </div>
                )}
            </div>

            {/* Pagination Controls (Hidden if custom scrollbar is enabled) */}
            {isPaginationEnabled && sortedFiles.length > 0 && !isCustomScrollbarEnabled && (
                <div className={cn('flex flex-col items-center gap-2 sm:gap-4 mt-6', isMobileView ? 'sm:flex-col' : 'sm:flex-row justify-center', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    {/* Page Indicator/Input */}
                    <span className={cn("text-sm text-center", isMobileView ? 'order-1 mb-2' : 'order-2')}>
                        <span className="hidden md:inline">Page </span>
                        {isEditingPage ? (
                            <input ref={pageInputRef} type="number" min="1" max={totalPages} value={editPageValue} onChange={(e) => setEditPageValue(e.target.value)} onKeyDown={handlePageInputKeyDown} onBlur={handlePageInputBlur} className={cn('w-16 text-center p-1 rounded-md text-sm border', darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800')} aria-label="Current page number input" />
                        ) : (
                            <span className={cn("font-medium px-1 cursor-pointer hover:underline", darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-800')} onClick={handlePageClick}>{currentPage}</span>
                        )}
                        &nbsp;of {totalPages}
                    </span>
                    {/* Previous Button */}
                    {currentPage > 1 && (<button onClick={handlePreviousPage} disabled={currentPage === 1} className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200', isMobileView ? 'flex-1 w-full order-2' : 'sm:flex-initial w-auto order-1', currentPage === 1 ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))}>{isMobileView ? 'Prev' : 'Previous'}</button>)}
                    {/* Next Button */}
                    {currentPage < totalPages && (<button onClick={handleNextPage} disabled={currentPage === totalPages} className={cn('px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200', isMobileView ? 'flex-1 w-full order-3' : 'sm:flex-initial w-auto order-3', currentPage === totalPages ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))}>{isMobileView ? 'Next' : 'Next'}</button>)}
                </div>
            )}
             {/* Messages for empty states (Unchanged) */}
             {isPaginationEnabled && sortedFiles.length === 0 && !isCustomScrollbarEnabled && (<div className={cn("text-center mt-4 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>No files match for pagination.</div>)}
             {isCustomScrollbarEnabled && sortedFiles.length === 0 && (<div className={cn("text-center mt-4 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>No files match for scrolling.</div>)}

            {/* --- Modals (Unchanged structure, only minor style tweaks if needed) --- */}
            {/* Delete Confirmation Modal */}
            {showDeleteConfirmModal && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm"> <div ref={deleteConfirmModalRef} className={cn('p-6 rounded-lg shadow-xl max-w-md w-full border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true" aria-labelledby="delete-modal-title" aria-describedby="delete-modal-description"> <h2 id="delete-modal-title" className="font-semibold text-lg mb-4">Confirm Deletion</h2> <p id="delete-modal-description" className="text-sm mb-6">Are you sure you want to permanently delete {selectedFiles.length} selected {selectedFiles.length === 1 ? 'item' : 'items'}? This action cannot be undone.</p> <div className="flex gap-3"> <button onClick={() => setShowDeleteConfirmModal(false)} disabled={batchOperationLoading} className={cn('flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm', darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500 disabled:bg-gray-700 disabled:text-gray-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400')}>Cancel</button> <button onClick={batchDelete} disabled={selectedFiles.length === 0 || batchOperationLoading} className={cn('flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm text-white flex items-center justify-center gap-2', selectedFiles.length === 0 || batchOperationLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700')}> {batchOperationLoading && ( <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> )} Delete </button> </div> </div> </div> )}
            {/* Download Progress Modal */}
            {showBatchDownloadProgress && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm"> <div ref={batchDownloadModalRef} className={cn('p-6 rounded-lg shadow-xl max-w-sm w-full border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true" aria-labelledby="download-progress-title"> <h2 id="download-progress-title" className="text-center font-semibold text-lg mb-5">Preparing Download</h2> <div className="my-6 px-2"> <div className="flex justify-between mb-1 text-sm font-medium"> <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Compressing files...</span> <span className={darkMode ? 'text-gray-100' : 'text-gray-800'}>{batchDownloadProgress}%</span> </div> <div className={cn('h-2.5 rounded-full overflow-hidden w-full', darkMode ? 'bg-gray-700' : 'bg-gray-200')}> <div className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full" style={{ width: `${batchDownloadProgress}%` }} /> </div> </div> <p className={cn("text-sm text-center mt-5", darkMode ? "text-gray-400" : "text-gray-500")}>Creating ZIP archive ({selectedFiles.length} {selectedFiles.length !== 1 ? 'items' : 'item'}).</p> </div> </div> )}
            {/* Share Modal */}
            {showBatchShareModal && ( <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fadeIn backdrop-blur-sm"> <div ref={batchShareModalRef} className={cn('p-6 rounded-lg shadow-xl max-w-md w-full relative border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="dialog" aria-modal="true" aria-labelledby="share-modal-title"> <button onClick={() => { if (!batchOperationLoading) { setShowBatchShareModal(false); refresh(); setSelectedFiles([]); } }} className={cn("absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50", batchOperationLoading ? "cursor-not-allowed" : (darkMode ? "hover:bg-gray-700 text-gray-400" : "hover:bg-gray-100 text-gray-500"))} disabled={batchOperationLoading} aria-label="Close share dialog"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"> <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /> </svg></button> <h2 id="share-modal-title" className="text-center font-semibold text-lg mb-5">Share</h2> <div className="flex justify-center mb-5"> <div className={cn("p-2 rounded-lg border", darkMode ? "border-gray-600 bg-gray-900" : "border-gray-300 bg-gray-50")}> {batchOperationLoading && !batchShareLink ? ( <div className="w-[150px] h-[150px] flex items-center justify-center"><svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg></div> ) : batchShareLink ? ( <QRCodeSVG value={batchShareLink} size={150} bgColor="transparent" fgColor={darkMode ? '#FFFFFF' : '#000000'} level="M" includeMargin={false} /> ) : ( <div className="w-[150px] h-[150px] flex items-center justify-center text-center text-xs text-red-500 p-2">Error generating QR code.</div> )} </div> </div> <div className="flex flex-col gap-2.5"> <input type="text" value={batchOperationLoading ? 'Generating link...' : batchShareLink || 'Error - No link generated'} readOnly className={cn('w-full p-2 rounded-md border text-xs font-mono overflow-x-auto', darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-700')} aria-label="Shareable link" onClick={(e) => e.target.select()} /> <button onClick={copyToClipboard} disabled={!batchShareLink || copied || batchOperationLoading} className={cn('w-full px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center justify-center gap-2', copied ? 'bg-green-600 text-white cursor-default' : !batchShareLink || batchOperationLoading ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))}> {copied ? ( <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> ) : ( 'Copy Link' )} </button> </div> {batchShareLink && ( <div className="mt-4 text-center"> <p className={cn("text-xs", darkMode ? "text-gray-400" : "text-gray-600")}>Anyone with the link can access the selected file{selectedFiles.length > 1 ? 's' : ''}.</p> </div> )} </div> </div> )}

            {/* CSS for animations and hiding native scrollbar */}
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
                @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }

                /* Hide native scrollbar when custom is enabled */
                .custom-scrollbar-container::-webkit-scrollbar {
                     display: ${isCustomScrollbarEnabled ? 'none' : 'auto'}; /* Safari and Chrome */
                }
            `}</style>
        </div>
    );
};

export default FileList;
