// src/components/FolderList.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useLayoutEffect,
} from 'react';
import axios from 'axios';

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

const FILE_TYPE_EMOJI = {
  image:    '🖼️',
  video:    '🎬',
  audio:    '🎵',
  pdf:      '📄',
  document: '📝',
  archive:  '🗜️',
  code:     '💻',
  other:    '📦',
};

const getFileType = (file) => {
  const mime = file?.metadata?.type || file?.contentType || '';
  const name = file?.filename || '';
  const ext  = name.split('.').pop()?.toLowerCase() || '';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime === 'application/pdf' || ext === 'pdf') return 'pdf';
  if (['doc','docx','xls','xlsx','ppt','pptx','odt','ods','txt','rtf','csv'].includes(ext)) return 'document';
  if (['zip','rar','7z','tar','gz','bz2'].includes(ext)) return 'archive';
  if (['js','jsx','ts','tsx','html','css','py','rb','java','c','cpp','go','rs','json','xml'].includes(ext)) return 'code';
  return 'other';
};

const formatSize = (bytes) => {
  if (bytes === null || bytes === undefined || bytes < 0) return 'N/A';
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 2)) + ' ' + sizes[i];
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? 'N/A' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// ─────────────────────────────────────────────────────────────────────────────
// Icon Components
// ─────────────────────────────────────────────────────────────────────────────
const FolderSVG = ({ color = '#6366f1', className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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

const CloseIcon = ({ className = 'h-4 w-4' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = ({ darkMode }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-3.5 w-3.5', darkMode ? 'text-gray-500' : 'text-gray-400')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
);

const DownloadIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
  </svg>
);

const ShareIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
  </svg>
);

const RemoveFromFolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 01-8 0m8 0a4 4 0 00-8 0m8 0v1M5 7v1m0 0v9a2 2 0 002 2h10a2 2 0 002-2V8M5 8H3m2 0h14m0 0H19" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6m4-6v6" />
  </svg>
);

const FolderSmallIcon = ({ color = '#6366f1' }) => (
  <svg className="h-3 w-3 flex-shrink-0" viewBox="0 0 24 24" fill="none">
    <path d="M3 7C3 5.89543 3.89543 5 5 5H10.5858C10.851 5 11.1054 5.10536 11.2929 5.29289L12.7071 6.70711C12.8946 6.89464 13.149 7 13.4142 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
      fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const GridIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Color picker
// ─────────────────────────────────────────────────────────────────────────────
const ColorPicker = ({ selected, onSelect, darkMode }) => (
  <div className="mt-3">
    <label className={cn('block text-xs font-medium mb-2', darkMode ? 'text-gray-400' : 'text-gray-600')}>
      Folder Color
    </label>
    <div className="flex flex-wrap gap-2">
      {FOLDER_COLORS.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onSelect(c.value)}
          title={c.name}
          className={cn(
            'w-7 h-7 rounded-full transition-all duration-150 border-2 focus:outline-none focus:ring-2 focus:ring-offset-1',
            selected === c.value
              ? 'border-white scale-125 shadow-lg ring-2 ring-white/30'
              : 'border-transparent hover:scale-110 hover:shadow-md',
            darkMode ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
          )}
          style={{ backgroundColor: c.value }}
          aria-label={`${c.name} color`}
          aria-pressed={selected === c.value}
        />
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Folder Card Options Dropdown (with smart positioning)
// ─────────────────────────────────────────────────────────────────────────────
const FolderOptionsDropdown = ({ darkMode, onView, onEdit, onDelete, onClose }) => {
  const dropRef = useRef(null);
  const [posStyle, setPosStyle] = useState({ right: 0, top: '100%' });

  useLayoutEffect(() => {
    if (!dropRef.current) return;
    const rect = dropRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let style = {};

    // Horizontal: if overflows right, align to left instead
    if (rect.right > vw - 8) {
      style.right = 'auto';
      style.left = 0;
    } else {
      style.right = 0;
      style.left = 'auto';
    }

    // Vertical: if overflows bottom, show above
    if (rect.bottom > vh - 8) {
      style.top = 'auto';
      style.bottom = '100%';
    } else {
      style.top = '100%';
      style.bottom = 'auto';
    }

    setPosStyle(style);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={dropRef}
      style={posStyle}
      className={cn(
        'absolute w-44 rounded-xl border shadow-2xl z-[9999] overflow-hidden',
        'folder-dropdown-anim',
        darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
      )}
      role="menu"
    >
      <button
        onClick={onView}
        className={cn(
          'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors',
          darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
        )}
        role="menuitem"
      >
        <EyeIcon /> View Files
      </button>
      <button
        onClick={onEdit}
        className={cn(
          'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors',
          darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50'
        )}
        role="menuitem"
      >
        <PencilIcon /> Rename / Color
      </button>
      <div className={cn('my-0.5 border-t', darkMode ? 'border-gray-700' : 'border-gray-100')} />
      <button
        onClick={onDelete}
        className={cn(
          'w-full px-3 py-2.5 text-left text-sm flex items-center gap-2.5 transition-colors text-red-500',
          darkMode ? 'hover:bg-red-900/25' : 'hover:bg-red-50'
        )}
        role="menuitem"
      >
        <TrashIcon className="h-4 w-4" /> Delete
      </button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Single Folder Card
// ─────────────────────────────────────────────────────────────────────────────
const FolderCard = ({ folder, darkMode, isOptionsOpen, onToggleOptions, onView, onEdit, onDeleteRequest }) => {
  const fileCount = folder.fileIds?.length || 0;
  const cardRef = useRef(null);

  return (
    <div
      ref={cardRef}
      className={cn(
        'relative group rounded-xl border transition-all duration-200 cursor-pointer select-none',
        'flex flex-col items-center gap-2 text-center',
        'p-3 sm:p-2.5',
        darkMode
          ? 'bg-gray-800 border-gray-700 hover:border-gray-500 hover:bg-gray-750'
          : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-white',
        'hover:shadow-md hover:-translate-y-0.5',
        isOptionsOpen ? 'z-30' : 'z-10'
      )}
      onClick={onView}
      role="button"
      aria-label={`Open folder ${folder.name}`}
    >
      {/* Options trigger */}
      <div className="absolute top-1.5 right-1.5 z-10" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleOptions(); }}
          className={cn(
            'p-1 rounded-md transition-all',
            'opacity-0 group-hover:opacity-100 focus:opacity-100',
            isOptionsOpen && 'opacity-100',
            darkMode
              ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'
              : 'text-gray-400 hover:bg-gray-200 hover:text-gray-600'
          )}
          aria-label="Folder options"
          aria-haspopup="true"
          aria-expanded={isOptionsOpen}
        >
          <DotsIcon />
        </button>

        {isOptionsOpen && (
          <FolderOptionsDropdown
            darkMode={darkMode}
            onView={() => { onView(); onToggleOptions(); }}
            onEdit={() => { onEdit(); }}
            onDelete={() => { onDeleteRequest(); }}
            onClose={onToggleOptions}
          />
        )}
      </div>

      {/* Icon */}
      <FolderSVG color={folder.color} className="w-10 h-10 sm:w-10 sm:h-10 flex-shrink-0 mt-1" />

      {/* Name */}
      <span
        className={cn('text-xs font-medium leading-tight w-full truncate px-0.5', darkMode ? 'text-gray-200' : 'text-gray-700')}
        title={folder.name}
      >
        {folder.name}
      </span>

      {/* File count */}
      <span className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
        {fileCount} {fileCount === 1 ? 'file' : 'files'}
      </span>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Skeleton placeholder for loading state
// ─────────────────────────────────────────────────────────────────────────────
const FolderCardSkeleton = ({ darkMode }) => (
  <div
    className={cn(
      'rounded-xl border p-3 flex flex-col items-center gap-2 animate-pulse',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
    )}
  >
    <div className={cn('w-10 h-10 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2.5 w-3/4 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2 w-1/2 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: File item row inside FolderViewModal (full list-view style)
// ─────────────────────────────────────────────────────────────────────────────
const FolderFileRow = ({
  file, darkMode, backendUrl, isSelected, selectionMode, onToggleSelect,
  onRemove, removing, onDelete, onShareDone, refresh,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({ right: 0, top: '100%' });
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);

  const type = getFileType(file);
  const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;

  // Smart menu positioning
  useLayoutEffect(() => {
    if (!showMenu || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const style = {};
    style.right = rect.right > vw - 8 ? 'auto' : 0;
    style.left = rect.right > vw - 8 ? 0 : 'auto';
    style.top = rect.bottom > vh - 8 ? 'auto' : '100%';
    style.bottom = rect.bottom > vh - 8 ? '100%' : 'auto';
    setMenuPos(style);
  }, [showMenu]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) &&
          menuBtnRef.current && !menuBtnRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const handleDownload = async () => {
    setShowMenu(false);
    setIsDownloading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
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
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setShowMenu(false);
    setIsSharing(true);
    setShareLink('');
    setCopied(false);
    setShowShareModal(true);
    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
      setShareLink(res.data.url);
    } catch (err) {
      console.error('Share failed:', err);
      setShowShareModal(false);
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDeleteFile = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`);
      setShowDeleteConfirm(false);
      if (refresh) refresh();
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-3 p-2.5 rounded-xl border transition-all duration-150',
          isSelected
            ? darkMode ? 'bg-blue-900/30 border-blue-700' : 'bg-blue-50 border-blue-300'
            : darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300',
          selectionMode && 'cursor-pointer'
        )}
        onClick={() => selectionMode && onToggleSelect(String(file._id))}
      >
        {/* Selection indicator */}
        {selectionMode && (
          <div
            className={cn(
              'w-5 h-5 rounded-full flex items-center justify-center border-2 flex-shrink-0 transition-all',
              isSelected
                ? darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500'
                : darkMode ? 'border-gray-500' : 'border-gray-400'
            )}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Thumbnail */}
        <div
          className={cn(
            'w-11 h-11 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-lg',
            darkMode ? 'bg-gray-700' : 'bg-gray-200'
          )}
        >
          {type === 'image' ? (
            <img src={previewUrl} alt={file.filename} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="text-base">{FILE_TYPE_EMOJI[type] || '📦'}</span>
          )}
        </div>

        {/* File info */}
        <div className="flex-grow min-w-0">
          <p className={cn('text-sm font-medium truncate', darkMode ? 'text-gray-200' : 'text-gray-800')} title={file.filename}>
            {file.filename}
          </p>
          <p className={cn('text-xs mt-0.5', darkMode ? 'text-gray-500' : 'text-gray-400')}>
            {formatSize(file.length)} · {type} · {formatDate(file.uploadDate)}
          </p>
        </div>

        {/* Action buttons (non-selection mode) */}
        {!selectionMode && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Quick download */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              disabled={isDownloading}
              className={cn(
                'p-1.5 rounded-lg transition-colors hidden sm:flex items-center justify-center',
                darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-blue-400' : 'text-gray-400 hover:bg-gray-100 hover:text-blue-600'
              )}
              title="Download"
            >
              {isDownloading ? <SpinnerIcon className="h-4 w-4" /> : <DownloadIcon />}
            </button>

            {/* Kebab menu */}
            <div className="relative">
              <button
                ref={menuBtnRef}
                onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }}
                className={cn(
                  'p-1.5 rounded-lg transition-colors flex items-center justify-center',
                  showMenu
                    ? darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700'
                    : darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-100' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-700'
                )}
                aria-label="File options"
                title="Options"
              >
                <DotsIcon />
              </button>

              {showMenu && (
                <div
                  ref={menuRef}
                  style={menuPos}
                  className={cn(
                    'absolute w-44 rounded-xl border shadow-2xl z-[9999] overflow-hidden py-1',
                    'folder-dropdown-anim',
                    darkMode ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'
                  )}
                  role="menu"
                >
                  <button onClick={handleDownload} className={cn('w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5', darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')} role="menuitem">
                    <DownloadIcon /> Download
                  </button>
                  <button onClick={handleShare} className={cn('w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5', darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-50')} role="menuitem">
                    <ShareIcon /> Share
                  </button>
                  <div className={cn('my-0.5 border-t', darkMode ? 'border-gray-700' : 'border-gray-100')} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); onRemove(String(file._id)); }}
                    disabled={removing}
                    className={cn('w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5', darkMode ? 'text-orange-400 hover:bg-orange-900/20' : 'text-orange-600 hover:bg-orange-50')}
                    role="menuitem"
                  >
                    {removing ? <SpinnerIcon className="h-4 w-4" /> : <CloseIcon className="h-4 w-4" />}
                    Remove from Folder
                  </button>
                  <div className={cn('my-0.5 border-t', darkMode ? 'border-gray-700' : 'border-gray-100')} />
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }}
                    className={cn('w-full text-left px-3.5 py-2 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50')}
                    role="menuitem"
                  >
                    <TrashIcon className="h-4 w-4" /> Delete File
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4" onClick={() => setShowShareModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className={cn('relative z-10 w-full max-w-sm rounded-2xl shadow-2xl p-5 border folder-modal-anim', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setShowShareModal(false)} className={cn('absolute top-3 right-3 p-1.5 rounded-full', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}>
              <CloseIcon />
            </button>
            <h3 className="font-semibold text-base mb-3">Share File</h3>
            <p className={cn('text-xs mb-3 truncate font-medium', darkMode ? 'text-gray-400' : 'text-gray-600')}>{file.filename}</p>
            {isSharing ? (
              <div className="flex justify-center py-4"><SpinnerIcon className="h-6 w-6" /></div>
            ) : shareLink ? (
              <>
                <input readOnly value={shareLink} className={cn('w-full text-xs p-2.5 rounded-lg border mb-3 truncate', darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')} />
                <button
                  onClick={handleCopy}
                  className={cn('w-full py-2 rounded-lg text-sm font-medium transition-colors', copied ? 'bg-green-600 text-white' : darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)} />
          <div
            className={cn('relative z-10 w-full max-w-xs rounded-2xl shadow-2xl p-6 border folder-modal-anim text-center', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}
          >
            <div className={cn('inline-flex p-3 rounded-full mb-3', darkMode ? 'bg-red-900/40' : 'bg-red-50')}>
              <TrashIcon className="h-6 w-6 text-red-500" />
            </div>
            <h3 className={cn('font-semibold text-base mb-2', darkMode ? 'text-white' : 'text-gray-900')}>Delete File?</h3>
            <p className={cn('text-xs mb-1 truncate font-medium', darkMode ? 'text-gray-400' : 'text-gray-600')}>{file.filename}</p>
            <p className={cn('text-xs mb-5', darkMode ? 'text-gray-500' : 'text-gray-400')}>This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting} className={cn('flex-1 px-3 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                Cancel
              </button>
              <button onClick={handleDeleteFile} disabled={isDeleting} className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2">
                {isDeleting && <SpinnerIcon className="h-4 w-4" />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: View Folder Modal (full file-list with batch ops + pagination)
// ─────────────────────────────────────────────────────────────────────────────
const FOLDER_VIEW_ITEMS_PER_PAGE = 10;

const FolderViewModal = ({ folder, allFiles, darkMode, backendUrl, onClose, onRemoveFile, onFoldersChanged, refresh }) => {
  const [removing, setRemoving] = useState({});
  const [innerSearch, setInnerSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Batch state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [showBatchShareModal, setShowBatchShareModal] = useState(false);
  const [batchShareLink, setBatchShareLink] = useState('');
  const [batchCopied, setBatchCopied] = useState(false);
  const [showBatchDownloadProgress, setShowBatchDownloadProgress] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState(0);

  const folderFiles = allFiles.filter((f) =>
    (folder.fileIds || []).includes(String(f._id))
  );

  const filteredFiles = innerSearch.trim()
    ? folderFiles.filter((f) => f.filename?.toLowerCase().includes(innerSearch.toLowerCase()))
    : folderFiles;

  const totalPages = Math.max(1, Math.ceil(filteredFiles.length / FOLDER_VIEW_ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFiles = filteredFiles.slice(
    (safePage - 1) * FOLDER_VIEW_ITEMS_PER_PAGE,
    safePage * FOLDER_VIEW_ITEMS_PER_PAGE
  );

  // Reset page on search change
  useEffect(() => { setCurrentPage(1); }, [innerSearch]);

  const handleRemove = async (fileId) => {
    if (removing[fileId]) return;
    setRemoving((prev) => ({ ...prev, [fileId]: true }));
    await onRemoveFile(String(folder._id), fileId);
    setRemoving((prev) => ({ ...prev, [fileId]: false }));
  };

  // Selection helpers
  const toggleSelect = (fileId) => {
    setSelectedFiles((prev) =>
      prev.includes(fileId) ? prev.filter((x) => x !== fileId) : [...prev, fileId]
    );
  };

  const toggleSelectAll = () => {
    const allIds = paginatedFiles.map((f) => String(f._id));
    const allSelected = allIds.every((id) => selectedFiles.includes(id));
    if (allSelected) {
      setSelectedFiles((prev) => prev.filter((id) => !allIds.includes(id)));
    } else {
      setSelectedFiles((prev) => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const clearSelection = () => {
    setSelectedFiles([]);
    setSelectionMode(false);
  };

  // Batch download
  const batchDownload = async () => {
    if (selectedFiles.length === 0 || batchLoading) return;
    setBatchLoading(true);
    setShowBatchDownloadProgress(true);
    setBatchDownloadProgress(0);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      let done = 0;
      const filesToZip = folderFiles.filter((f) => selectedFiles.includes(String(f._id)));
      for (const file of filesToZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
        zip.file(file.filename, res.data);
        done++;
        setBatchDownloadProgress(Math.round((done / filesToZip.length) * 100));
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = window.URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${folder.name || 'folder'}_files.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Batch download failed:', err);
    } finally {
      setBatchLoading(false);
      setTimeout(() => { setShowBatchDownloadProgress(false); setBatchDownloadProgress(0); }, 1200);
    }
  };

  // Batch share
  const batchShare = async () => {
    if (selectedFiles.length === 0 || batchLoading) return;
    setBatchLoading(true);
    setShowBatchShareModal(true);
    setBatchShareLink('');
    setBatchCopied(false);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const filesToZip = folderFiles.filter((f) => selectedFiles.includes(String(f._id)));
      for (const file of filesToZip) {
        const res = await axios.get(`${backendUrl}/api/files/download/${file._id}`, { responseType: 'blob' });
        zip.file(file.filename, res.data);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const ts = Date.now();
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      const zipFilename = `AIRSTREAM${ts}${rand}.zip`;
      const formData = new FormData();
      formData.append('zipFile', zipBlob, zipFilename);
      const uploadRes = await axios.post(`${backendUrl}/api/files/share-zip`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const shareUrl = uploadRes.data?.url;
      if (!shareUrl) throw new Error('No URL returned');
      setBatchShareLink(shareUrl);
    } catch (err) {
      console.error('Batch share failed:', err);
      setShowBatchShareModal(false);
    } finally {
      setBatchLoading(false);
    }
  };

  const copyBatchLink = async () => {
    try {
      await navigator.clipboard.writeText(batchShareLink);
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 2000);
    } catch {}
  };

  // Batch delete
  const batchDelete = async () => {
    if (selectedFiles.length === 0 || batchLoading) return;
    setBatchLoading(true);
    try {
      await Promise.allSettled(selectedFiles.map((id) => axios.delete(`${backendUrl}/api/files/${id}`)));
      setShowBatchDeleteConfirm(false);
      clearSelection();
      if (refresh) refresh();
    } catch (err) {
      console.error('Batch delete failed:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  // Batch remove from folder
  const batchRemoveFromFolder = async () => {
    if (selectedFiles.length === 0 || batchLoading) return;
    setBatchLoading(true);
    try {
      for (const fileId of selectedFiles) {
        await onRemoveFile(String(folder._id), fileId);
      }
      clearSelection();
    } catch (err) {
      console.error('Batch remove failed:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  const allPageSelected = paginatedFiles.length > 0 && paginatedFiles.every((f) => selectedFiles.includes(String(f._id)));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-view-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border flex flex-col folder-modal-anim',
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
        style={{ maxHeight: '90vh' }}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-5 py-4 border-b flex-shrink-0', darkMode ? 'border-gray-700' : 'border-gray-200')}>
          <FolderSVG color={folder.color} className="w-7 h-7 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <h2 id="folder-view-title" className={cn('font-semibold text-base truncate', darkMode ? 'text-white' : 'text-gray-900')}>
              {folder.name}
            </h2>
            <p className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              {folderFiles.length} {folderFiles.length === 1 ? 'file' : 'files'}
            </p>
          </div>
          {/* Selection mode toggle */}
          <button
            onClick={() => { setSelectionMode((s) => !s); setSelectedFiles([]); }}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mr-1',
              selectionMode
                ? darkMode ? 'bg-blue-700 text-white' : 'bg-blue-600 text-white'
                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
            title={selectionMode ? 'Exit selection' : 'Select files'}
          >
            {selectionMode ? 'Cancel' : 'Select'}
          </button>
          <button onClick={onClose} className={cn('p-1.5 rounded-full transition-colors flex-shrink-0', darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}>
            <CloseIcon />
          </button>
        </div>

        {/* Search bar */}
        <div className={cn('px-5 py-3 border-b flex-shrink-0', darkMode ? 'border-gray-700/60' : 'border-gray-100')}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon darkMode={darkMode} />
            </div>
            <input
              type="text"
              placeholder="Search files in this folder…"
              value={innerSearch}
              onChange={(e) => setInnerSearch(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                darkMode
                  ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              )}
            />
          </div>
        </div>

        {/* Batch action bar */}
        {selectionMode && (
          <div className={cn('px-5 py-2.5 border-b flex-shrink-0 flex flex-wrap items-center gap-2', darkMode ? 'border-gray-700/60 bg-gray-800/50' : 'border-gray-100 bg-gray-50')}>
            {/* Select all */}
            <button
              onClick={toggleSelectAll}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50')}
            >
              {allPageSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className={cn('text-xs flex-grow', darkMode ? 'text-gray-400' : 'text-gray-500')}>
              {selectedFiles.length} selected
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={batchDownload}
                disabled={selectedFiles.length === 0 || batchLoading}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                  selectedFiles.length === 0 || batchLoading
                    ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : darkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
                title="Download selected"
              >
                <DownloadIcon /> <span className="hidden sm:inline">Download</span>
              </button>
              <button
                onClick={batchShare}
                disabled={selectedFiles.length === 0 || batchLoading}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                  selectedFiles.length === 0 || batchLoading
                    ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : darkMode ? 'bg-green-700 hover:bg-green-600 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                )}
                title="Share selected"
              >
                <ShareIcon /> <span className="hidden sm:inline">Share</span>
              </button>
              <button
                onClick={batchRemoveFromFolder}
                disabled={selectedFiles.length === 0 || batchLoading}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                  selectedFiles.length === 0 || batchLoading
                    ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : darkMode ? 'bg-orange-700 hover:bg-orange-600 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                )}
                title="Remove from folder"
              >
                <CloseIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Remove</span>
              </button>
              <button
                onClick={() => setShowBatchDeleteConfirm(true)}
                disabled={selectedFiles.length === 0 || batchLoading}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors',
                  selectedFiles.length === 0 || batchLoading
                    ? darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : darkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'
                )}
                title="Delete selected"
              >
                <TrashIcon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Delete</span>
              </button>
            </div>
          </div>
        )}

        {/* Batch download progress bar */}
        {showBatchDownloadProgress && (
          <div className={cn('px-5 py-2 flex-shrink-0', darkMode ? 'bg-gray-800' : 'bg-blue-50')}>
            <div className="flex items-center gap-3">
              <SpinnerIcon className="h-4 w-4 text-blue-500" />
              <div className={cn('flex-grow rounded-full h-2 overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-blue-200')}>
                <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${batchDownloadProgress}%` }} />
              </div>
              <span className={cn('text-xs font-medium', darkMode ? 'text-gray-400' : 'text-blue-700')}>{batchDownloadProgress}%</span>
            </div>
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2 min-h-0">
          {folderFiles.length === 0 ? (
            <div className={cn('text-center py-10', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              <FolderSVG color={darkMode ? '#4b5563' : '#d1d5db'} className="w-12 h-12 mx-auto mb-3" />
              <p className="text-sm font-medium mb-1">This folder is empty</p>
              <p className="text-xs leading-relaxed">
                Select files in your file list and use the<br />
                <strong>"Add to Folder"</strong> button to organize them here.
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className={cn('text-center py-8 text-sm', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              No files matching "<strong>{innerSearch}</strong>"
            </div>
          ) : (
            paginatedFiles.map((file) => (
              <FolderFileRow
                key={file._id}
                file={file}
                darkMode={darkMode}
                backendUrl={backendUrl}
                isSelected={selectedFiles.includes(String(file._id))}
                selectionMode={selectionMode}
                onToggleSelect={toggleSelect}
                onRemove={handleRemove}
                removing={!!removing[String(file._id)]}
                refresh={refresh}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {filteredFiles.length > FOLDER_VIEW_ITEMS_PER_PAGE && (
          <div className={cn('flex items-center justify-between px-5 py-3 border-t flex-shrink-0', darkMode ? 'border-gray-700' : 'border-gray-200')}>
            <span className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              {(safePage - 1) * FOLDER_VIEW_ITEMS_PER_PAGE + 1}–{Math.min(safePage * FOLDER_VIEW_ITEMS_PER_PAGE, filteredFiles.length)} of {filteredFiles.length}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  safePage <= 1
                    ? darkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                ← Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={cn(
                    'w-8 h-7 rounded-lg text-xs font-medium transition-colors',
                    p === safePage
                      ? 'bg-blue-600 text-white'
                      : darkMode ? 'bg-gray-700 text-gray-400 hover:bg-gray-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  )}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  safePage >= totalPages
                    ? darkMode ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Share Modal */}
      {showBatchShareModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBatchShareModal(false)} />
          <div
            className={cn('relative z-10 w-full max-w-sm rounded-2xl shadow-2xl p-6 border folder-modal-anim', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}
          >
            <button onClick={() => setShowBatchShareModal(false)} className={cn('absolute top-3 right-3 p-1.5 rounded-full', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}>
              <CloseIcon />
            </button>
            <h3 className="font-semibold text-base mb-4">Share {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}</h3>
            {batchLoading ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <SpinnerIcon className="h-7 w-7 text-blue-500" />
                <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>Preparing share link…</p>
              </div>
            ) : batchShareLink ? (
              <>
                <input readOnly value={batchShareLink} className={cn('w-full text-xs p-2.5 rounded-lg border mb-3 truncate', darkMode ? 'bg-gray-800 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700')} />
                <button onClick={copyBatchLink} className={cn('w-full py-2.5 rounded-xl text-sm font-medium transition-colors', batchCopied ? 'bg-green-600 text-white' : darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                  {batchCopied ? '✓ Copied!' : 'Copy Link'}
                </button>
                <p className={cn('text-xs text-center mt-3', darkMode ? 'text-gray-500' : 'text-gray-400')}>
                  Anyone with this link can access the selected files.
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Batch Delete Confirm */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowBatchDeleteConfirm(false)} />
          <div className={cn('relative z-10 w-full max-w-xs rounded-2xl shadow-2xl p-6 border folder-modal-anim text-center', darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')}>
            <div className={cn('inline-flex p-3 rounded-full mb-3', darkMode ? 'bg-red-900/40' : 'bg-red-50')}>
              <TrashIcon className="h-7 w-7 text-red-500" />
            </div>
            <h3 className={cn('font-semibold text-base mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
              Delete {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''}?
            </h3>
            <p className={cn('text-xs mb-5', darkMode ? 'text-gray-400' : 'text-gray-600')}>This action cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowBatchDeleteConfirm(false)} disabled={batchLoading} className={cn('flex-1 px-3 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}>
                Cancel
              </button>
              <button onClick={batchDelete} disabled={batchLoading} className="flex-1 px-3 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2">
                {batchLoading && <SpinnerIcon className="h-4 w-4" />}
                {batchLoading ? 'Deleting…' : 'Delete All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: View All Folders Modal
// ─────────────────────────────────────────────────────────────────────────────
const ViewAllFoldersModal = ({
  darkMode, folders, files, backendUrl,
  onClose, onView, onEdit, onDeleteRequest,
}) => {
  const [search, setSearch] = useState('');
  const [openOptionsId, setOpenOptionsId] = useState(null);

  const filtered = search.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : folders;

  const toggleOptions = useCallback((id) => {
    setOpenOptionsId((prev) => (prev === id ? null : id));
  }, []);

  // Close modal on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="All Folders"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl shadow-2xl border flex flex-col folder-modal-anim',
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-5 py-4 border-b flex-shrink-0', darkMode ? 'border-gray-700' : 'border-gray-200')}>
          <FolderSVG color={darkMode ? '#ffffff' : '#1f2937'} className="w-6 h-6" />
          <h2 className={cn('font-semibold text-base flex-grow', darkMode ? 'text-white' : 'text-gray-900')}>
            All Folders
            <span className={cn('ml-2 text-xs px-2 py-0.5 rounded-full font-medium', darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500')}>
              {folders.length}
            </span>
          </h2>
          <button onClick={onClose} className={cn('p-1.5 rounded-full transition-colors flex-shrink-0', darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-gray-200' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700')}>
            <CloseIcon />
          </button>
        </div>

        {/* Search */}
        <div className={cn('px-5 py-3 border-b flex-shrink-0', darkMode ? 'border-gray-700/60' : 'border-gray-100')}>
          <div className="relative">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon darkMode={darkMode} />
            </div>
            <input
              type="text"
              placeholder="Search folders…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none transition-colors',
                darkMode
                  ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-gray-50 text-gray-900 border-gray-200 placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              )}
              autoFocus
            />
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {filtered.length === 0 ? (
            <div className={cn('text-center py-10 text-sm', darkMode ? 'text-gray-500' : 'text-gray-400')}>
              {search ? `No folders matching "${search}"` : 'No folders yet'}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filtered.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folder={folder}
                  darkMode={darkMode}
                  isOptionsOpen={openOptionsId === String(folder._id)}
                  onToggleOptions={() => toggleOptions(String(folder._id))}
                  onView={() => { onView(folder); onClose(); }}
                  onEdit={() => { onEdit(folder); onClose(); }}
                  onDeleteRequest={() => { onDeleteRequest(folder); onClose(); }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Create / Edit Folder Modal
// ─────────────────────────────────────────────────────────────────────────────
const FolderFormModal = ({
  mode,
  initialName,
  initialColor,
  darkMode,
  onConfirm,
  onClose,
}) => {
  const [name, setName] = useState(initialName || '');
  const [color, setColor] = useState(initialColor || '#6366f1');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 80);
  }, []);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Please enter a folder name.'); return; }
    setBusy(true);
    setError('');
    try {
      await onConfirm(name.trim(), color);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong.');
      setBusy(false);
    }
  };

  const isCreate = mode === 'create';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-form-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-sm rounded-2xl shadow-2xl p-6 border folder-modal-anim',
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
      >
        <button
          type="button"
          onClick={onClose}
          className={cn('absolute top-3 right-3 p-1.5 rounded-full transition-colors', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}
        >
          <CloseIcon />
        </button>

        <h2 id="folder-form-title" className={cn('font-semibold text-base mb-4', darkMode ? 'text-white' : 'text-gray-900')}>
          {isCreate ? 'Create Folder' : 'Edit Folder'}
        </h2>

        <label className={cn('block text-xs font-medium mb-1', darkMode ? 'text-gray-400' : 'text-gray-600')}>
          Folder Name
        </label>
        <input
          ref={inputRef}
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="My Folder"
          maxLength={80}
          className={cn(
            'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-colors',
            darkMode
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
              : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-1 focus:ring-blue-600 focus:border-blue-600'
          )}
        />
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

        <ColorPicker selected={color} onSelect={setColor} darkMode={darkMode} />

        <div className="flex gap-2 mt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || busy}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors',
              !name.trim() || busy ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {busy && <SpinnerIcon className="h-4 w-4" />}
            {busy ? (isCreate ? 'Creating…' : 'Saving…') : (isCreate ? 'Create Folder' : 'Save Changes')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Delete Confirmation Modal
// ─────────────────────────────────────────────────────────────────────────────
const DeleteConfirmModal = ({ folder, darkMode, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);

  const handleDelete = async () => {
    setBusy(true);
    await onConfirm();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-full max-w-xs rounded-2xl shadow-2xl p-6 border folder-modal-anim text-center',
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
      >
        <div className={cn('inline-flex p-3 rounded-full mb-4', darkMode ? 'bg-red-900/40' : 'bg-red-50')}>
          <TrashIcon className="h-7 w-7 text-red-500" />
        </div>
        <h3 className={cn('font-semibold text-base mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
          Delete "{folder?.name}"?
        </h3>
        <p className={cn('text-sm mb-5 leading-relaxed', darkMode ? 'text-gray-400' : 'text-gray-600')}>
          The folder will be permanently deleted.<br />
          <span className="font-medium">Your files will not be affected.</span>
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn('flex-1 px-4 py-2.5 rounded-xl text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200')}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-red-600 hover:bg-red-700 flex items-center justify-center gap-2"
          >
            {busy && <SpinnerIcon className="h-4 w-4" />}
            {busy ? 'Deleting…' : 'Delete'}
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

  // ── Responsive visible count ──────────────────────────────────────────────
  // Mobile (< 640px): 2 cols × 2 rows = 4
  // sm (640–767):     3 cols × 2 rows = 6
  // md (768–1023):    4 cols × 2 rows = 8
  // lg (1024–1279):   5 cols × 2 rows = 10  (but show 2 rows max)
  // xl+(1280+):       6 cols × 2 rows = 12
  const [visibleCount, setVisibleCount] = useState(4);
  const [gridCols, setGridCols] = useState('grid-cols-2');

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280) {
        setVisibleCount(12);
        setGridCols('grid-cols-6');
      } else if (w >= 1024) {
        setVisibleCount(10);
        setGridCols('grid-cols-5');
      } else if (w >= 768) {
        setVisibleCount(8);
        setGridCols('grid-cols-4');
      } else if (w >= 640) {
        setVisibleCount(6);
        setGridCols('grid-cols-3');
      } else {
        setVisibleCount(4);
        setGridCols('grid-cols-2');
      }
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // ── View All modal ────────────────────────────────────────────────────────
  const [showViewAll, setShowViewAll] = useState(false);

  // ── Options dropdown state ────────────────────────────────────────────────
  const [openOptionsId, setOpenOptionsId] = useState(null);

  const toggleOptions = useCallback((id) => {
    setOpenOptionsId((prev) => (prev === id ? null : id));
  }, []);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);

  // ── Loading state ─────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Computed folders ──────────────────────────────────────────────────────
  const displayedFolders = folders.slice(0, visibleCount);
  const hasMore = folders.length > visibleCount;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCreate = async (name, color) => {
    await axios.post(`${backendUrl}/api/folders`, { name, color });
    setCreateModal(false);
    await onFoldersChanged();
  };

  const handleEdit = async (name, color) => {
    await axios.patch(`${backendUrl}/api/folders/${editTarget._id}`, { name, color });
    if (viewTarget && String(viewTarget._id) === String(editTarget._id)) {
      setViewTarget((prev) => ({ ...prev, name, color }));
    }
    setEditTarget(null);
    setOpenOptionsId(null);
    await onFoldersChanged();
  };

  const handleDelete = async () => {
    await axios.delete(`${backendUrl}/api/folders/${deleteTarget._id}`);
    if (viewTarget && String(viewTarget._id) === String(deleteTarget._id)) {
      setViewTarget(null);
    }
    setDeleteTarget(null);
    setOpenOptionsId(null);
    await onFoldersChanged();
  };

  const handleRemoveFileFromFolder = async (folderId, fileId) => {
    await axios.delete(`${backendUrl}/api/folders/${folderId}/files/${fileId}`);
    if (viewTarget && String(viewTarget._id) === folderId) {
      setViewTarget((prev) =>
        prev ? { ...prev, fileIds: prev.fileIds.filter((id) => id !== fileId) } : null
      );
    }
    await onFoldersChanged();
  };

  // Sync viewTarget when folders prop updates
  useEffect(() => {
    if (viewTarget) {
      const updated = folders.find((f) => String(f._id) === String(viewTarget._id));
      if (updated) setViewTarget(updated);
    }
  }, [folders]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
        darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
      )}
    >
      {/* ── Top Row: Title + New Folder ── */}
      <div className="flex items-center justify-between mb-4">
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <FolderSVG color={darkMode ? '#ffffff' : '#1f2937'} className="w-5 h-5" />
          <h2 className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
            Folders
          </h2>
          <span
            className={cn(
              'text-xs px-2 py-0.5 rounded-full font-medium',
              darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'
            )}
          >
            {folders.length}
          </span>
        </div>

        {/* New Folder Button */}
        <button
          type="button"
          onClick={() => setCreateModal(true)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
            'bg-blue-600 hover:bg-blue-700 text-white'
          )}
          title="Create new folder"
        >
          <PlusIcon />
          <span className="hidden xs:inline sm:inline">New Folder</span>
        </button>
      </div>

      {/* ── Folder Grid ── */}
      {loading ? (
        <div className={cn('grid gap-3', gridCols)}>
          {Array(visibleCount).fill(null).map((_, i) => (
            <FolderCardSkeleton key={`skel-${i}`} darkMode={darkMode} />
          ))}
        </div>
      ) : folders.length === 0 ? (
        /* Empty state */
        <div
          className={cn(
            'text-center py-8 rounded-xl border-2 border-dashed',
            darkMode ? 'border-gray-700 text-gray-500' : 'border-gray-200 text-gray-400'
          )}
        >
          <FolderSVG color={darkMode ? '#374151' : '#d1d5db'} className="w-10 h-10 mx-auto mb-2" />
          <p className={cn('text-sm font-medium', darkMode ? 'text-gray-400' : 'text-gray-500')}>
            No folders yet
          </p>
          <p className="text-xs mt-1">
            Create a folder to start organizing your files
          </p>
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <PlusIcon /> Create Folder
          </button>
        </div>
      ) : (
        <>
          {/* Folder grid */}
          <div className={cn('grid gap-3', gridCols)}>
            {displayedFolders.map((folder) => (
              <FolderCard
                key={folder._id}
                folder={folder}
                darkMode={darkMode}
                isOptionsOpen={openOptionsId === String(folder._id)}
                onToggleOptions={() => toggleOptions(String(folder._id))}
                onView={() => {
                  setViewTarget(folder);
                  setOpenOptionsId(null);
                }}
                onEdit={() => {
                  setEditTarget(folder);
                  setOpenOptionsId(null);
                }}
                onDeleteRequest={() => {
                  setDeleteTarget(folder);
                  setOpenOptionsId(null);
                }}
              />
            ))}
          </div>

          {/* "View All Folders" button — shown when there are more folders than visible */}
          {hasMore && (
            <button
              type="button"
              onClick={() => setShowViewAll(true)}
              className={cn(
                'mt-3 w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all border-2 border-dashed',
                darkMode
                  ? 'border-gray-600 text-gray-400 hover:border-blue-500 hover:text-blue-400 hover:bg-blue-900/10'
                  : 'border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50'
              )}
            >
              <GridIcon />
              View All Folders ({folders.length})
            </button>
          )}
        </>
      )}

      {/* ── Modals ── */}

      {createModal && (
        <FolderFormModal
          mode="create"
          initialName=""
          initialColor="#6366f1"
          darkMode={darkMode}
          onConfirm={handleCreate}
          onClose={() => setCreateModal(false)}
        />
      )}

      {editTarget && (
        <FolderFormModal
          mode="edit"
          initialName={editTarget.name}
          initialColor={editTarget.color}
          darkMode={darkMode}
          onConfirm={handleEdit}
          onClose={() => { setEditTarget(null); setOpenOptionsId(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          folder={deleteTarget}
          darkMode={darkMode}
          onConfirm={handleDelete}
          onClose={() => { setDeleteTarget(null); setOpenOptionsId(null); }}
        />
      )}

      {viewTarget && (
        <FolderViewModal
          folder={viewTarget}
          allFiles={files}
          darkMode={darkMode}
          backendUrl={backendUrl}
          onClose={() => setViewTarget(null)}
          onRemoveFile={handleRemoveFileFromFolder}
          onFoldersChanged={onFoldersChanged}
          refresh={refresh}
        />
      )}

      {showViewAll && (
        <ViewAllFoldersModal
          darkMode={darkMode}
          folders={folders}
          files={files}
          backendUrl={backendUrl}
          onClose={() => setShowViewAll(false)}
          onView={(folder) => {
            setViewTarget(folder);
            setOpenOptionsId(null);
          }}
          onEdit={(folder) => {
            setEditTarget(folder);
            setOpenOptionsId(null);
          }}
          onDeleteRequest={(folder) => {
            setDeleteTarget(folder);
            setOpenOptionsId(null);
          }}
        />
      )}

      {/* Shared CSS animations */}
      <style>{`
        @keyframes folderModalIn {
          from { opacity: 0; transform: scale(0.95) translateY(12px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .folder-modal-anim { animation: folderModalIn 0.22s ease-out; }

        @keyframes folderDropIn {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
        .folder-dropdown-anim { animation: folderDropIn 0.15s ease-out; }
      `}</style>
    </div>
  );
};

export default FolderList;
