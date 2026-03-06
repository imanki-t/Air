// src/components/FolderList.jsx
import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import FileItem from './FileItem';
import axios from 'axios';
import JSZip from 'jszip';

const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const FOLDER_COLORS = [
  { name: 'Indigo',  value: '#6366f1' },
  { name: 'Blue',   value: '#3b82f6' },
  { name: 'Sky',    value: '#0ea5e9' },
  { name: 'Teal',   value: '#14b8a6' },
  { name: 'Green',  value: '#22c55e' },
  { name: 'Lime',   value: '#84cc16' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Red',    value: '#ef4444' },
  { name: 'Pink',   value: '#ec4899' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Gray',   value: '#6b7280' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────────────
const FolderSVG = ({ color = '#6366f1', className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path d="M3 7C3 5.89543 3.89543 5 5 5H10.5858C10.851 5 11.1054 5.10536 11.2929 5.29289L12.7071 6.70711C12.8946 6.89464 13.149 7 13.4142 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
      fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M3 10H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);
const DotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);
const PencilIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const TrashIcon = ({ className = 'h-4 w-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const SpinnerIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);
const CloseIcon = ({ className = 'h-5 w-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);
const ArrowLeftIcon = ({ className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
  </svg>
);
const ArrowRightIcon = ({ className = 'w-5 h-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);
const FileItemSkeleton = ({ darkMode }) => (
  <div className={cn('w-full h-[180px] flex flex-col p-3 rounded-xl shadow-md border animate-pulse', darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')}>
    <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className="mt-2"><div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')} /></div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Color Picker
// ─────────────────────────────────────────────────────────────────────────────
const ColorPicker = ({ selected, onSelect, darkMode }) => (
  <div className="mt-3">
    <label className={cn('block text-xs font-medium mb-2', darkMode ? 'text-gray-400' : 'text-gray-600')}>Folder Color</label>
    <div className="flex flex-wrap gap-2">
      {FOLDER_COLORS.map((c) => (
        <button key={c.value} type="button" onClick={() => onSelect(c.value)} title={c.name}
          className={cn('w-7 h-7 rounded-full transition-all duration-150 border-2 focus:outline-none',
            selected === c.value ? 'border-white scale-125 shadow-lg' : 'border-transparent hover:scale-110')}
          style={{ backgroundColor: c.value }} aria-label={c.name} aria-pressed={selected === c.value} />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Folder Options Dropdown — smart viewport-clamped positioning
// ─────────────────────────────────────────────────────────────────────────────
const FolderOptionsDropdown = ({ darkMode, onView, onEdit, onDelete, onClose }) => {
  const dropRef = useRef(null);
  const [style, setStyle] = useState({ top: '100%', right: 0, opacity: 0 });

  useLayoutEffect(() => {
    if (!dropRef.current) return;
    const r = dropRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const s = { opacity: 1 };
    // Horizontal: prefer right-aligned; if left edge clips, pin to left instead
    if (r.left < 8) {
      s.left = 0;
      s.right = 'auto';
    } else {
      s.right = 0;
      s.left = 'auto';
    }
    // Vertical: prefer below; if bottom clips, flip above
    s.top    = r.bottom > vh - 8 ? 'auto' : '100%';
    s.bottom = r.bottom > vh - 8 ? '100%' : 'auto';
    setStyle(s);
  }, []);

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);

  return (
    <div ref={dropRef} style={style}
      className={cn('absolute w-44 rounded-xl border shadow-2xl z-[9999] overflow-hidden folder-dropdown-anim transition-opacity',
        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200')}
      role="menu">
      <button onClick={onView}   className={cn('w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors', darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')} role="menuitem"><EyeIcon />    View Files</button>
      <button onClick={onEdit}   className={cn('w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors', darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')} role="menuitem"><PencilIcon /> Rename / Color</button>
      <div className={cn('my-0.5 border-t', darkMode ? 'border-gray-700' : 'border-gray-100')} />
      <button onClick={onDelete} className={cn('w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors text-red-500', darkMode ? 'hover:bg-red-900/25' : 'hover:bg-red-50')} role="menuitem"><TrashIcon className="h-4 w-4" /> Delete</button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Folder Card
// ─────────────────────────────────────────────────────────────────────────────
const FolderCard = ({ folder, darkMode, isOptionsOpen, onToggleOptions, onView, onEdit, onDeleteRequest }) => (
  <div
    className={cn('relative group rounded-xl border transition-all duration-200 cursor-pointer select-none flex flex-col items-center gap-2 text-center p-3',
      darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white',
      'hover:shadow-md hover:-translate-y-0.5', isOptionsOpen ? 'z-30' : 'z-10')}
    onClick={onView} role="button" aria-label={`Open folder ${folder.name}`}>

    {/* Kebab trigger */}
    <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
      <button type="button" onClick={(e) => { e.stopPropagation(); onToggleOptions(); }}
        className={cn('p-1 rounded-md transition-all opacity-0 group-hover:opacity-100 focus:opacity-100',
          isOptionsOpen && 'opacity-100',
          darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600')}
        aria-label="Folder options" aria-haspopup="true" aria-expanded={isOptionsOpen}>
        <DotsIcon />
      </button>
      {isOptionsOpen && (
        <FolderOptionsDropdown darkMode={darkMode}
          onView={() => { onView(); onToggleOptions(); }}
          onEdit={() => { onEdit(); }}
          onDelete={() => { onDeleteRequest(); }}
          onClose={onToggleOptions} />
      )}
    </div>

    <FolderSVG color={folder.color} className="w-10 h-10 flex-shrink-0 mt-1" />
    <span className={cn('text-xs font-medium leading-tight w-full truncate px-0.5', darkMode ? 'text-gray-200' : 'text-gray-700')} title={folder.name}>{folder.name}</span>
    <span className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>{folder.fileIds?.length || 0} {folder.fileIds?.length === 1 ? 'file' : 'files'}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Folder Card Skeleton
// ─────────────────────────────────────────────────────────────────────────────
const FolderCardSkeleton = ({ darkMode }) => (
  <div className={cn('rounded-xl border p-3 flex flex-col items-center gap-2 animate-pulse', darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200')}>
    <div className={cn('w-10 h-10 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2.5 w-3/4 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2 w-1/2 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FolderViewModal — FULLSCREEN replica of FileList, uses real FileItem
// ─────────────────────────────────────────────────────────────────────────────
const FolderViewModal = ({ folder, allFiles, darkMode, backendUrl, onClose, onRemoveFile, onFoldersChanged, refresh }) => {
  const folderFiles = allFiles.filter((f) => (folder.fileIds || []).includes(String(f._id)));

  // ── Exact FileList state ─────────────────────────────────────────────────
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
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);

  const sortOptionsRef = useRef(null);
  const sortButtonRef  = useRef(null);
  const pageInputRef   = useRef(null);
  const deleteConfirmModalRef = useRef(null);
  const batchShareModalRef    = useRef(null);
  const removeConfirmRef      = useRef(null);

  // ── Responsive items per page ────────────────────────────────────────────
  useEffect(() => {
    const calc = () => setItemsPerPage(window.innerWidth < 768 ? 10 : 20);
    calc(); window.addEventListener('resize', calc); return () => window.removeEventListener('resize', calc);
  }, []);

  // ── Reset page on filter/search change ───────────────────────────────────
  useEffect(() => { setCurrentPage(1); }, [searchInput, filter, sortOption]);

  // ── Outside clicks ────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (showSortOptions && sortOptionsRef.current && !sortOptionsRef.current.contains(e.target) &&
          sortButtonRef.current && !sortButtonRef.current.contains(e.target)) setShowSortOptions(false);
      if (isEditingPage && pageInputRef.current && !pageInputRef.current.contains(e.target)) setIsEditingPage(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [showSortOptions, isEditingPage]);

  useEffect(() => { if (isEditingPage && pageInputRef.current) { pageInputRef.current.focus(); pageInputRef.current.select(); } }, [isEditingPage]);

  // ── Escape key ────────────────────────────────────────────────────────────
  useEffect(() => {
    const h = (e) => {
      if (e.key === 'Escape') {
        if (showSortOptions) { setShowSortOptions(false); return; }
        if (showDeleteConfirmModal || showRemoveConfirmModal || showBatchShareModal) return;
        onClose();
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose, showSortOptions, showDeleteConfirmModal, showRemoveConfirmModal, showBatchShareModal]);

  // ── Filter / sort / paginate ──────────────────────────────────────────────
  const visible = folderFiles.filter((file) => {
    const type = file.metadata?.type || 'other';
    return (filter === 'all' || type === filter) &&
      (!searchInput.trim() || file.filename?.toLowerCase().includes(searchInput.toLowerCase()));
  });

  const sortedFiles = [...visible].sort((a, b) => {
    if (sortOption === 'date')      return new Date(a.uploadDate) - new Date(b.uploadDate);
    if (sortOption === 'name-asc')  return (a.filename || '').localeCompare(b.filename || '');
    if (sortOption === 'name-desc') return (b.filename || '').localeCompare(a.filename || '');
    if (sortOption === 'size-desc') return (b.length || 0) - (a.length || 0);
    if (sortOption === 'size-asc')  return (a.length || 0) - (b.length || 0);
    return new Date(b.uploadDate) - new Date(a.uploadDate);
  });

  const totalPages   = isPaginationEnabled ? Math.max(1, Math.ceil(sortedFiles.length / itemsPerPage)) : 1;
  const displayFiles = isPaginationEnabled ? sortedFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage) : sortedFiles;
  const paginatedFiles = displayFiles;

  // ── Pagination ────────────────────────────────────────────────────────────
  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); };
  const handlePreviousPage = () => { if (currentPage > 1) setCurrentPage((p) => p - 1); };
  const handlePageClick = () => { if (isPaginationEnabled && totalPages > 0) { setIsEditingPage(true); setEditPageValue(String(currentPage)); } };
  const handlePageInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      const p = parseInt(editPageValue, 10);
      setCurrentPage(!isNaN(p) && p >= 1 && p <= totalPages ? p : currentPage);
      setIsEditingPage(false);
    } else if (e.key === 'Escape') setIsEditingPage(false);
  };
  const handlePageInputBlur = () => {
    const p = parseInt(editPageValue, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) setCurrentPage(p);
    setIsEditingPage(false);
  };

  // ── Selection ─────────────────────────────────────────────────────────────
  const toggleSelectionMode = () => { setSelectionMode((s) => !s); setSelectedFiles([]); };
  const handleSelectFile = (id) => {
    if (!selectionMode) return;
    setSelectedFiles((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };
  const toggleSelectAll = () => {
    const ids = (isPaginationEnabled ? paginatedFiles : displayFiles).map((f) => f._id);
    const allSel = ids.every((id) => selectedFiles.includes(id)) && ids.length > 0;
    if (allSel) setSelectedFiles((prev) => prev.filter((id) => !ids.includes(id)));
    else setSelectedFiles((prev) => Array.from(new Set([...prev, ...ids])));
  };
  const allSelected = (isPaginationEnabled ? paginatedFiles : displayFiles).every((f) => selectedFiles.includes(f._id))
    && (isPaginationEnabled ? paginatedFiles : displayFiles).length > 0;

  // ── Batch: Remove from folder ─────────────────────────────────────────────
  const batchRemoveFromFolder = async () => {
    setBatchOperationLoading(true);
    try {
      for (const id of selectedFiles) await onRemoveFile(String(folder._id), String(id));
      setShowRemoveConfirmModal(false); setSelectionMode(false); setSelectedFiles([]);
    } catch (err) { console.error(err); }
    finally { setBatchOperationLoading(false); }
  };

  // ── Batch: Download ───────────────────────────────────────────────────────
  const batchDownload = async () => {
    if (!selectedFiles.length || batchOperationLoading) return;
    setBatchOperationLoading(true); setShowBatchDownloadProgress(true); setBatchDownloadProgress(0);
    try {
      const zip = new JSZip();
      const toZip = folderFiles.filter((f) => selectedFiles.includes(f._id));
      let done = 0;
      for (const file of toZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
        zip.file(file.filename, res.data);
        setBatchDownloadProgress(Math.round((++done / toZip.length) * 100));
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${folder.name || 'folder'}_files.zip`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
    finally { setBatchOperationLoading(false); setTimeout(() => { setShowBatchDownloadProgress(false); setBatchDownloadProgress(0); }, 1500); }
  };

  // ── Batch: Share ──────────────────────────────────────────────────────────
  const batchShare = async () => {
    if (!selectedFiles.length || batchOperationLoading) return;
    setBatchOperationLoading(true); setBatchShareLink(''); setCopied(false); setShowBatchShareModal(true);
    try {
      const zip = new JSZip();
      const toZip = folderFiles.filter((f) => selectedFiles.includes(f._id));
      for (const file of toZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
        zip.file(file.filename, res.data);
      }
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      const fd = new FormData(); fd.append('zipFile', blob, `AIRSTREAM${Date.now()}${rand}.zip`);
      const up = await axios.post(`${backendUrl}/api/files/share-zip`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (!up.data?.url) throw new Error('No URL');
      setBatchShareLink(up.data.url);
    } catch (err) { console.error(err); setShowBatchShareModal(false); }
    finally { setBatchOperationLoading(false); }
  };

  // ── Batch: Delete ─────────────────────────────────────────────────────────
  const batchDelete = async () => {
    setBatchOperationLoading(true);
    try {
      await Promise.allSettled(selectedFiles.map((id) => axios.delete(`${backendUrl}/api/files/${id}`)));
      setShowDeleteConfirmModal(false); setSelectionMode(false); setSelectedFiles([]);
      if (refresh) refresh();
    } catch (err) { console.error(err); }
    finally { setBatchOperationLoading(false); }
  };

  const copyToClipboard = async () => {
    if (!batchShareLink) return;
    try { await navigator.clipboard.writeText(batchShareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex flex-col" role="dialog" aria-modal="true" aria-label={`Folder: ${folder.name}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Full-screen panel — grid background matching App.jsx */}
      <div
        className={cn('relative z-10 flex flex-col h-full w-full', darkMode ? 'text-gray-200' : 'text-gray-800')}
        style={{
          backgroundImage: darkMode
            ? `linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)`
            : `linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)`,
          backgroundSize: '30px 30px',
          backgroundColor: darkMode ? '#0f172a' : '#ffffff',
        }}>

        {/* Top bar */}
        <div className={cn('flex items-center gap-3 px-4 py-3 border-b flex-shrink-0 shadow-sm backdrop-blur-md', darkMode ? 'border-gray-700 bg-gray-900/90' : 'border-gray-200 bg-white/90')}>
          <FolderSVG color={folder.color} className="w-7 h-7 flex-shrink-0" />
          <div className="min-w-0 flex-grow">
            <h2 className={cn('font-semibold text-base truncate leading-tight', darkMode ? 'text-white' : 'text-gray-900')}>{folder.name}</h2>
            <p className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>{folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''} · {visible.length} visible</p>
          </div>
          <button onClick={onClose} className={cn('p-2 rounded-full transition-colors flex-shrink-0', darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}>
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-4 w-full mx-auto max-w-7xl">

            {/* Dashboard-style card wrapping all content */}
            <div className={cn('rounded-xl border shadow-lg overflow-hidden', darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200')}>

              {/* Card header */}
              <div className={cn('flex items-center justify-between px-5 py-4 border-b', darkMode ? 'border-gray-700' : 'border-gray-200')}>
                <div className="flex items-center gap-2">
                  <FolderSVG color={folder.color} className="w-5 h-5 flex-shrink-0" />
                  <h2 className={cn('font-semibold text-base', darkMode ? 'text-white' : 'text-gray-900')}>{folder.name}</h2>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>
                    {visible.length} item{visible.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
                  </span>
                </div>
                <button onClick={onClose}
                  className={cn('p-1.5 rounded-lg transition-colors flex-shrink-0', darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800')}
                  aria-label="Close folder">
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Controls row */}
              <div className={cn('px-5 py-3 border-b', darkMode ? 'border-gray-700' : 'border-gray-200')}>
                <div className="flex flex-col md:flex-row gap-3 items-center justify-between flex-wrap">
                  {/* Search */}
                  <div className="relative flex-grow w-full md:w-auto md:flex-grow-[2]">
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', darkMode ? 'text-gray-400' : 'text-gray-500')} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <input type="text" placeholder="" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                      className={cn('w-full pl-10 pr-4 py-2 rounded-lg border text-sm transition-colors duration-200',
                        darkMode ? 'bg-gray-800 text-white border-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500'
                          : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-gray-400')}
                      aria-label="Search files" />
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end flex-shrink-0">

                {/* Pagination Toggle */}
                <button onClick={() => setIsPaginationEnabled((p) => !p)}
                  className={cn('w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
                    isPaginationEnabled ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
                  title={isPaginationEnabled ? 'Disable Pagination' : 'Enable Pagination'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {isPaginationEnabled ? <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />}
                  </svg>
                </button>

                {/* Selection Mode Toggle */}
                <button onClick={toggleSelectionMode}
                  className={cn('w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
                    selectionMode ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
                  title={selectionMode ? 'Exit selection mode' : 'Select multiple files'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {selectionMode ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" />}
                  </svg>
                </button>

                {/* Metadata Toggle */}
                <button onClick={() => setShowMetadata((m) => !m)}
                  className={cn('w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
                    showMetadata ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
                  title={showMetadata ? 'Hide Details' : 'Show Details'}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>

                {/* Sort / Filter */}
                <div className="relative">
                  <button ref={sortButtonRef} onClick={() => setShowSortOptions((s) => !s)}
                    className={cn('w-9 h-9 flex items-center justify-center rounded-md transition-colors duration-200',
                      showSortOptions ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600') : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'))}
                    aria-label="Sort and filter" aria-expanded={showSortOptions} title="Sort & Filter">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4M16 15l-4 4-4-4" /></svg>
                  </button>
                  {showSortOptions && (
                    <div ref={sortOptionsRef}
                      className={cn('absolute right-0 mt-1 w-48 rounded-xl shadow-xl border z-30 overflow-y-auto max-h-52 sort-scrollbar divide-y',
                        darkMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-200')}
                      role="menu">
                      <div>
                        <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                        {[{ label: 'Default', id: 'default' }, { label: 'Oldest', id: 'date' }, { label: 'Name (A-Z)', id: 'name-asc' }, { label: 'Name (Z-A)', id: 'name-desc' }, { label: 'Larger Files', id: 'size-desc' }, { label: 'Smaller Files', id: 'size-asc' }].map((opt) => (
                          <button key={opt.id} onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }}
                            className={cn('flex items-center w-full px-4 py-2 text-sm text-left transition-colors',
                              sortOption === opt.id ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'))}
                            role="menuitemradio" aria-checked={sortOption === opt.id}>{opt.label}</button>
                        ))}
                      </div>
                      <div>
                        <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                        {['all', 'image', 'video', 'audio', 'document', 'other'].map((type) => (
                          <button key={type} onClick={() => { setFilter(type); setShowSortOptions(false); }}
                            className={cn('flex items-center w-full px-4 py-2 text-sm text-left transition-colors',
                              filter === type ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium') : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'))}
                            role="menuitemradio" aria-checked={filter === type}>{type.charAt(0).toUpperCase() + type.slice(1)}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* View Toggle */}
                <div className={cn('flex items-center rounded-md overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                  <button onClick={() => setView('list')} className={cn('p-2 transition-colors duration-200', view === 'list' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'))} aria-label="List view" title="List View">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  </button>
                  <button onClick={() => setView('grid')} className={cn('p-2 transition-colors duration-200', view === 'grid' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : (darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'))} aria-label="Grid view" title="Grid View">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                </div>
                  </div>{/* end action buttons */}
                </div>{/* end flex row */}
              </div>{/* end controls row */}

              {/* Card body — batch bar + files + pagination */}
              <div className="px-5 py-4">

            {/* Batch bar */}
            {selectionMode && (
              <div className={cn('mb-4 p-3 rounded-lg border transition-all duration-300', darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200')}>
                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4 flex-wrap">
                  <div className="w-full md:w-auto">
                    <button onClick={toggleSelectAll}
                      className={cn('w-full md:w-auto py-2 px-4 rounded-md text-sm font-medium border transition-colors duration-200',
                        allSelected
                          ? `border-red-400 ${darkMode ? 'text-red-400 bg-gray-700 hover:bg-gray-600' : 'text-red-600 bg-white hover:bg-red-50'}`
                          : `border-blue-400 ${darkMode ? 'text-blue-300 bg-gray-700 hover:bg-gray-600' : 'text-blue-600 bg-white hover:bg-blue-50'}`)}>
                      {allSelected ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className={cn('text-sm flex-grow text-center md:text-left order-last md:order-none w-full md:w-auto pt-2 md:pt-0', darkMode ? 'text-gray-400' : 'text-gray-600')}>
                    {selectedFiles.length > 0 && isPaginationEnabled
                      ? `${selectedFiles.length} of ${visible.length} total items selected till this page.`
                      : `${selectedFiles.length} of ${isPaginationEnabled ? paginatedFiles.length : displayFiles.length} selected.`}
                  </div>
                  <div className="w-full md:w-auto flex flex-wrap justify-center md:justify-end gap-2">
                    {/* Download */}
                    <button onClick={batchDownload} disabled={!selectedFiles.length || batchOperationLoading}
                      className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors duration-200',
                        !selectedFiles.length || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      <span className="hidden sm:inline">Download</span> ({selectedFiles.length})
                    </button>
                    {/* Share */}
                    <button onClick={batchShare} disabled={!selectedFiles.length || batchOperationLoading}
                      className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors duration-200',
                        !selectedFiles.length || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      <span className="hidden sm:inline">Share</span> ({selectedFiles.length})
                    </button>
                    {/* Remove from Folder */}
                    <button onClick={() => setShowRemoveConfirmModal(true)} disabled={!selectedFiles.length || batchOperationLoading}
                      className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors duration-200',
                        !selectedFiles.length || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-orange-700 hover:bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6" /></svg>
                      <span className="hidden sm:inline">Remove</span> ({selectedFiles.length})
                    </button>
                    {/* Delete */}
                    <button onClick={() => setShowDeleteConfirmModal(true)} disabled={!selectedFiles.length || batchOperationLoading}
                      className={cn('flex-1 md:flex-initial px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 transition-colors duration-200',
                        !selectedFiles.length || batchOperationLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'))}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      <span className="hidden sm:inline">Delete</span> ({selectedFiles.length})
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Batch download progress */}
            {showBatchDownloadProgress && (
              <div className={cn('mb-4 p-3 rounded-lg border', darkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200')}>
                <div className="flex items-center gap-3">
                  <SpinnerIcon className="h-4 w-4 text-blue-500" />
                  <div className={cn('flex-grow rounded-full h-2', darkMode ? 'bg-gray-700' : 'bg-blue-200')}>
                    <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${batchDownloadProgress}%` }} />
                  </div>
                  <span className={cn('text-xs font-medium w-10 text-right', darkMode ? 'text-gray-400' : 'text-blue-700')}>{batchDownloadProgress}%</span>
                </div>
              </div>
            )}

            {/* File display */}
            <div className="min-h-[250px]">
              {folderFiles.length === 0 ? (
                <div className={cn('text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]', darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50')}>
                  <FolderSVG color={darkMode ? '#374151' : '#d1d5db'} className="w-12 h-12 mx-auto mb-3" />
                  <h3 className="text-lg font-medium mb-1 text-gray-500">This folder is empty</h3>
                  <p className="text-sm text-gray-400">Select files in your file list and use<br /><strong>"Add to Folder"</strong> to organize them here.</p>
                </div>
              ) : paginatedFiles.length > 0 ? (
                <div className={cn('grid gap-4', view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1')}>
                  {paginatedFiles.map((file) => (
                    <FileItem
                      key={file._id} file={file} darkMode={darkMode} showDetails={showMetadata}
                      viewType={view} onSelect={handleSelectFile}
                      isSelected={selectedFiles.includes(file._id)} selectionMode={selectionMode} refresh={refresh} />
                  ))}
                </div>
              ) : (
                <div className={cn('text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]', darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50')}>
                  <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                  <h3 className="text-lg font-medium mb-1 text-gray-500">No files found</h3>
                  <p className="text-sm text-gray-400">{searchInput ? 'Try adjusting your search or filter.' : 'No files match this filter.'}</p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {isPaginationEnabled && visible.length > 0 && (
              <div className={cn('flex items-center justify-center gap-2 sm:gap-3 mt-8', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                <button onClick={handlePreviousPage} disabled={currentPage === 1}
                  className={cn('p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2',
                    currentPage === 1
                      ? (darkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                      : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300'))}
                  aria-label="Previous Page">
                  <ArrowLeftIcon className="w-5 h-5" />
                </button>
                <span className="text-sm text-center mx-1">
                  <span className="hidden md:inline">Page </span>
                  {isEditingPage ? (
                    <input ref={pageInputRef} type="number" min="1" max={totalPages} value={editPageValue}
                      onChange={(e) => setEditPageValue(e.target.value)} onKeyDown={handlePageInputKeyDown} onBlur={handlePageInputBlur}
                      className={cn('w-16 text-center p-1.5 rounded-md text-sm border', darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-blue-500 focus:border-blue-500' : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-600 focus:border-blue-600')} />
                  ) : (
                    <span className={cn('font-medium px-2 py-1 rounded-md cursor-pointer hover:underline', darkMode ? 'text-gray-200 hover:text-white' : 'text-gray-800 hover:text-blue-600')} onClick={handlePageClick} title="Click to jump to page">{currentPage}</span>
                  )}
                  <span className={cn(darkMode ? 'text-gray-400' : 'text-gray-600')}> / {totalPages}</span>
                </span>
                <button onClick={handleNextPage} disabled={currentPage === totalPages || totalPages === 0}
                  className={cn('p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center focus:outline-none focus:ring-2',
                    currentPage === totalPages || totalPages === 0
                      ? (darkMode ? 'bg-gray-800 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                      : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300'))}
                  aria-label="Next Page">
                  <ArrowRightIcon className="w-5 h-5" />
                </button>
              </div>
            )}

              </div>{/* end card body */}
            </div>{/* end dashboard card */}

          </div>
        </div>

        {/* CSS */}
        <style>{`
          .sort-scrollbar::-webkit-scrollbar{width:5px;height:5px}
          .sort-scrollbar::-webkit-scrollbar-track{background:transparent}
          .sort-scrollbar::-webkit-scrollbar-thumb{background-color:#6b7280;border-radius:9999px}
          .sort-scrollbar::-webkit-scrollbar-thumb:hover{background-color:#9ca3af}
          .sort-scrollbar{scrollbar-width:thin;scrollbar-color:#6b7280 transparent}
        `}</style>
      </div>

      {/* ── Sub-modals (z-[60]) ── */}

      {/* Delete Confirm */}
      {showDeleteConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div ref={deleteConfirmModalRef} className={cn('p-6 rounded-lg shadow-xl max-w-md w-full border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true">
            <h2 className="font-semibold text-lg mb-4">Confirm Deletion</h2>
            <p className="text-sm mb-6">Permanently delete {selectedFiles.length} selected {selectedFiles.length === 1 ? 'item' : 'items'}? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirmModal(false)} disabled={batchOperationLoading} className={cn('flex-1 px-4 py-2 rounded-md font-medium text-sm', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>Cancel</button>
              <button onClick={batchDelete} disabled={batchOperationLoading} className="flex-1 px-4 py-2 rounded-md font-medium text-sm bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2">
                {batchOperationLoading && <SpinnerIcon />} {batchOperationLoading ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm */}
      {showRemoveConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div ref={removeConfirmRef} className={cn('p-6 rounded-lg shadow-xl max-w-md w-full border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true">
            <h2 className="font-semibold text-lg mb-4">Remove from Folder</h2>
            <p className="text-sm mb-6">Remove {selectedFiles.length} selected {selectedFiles.length === 1 ? 'file' : 'files'} from "<strong>{folder.name}</strong>"? Files won't be deleted.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRemoveConfirmModal(false)} disabled={batchOperationLoading} className={cn('flex-1 px-4 py-2 rounded-md font-medium text-sm', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>Cancel</button>
              <button onClick={batchRemoveFromFolder} disabled={batchOperationLoading} className="flex-1 px-4 py-2 rounded-md font-medium text-sm bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center gap-2">
                {batchOperationLoading && <SpinnerIcon />} {batchOperationLoading ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Share */}
      {showBatchShareModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div ref={batchShareModalRef} className={cn('p-6 rounded-xl shadow-2xl max-w-sm w-full border animate-modalIn', darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="dialog" aria-modal="true">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">Share Files</h2>
              <button onClick={() => setShowBatchShareModal(false)} className={cn('p-1.5 rounded-full', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}><CloseIcon className="h-4 w-4" /></button>
            </div>
            {batchOperationLoading ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <SpinnerIcon className="h-8 w-8 text-blue-500" />
                <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>Creating share link…</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <input readOnly value={batchShareLink} onClick={(e) => e.target.select()}
                  className={cn('w-full px-3 py-2 rounded-md border text-sm', darkMode ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-gray-50 border-gray-300 text-gray-700')} />
                <button onClick={copyToClipboard} disabled={!batchShareLink}
                  className={cn('w-full px-4 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                    copied ? 'bg-green-600 text-white' : (!batchShareLink ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')))}>
                  {copied ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> : 'Copy Link'}
                </button>
                {batchShareLink && <p className={cn('text-xs text-center', darkMode ? 'text-gray-400' : 'text-gray-500')}>Anyone with this link can access the selected file{selectedFiles.length > 1 ? 's' : ''}.</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// View All Folders Modal
// ─────────────────────────────────────────────────────────────────────────────
const ViewAllFoldersModal = ({ darkMode, folders, onClose, onView, onEdit, onDeleteRequest }) => {
  const [search, setSearch] = useState('');
  const [openOptionsId, setOpenOptionsId] = useState(null);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);

  const filtered = search.trim() ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase())) : folders;
  const toggleOptions = useCallback((id) => setOpenOptionsId((p) => (p === id ? null : id)), []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    const onResize = () => setIsMobile(window.innerWidth < 640);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => { document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onResize); };
  }, [onClose]);

  // Mobile  → panel capped at 50 vh (bottom-sheet style); grid fills remaining space and scrolls
  // Desktop → panel capped at 85 vh; grid area capped at ~360 px (≈9 cards across 3-4 cols) then scrolls
  const panelMaxHeight  = isMobile ? '50vh'  : '85vh';
  const gridMaxHeight   = isMobile ? undefined : '360px';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn('relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border flex flex-col folder-modal-anim', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}
        style={{ maxHeight: panelMaxHeight }}
      >
        {/* ── Header — always visible ─────────────────────────────────────── */}
        <div className={cn('flex items-center gap-3 px-5 py-4 border-b flex-shrink-0', darkMode ? 'border-gray-700' : 'border-gray-200')}>
          <FolderSVG color={darkMode ? '#fff' : '#1f2937'} className="w-6 h-6" />
          <h2 className={cn('font-semibold text-base flex-grow', darkMode ? 'text-white' : 'text-gray-900')}>
            All Folders <span className={cn('ml-2 text-xs px-2 py-0.5 rounded-full', darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>{folders.length}</span>
          </h2>
          <button onClick={onClose} className={cn('p-1.5 rounded-full transition-colors flex-shrink-0', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')} aria-label="Close"><CloseIcon /></button>
        </div>

        {/* ── Search bar — always visible ──────────────────────────────────── */}
        <div className={cn('px-5 py-3 border-b flex-shrink-0', darkMode ? 'border-gray-700/60' : 'border-gray-100')}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-4 w-4', darkMode ? 'text-gray-500' : 'text-gray-400')} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input type="text" placeholder="" value={search} onChange={(e) => setSearch(e.target.value)}
              className={cn('w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors', darkMode ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400 focus:ring-1 focus:ring-blue-500')} />
          </div>
        </div>

        {/* ── Folder grid — scrollable ─────────────────────────────────────── */}
        <div
          className="overflow-y-auto px-5 py-4"
          style={{ maxHeight: gridMaxHeight, flex: isMobile ? '1' : 'none' }}
        >
          {filtered.length === 0 ? (
            <div className={cn('text-center py-10 text-sm', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              {search ? `No folders matching "${search}"` : 'No folders yet'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((folder) => (
                <FolderCard key={folder._id} folder={folder} darkMode={darkMode}
                  isOptionsOpen={openOptionsId === String(folder._id)} onToggleOptions={() => toggleOptions(String(folder._id))}
                  onView={() => { onView(folder); onClose(); }} onEdit={() => { onEdit(folder); onClose(); }} onDeleteRequest={() => { onDeleteRequest(folder); onClose(); }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Folder Form Modal
// ─────────────────────────────────────────────────────────────────────────────
const FolderFormModal = ({ mode, initialName, initialColor, darkMode, onConfirm, onClose }) => {
  const [name, setName] = useState(initialName || '');
  const [color, setColor] = useState(initialColor || '#6366f1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 80); }, []);
  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter a folder name.'); return; }
    setBusy(true); setError('');
    try { await onConfirm(name.trim(), color); }
    catch (err) { setError(err?.response?.data?.error || 'Something went wrong.'); setBusy(false); }
  };
  const isCreate = mode === 'create';
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-sm rounded-2xl shadow-2xl p-6 border folder-modal-anim', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}>
        <button type="button" onClick={onClose} className={cn('absolute top-3 right-3 p-1.5 rounded-full transition-colors', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}><CloseIcon className="h-4 w-4" /></button>
        <h2 className={cn('font-semibold text-base mb-4', darkMode ? 'text-white' : 'text-gray-900')}>{isCreate ? 'Create Folder' : 'Edit Folder'}</h2>
        <label className={cn('block text-xs font-medium mb-1', darkMode ? 'text-gray-400' : 'text-gray-600')}>Folder Name</label>
        <input ref={inputRef} type="text" value={name} onChange={(e) => { setName(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleSubmit()} placeholder="My Folder" maxLength={80}
          className={cn('w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors', darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500' : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-600')} />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        <ColorPicker selected={color} onSelect={setColor} darkMode={darkMode} />
        <div className="flex gap-2 mt-5">
          <button type="button" onClick={onClose} disabled={busy} className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>Cancel</button>
          <button type="button" onClick={handleSubmit} disabled={!name.trim() || busy}
            className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors', !name.trim() || busy ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700')}>
            {busy && <SpinnerIcon className="h-4 w-4" />}
            {busy ? (isCreate ? 'Creating…' : 'Saving…') : (isCreate ? 'Create Folder' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({ folder, darkMode, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);
  const handleDelete = async () => { setBusy(true); await onConfirm(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative z-10 w-full max-w-xs rounded-2xl shadow-2xl p-6 border folder-modal-anim text-center', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}>
        <div className={cn('inline-flex p-3 rounded-full mb-4', darkMode ? 'bg-red-900/40' : 'bg-red-50')}><TrashIcon className="h-7 w-7 text-red-500" /></div>
        <h3 className={cn('font-semibold text-base mb-2', darkMode ? 'text-white' : 'text-gray-900')}>Delete "{folder?.name}"?</h3>
        <p className={cn('text-sm mb-5 leading-relaxed', darkMode ? 'text-gray-400' : 'text-gray-600')}>The folder will be permanently deleted.<br /><span className="font-medium">Your files will not be affected.</span></p>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} disabled={busy} className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>Cancel</button>
          <button type="button" onClick={handleDelete} disabled={busy} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2">
            {busy && <SpinnerIcon className="h-4 w-4" />}{busy ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main FolderList Component
// ─────────────────────────────────────────────────────────────────────────────
const FolderList = ({ darkMode, files = [], folders = [], onFoldersChanged, refresh }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [isVisible, setIsVisible] = useState(true);
  const [visibleCount, setVisibleCount] = useState(4);
  const [gridCols, setGridCols]   = useState('grid-cols-2');

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280)      { setVisibleCount(12); setGridCols('grid-cols-6'); }
      else if (w >= 1024) { setVisibleCount(10); setGridCols('grid-cols-5'); }
      else if (w >= 768)  { setVisibleCount(8);  setGridCols('grid-cols-4'); }
      else if (w >= 640)  { setVisibleCount(6);  setGridCols('grid-cols-3'); }
      else                { setVisibleCount(4);  setGridCols('grid-cols-2'); }
    };
    calc(); window.addEventListener('resize', calc); return () => window.removeEventListener('resize', calc);
  }, []);

  const [showViewAll,   setShowViewAll]   = useState(false);
  const [openOptionsId, setOpenOptionsId] = useState(null);
  const [createModal,   setCreateModal]   = useState(false);
  const [editTarget,    setEditTarget]    = useState(null);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [viewTarget,    setViewTarget]    = useState(null);

  const toggleOptions = useCallback((id) => setOpenOptionsId((p) => (p === id ? null : id)), []);

  // Sort by lastViewed desc so most-recently opened folders appear first
  const sortedFolders = [...folders].sort((a, b) => {
    if (!a.lastViewed && !b.lastViewed) return 0;
    if (!a.lastViewed) return 1;
    if (!b.lastViewed) return -1;
    return new Date(b.lastViewed) - new Date(a.lastViewed);
  });

  const displayedFolders = sortedFolders.slice(0, visibleCount);
  const hasMore = sortedFolders.length > visibleCount;

  // Records lastViewed on the backend (persists cross-device/session) then opens folder
  const handleViewFolder = useCallback(async (folder) => {
    setViewTarget(folder);
    setOpenOptionsId(null);
    try {
      await axios.patch(`${backendUrl}/api/folders/${folder._id}`, { lastViewed: new Date().toISOString() });
      onFoldersChanged();
    } catch (_) { /* non-critical, fail silently */ }
  }, [backendUrl, onFoldersChanged]);

  const handleCreate = async (name, color) => {
    await axios.post(`${backendUrl}/api/folders`, { name, color });
    setCreateModal(false); await onFoldersChanged();
  };
  const handleEdit = async (name, color) => {
    await axios.patch(`${backendUrl}/api/folders/${editTarget._id}`, { name, color });
    if (viewTarget && String(viewTarget._id) === String(editTarget._id)) setViewTarget((p) => ({ ...p, name, color }));
    setEditTarget(null); setOpenOptionsId(null); await onFoldersChanged();
  };
  const handleDelete = async () => {
    await axios.delete(`${backendUrl}/api/folders/${deleteTarget._id}`);
    if (viewTarget && String(viewTarget._id) === String(deleteTarget._id)) setViewTarget(null);
    setDeleteTarget(null); setOpenOptionsId(null); await onFoldersChanged();
  };
  const handleRemoveFileFromFolder = async (folderId, fileId) => {
    await axios.delete(`${backendUrl}/api/folders/${folderId}/files/${fileId}`);
    if (viewTarget && String(viewTarget._id) === folderId) setViewTarget((p) => p ? { ...p, fileIds: p.fileIds.filter((id) => id !== fileId) } : null);
    await onFoldersChanged();
  };
  useEffect(() => {
    if (viewTarget) { const u = folders.find((f) => String(f._id) === String(viewTarget._id)); if (u) setViewTarget(u); }
  }, [folders]);

  if (!isVisible) return null;

  return (
    <div className={cn('transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border', darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200')}>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderSVG color={darkMode ? '#fff' : '#1f2937'} className="w-5 h-5" />
          <h2 className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>Folders</h2>
          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>{folders.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCreateModal(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors">
            <PlusIcon /><span className="hidden sm:inline">New Folder</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {folders.length === 0 ? (
        <div className={cn('text-center py-8 rounded-xl border-2 border-dashed', darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400')}>
          <FolderSVG color={darkMode ? '#374151' : '#d1d5db'} className="w-10 h-10 mx-auto mb-2" />
          <p className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>No folders yet</p>
          <p className="text-xs mt-1">Create a folder to start organizing your files</p>
          <button type="button" onClick={() => setCreateModal(true)} className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
            <PlusIcon /> Create Folder
          </button>
        </div>
      ) : (
        <>
          <div className={cn('grid gap-3', gridCols)}>
            {displayedFolders.map((folder) => (
              <FolderCard key={folder._id} folder={folder} darkMode={darkMode}
                isOptionsOpen={openOptionsId === String(folder._id)}
                onToggleOptions={() => toggleOptions(String(folder._id))}
                onView={() => handleViewFolder(folder)}
                onEdit={() => { setEditTarget(folder); setOpenOptionsId(null); }}
                onDeleteRequest={() => { setDeleteTarget(folder); setOpenOptionsId(null); }} />
            ))}
          </div>
          {hasMore && (
            <button type="button" onClick={() => setShowViewAll(true)}
              className={cn('mt-3 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all border-2 border-dashed',
                darkMode ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/10' : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50')}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
              View All Folders ({folders.length})
            </button>
          )}
        </>
      )}

      {/* Modals */}
      {createModal  && <FolderFormModal mode="create" initialName="" initialColor="#6366f1" darkMode={darkMode} onConfirm={handleCreate} onClose={() => setCreateModal(false)} />}
      {editTarget   && <FolderFormModal mode="edit" initialName={editTarget.name} initialColor={editTarget.color} darkMode={darkMode} onConfirm={handleEdit} onClose={() => { setEditTarget(null); setOpenOptionsId(null); }} />}
      {deleteTarget && <DeleteConfirmModal folder={deleteTarget} darkMode={darkMode} onConfirm={handleDelete} onClose={() => { setDeleteTarget(null); setOpenOptionsId(null); }} />}
      {viewTarget   && <FolderViewModal folder={viewTarget} allFiles={files} darkMode={darkMode} backendUrl={backendUrl} onClose={() => setViewTarget(null)} onRemoveFile={handleRemoveFileFromFolder} onFoldersChanged={onFoldersChanged} refresh={refresh} />}
      {showViewAll  && <ViewAllFoldersModal darkMode={darkMode} folders={sortedFolders} onClose={() => setShowViewAll(false)} onView={(f) => { handleViewFolder(f); setOpenOptionsId(null); }} onEdit={(f) => { setEditTarget(f); setOpenOptionsId(null); }} onDeleteRequest={(f) => { setDeleteTarget(f); setOpenOptionsId(null); }} />}

      <style>{`
        @keyframes folderModalIn{from{opacity:0;transform:scale(0.95) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .folder-modal-anim{animation:folderModalIn 0.22s ease-out}
        @keyframes folderDropIn{from{opacity:0;transform:translateY(-6px) scale(0.97)}to{opacity:1;transform:translateY(0) scale(1)}}
        .folder-dropdown-anim{animation:folderDropIn 0.15s ease-out}
        @keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .animate-modalIn{animation:modalIn 0.25s ease-out}
      `}</style>
    </div>
  );
};

export default FolderList;
