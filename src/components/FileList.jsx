import React, { useState, useEffect, useRef, useCallback } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Skeleton Loading Placeholder
const FileItemSkeleton = ({ darkMode, viewType }) => (
    <div className={cn(
        'w-full flex rounded-xl shadow-md border animate-pulse',
        viewType === 'grid' ? 'h-[180px] flex-col p-3' : 'h-[80px] items-center p-2', // Adjust height and layout based on view
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
    const [isCustomScrollbarEnabled, setIsCustomScrollbarEnabled] = useState(false); // New state for custom scrollbar

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

    // --- Custom Scrollbar State ---
    const [scrollbarHeight, setScrollbarHeight] = useState(0);
    const [scrollbarThumbHeight, setScrollbarThumbHeight] = useState(0);
    const [scrollbarThumbTop, setScrollbarThumbTop] = useState(0);
    const [isDraggingThumb, setIsDraggingThumb] = useState(false);
    const [dragStartMouseY, setDragStartMouseY] = useState(0);
    const [dragStartThumbTop, setDragStartThumbTop] = useState(0);

    // --- Refs ---
    const sortOptionsRef = useRef(null);
    const deleteConfirmModalRef = useRef(null);
    const batchShareModalRef = useRef(null);
    const sortButtonRef = useRef(null);
    const batchDownloadModalRef = useRef(null);
    const pageInputRef = useRef(null);
    const fileListContainerRef = useRef(null); // Ref for the scrollable content area
    const customScrollbarRef = useRef(null); // Ref for the custom scrollbar track

    // --- Screen Size Detection for Responsive Items Per Page and Mobile View State ---
    const [isMobileView, setIsMobileView] = useState(false);

    useEffect(() => {
        const handleResize = () => {
            const mobileBreakpoint = 768; // Adjust breakpoint as needed
            const tabletBreakpoint = 1024;
            if (window.innerWidth < mobileBreakpoint) {
                setItemsPerPage(10);
                setIsMobileView(true);
            } else if (window.innerWidth >= mobileBreakpoint && window.innerWidth < tabletBreakpoint) {
                setItemsPerPage(15);
                setIsMobileView(false); // Not mobile, but not full PC
            } else {
                setItemsPerPage(20);
                setIsMobileView(false);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Set initial value on mount

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset selections when files list changes or selection mode exits
    useEffect(() => {
        if (!selectionMode) {
            setSelectedFiles([]);
        }
    }, [selectionMode]);

    useEffect(() => {
        setSelectedFiles([]); // Clear selection if the file list itself changes
    }, [files]);

    // Reset to first page when filter, sort, search, or itemsPerPage changes
    useEffect(() => {
        setCurrentPage(1);
    }, [filter, sortOption, searchInput, itemsPerPage]);

    // Click-outside handler for dropdowns/modals
    useEffect(() => {
        const handleClickOutside = e => {
            if (
                sortOptionsRef.current &&
                !sortOptionsRef.current.contains(e.target) &&
                !sortButtonRef.current?.contains(e.target)
            ) {
                setShowSortOptions(false);
            }
            if (deleteConfirmModalRef.current && !deleteConfirmModalRef.current.contains(e.target)) {
                setShowDeleteConfirmModal(false);
            }
            if (batchShareModalRef.current && !batchShareModalRef.current.contains(e.target) && !batchOperationLoading) {
                setShowBatchShareModal(false);
            }
            // Close page input if clicking outside
            if (isEditingPage && pageInputRef.current && !pageInputRef.current.contains(e.target)) {
                setIsEditingPage(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [batchOperationLoading, isEditingPage]);

    // Focus the page input when editing starts
    useEffect(() => {
        if (isEditingPage && pageInputRef.current) {
            pageInputRef.current.focus();
            pageInputRef.current.select(); // Select the current value
        }
    }, [isEditingPage]);

    // --- Filtering and Sorting ---
    const filtered = files.filter(f => filter === 'all' || f.metadata?.type === filter);
    const visible = filtered.filter(f =>
        f.filename.toLowerCase().includes(searchInput.toLowerCase())
    );
    const sortedFiles = [...visible].sort((a, b) => {
        switch (sortOption) {
            case 'name': return a.filename.localeCompare(b.filename);
            case 'size': return (a.length || 0) - (b.length || 0);
            case 'date': return new Date(a.uploadDate) - new Date(b.uploadDate);
            case 'default':
            default:    // Default sort (Latest First)
                return new Date(b.uploadDate) - new Date(a.uploadDate);
        }
    });

    // --- Pagination Logic ---
    const totalPages = Math.ceil(sortedFiles.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    // paginatedFiles is only used when pagination is enabled.
    // When custom scrollbar is enabled *without* pagination, we use sortedFiles directly
    // to allow scrolling the entire list.
    const displayFiles = (isPaginationEnabled && !isCustomScrollbarEnabled)
        ? sortedFiles.slice(startIndex, endIndex)
        : sortedFiles; // Use all sorted files if custom scrollbar is on or pagination is off

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(prev => prev + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(prev => prev - 1);
        }
    };

    // --- Page Editing Handlers ---
    const handlePageClick = () => {
        if (isPaginationEnabled && totalPages > 0) { // Only allow editing if pagination is enabled and there are pages
            setIsEditingPage(true);
            setEditPageValue(currentPage.toString()); // Initialize with current page number
        }
    };
    const handlePageInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            const page = parseInt(editPageValue, 10);
            // Check for valid number and range
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
                setCurrentPage(page);
                setIsEditingPage(false); // Exit editing on valid input + Enter
            } else {
                // Invalid input - just exit editing, onBlur will handle value reset
                setIsEditingPage(false);
            }
        } else if (e.key === 'Escape') {
            setIsEditingPage(false);
            // Cancel editing on Escape
        }
    };
    const handlePageInputBlur = () => {
        const page = parseInt(editPageValue, 10);
        // Reset value if invalid when blurring, but only if not empty
        if (isNaN(page) || page < 1 || page > totalPages || editPageValue === '') {
            setEditPageValue(currentPage.toString());
        } else {
            // If it's a valid number, update the page (redundant if Enter was pressed, but safe)
            setCurrentPage(page);
        }
        setIsEditingPage(false); // Always exit editing on blur
    };

    // --- Selection Handlers ---
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
        // Determine the list of files relevant to 'Select All' based on pagination state
        // When custom scrollbar is enabled, 'Select All' applies to the *entire* sorted list, not just the viewable portion
        const filesToConsider = (isPaginationEnabled && !isCustomScrollbarEnabled)
            ? displayFiles // Paginated view
            : sortedFiles; // Full list (for custom scrollbar or no pagination)

        // Check if ALL files in the relevant list are currently selected
        const allRelevantSelected = filesToConsider.every(file => selectedFiles.includes(file._id));

        if (allRelevantSelected && selectedFiles.length >= filesToConsider.length && filesToConsider.length > 0) {
            // If all relevant files are selected and there's at least one file, deselect *only* those relevant files
            setSelectedFiles(prevSelected => prevSelected.filter(id => !filesToConsider.some(file => file._id === id)));
        } else {
            // If not all relevant files are selected (or none are), select all relevant files
            // Merge the new selections with existing global selections
            setSelectedFiles(prevSelected => {
                const newSelections = filesToConsider.map(file => file._id);
                // Create a Set to easily manage unique IDs
                const combinedSelections = new Set([...prevSelected, ...newSelections]);
                return Array.from(combinedSelections);
            });
        }
    };


    // --- Batch Operations ---
    const batchDelete = async () => {
        setBatchOperationLoading(true);
        try {
            // API endpoint: /api/files/:id
            await Promise.allSettled(selectedFiles.map(id =>
                axios.delete(`${backendUrl}/api/files/${id}`)
            ));
            refresh(); // Refresh file list
            setShowDeleteConfirmModal(false); // Close modal
            setSelectionMode(false);
            setSelectedFiles([]); // Clear selection after operation
        } catch (err) {
            console.error('Error deleting files:', err);
            alert('Error deleting files. Please try again.');
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
        // Find the full file objects for the selected IDs
        const toDownload = selectedFiles
            .map(id => files.find(f => f._id === id))
            .filter(Boolean); // Filter out any null/undefined if an ID wasn't found
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
            saveAs(blob, `batch_download_${Date.now()}.zip`);
            setSelectionMode(false); // Exit selection mode after download
            setSelectedFiles([]); // Clear selection after download
        } catch (err) {
            console.error('Error preparing batch download:', err);
            alert('Error preparing batch download. Please try again.');
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
        setShowBatchShareModal(true); // Show the modal early
        setBatchShareLink('');
        setCopied(false);
        try {
            const zip = new JSZip();
            let done = 0;
            // Find the full file objects for the selected IDs
            const filesToZip = selectedFiles
                .map(id => files.find(f => f._id === id))
                .filter(Boolean); // Filter out any null/undefined if an ID wasn't found

            if (filesToZip.length === 0) {
                throw new Error("No valid files selected for zipping.");
            }

            console.log('Starting batch share zip process...');
            for (const file of filesToZip) {
                console.log(`Processing file: ${file.filename} (${file._id})`);
                const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, {
                    responseType: 'blob'
                });
                console.log(`Adding ${file.filename} to zip`);
                zip.file(file.filename, res.data);
                done++;
            }

            console.log('Generating ZIP blob...');
            const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
            console.log('ZIP blob generated, size:', zipBlob.size);

            const formData = new FormData();
            const zipFilename = `shared_files_${Date.now()}.zip`;
            formData.append('zipFile', zipBlob, zipFilename);
            console.log(`Uploading ${zipFilename} to ${backendUrl}/api/files/share-zip`);
            const uploadResponse = await axios.post(`${backendUrl}/api/files/share-zip`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            console.log('Upload response received:', uploadResponse.data);

            const shareUrl = uploadResponse.data?.url;
            if (!shareUrl) {
                console.error("Backend response missing URL:", uploadResponse.data);
                throw new Error("Failed to generate the link.");
            }

            setBatchShareLink(shareUrl);
            console.log('Batch share link set:', shareUrl);
            // Don't exit selection mode automatically after sharing, user might want to download/delete too
            // setSelectionMode(false); // Keep selection mode active
            // setSelectedFiles([]); // Don't clear selection automatically

        } catch (err) {
            console.error('Error creating or sharing ZIP file:', err.response ? err.response.data : err.message, err.stack);
            const errorMessage = err.response?.data?.error || err.message ||
                'Please try again.';
            alert(`Error sharing files: ${errorMessage}`);
            setShowBatchShareModal(false); // Close modal on error
        } finally {
            setBatchOperationLoading(false);
            console.log('Batch share operation finished.');
        }
    };


    const copyToClipboard = async () => {
        if (!batchShareLink) return;
        try {
            await navigator.clipboard.writeText(batchShareLink); // Copy the generated link (or combined links)
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy batch link:', err);
            alert('Failed to copy link.');
        }
    };

    // --- Custom Scrollbar Logic ---

    // Calculate scrollbar and thumb size
    const calculateScrollbarMetrics = useCallback(() => {
        const container = fileListContainerRef.current;
        const scrollbarTrack = customScrollbarRef.current;

        if (container && scrollbarTrack) {
            const contentHeight = container.scrollHeight; // Total height of content
            const visibleHeight = container.clientHeight; // Height of the visible area
            const trackHeight = scrollbarTrack.clientHeight; // Height of the custom scrollbar track

            setScrollbarHeight(trackHeight);

            // Calculate thumb height: (Visible Height / Total Content Height) * Scrollbar Track Height
            // Ensure minimum thumb height for usability
            const minThumbHeight = 20; // Minimum height in pixels
            const thumbHeight = Math.max((visibleHeight / contentHeight) * trackHeight, minThumbHeight);

            setScrollbarThumbHeight(thumbHeight);

            // Update thumb position based on current scroll
            const scrollTop = container.scrollTop;
            const maxScrollTop = contentHeight - visibleHeight;
            const maxThumbTop = trackHeight - thumbHeight;

            if (maxScrollTop <= 0) { // No scrolling needed
                 setScrollbarThumbTop(0);
            } else {
                 const thumbPosition = (scrollTop / maxScrollTop) * maxThumbTop;
                 setScrollbarThumbTop(thumbPosition);
            }

        } else {
             setScrollbarHeight(0);
             setScrollbarThumbHeight(0);
             setScrollbarThumbTop(0);
        }
    }, [fileListContainerRef, customScrollbarRef]);


    // Sync custom scrollbar with content scrolling
    const handleScroll = useCallback(() => {
        const container = fileListContainerRef.current;
        const scrollbarTrack = customScrollbarRef.current;

        if (container && scrollbarTrack) {
            const contentHeight = container.scrollHeight;
            const visibleHeight = container.clientHeight;
            const trackHeight = scrollbarTrack.clientHeight;
            const thumbHeight = scrollbarThumbHeight; // Use the calculated thumb height

            const scrollTop = container.scrollTop;
            const maxScrollTop = contentHeight - visibleHeight;
            const maxThumbTop = trackHeight - thumbHeight;

             if (maxScrollTop <= 0) { // No scrolling needed
                 setScrollbarThumbTop(0);
            } else {
                 const thumbPosition = (scrollTop / maxScrollTop) * maxThumbTop;
                 setScrollbarThumbTop(thumbPosition);
            }
        }
    }, [fileListContainerRef, customScrollbarRef, scrollbarThumbHeight]); // Add scrollbarThumbHeight as dependency


    // Handle thumb drag start
    const handleThumbMouseDown = useCallback((e) => {
        e.preventDefault(); // Prevent default browser drag behavior
        setIsDraggingThumb(true);
        setDragStartMouseY(e.clientY);
        setDragStartThumbTop(scrollbarThumbTop); // Store current thumb position
    }, [scrollbarThumbTop]);

    // Handle thumb drag move
    const handleThumbMouseMove = useCallback((e) => {
        if (!isDraggingThumb) return;

        const scrollbarTrack = customScrollbarRef.current;
        const container = fileListContainerRef.current;

        if (container && scrollbarTrack) {
            const deltaY = e.clientY - dragStartMouseY; // Mouse movement delta
            const trackHeight = scrollbarTrack.clientHeight;
            const contentHeight = container.scrollHeight;
            const visibleHeight = container.clientHeight;
            const thumbHeight = scrollbarThumbHeight;

            const maxThumbTop = trackHeight - thumbHeight;
            const maxScrollTop = contentHeight - visibleHeight;

            if (maxScrollTop <= 0) return; // No scrolling needed

            // Calculate new thumb position based on drag delta
            const newThumbTop = dragStartThumbTop + deltaY;

            // Clamp the new thumb position within the track bounds
            const clampedThumbTop = Math.max(0, Math.min(maxThumbTop, newThumbTop));
            setScrollbarThumbTop(clampedThumbTop);

            // Calculate the corresponding scroll position for the content
            const scrollRatio = clampedThumbTop / maxThumbTop;
            container.scrollTop = scrollRatio * maxScrollTop;
        }
    }, [isDraggingThumb, dragStartMouseY, dragStartThumbTop, fileListContainerRef, customScrollbarRef, scrollbarThumbHeight]); // Add scrollbarThumbHeight as dependency

    // Handle thumb drag end
    const handleThumbMouseUp = useCallback(() => {
        setIsDraggingThumb(false);
    }, []);

    // Add/remove global mousemove and mouseup listeners for dragging
    useEffect(() => {
        if (isDraggingThumb) {
            document.addEventListener('mousemove', handleThumbMouseMove);
            document.addEventListener('mouseup', handleThumbMouseUp);
        } else {
            document.removeEventListener('mousemove', handleThumbMouseMove);
            document.removeEventListener('mouseup', handleThumbMouseUp);
        }

        // Cleanup function
        return () => {
            document.removeEventListener('mousemove', handleThumbMouseMove);
            document.removeEventListener('mouseup', handleThumbMouseUp);
        };
    }, [isDraggingThumb, handleThumbMouseMove, handleThumbMouseUp]);


    // Recalculate scrollbar metrics whenever file list changes, view changes,
    // or custom scrollbar is toggled. Also on container resize.
    useEffect(() => {
        calculateScrollbarMetrics();
        // Add resize observer for more accurate recalculation on container resize
        const resizeObserver = new ResizeObserver(() => {
            calculateScrollbarMetrics();
             // Ensure scroll position is maintained relative to content if possible
            const container = fileListContainerRef.current;
            if (container) {
                 const scrollTop = container.scrollTop;
                 const maxScrollTop = container.scrollHeight - container.clientHeight;
                 if (maxScrollTop > 0) {
                     const scrollRatio = scrollTop / (container.dataset.prevScrollHeight - container.dataset.prevClientHeight || 1);
                     container.scrollTop = scrollRatio * maxScrollTop;
                 }
                 container.dataset.prevScrollHeight = container.scrollHeight;
                 container.dataset.prevClientHeight = container.clientHeight;
            }
        });

        const container = fileListContainerRef.current;
        if (container) {
             resizeObserver.observe(container);
             // Store initial dimensions
             container.dataset.prevScrollHeight = container.scrollHeight;
             container.dataset.prevClientHeight = container.clientHeight;
        }


        return () => {
            if (container) {
                 resizeObserver.unobserve(container);
            }
        };
    }, [displayFiles, view, isCustomScrollbarEnabled, calculateScrollbarMetrics]); // Recalculate when displayFiles, view, or scrollbar state changes

    // Add scroll listener to the file list container
    useEffect(() => {
        const container = fileListContainerRef.current;
        if (container && isCustomScrollbarEnabled) {
            container.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (container) {
                container.removeEventListener('scroll', handleScroll);
            }
        };
    }, [fileListContainerRef, isCustomScrollbarEnabled, handleScroll]); // Re-attach listener if container or scrollbar state changes

    // Reset scroll position to top when pagination page changes
    useEffect(() => {
        const container = fileListContainerRef.current;
        if (container && isPaginationEnabled && !isCustomScrollbarEnabled) {
            container.scrollTop = 0;
        }
         // When custom scrollbar is enabled, we don't reset scroll on page change
         // because the 'page' concept is handled by the scroll position itself.
    }, [currentPage, isPaginationEnabled, isCustomScrollbarEnabled]);


    // --- Render ---
    return (
        <div className={cn(
            'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
            darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
        )}>
            {/* Header */}
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

            {/* Controls Row */}
            <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 items-center justify-between flex-wrap">
                {/* Search Input */}
                <div className="relative flex-grow w-full md:w-auto md:flex-grow-[2]">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', darkMode ? 'text-gray-400' : 'text-gray-500')} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder=""
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        className={cn(
                            'w-full pl-10 pr-4 py-2 rounded-lg transition-colors duration-200 border text-sm',
                            darkMode
                                ? 'bg-gray-800 text-white border-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500'
                                : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-gray-400'
                        )}
                        aria-label="Search files"
                    />
                </div>

                {/* Action Buttons Group */}
                <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end flex-grow md:flex-grow-0">
                    {/* Pagination Toggle */}
                    <button
                        onClick={() => setIsPaginationEnabled(prev => !prev)}
                        className={cn(
                            'p-2 rounded-md transition-colors duration-200',
                            isPaginationEnabled
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label={isPaginationEnabled ? "Disable pagination" : "Enable pagination"}
                        aria-pressed={isPaginationEnabled}
                        title={isPaginationEnabled ? "Disable Pagination" : "Enable Pagination"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {isPaginationEnabled ? (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> // Minus icon for disabling
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> // Plus icon for enabling
                            )}
                        </svg>
                    </button>

                    {/* Toggle Selection (Batch Mode) */}
                    <button
                        onClick={toggleSelectionMode}
                        className={cn(
                            'p-2 rounded-md transition-colors duration-200',
                            selectionMode
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"}
                        aria-pressed={selectionMode}
                        title={selectionMode ? "Exit selection mode" : "Select multiple files"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', selectionMode ? '' : (darkMode ? 'text-gray-300' : 'text-gray-600'))} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {selectionMode
                                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> // X icon for exit
                                : <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" /> // Square icon for enter selection mode
                            }
                        </svg>
                    </button>

                    {/* NEW: Toggle Custom Scrollbar */}
                    <button
                        onClick={() => setIsCustomScrollbarEnabled(prev => !prev)}
                        className={cn(
                            'p-2 rounded-md transition-colors duration-200',
                            isCustomScrollbarEnabled
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label={isCustomScrollbarEnabled ? "Disable custom scrollbar" : "Enable custom scrollbar"}
                        aria-pressed={isCustomScrollbarEnabled}
                        title={isCustomScrollbarEnabled ? "Disable Custom Scrollbar" : "Enable Custom Scrollbar"}
                    >
                        {/* Using a simple scrollbar icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </button>


                    {/* Toggle Metadata */}
                    <button
                        onClick={() => setShowMetadata(!showMetadata)}
                        className={cn(
                            'p-2 rounded-md transition-colors duration-200',
                            showMetadata
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label={showMetadata ? "Hide file details" : "Show file details"}
                        aria-pressed={showMetadata}
                        title={showMetadata ? "Hide details" : "Show details"}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    </button>

                    {/* Sort & Filter Dropdown */}
                    <div className="relative">
                        <button
                            ref={sortButtonRef}
                            onClick={() => setShowSortOptions(prev => !prev)}
                            className={cn(
                                'p-2 rounded-md transition-colors duration-200',
                                sortOption !== 'default' || filter !== 'all'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                            )}
                            aria-label="Sort and filter options"
                            aria-haspopup="true"
                            aria-expanded={showSortOptions}
                            title="Sort & Filter"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9M3 12h9m-9 4h9m5-4v.01M12 20h5.5a2.5 2.5 0 002.5-2.5V6.5A2.5 2.5 0 0017.5 4h-11" />
                            </svg>
                        </button>
                        {/* Dropdown Panel */}
                        {showSortOptions && (
                            <div
                                ref={sortOptionsRef}
                                className={cn(
                                    'absolute right-0 mt-2 w-56 rounded-lg shadow-xl z-20 border overflow-hidden',
                                    'max-h-[40vh] sm:max-h-[75vh] overflow-y-auto',
                                    darkMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-200',
                                    'divide-y'
                                )}
                                role="menu"
                            >
                                {/* Sort Section */}
                                <div>
                                    <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                                    {[
                                        { label: 'Default', id: 'default' },
                                        { label: 'Name', id: 'name' },
                                        { label: 'Size', id: 'size' },
                                        { label: 'Date', id: 'date' },
                                    ].map(opt => (
                                        <button
                                            key={opt.id}
                                            onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }}
                                            className={cn(
                                                'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                                                sortOption === opt.id
                                                    ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                                                    : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                                            )}
                                            role="menuitemradio" aria-checked={sortOption === opt.id}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Filter Section */}
                                <div>
                                    <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                                    {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (
                                        <button
                                            key={type}
                                            onClick={() => { setFilter(type); setShowSortOptions(false); }}
                                            className={cn(
                                                'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                                                filter === type
                                                    ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                                                    : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                                            )}
                                            role="menuitemradio" aria-checked={filter === type}
                                        >
                                            {type.charAt(0).toUpperCase() + type.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

          {/* View Toggle */}
                    <div className={cn('flex items-center rounded-md overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                        <button
                            onClick={() => setView('list')}
                            className={cn('p-2 transition-colors duration-200',
                                view === 'list' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
                            )}
                            aria-label="List view" aria-pressed={view === 'list'} title="List View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setView('grid')}
                            className={cn('p-2 transition-colors duration-200',
                                view === 'grid' ? 'bg-blue-600 text-white' : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
                            )}
                            aria-label="Grid view" aria-pressed={view === 'grid'} title="Grid View"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {/* Batch Selection Bar */}
            {selectionMode && (
                <div className={cn(
                    'mb-6 p-3 rounded-lg border transition-all duration-300 ease-in-out',
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'
                )}>
                    <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 flex-wrap">
                        {/* Select/Deselect All Button */}
                        <div className="w-full md:w-auto">
                            <button
                                onClick={toggleSelectAll}
                                className={cn(
                                    'w-full md:w-auto py-2 px-4 rounded-md text-sm font-medium text-center transition-colors duration-200 border',
                                    // Determine button state based on whether *all relevant* files are selected
                                    ((isPaginationEnabled && !isCustomScrollbarEnabled) ? displayFiles.every(file => selectedFiles.includes(file._id)) && displayFiles.length > 0 : sortedFiles.every(file => selectedFiles.includes(file._id)) && sortedFiles.length > 0)
                                        ? `border-red-400 ${darkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-white hover:bg-red-50'}`
                                        : `border-blue-400 ${darkMode ? 'text-blue-300 bg-gray-700 hover:bg-gray-600' : 'text-blue-600 bg-white hover:bg-blue-50'}`
                                )}
                            >
                                {((isPaginationEnabled && !isCustomScrollbarEnabled) ? displayFiles.every(file => selectedFiles.includes(file._id)) && displayFiles.length > 0 : sortedFiles.every(file => selectedFiles.includes(file._id)) && sortedFiles.length > 0) ? 'Deselect All' : 'Select All'}
                            </button>
                        </div>

                        {/* Selected Count Indicator */}
                        <div className={cn('text-sm flex-grow text-center md:text-left order-last md:order-none w-full md:w-auto pt-2 md:pt-0', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                            {selectedFiles.length > 0 && (isPaginationEnabled && !isCustomScrollbarEnabled) ? `${selectedFiles.length} of ${sortedFiles.length} total items selected (on current page: ${displayFiles.length}).`
                                : `${selectedFiles.length} of ${isCustomScrollbarEnabled ? sortedFiles.length : displayFiles.length} selected.`
                            }
                        </div>

                        {/* Batch Action Buttons */}
                        <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-2">
                            {/* Theme Colors & Themed Disabled State */}
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
            )}

            {/* Files Display Area with min-height and Custom Scrollbar Container */}
            <div className={cn(
                 "relative overflow-hidden min-h-[250px]", // Relative for absolute scrollbar, hidden to hide native
                 isCustomScrollbarEnabled ? "pr-3" : "" // Add padding right when custom scrollbar is enabled
            )}>
                {isLoading ? (
                    <div className={cn(
                        'grid gap-4',
                        view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
                    )}>
                        {/* Render Skeletons */}
                        {Array(view === 'grid' ? 10 : 5).fill().map((_, i) => (
                            <FileItemSkeleton key={`skel-${i}`} darkMode={darkMode} viewType={view} />
                        ))}
                    </div>
                ) : displayFiles.length > 0 ? (
                    // File List Content Container (Scrollable)
                    <div
                        ref={fileListContainerRef}
                        className={cn(
                            'grid gap-4',
                            view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1',
                            isCustomScrollbarEnabled ? 'custom-scrollbar-content' : 'overflow-y-auto' // Apply custom class or native scroll
                        )}
                        style={{
                             // Ensure max height for scrolling, adjust as needed
                            maxHeight: isCustomScrollbarEnabled ? '400px' : 'none', // Example max height
                            paddingRight: isCustomScrollbarEnabled ? '15px' : '0', // Make space for the custom scrollbar
                        }}
                    >
                        {/* Render File Items */}
                        {displayFiles.map(file => (
                            <FileItem
                                key={file._id}
                                file={file}
                                darkMode={darkMode}
                                showDetails={showMetadata}
                                viewType={view}
                                onSelect={handleSelectFile}
                                isSelected={selectedFiles.includes(file._id)}
                                selectionMode={selectionMode}
                                refresh={refresh}
                            />
                        ))}
                    </div>
                ) : (
                    // No Files Found Message
                    <div className={cn(
                        'text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]',
                        darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50'
                    )}>
                        <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                        </svg>
                        <h3 className="text-lg font-medium mb-1 text-gray-500">No files found</h3>
                        <p className="text-sm text-gray-400">
                            {searchInput ? 'Try adjusting your search or filter.' : 'Upload some files!'}
                        </p>
                    </div>
                )}

                {/* Custom Scrollbar Track */}
                {isCustomScrollbarEnabled && sortedFiles.length > 0 && (
                    <div
                        ref={customScrollbarRef}
                        className={cn(
                            'absolute top-0 right-0 w-2 rounded-full transition-colors duration-200',
                            darkMode ? 'bg-gray-700' : 'bg-gray-300'
                        )}
                        style={{
                            height: `${scrollbarHeight}px`, // Set track height based on calculation
                            bottom: 0, // Ensure it extends to the bottom of the container
                        }}
                    >
                        {/* Custom Scrollbar Thumb */}
                        <div
                            className={cn(
                                'absolute left-0 w-full rounded-full cursor-pointer transition-colors duration-200',
                                isDraggingThumb ? (darkMode ? 'bg-blue-500' : 'bg-blue-700') : (darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600')
                            )}
                            style={{
                                height: `${scrollbarThumbHeight}px`, // Set thumb height based on calculation
                                top: `${scrollbarThumbTop}px`, // Set thumb position based on scroll
                            }}
                            onMouseDown={handleThumbMouseDown}
                            // Add touch event listeners for mobile dragging
                            onTouchStart={(e) => {
                                // Prevent default touch behavior (like scrolling)
                                e.preventDefault();
                                const touch = e.touches[0];
                                setIsDraggingThumb(true);
                                setDragStartMouseY(touch.clientY);
                                setDragStartThumbTop(scrollbarThumbTop);
                            }}
                            onTouchMove={(e) => {
                                if (!isDraggingThumb) return;
                                const touch = e.touches[0];
                                const scrollbarTrack = customScrollbarRef.current;
                                const container = fileListContainerRef.current;

                                if (container && scrollbarTrack) {
                                    const deltaY = touch.clientY - dragStartMouseY;
                                    const trackHeight = scrollbarTrack.clientHeight;
                                    const contentHeight = container.scrollHeight;
                                    const visibleHeight = container.clientHeight;
                                    const thumbHeight = scrollbarThumbHeight;

                                    const maxThumbTop = trackHeight - thumbHeight;
                                    const maxScrollTop = contentHeight - visibleHeight;

                                    if (maxScrollTop <= 0) return;

                                    const newThumbTop = dragStartThumbTop + deltaY;
                                    const clampedThumbTop = Math.max(0, Math.min(maxThumbTop, newThumbTop));
                                    setScrollbarThumbTop(clampedThumbTop);

                                    const scrollRatio = clampedThumbTop / maxThumbTop;
                                    container.scrollTop = scrollRatio * maxScrollTop;
                                }
                            }}
                            onTouchEnd={() => {
                                setIsDraggingThumb(false);
                            }}
                        >
                             {/* Optional: Add a small handle indicator */}
                             <div className={cn(
                                 "absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-1 h-3 rounded-full",
                                 darkMode ? 'bg-gray-300' : 'bg-gray-600'
                             )}></div>
                        </div>
                    </div>
                )}
            </div>


            {/* Pagination Controls at the bottom (Hidden if custom scrollbar is enabled) */}
            {isPaginationEnabled && sortedFiles.length > 0 && !isCustomScrollbarEnabled && (
                <div className={cn(
                    'flex flex-col items-center gap-2 sm:gap-4 mt-6',
                    isMobileView ? 'sm:flex-col' : 'sm:flex-row justify-center', // Stack vertically on mobile, row on larger screens
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                )}>
                    {/* Page Indicator/Input (Above buttons on mobile) */}
                    <span className={cn(
                        "text-sm text-center",
                        isMobileView ? 'order-1 mb-2' : 'order-2' // Order 1 and margin-bottom on mobile
                    )}>
                        <span className="hidden md:inline">Page </span>
                        {isEditingPage ? (
                            <input
                                ref={pageInputRef}
                                type="number"
                                min="1"
                                max={totalPages}
                                value={editPageValue}
                                onChange={(e) => setEditPageValue(e.target.value)}
                                onKeyDown={handlePageInputKeyDown}
                                onBlur={handlePageInputBlur}
                                className={cn(
                                    'w-16 text-center p-1 rounded-md text-sm border',
                                    darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-800'
                                )}
                                aria-label="Current page number input"
                            />
                        ) : (
                            <span
                                className={cn(
                                    "text-sm cursor-pointer hover:underline", // Hover effect
                                    darkMode ? 'text-gray-300 hover:text-gray-100' : 'text-gray-700 hover:text-gray-900' // Hover colors
                                )}
                                onClick={handlePageClick}
                                onContextMenu={(e) => { // Handle right-click
                                    e.preventDefault();
                                    handlePageClick();
                                }}
                                 // Basic long-press detection (can be enhanced)
                                onTouchStart={(e) => {
                                    // Store timer ID directly on the element
                                    e.currentTarget.dataset.pressTimer = setTimeout(() => {
                                        handlePageClick();
                                    }, 3000); // 3 seconds for long press
                                }}
                                onTouchEnd={(e) => {
                                    // Clear the timer using the stored ID
                                    clearTimeout(e.currentTarget.dataset.pressTimer);
                                }}
                                onMouseDown={(e) => {
                                    // Only handle left click for regular click, right click is contextmenu
                                    if (e.button === 0) {
                                        // Store timer ID directly on the element
                                        e.currentTarget.dataset.pressTimer = setTimeout(() => {
                                            handlePageClick();
                                        }, 3000); // 3 seconds for long press
                                    }
                                }}
                                onMouseUp={(e) => {
                                    if (e.button === 0) {
                                        // Clear the timer using the stored ID
                                        clearTimeout(e.currentTarget.dataset.pressTimer);
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (e.button === 0) { // Clear timer if mouse leaves while holding
                                        // Clear the timer using the stored ID
                                        clearTimeout(e.currentTarget.dataset.pressTimer);
                                    }
                                }}

                            >
                                {currentPage}
                            </span>
                        )}
                        &nbsp;of {totalPages}
                    </span>

                    {/* Previous Button */}
                    {currentPage > 1 && (
                        <button
                            onClick={handlePreviousPage}
                            disabled={currentPage === 1}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                                isMobileView ? 'flex-1 w-full order-2' : 'sm:flex-initial w-auto order-1', // Order 2 on mobile, Order 1 on larger screens
                                currentPage === 1
                                    ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                    : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                            )}
                        >
                            {isMobileView ? 'Prev' : 'Previous Page'}
                        </button>
                    )}

                    {/* Next Button */}
                    {currentPage < totalPages && (
                        <button
                            onClick={handleNextPage}
                            disabled={currentPage === totalPages}
                            className={cn(
                                'px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200',
                                isMobileView ? 'flex-1 w-full order-3' : 'sm:flex-initial w-auto order-3', // Order 3 on mobile and larger screens
                                currentPage === totalPages
                                    ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                                    : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
                            )}
                        >
                            {isMobileView ? 'Next' : 'Next Page'}
                        </button>
                    )}
                </div>
            )}
            {/* Message when pagination is enabled but no files */}
            {isPaginationEnabled && sortedFiles.length === 0 && !isCustomScrollbarEnabled && (
                <div className={cn("text-center mt-4 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
                    No files match your criteria for pagination.
                </div>
            )}
             {/* Message when custom scrollbar is enabled but no files */}
             {isCustomScrollbarEnabled && sortedFiles.length === 0 && (
                <div className={cn("text-center mt-4 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
                    No files match your criteria for custom scrolling.
                </div>
            )}


            {/* --- Modals --- */}

            {/* Delete Confirmation Modal */}
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
                                disabled={selectedFiles.length === 0 || batchOperationLoading}
                                className={cn(
                                    'flex-1 px-4 py-2 rounded-md font-medium transition-colors duration-150 text-sm text-white flex items-center justify-center gap-2',
                                    selectedFiles.length === 0 || batchOperationLoading
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

            {/* Download Progress Modal */}
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

            {/* Share Modal */}
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
                        {/* Close Button */}
                        <button
                            onClick={() => {
                                if (!batchOperationLoading) {
                                    setShowBatchShareModal(false);
                                    refresh(); // Refresh list in case shared files were deleted (less likely but safe)
                                    setSelectedFiles([]); // Clear selection after closing share modal
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

                        {/* QR Code Section */}
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

                        {/* Link and Copy Button - Vertical Layout */}
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

            {/* CSS for custom scrollbar and animations */}
            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
                @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
                .animate-modalIn { animation: modalIn 0.25s ease-out; }

                /* Custom Scrollbar Styles */
                .custom-scrollbar-content {
                    /* Hide the default scrollbar */
                    -ms-overflow-style: none;  /* Internet Explorer 10+ */
                    scrollbar-width: none;  /* Firefox */
                    overflow-y: scroll; /* Enable scrolling */
                }

                .custom-scrollbar-content::-webkit-scrollbar {
                    display: none;  /* Safari and Chrome */
                }

                /* Optional: Add hover state for custom scrollbar track/thumb */
                .custom-scrollbar-track:hover .custom-scrollbar-thumb {
                    /* Example: make thumb wider on hover */
                    width: 8px;
                }
                 .custom-scrollbar-thumb {
                     transition: background-color 0.2s ease-in-out; /* Smooth color transition */
                 }
                 .custom-scrollbar-thumb:active {
                    /* Style when thumb is being dragged */
                    cursor: grabbing;
                 }
            `}</style>
        </div>
    );
};

export default FileList;
