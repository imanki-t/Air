import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { io } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

const formatBytes = (bytes) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icon = {
  Export: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  Import: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="19" x2="12" y2="5" />
      <polyline points="5 12 12 5 19 12" />
    </svg>
  ),
  Trash: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  ),
  Logout: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  ),
  Sun: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  Moon: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  Database: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4.03 3-9 3S3 13.66 3 12" />
      <path d="M3 5v14c0 1.66 4.03 3 9 3s9-1.34 9-3V5" />
    </svg>
  ),
  Warning: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  Check: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  Clock: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  Refresh: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  FileZip: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="12" y1="12" x2="12" y2="18" />
      <line x1="9" y1="15" x2="15" y2="15" />
    </svg>
  ),
  Plus: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  Shield: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  X: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
  Mail: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  Folder: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  ),
};

// ─── Modal — renders via portal directly on body, bypasses all z-index stacking ──
const Modal = ({ open, onClose, darkMode, children }) => {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ zIndex: 99999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <div
          className={`relative w-full rounded-2xl shadow-2xl border sm:max-w-md ${
            darkMode ? 'bg-gray-900 border-gray-700/80' : 'bg-white border-gray-200'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ darkMode }) => (
  <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${darkMode ? 'border-blue-400' : 'border-white'}`} />
);

// ─── Info row used inside modals ──────────────────────────────────────────────
const InfoRow = ({ icon: IconComp, text, darkMode }) => (
  <div className="flex items-start gap-3">
    <div className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
      <IconComp className={`w-3.5 h-3.5 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
    </div>
    <p className={`text-xs leading-relaxed pt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>{text}</p>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
const ProfileMenu = ({ user, darkMode, onDarkModeToggle, onLogout, onFilesRefresh, hideFolderFiles, onHideFolderFilesToggle }) => {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ fileCount: 0, storageUsed: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');

  // Import
  const importInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [importError, setImportError] = useState('');
  const [importProgress, setImportProgress] = useState(0);   // files done
  const [importTotal, setImportTotal] = useState(0);         // total files
  const [importInProgress, setImportInProgress] = useState(false); // background running

  // Delete
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const menuRef = useRef(null);
  const backendUrl = BACKEND_URL;

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadingStats(true);
    axios
      .get(`${backendUrl}/api/auth/stats`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Stats fetch error:', err))
      .finally(() => setLoadingStats(false));
  }, [open, backendUrl]);

  const storagePercent = Math.min(100, (stats.storageUsed / STORAGE_LIMIT) * 100);
  const storageColor =
    storagePercent > 90 ? 'bg-red-500' :
    storagePercent > 70 ? 'bg-yellow-500' :
    darkMode ? 'bg-blue-500' : 'bg-red-500';

  const accentRing = darkMode ? 'focus:ring-blue-500' : 'focus:ring-red-400';

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleDarkToggle = () => { setOpen(false); onDarkModeToggle?.(); };
  const handleLogout = async () => {
    setOpen(false);
    try { await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true }); } catch (_) {}
    onLogout?.();
  };

  const handleOpenExport = () => {
    setOpen(false); setExportDone(false); setExportError(''); setShowExportModal(true);
  };
  const handleConfirmExport = async () => {
    setExportLoading(true); setExportError('');
    try {
      await axios.post(`${backendUrl}/api/auth/export-data`, {}, { withCredentials: true });
      setExportDone(true);
    } catch (err) {
      setExportError(err.response?.data?.error || 'Export failed. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenImport = () => {
    setOpen(false);
    setImportResult(null);
    setImportError('');
    setImportProgress(0);
    setImportTotal(0);
    setImportInProgress(false);
    setShowImportModal(true);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportLoading(true);
    setImportError('');
    setImportProgress(0);
    setImportTotal(0);
    setImportInProgress(false);

    try {
      const formData = new FormData();
      formData.append('exportFile', file);

      // Upload ZIP — backend responds immediately with { total }
      const res = await axios.post(`${backendUrl}/api/auth/import-data`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      // Switch from spinner to live progress bar
      setImportLoading(false);
      setImportTotal(res.data.total);
      setImportInProgress(true);

      // Connect socket and listen for per-file progress
      const socket = io(backendUrl, { withCredentials: true });

      socket.on('importProgress', (data) => {
        if (data.userId !== res.data.userId) return;
        setImportProgress(data.imported + data.skipped);
      });

      socket.on('importComplete', (data) => {
        socket.disconnect();
        setImportInProgress(false);
        setImportResult(data);
        onFilesRefresh?.();
      });

      // Safety timeout — treat as done after 10 min regardless
      setTimeout(() => {
        socket.disconnect();
        setImportInProgress(false);
      }, 10 * 60 * 1000);

    } catch (err) {
      setImportLoading(false);
      setImportError(err.response?.data?.error || 'Import failed. Please try again.');
    }
  };

  const handleOpenDelete = () => {
    setOpen(false); setDeleteConfirmText(''); setDeleteError(''); setShowDeleteModal(true);
  };
  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true); setDeleteError('');
    try {
      await axios.post(`${backendUrl}/api/auth/delete-account`, {}, { withCredentials: true });
      setShowDeleteModal(false);
      onLogout?.();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to schedule account deletion. Please try again.');
      setDeleteLoading(false);
    }
  };

  // ── Menu item ────────────────────────────────────────────────────────────────
  const MenuItem = ({ IconComp, label, onClick, danger = false, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors duration-150 text-left ${
        danger
          ? darkMode ? 'text-red-400 hover:bg-red-900/20' : 'text-red-600 hover:bg-red-50'
          : darkMode ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <IconComp className="w-4 h-4 flex-shrink-0" />
      <span>{label}</span>
    </button>
  );

  // ── Modal header helper ──────────────────────────────────────────────────────
  const ModalHeader = ({ IconComp, iconBg, iconColor, title, subtitle, onClose, closable = true }) => (
    <div className={`flex items-start justify-between px-6 pt-6 pb-4 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <IconComp className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h2>
          {subtitle && <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{subtitle}</p>}
        </div>
      </div>
      {closable && (
        <button
          onClick={onClose}
          className={`ml-4 mt-0.5 p-1 rounded-lg transition-colors ${darkMode ? 'text-gray-500 hover:text-gray-300 hover:bg-gray-800' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
        >
          <Icon.X className="w-4 h-4" />
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* ── Profile dropdown ─────────────────────────────────────────────────── */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${accentRing}`}
          aria-label="Profile menu"
        >
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
                open
                  ? darkMode ? 'border-blue-400' : 'border-red-400'
                  : darkMode ? 'border-gray-600 hover:border-blue-400' : 'border-gray-300 hover:border-red-400'
              }`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-700'
            }`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            {/* Mobile backdrop */}
            <div className="fixed inset-0 z-40 sm:hidden" onClick={() => setOpen(false)} />
            <div className={`
              z-50 rounded-2xl border shadow-xl overflow-hidden
              fixed left-1/2 -translate-x-1/2 top-16 w-[92vw]
              sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-72 sm:translate-x-0 sm:fixed-none
              ${darkMode ? 'bg-gray-900 border-gray-700/80 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/80'}
            `}>

            {/* User info */}
            <div className={`px-4 py-4 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-700'}`}>
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>{user?.name}</p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
                </div>
              </div>

              {/* Storage bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Storage</span>
                  <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {loadingStats ? '—' : `${formatBytes(stats.storageUsed)} / 5 GB`}
                  </span>
                </div>
                <div className={`h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                  <div className={`h-full rounded-full transition-all duration-500 ${storageColor}`} style={{ width: `${storagePercent}%` }} />
                </div>
                {!loadingStats && (
                  <p className={`text-[10px] mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {stats.fileCount} file{stats.fileCount !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            </div>

            {/* Dark mode toggle */}
            <div className={`px-4 py-2.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <button
                onClick={handleDarkToggle}
                className={`w-full flex items-center justify-between text-sm transition-colors duration-150 ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  {darkMode ? <Icon.Moon className="w-4 h-4" /> : <Icon.Sun className="w-4 h-4" />}
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </span>
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>

            {/* Hide folder files toggle */}
            <div className={`px-4 py-2.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <button
                onClick={() => { onHideFolderFilesToggle?.(); }}
                className={`w-full flex items-center justify-between text-sm transition-colors duration-150 ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon.Folder className="w-4 h-4" />
                  Hide files in folders
                </span>
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${hideFolderFiles ? (darkMode ? 'bg-blue-600' : 'bg-red-500') : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${hideFolderFiles ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>

            {/* Data section */}
            <div className={`py-1.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <p className={`px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Data</p>
              <MenuItem IconComp={Icon.Export} label="Export data" onClick={handleOpenExport} />
              <MenuItem IconComp={Icon.Import} label="Import data" onClick={handleOpenImport} />
              <MenuItem IconComp={Icon.Trash} label="Delete account" onClick={handleOpenDelete} danger />
            </div>

            {/* Logout */}
            <div className="py-1.5">
              <MenuItem IconComp={Icon.Logout} label="Sign out" onClick={handleLogout} />
            </div>
          </div>
          </>
        )}
      </div>

      {/* ── Export Modal ──────────────────────────────────────────────────────── */}
      <Modal open={showExportModal} onClose={() => !exportLoading && setShowExportModal(false)} darkMode={darkMode}>
        <ModalHeader
          IconComp={Icon.Export}
          iconBg={darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}
          iconColor={darkMode ? 'text-blue-400' : 'text-blue-600'}
          title="Export data"
          subtitle="Download all your files as a ZIP archive"
          onClose={() => !exportLoading && setShowExportModal(false)}
          closable={false}
        />

        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {exportDone ? (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${darkMode ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
              <Icon.Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Export link sent</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-green-500/80' : 'text-green-600'}`}>
                  Check your email — the download link expires in 24 hours.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 mb-4 space-y-3 ${darkMode ? 'bg-gray-800/60 border border-gray-700/60' : 'bg-gray-50 border border-gray-200'}`}>
                <InfoRow icon={Icon.Mail} text="A download link will be sent to your email address" darkMode={darkMode} />
                <InfoRow icon={Icon.FileZip} text="Contains all your uploaded files plus a manifest.json" darkMode={darkMode} />
                <InfoRow icon={Icon.Clock} text="Link expires after 24 hours" darkMode={darkMode} />
                <InfoRow icon={Icon.Import} text="The ZIP can be used to import data back into Airstream" darkMode={darkMode} />
              </div>

              {exportError && (
                <p className={`text-xs mb-4 px-3 py-2.5 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {exportError}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => setShowExportModal(false)}
              disabled={exportLoading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {exportDone ? 'Close' : 'Cancel'}
            </button>
            {!exportDone && (
              <button
                onClick={handleConfirmExport}
                disabled={exportLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-60`}
              >
                {exportLoading ? <><Spinner darkMode={darkMode} /> Sending…</> : 'Send export link'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ──────────────────────────────────────────────────────── */}
      <Modal open={showImportModal} onClose={() => !importLoading && setShowImportModal(false)} darkMode={darkMode}>
        <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportFileChange} />

        <ModalHeader
          IconComp={Icon.Import}
          iconBg={darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}
          iconColor={darkMode ? 'text-blue-400' : 'text-blue-600'}
          title="Import data"
          subtitle="Restore files from an Airstream export ZIP"
          onClose={() => !importLoading && setShowImportModal(false)}
          closable={false}
        />

        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {importLoading ? (
            // Phase 1 — uploading the ZIP
            <div className="text-center py-8">
              <div className={`w-9 h-9 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3 ${darkMode ? 'border-blue-400' : 'border-red-500'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Uploading ZIP…</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Preparing your files for import.</p>
            </div>
          ) : importInProgress ? (
            // Phase 2 — background processing with live progress bar
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Importing files…</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-red-600'}`}>
                  {importProgress} / {importTotal}
                </p>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: importTotal > 0 ? `${Math.round((importProgress / importTotal) * 100)}%` : '0%' }}
                />
              </div>
              <p className={`text-xs mt-2 text-center ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Files are appearing in your dashboard as they import. You can close this.
              </p>
            </div>
          ) : importResult ? (
            <div className={`rounded-xl p-4 flex items-start gap-3 ${darkMode ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
              <Icon.Check className={`w-5 h-5 flex-shrink-0 mt-0.5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
              <div>
                <p className={`text-sm font-semibold ${darkMode ? 'text-green-400' : 'text-green-700'}`}>Import complete</p>
                <p className={`text-xs mt-1 ${darkMode ? 'text-green-500/80' : 'text-green-600'}`}>{importResult.message}</p>
              </div>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 mb-4 space-y-3 ${darkMode ? 'bg-gray-800/60 border border-gray-700/60' : 'bg-gray-50 border border-gray-200'}`}>
                <InfoRow icon={Icon.Import} text="Select your Airstream export ZIP file" darkMode={darkMode} />
                <InfoRow icon={Icon.Plus} text="Files will be added to your current account" darkMode={darkMode} />
                <InfoRow icon={Icon.Shield} text="Existing files will not be removed or replaced" darkMode={darkMode} />
              </div>
              {importError && (
                <p className={`text-xs mb-4 px-3 py-2.5 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {importError}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2.5 mt-4">
            <button
              onClick={() => setShowImportModal(false)}
              disabled={importLoading}
              className={`${(!importResult && !importLoading && !importInProgress) ? 'flex-1' : 'px-6'} py-2.5 rounded-xl text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {importResult ? 'Close' : importInProgress ? 'Close' : 'Cancel'}
            </button>
            {!importResult && !importLoading && !importInProgress && (
              <button
                onClick={() => importInputRef.current?.click()}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Choose ZIP file
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Delete Account Modal ──────────────────────────────────────────────── */}
      <Modal open={showDeleteModal} onClose={() => !deleteLoading && setShowDeleteModal(false)} darkMode={darkMode}>
        <ModalHeader
          IconComp={Icon.Warning}
          iconBg={darkMode ? 'bg-red-900/40' : 'bg-red-50'}
          iconColor="text-red-500"
          title="Delete account"
          subtitle="This action schedules permanent deletion of your account"
          onClose={() => !deleteLoading && setShowDeleteModal(false)}
          closable={false}
        />

        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className={`rounded-xl p-4 mb-5 space-y-3 ${darkMode ? 'bg-red-900/20 border border-red-800/40' : 'bg-red-50 border border-red-200'}`}>
            <InfoRow
              icon={Icon.Clock}
              text={<>Your account will be <strong>permanently deleted in 7 days</strong></>}
              darkMode={darkMode}
            />
            <InfoRow
              icon={Icon.Refresh}
              text="Sign back in within 7 days to cancel and restore your account"
              darkMode={darkMode}
            />
            <InfoRow
              icon={Icon.Export}
              text="We recommend exporting your data before proceeding"
              darkMode={darkMode}
            />
            <InfoRow
              icon={Icon.Trash}
              text="After 7 days, all files are permanently gone and unrecoverable"
              darkMode={darkMode}
            />
          </div>

          <div className="mb-4">
            <label className={`block text-xs font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Type <span className={`font-bold font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={deleteLoading}
              className={`w-full px-3 py-2.5 rounded-xl text-sm border outline-none transition-colors font-mono ${
                darkMode
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-600 focus:border-red-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-300 focus:border-red-500'
              } disabled:opacity-50`}
            />
          </div>

          {deleteError && (
            <p className={`text-xs mb-4 px-3 py-2.5 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-200'}`}>
              {deleteError}
            </p>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleteLoading ? <><div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" /> Scheduling…</> : 'Delete my account'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProfileMenu;
