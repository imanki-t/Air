// src/components/FolderList.jsx
// Full-featured folder management panel for Airstream
// Features: create/delete/rename folders, color picker, search, move files, view contents

import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

// ─── Utility ─────────────────────────────────────────────────────────────────
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─── Folder Color Palette ─────────────────────────────────────────────────────
const FOLDER_COLORS = [
  { name: 'Indigo',  value: '#6366f1' },
  { name: 'Blue',    value: '#3b82f6' },
  { name: 'Sky',     value: '#0ea5e9' },
  { name: 'Teal',    value: '#14b8a6' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Lime',    value: '#84cc16' },
  { name: 'Yellow',  value: '#eab308' },
  { name: 'Orange',  value: '#f97316' },
  { name: 'Red',     value: '#ef4444' },
  { name: 'Rose',    value: '#f43f5e' },
  { name: 'Pink',    value: '#ec4899' },
  { name: 'Purple',  value: '#a855f7' },
  { name: 'Slate',   value: '#64748b' },
];

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const FolderSVG = ({ color = '#6366f1', className = 'w-8 h-8' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill={color}>
    <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-15a3 3 0 00-3 3V18a3 3 0 003 3h15zM1.5 10.146V6a3 3 0 013-3h5.379a2.25 2.25 0 011.59.659l2.122 2.121c.14.141.331.22.53.22H19.5a3 3 0 013 3v1.146A4.483 4.483 0 0019.5 9h-15a4.483 4.483 0 00-3 1.146z" />
  </svg>
);

const CloseIcon = ({ className = 'h-5 w-5' }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const DotsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
    <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
  </svg>
);

const SpinnerIcon = ({ className = 'h-4 w-4' }) => (
  <svg className={cn('animate-spin', className)} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
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

const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const SearchIcon = ({ darkMode }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-4 w-4', darkMode ? 'text-gray-400' : 'text-gray-400')} viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
  </svg>
);

// ─── Format helpers ───────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = Number(bytes);
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit++; }
  return `${size.toFixed(1)} ${units[unit]}`;
};

const getFileType = (file) => {
  const ct = (file?.contentType || file?.metadata?.contentType || '').toLowerCase();
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct.includes('pdf') || ct.includes('document') || ct.includes('word') || ct.includes('text')) return 'document';
  return 'other';
};

const FILE_TYPE_EMOJI = { image: '🖼️', video: '🎬', audio: '🎵', document: '📄', other: '📦' };

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: Color Picker
// ─────────────────────────────────────────────────────────────────────────────
const ColorPicker = ({ selected, onSelect, darkMode }) => (
  <div>
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
// Sub-component: Folder Card Options Dropdown
// ─────────────────────────────────────────────────────────────────────────────
const FolderOptionsDropdown = ({ darkMode, onView, onEdit, onDelete, onClose }) => {
  const dropRef = useRef(null);

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
      className={cn(
        'absolute right-0 top-8 w-40 rounded-xl border shadow-2xl z-50 overflow-hidden',
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

  return (
    <div
      className={cn(
        'relative group rounded-xl border transition-all duration-200 cursor-pointer',
        'p-2.5 flex flex-col items-center gap-1.5 text-center select-none',
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
      <div className="absolute top-1.5 right-1.5 z-10">
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
            onView={(e) => { if (e) e.stopPropagation(); onView(); onToggleOptions(); }}
            onEdit={(e) => { if (e) e.stopPropagation(); onEdit(); }}
            onDelete={(e) => { if (e) e.stopPropagation(); onDeleteRequest(); }}
            onClose={onToggleOptions}
          />
        )}
      </div>

      {/* Icon */}
      <FolderSVG color={folder.color} className="w-10 h-10 flex-shrink-0" />

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
      'rounded-xl border p-2.5 flex flex-col items-center gap-1.5 animate-pulse',
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'
    )}
  >
    <div className={cn('w-10 h-10 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2.5 w-3/4 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
    <div className={cn('h-2 w-1/2 rounded', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Sub-component: View Folder Modal — shows all files inside a folder
// ─────────────────────────────────────────────────────────────────────────────
const FolderViewModal = ({ folder, allFiles, darkMode, backendUrl, onClose, onRemoveFile }) => {
  const [removing, setRemoving] = useState({});
  const [innerSearch, setInnerSearch] = useState('');

  const folderFiles = allFiles.filter((f) =>
    (folder.fileIds || []).includes(String(f._id))
  );

  const filteredFiles = innerSearch.trim()
    ? folderFiles.filter((f) =>
        f.filename?.toLowerCase().includes(innerSearch.toLowerCase())
      )
    : folderFiles;

  const handleRemove = async (fileId) => {
    if (removing[fileId]) return;
    setRemoving((prev) => ({ ...prev, [fileId]: true }));
    await onRemoveFile(String(folder._id), fileId);
    setRemoving((prev) => ({ ...prev, [fileId]: false }));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-view-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'relative z-10 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border flex flex-col folder-modal-anim',
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
        style={{ maxHeight: '85vh' }}
      >
        {/* Header */}
        <div className={cn('flex items-center gap-3 px-5 py-4 border-b flex-shrink-0', darkMode ? 'border-gray-700' : 'border-gray-100')}>
          <FolderSVG color={folder.color} className="w-6 h-6 flex-shrink-0" />
          <div className="flex-grow min-w-0">
            <h3
              id="folder-view-title"
              className={cn('font-semibold text-base truncate', darkMode ? 'text-white' : 'text-gray-900')}
            >
              {folder.name}
            </h3>
            <p className={cn('text-xs mt-0.5', darkMode ? 'text-gray-400' : 'text-gray-500')}>
              {folderFiles.length} file{folderFiles.length !== 1 ? 's' : ''} in this folder
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn('p-1.5 rounded-full flex-shrink-0 transition-colors', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}
            aria-label="Close"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Inner search bar — only when has files */}
        {folderFiles.length > 3 && (
          <div className={cn('px-4 pt-3 pb-0 flex-shrink-0')}>
            <div className="relative">
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                <SearchIcon darkMode={darkMode} />
              </div>
              <input
                type="text"
                placeholder="Search in this folder..."
                value={innerSearch}
                onChange={(e) => setInnerSearch(e.target.value)}
                className={cn(
                  'w-full pl-8 pr-3 py-2 rounded-lg border text-sm',
                  darkMode
                    ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                    : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-1 focus:ring-blue-600 focus:border-blue-600'
                )}
              />
            </div>
          </div>
        )}

        {/* File List */}
        <div className="flex-grow overflow-y-auto p-4 space-y-2">
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
              No files matching "{innerSearch}"
            </div>
          ) : (
            filteredFiles.map((file) => {
              const type = getFileType(file);
              const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
              const fileIdStr = String(file._id);
              return (
                <div
                  key={file._id}
                  className={cn(
                    'flex items-center gap-3 p-2.5 rounded-xl border transition-colors',
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                  )}
                >
                  {/* Preview thumbnail */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center text-lg',
                      darkMode ? 'bg-gray-700' : 'bg-gray-200'
                    )}
                  >
                    {type === 'image' ? (
                      <img
                        src={previewUrl}
                        alt={file.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span>{FILE_TYPE_EMOJI[type] || '📦'}</span>
                    )}
                  </div>

                  {/* File Info */}
                  <div className="flex-grow min-w-0">
                    <p
                      className={cn('text-sm font-medium truncate', darkMode ? 'text-gray-200' : 'text-gray-800')}
                      title={file.filename}
                    >
                      {file.filename}
                    </p>
                    <p className={cn('text-xs', darkMode ? 'text-gray-500' : 'text-gray-400')}>
                      {formatSize(file.length)} · {type}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(fileIdStr)}
                    disabled={!!removing[fileIdStr]}
                    className={cn(
                      'flex-shrink-0 p-1.5 rounded-lg transition-colors text-red-500',
                      darkMode ? 'hover:bg-red-900/30' : 'hover:bg-red-50',
                      removing[fileIdStr] && 'opacity-60 cursor-wait'
                    )}
                    title="Remove from folder"
                    aria-label={`Remove ${file.filename} from folder`}
                  >
                    {removing[fileIdStr] ? (
                      <SpinnerIcon className="h-4 w-4" />
                    ) : (
                      <CloseIcon className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })
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
  mode,           // 'create' | 'edit'
  initialName,
  initialColor,
  darkMode,
  onConfirm,      // async (name, color) => void
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
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          className={cn('absolute top-3 right-3 p-1.5 rounded-full transition-colors', darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')}
          aria-label="Close"
        >
          <CloseIcon className="h-5 w-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3 mb-5">
          <FolderSVG color={color} className="w-8 h-8 flex-shrink-0" />
          <h3
            id="folder-form-title"
            className={cn('text-lg font-semibold', darkMode ? 'text-white' : 'text-gray-900')}
          >
            {isCreate ? 'Create New Folder' : 'Edit Folder'}
          </h3>
        </div>

        {/* Name field */}
        <div className="mb-4">
          <label className={cn('block text-xs font-medium mb-1.5', darkMode ? 'text-gray-400' : 'text-gray-600')}>
            Folder Name
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && !busy && handleSubmit()}
            placeholder="e.g. Project Files"
            maxLength={80}
            className={cn(
              'w-full px-3 py-2.5 rounded-xl border text-sm outline-none transition-all',
              error && '!border-red-500',
              darkMode
                ? 'bg-gray-800 text-white border-gray-600 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-2 focus:ring-blue-600 focus:border-blue-600'
            )}
          />
          {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
        </div>

        {/* Color picker */}
        <div className="mb-6">
          <ColorPicker selected={color} onSelect={setColor} darkMode={darkMode} />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors',
              darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!name.trim() || busy}
            className={cn(
              'flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white flex items-center justify-center gap-2 transition-colors',
              !name.trim() || busy
                ? 'bg-blue-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            )}
          >
            {busy && <SpinnerIcon className="h-4 w-4" />}
            {busy ? (isCreate ? 'Creating...' : 'Saving...') : (isCreate ? 'Create Folder' : 'Save Changes')}
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
            {busy ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main FolderList Component
// ─────────────────────────────────────────────────────────────────────────────
const FolderList = ({ darkMode, files = [], folders = [], onFoldersChanged }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // ── Search ──────────────────────────────────────────────────────────────────
  const [folderSearch, setFolderSearch] = useState('');

  // ── Responsive visible count ────────────────────────────────────────────────
  const [visibleCount, setVisibleCount] = useState(4);

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth;
      if (w >= 1280)      setVisibleCount(8);
      else if (w >= 1024) setVisibleCount(6);
      else if (w >= 768)  setVisibleCount(5);
      else                setVisibleCount(4);
    };
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // ── Options dropdown state ───────────────────────────────────────────────────
  const [openOptionsId, setOpenOptionsId] = useState(null);

  const toggleOptions = useCallback((id) => {
    setOpenOptionsId((prev) => (prev === id ? null : id));
  }, []);

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [createModal, setCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);     // folder object
  const [deleteTarget, setDeleteTarget] = useState(null); // folder object
  const [viewTarget, setViewTarget] = useState(null);     // folder object

  // ── Loading / operation state ───────────────────────────────────────────────
  const [loading, setLoading] = useState(false);

  // ── Computed: folders list ───────────────────────────────────────────────────
  const filteredFolders = folderSearch.trim()
    ? folders.filter((f) => f.name.toLowerCase().includes(folderSearch.toLowerCase()))
    : folders;

  const displayedFolders = folderSearch.trim()
    ? filteredFolders
    : filteredFolders.slice(0, visibleCount);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCreate = async (name, color) => {
    await axios.post(`${backendUrl}/api/folders`, { name, color });
    setCreateModal(false);
    await onFoldersChanged();
  };

  const handleEdit = async (name, color) => {
    await axios.patch(`${backendUrl}/api/folders/${editTarget._id}`, { name, color });
    // If viewing this folder, update the local viewTarget color/name
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
    // Also update viewTarget's fileIds locally for instant feedback
    if (viewTarget && String(viewTarget._id) === folderId) {
      setViewTarget((prev) =>
        prev ? { ...prev, fileIds: prev.fileIds.filter((id) => id !== fileId) } : null
      );
    }
    await onFoldersChanged();
  };

  // Sync viewTarget when folders prop updates (e.g. after removing a file)
  useEffect(() => {
    if (viewTarget) {
      const updated = folders.find((f) => String(f._id) === String(viewTarget._id));
      if (updated) setViewTarget(updated);
    }
  }, [folders]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'transition-colors duration-300 rounded-lg p-4 shadow-lg w-full mx-auto max-w-7xl my-4 border',
        darkMode ? 'bg-gray-900 text-gray-200 border-gray-700' : 'bg-white text-gray-800 border-gray-200'
      )}
    >
      {/* ── Top Row: Title + Search + New Folder ── */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-4">
        {/* Title */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <FolderSVG color={darkMode ? '#818cf8' : '#6366f1'} className="w-5 h-5" />
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

        {/* Search + Create */}
        <div className="flex gap-2 w-full sm:w-auto sm:max-w-xs flex-grow sm:flex-grow-0">
          {/* Folder Search */}
          <div className="relative flex-grow">
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon darkMode={darkMode} />
            </div>
            <input
              type="text"
              placeholder="Search folders..."
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              className={cn(
                'w-full pl-8 pr-3 py-2 rounded-lg border text-sm transition-colors outline-none',
                darkMode
                  ? 'bg-gray-800 text-white border-gray-700 placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500'
                  : 'bg-gray-50 text-gray-900 border-gray-300 placeholder-gray-400 focus:ring-1 focus:ring-blue-600 focus:border-blue-600'
              )}
              aria-label="Search folders"
            />
          </div>

          {/* New Folder Button */}
          <button
            type="button"
            onClick={() => setCreateModal(true)}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0',
              darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
            title="Create new folder"
          >
            <PlusIcon />
            <span className="hidden xs:inline sm:inline">New Folder</span>
          </button>
        </div>
      </div>

      {/* ── Folder Grid ── */}
      {loading ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
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
      ) : displayedFolders.length === 0 && folderSearch ? (
        /* No search results */
        <div className={cn('text-center py-6 text-sm', darkMode ? 'text-gray-500' : 'text-gray-400')}>
          No folders matching <strong>"{folderSearch}"</strong>
        </div>
      ) : (
        /* Folder grid */
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8 gap-3">
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
      )}

      {/* "More folders" hint when truncated */}
      {!folderSearch && folders.length > visibleCount && (
        <p className={cn('text-xs mt-2.5 text-center', darkMode ? 'text-gray-500' : 'text-gray-400')}>
          Showing {Math.min(visibleCount, folders.length)} of {folders.length} folders
          &nbsp;—&nbsp;search to find the others
        </p>
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
