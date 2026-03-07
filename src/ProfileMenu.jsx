// src/components/ProfileMenu.jsx
// Storage section now shows Google Drive quota:
//   - Airstream app usage (from drive_mappings metadata sum)
//   - Total Google Drive usage (Drive + Gmail + Photos) 
//   - Total Drive capacity (15 GB standard, more with Google One)
// All other features (export, import, delete, dark mode, hide folder files) unchanged.

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io as socketIO } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ─── formatBytes helper ───────────────────────────────────────────────────────
const formatBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

// ─── Icon set ─────────────────────────────────────────────────────────────────
const Icon = {
  Moon:   ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>,
  Sun:    ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.36-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l.71.71M12 5a7 7 0 100 14A7 7 0 0012 5z"/></svg>,
  Folder: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>,
  Export: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>,
  Import: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>,
  Trash:  ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
  Logout: ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>,
  X:      ({ className }) => <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>,
  Drive:  ({ className }) => <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M12 3L6.5 13.5h11L12 3zM2 21h10.5L7 13.5 2 21zm10 0H22l-5.5-7.5L11.5 21z" opacity=".8"/></svg>,
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

// ─── Modal wrapper ────────────────────────────────────────────────────────────
const Modal = ({ open, onClose, darkMode, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative z-10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${darkMode ? 'bg-gray-900 border border-gray-700/80' : 'bg-white border border-gray-200'}`}>
        {children}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
const ProfileMenu = ({ user, darkMode, onDarkModeToggle, onLogout, onFilesRefresh, hideFolderFiles, onHideFolderFilesToggle }) => {
  const [open, setOpen] = useState(false);
  // stats now includes: fileCount, storageUsed (app), storageLimit (Drive total), driveQuota
  const [stats, setStats] = useState({ fileCount: 0, storageUsed: 0, storageLimit: 0, driveQuota: null });
  const [loadingStats, setLoadingStats] = useState(false);

  // Export
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading]     = useState(false);
  const [exportDone, setExportDone]           = useState(false);
  const [exportError, setExportError]         = useState('');

  // Import
  const importInputRef   = useRef(null);
  const importTimeoutRef = useRef(null);
  const [showImportModal, setShowImportModal]   = useState(false);
  const [importLoading, setImportLoading]       = useState(false);
  const [importResult, setImportResult]         = useState(null);
  const [importError, setImportError]           = useState('');
  const [importProgress, setImportProgress]     = useState(0);
  const [importTotal, setImportTotal]           = useState(0);
  const [importInProgress, setImportInProgress] = useState(false);

  // Delete
  const [showDeleteModal, setShowDeleteModal]     = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading]         = useState(false);
  const [deleteError, setDeleteError]             = useState('');

  const menuRef    = useRef(null);
  const backendUrl = BACKEND_URL;

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  useEffect(() => {
    return () => {
      if (importTimeoutRef.current) { clearTimeout(importTimeoutRef.current); importTimeoutRef.current = null; }
    };
  }, []);

  // Fetch stats (includes Drive quota) whenever dropdown opens
  useEffect(() => {
    if (!open) return;
    setLoadingStats(true);
    axios
      .get(`${backendUrl}/api/auth/stats`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Stats fetch error:', err))
      .finally(() => setLoadingStats(false));
  }, [open, backendUrl]);

  // ── Storage calculations ─────────────────────────────────────────────────────
  // App storage bar: how much Airstream uses vs total Drive capacity
  const driveLimit       = stats.driveQuota?.limit || stats.storageLimit || 0;
  const driveUsageTotal  = stats.driveQuota?.usage || 0;       // Drive + Gmail + Photos
  const driveUsageDrive  = stats.driveQuota?.usageInDrive || 0; // Drive files only
  const appUsed          = stats.storageUsed || 0;              // Airstream's files

  // Bar shows Airstream's portion of total Drive capacity
  const appPercent   = driveLimit > 0 ? Math.min(100, (appUsed / driveLimit) * 100) : 0;
  const drivePercent = driveLimit > 0 ? Math.min(100, (driveUsageTotal / driveLimit) * 100) : 0;

  const appBarColor =
    appPercent > 90 ? 'bg-red-500' :
    appPercent > 70 ? 'bg-yellow-500' :
    darkMode ? 'bg-blue-500' : 'bg-red-500';

  const accentRing = darkMode ? 'focus:ring-blue-500' : 'focus:ring-red-400';

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDarkToggle = () => { onDarkModeToggle?.(); };

  const handleOpenExport = () => {
    setOpen(false);
    setExportDone(false);
    setExportError('');
    setExportLoading(false);
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    setExportLoading(true);
    setExportError('');
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
    setTimeout(() => importInputRef.current?.click(), 100);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('exportFile', file);

      const res = await axios.post(`${backendUrl}/api/auth/import-data`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setImportLoading(false);
      setImportTotal(res.data.total || 0);
      setImportProgress(0);
      setImportInProgress(true);

      // Listen for progress via Socket.IO
      const socket = socketIO(backendUrl, { withCredentials: true, transports: ['websocket'] });
      socket.on('importProgress', ({ imported, skipped, total }) => {
        setImportProgress(imported + skipped);
        setImportTotal(total);
      });
      socket.on('importComplete', ({ imported, skipped, message }) => {
        setImportInProgress(false);
        setImportResult({ imported, skipped, message });
        socket.disconnect();
        if (importTimeoutRef.current) { clearTimeout(importTimeoutRef.current); importTimeoutRef.current = null; }
        onFilesRefresh?.();
      });
      socket.on('refreshFileList', () => { onFilesRefresh?.(); });

      importTimeoutRef.current = setTimeout(() => {
        socket.disconnect();
        setImportInProgress(false);
      }, 10 * 60 * 1000);

    } catch (err) {
      setImportLoading(false);
      setImportError(err.response?.data?.error || 'Import failed. Please try again.');
    }
  };

  const handleOpenDelete = () => {
    setOpen(false);
    setDeleteConfirmText('');
    setDeleteError('');
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await axios.post(`${backendUrl}/api/auth/delete-account`, {}, { withCredentials: true });
      setShowDeleteModal(false);
      onLogout?.();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Failed to schedule account deletion. Please try again.');
      setDeleteLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });
    } catch (_) {}
    onLogout?.();
  };

  // ── Sub-components ────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Profile dropdown trigger ──────────────────────────────────────────── */}
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
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-100 border-gray-300 text-gray-700'}`}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80 sm:translate-x-0
              ${darkMode ? 'bg-gray-900 border-gray-700/80 shadow-black/40' : 'bg-white border-gray-200 shadow-gray-200/80'}
            `}>

              {/* ── User info + storage ──────────────────────────────────────── */}
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

                {/* ── Drive Storage panel ──────────────────────────────────── */}
                <div className="mt-3">
                  {/* Airstream app usage bar */}
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs flex items-center gap-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <Icon.Drive className="w-3 h-3" />
                      Airstream storage
                    </span>
                    <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {loadingStats ? '—' : (
                        driveLimit > 0
                          ? `${formatBytes(appUsed)} / ${formatBytes(driveLimit)}`
                          : formatBytes(appUsed)
                      )}
                    </span>
                  </div>

                  {/* App usage bar */}
                  <div className={`h-1.5 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${appBarColor}`}
                      style={{ width: `${appPercent}%` }}
                    />
                  </div>

                  {/* Secondary: total Drive usage breakdown */}
                  {!loadingStats && driveLimit > 0 && (
                    <div className="mt-2">
                      {/* Total Drive bar (dimmed, background context) */}
                      <div className={`h-1 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <div
                          className={`h-full rounded-full transition-all duration-500 opacity-40 ${darkMode ? 'bg-blue-400' : 'bg-gray-400'}`}
                          style={{ width: `${drivePercent}%` }}
                        />
                      </div>

                      {/* Three-line breakdown */}
                      <div className={`mt-1.5 space-y-0.5 text-[10px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        <div className="flex justify-between">
                          <span>{stats.fileCount} file{stats.fileCount !== 1 ? 's' : ''} in Airstream</span>
                          <span>{formatBytes(appUsed)} used by Airstream</span>
                        </div>
                        <div className="flex justify-between">
                          <span className={`${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>Google Drive (all)</span>
                          <span className={`${darkMode ? 'text-gray-600' : 'text-gray-300'}`}>
                            {formatBytes(driveUsageTotal)} / {formatBytes(driveLimit)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple file count when Drive quota unavailable */}
                  {!loadingStats && driveLimit === 0 && (
                    <p className={`text-[10px] mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {stats.fileCount} file{stats.fileCount !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Dark mode toggle ─────────────────────────────────────────── */}
              <div className={`px-4 py-2.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
                <button
                  onClick={handleDarkToggle}
                  className={`w-full flex items-center justify-between text-sm transition-colors duration-150 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
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

              {/* ── Hide folder files toggle ─────────────────────────────────── */}
              <div className={`px-4 py-2.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
                <button
                  onClick={() => { onHideFolderFilesToggle?.(); }}
                  className={`w-full flex items-center justify-between text-sm transition-colors duration-150 ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
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

              {/* ── Data section ─────────────────────────────────────────────── */}
              <div className={`py-1.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
                <p className={`px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Data</p>
                <MenuItem IconComp={Icon.Export} label="Export data"     onClick={handleOpenExport} />
                <MenuItem IconComp={Icon.Import} label="Import data"     onClick={handleOpenImport} />
                <MenuItem IconComp={Icon.Trash}  label="Delete account"  onClick={handleOpenDelete} danger />
              </div>

              {/* ── Logout ───────────────────────────────────────────────────── */}
              <div className="py-1.5">
                <MenuItem IconComp={Icon.Logout} label="Sign out" onClick={handleLogout} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          Export Modal
      ──────────────────────────────────────────────────────────────────────── */}
      <Modal open={showExportModal} onClose={() => !exportLoading && setShowExportModal(false)} darkMode={darkMode}>
        <ModalHeader
          IconComp={Icon.Export}
          iconBg={darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}
          iconColor={darkMode ? 'text-blue-400' : 'text-blue-600'}
          title="Export data"
          subtitle="Download a ZIP of all your files"
          onClose={() => !exportLoading && setShowExportModal(false)}
        />
        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {exportDone ? (
            <div className="text-center py-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Export link sent!</p>
              <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Check your email for the download link. It expires in 72 hours.</p>
            </div>
          ) : (
            <>
              <div className="space-y-3 mb-5">
                <InfoRow icon={Icon.Export} text="A ZIP archive of all your files will be prepared. Files are fetched directly from your Google Drive." darkMode={darkMode} />
                <InfoRow icon={Icon.Drive}  text="The download link is emailed to you and expires in 72 hours. It can only be used once." darkMode={darkMode} />
              </div>
              {exportError && (
                <p className={`text-xs mb-4 px-3 py-2.5 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {exportError}
                </p>
              )}
            </>
          )}
          <div className="flex gap-2.5">
            <button
              onClick={() => setShowExportModal(false)}
              disabled={exportLoading}
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
            >
              {exportDone ? 'Close' : 'Cancel'}
            </button>
            {!exportDone && (
              <button
                onClick={handleConfirmExport}
                disabled={exportLoading}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'} disabled:opacity-60`}
              >
                {exportLoading ? <><Spinner darkMode={darkMode} /> Sending…</> : 'Send export link'}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────
          Import Modal
      ──────────────────────────────────────────────────────────────────────── */}
      <Modal open={showImportModal} onClose={() => !importLoading && !importInProgress && setShowImportModal(false)} darkMode={darkMode}>
        <input ref={importInputRef} type="file" accept=".zip" className="hidden" onChange={handleImportFileChange} />

        <ModalHeader
          IconComp={Icon.Import}
          iconBg={darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}
          iconColor={darkMode ? 'text-blue-400' : 'text-blue-600'}
          title="Import data"
          subtitle="Restore files from an Airstream export ZIP"
          onClose={() => !importLoading && !importInProgress && setShowImportModal(false)}
          closable={!importLoading && !importInProgress}
        />

        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {importLoading ? (
            <div className="text-center py-8">
              <div className={`w-9 h-9 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3 ${darkMode ? 'border-blue-400' : 'border-red-500'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Uploading ZIP…</p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Files will be uploaded to your Google Drive.</p>
            </div>
          ) : importInProgress ? (
            <div className="py-4">
              <div className="flex items-center justify-between mb-2">
                <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Importing to Google Drive…</p>
                <p className={`text-sm font-semibold ${darkMode ? 'text-blue-400' : 'text-red-600'}`}>{importProgress} / {importTotal}</p>
              </div>
              <div className={`h-2.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                  className={`h-full rounded-full transition-all duration-300 ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`}
                  style={{ width: `${importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0}%` }}
                />
              </div>
              <p className={`text-xs mt-2 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Uploading files to your Google Drive — this may take a few minutes.
              </p>
            </div>
          ) : importResult ? (
            <div className="py-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${darkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                <svg className={`w-6 h-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className={`text-center text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Import complete</p>
              <p className={`text-center text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{importResult.message}</p>
              <button
                onClick={() => setShowImportModal(false)}
                className={`w-full mt-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
              >
                Close
              </button>
            </div>
          ) : (
            <div className="py-4">
              {importError ? (
                <p className={`text-xs mb-4 px-3 py-2.5 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400 border border-red-800/40' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                  {importError}
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  <InfoRow icon={Icon.Import} text="Select an Airstream export ZIP. Files will be uploaded to your Google Drive in the Airstream folder." darkMode={darkMode} />
                  <InfoRow icon={Icon.Drive}  text="Duplicate files will be imported as additional copies. Your existing files will not be affected." darkMode={darkMode} />
                </div>
              )}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowImportModal(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={() => importInputRef.current?.click()}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors ${darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  Choose file
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* ────────────────────────────────────────────────────────────────────────
          Delete account Modal
      ──────────────────────────────────────────────────────────────────────── */}
      <Modal open={showDeleteModal} onClose={() => !deleteLoading && setShowDeleteModal(false)} darkMode={darkMode}>
        <ModalHeader
          IconComp={Icon.Trash}
          iconBg={darkMode ? 'bg-red-900/40' : 'bg-red-50'}
          iconColor={darkMode ? 'text-red-400' : 'text-red-600'}
          title="Delete account"
          subtitle="This action schedules your account for permanent deletion"
          onClose={() => !deleteLoading && setShowDeleteModal(false)}
        />
        <div className={`px-6 py-5 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="space-y-3 mb-5">
            <InfoRow icon={Icon.Trash} text="Your account will be permanently deleted after 7 days. You can cancel by signing back in within that window." darkMode={darkMode} />
            <InfoRow icon={Icon.Drive} text="All files stored in your Google Drive Airstream folder will also be permanently deleted after the 7-day window." darkMode={darkMode} />
          </div>
          <div className="mb-4">
            <label className={`block text-xs mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
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
              className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleteLoading ? <><Spinner darkMode={darkMode} /> Scheduling…</> : 'Delete my account'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProfileMenu;
