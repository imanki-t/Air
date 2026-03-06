// src/components/ProfileMenu.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// ─── Reusable modal wrapper ───────────────────────────────────────────────────
const Modal = ({ open, onClose, darkMode, children }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full max-w-md rounded-2xl shadow-2xl border overflow-hidden ${
          darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

// ─── Spinner ──────────────────────────────────────────────────────────────────
const Spinner = ({ darkMode }) => (
  <div
    className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${
      darkMode ? 'border-blue-400' : 'border-white'
    }`}
  />
);

const ProfileMenu = ({ user, darkMode, onDarkModeToggle, onLogout, onFilesRefresh }) => {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ fileCount: 0, storageUsed: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState('');

  // Import state
  const importInputRef = useRef(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null); // { imported, skipped, message }
  const [importError, setImportError] = useState('');

  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const menuRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  // Load stats when menu opens
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
    storagePercent > 90
      ? 'bg-red-500'
      : storagePercent > 70
      ? 'bg-yellow-500'
      : darkMode
      ? 'bg-blue-500'
      : 'bg-red-500';

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    setOpen(false);
    try {
      await axios.post(`${backendUrl}/api/auth/logout`, {}, { withCredentials: true });
    } catch (e) {
      console.error('Logout error:', e);
    }
    onLogout();
  };

  const handleDarkToggle = async () => {
    const newMode = !darkMode;
    onDarkModeToggle(newMode);
    try {
      await axios.patch(
        `${backendUrl}/api/auth/preferences`,
        { darkMode: newMode },
        { withCredentials: true }
      );
    } catch (e) {
      console.error('Preference save error:', e);
    }
  };

  const handleOpenExport = () => {
    setOpen(false);
    setExportDone(false);
    setExportError('');
    setShowExportModal(true);
  };

  const handleConfirmExport = async () => {
    setExportLoading(true);
    setExportError('');
    try {
      await axios.post(`${backendUrl}/api/auth/export-data`, {}, { withCredentials: true });
      setExportDone(true);
    } catch (err) {
      setExportError(
        err.response?.data?.error || 'Failed to initiate export. Please try again.'
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleOpenImport = () => {
    setOpen(false);
    setImportResult(null);
    setImportError('');
    setShowImportModal(true);
  };

  const handleImportFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected if needed
    e.target.value = '';

    if (!file.name.endsWith('.zip')) {
      setImportError('Please select a valid Airstream export ZIP file.');
      return;
    }

    setImportLoading(true);
    setImportError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('exportFile', file);

    try {
      const res = await axios.post(`${backendUrl}/api/auth/import-data`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 10 * 60 * 1000, // 10 min timeout for large imports
      });
      setImportResult(res.data);
      if (onFilesRefresh) onFilesRefresh();
    } catch (err) {
      setImportError(
        err.response?.data?.error || 'Import failed. Please try again.'
      );
    } finally {
      setImportLoading(false);
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
      onLogout();
    } catch (err) {
      setDeleteError(
        err.response?.data?.error || 'Failed to schedule account deletion. Please try again.'
      );
      setDeleteLoading(false);
    }
  };

  const accent = darkMode ? 'bg-blue-500' : 'bg-red-500';
  const accentText = darkMode ? 'text-blue-400' : 'text-red-500';
  const accentRing = darkMode ? 'focus:ring-blue-500' : 'focus:ring-red-400';

  // ── Dropdown item helper ────────────────────────────────────────────────────
  const MenuItem = ({ icon, label, onClick, danger = false, disabled = false }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors duration-150 text-left ${
        danger
          ? darkMode
            ? 'text-red-400 hover:bg-red-900/20'
            : 'text-red-600 hover:bg-red-50'
          : darkMode
          ? 'text-gray-300 hover:bg-gray-800'
          : 'text-gray-700 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className="w-4 flex-shrink-0">{icon}</span>
      {label}
    </button>
  );

  return (
    <>
      {/* ── Profile dropdown ─────────────────────────────────────────────── */}
      <div className="relative" ref={menuRef}>
        {/* Avatar button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className={`flex items-center gap-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${accentRing}`}
          aria-label="Profile menu"
          title={user?.name || 'Profile'}
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
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                darkMode ? 'bg-blue-600 border-blue-500 text-white' : 'bg-red-600 border-red-500 text-white'
              }`}
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            className={`absolute right-0 top-12 w-72 rounded-xl shadow-2xl border overflow-hidden z-50 transition-all duration-200 ${
              darkMode ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-200'
            }`}
          >
            {/* Accent line */}
            <div className={`h-1 w-full ${accent}`} />

            {/* User info */}
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <div className="flex items-center gap-3">
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-10 h-10 rounded-full flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${
                      darkMode ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {user?.name || 'User'}
                  </p>
                  <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {user?.email || ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              {loadingStats ? (
                <div className="flex items-center justify-center py-2">
                  <div className={`w-4 h-4 rounded-full border-2 border-t-transparent animate-spin ${darkMode ? 'border-blue-400' : 'border-red-400'}`} />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-xs font-medium flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8" />
                      </svg>
                      Files uploaded
                    </span>
                    <span className={`text-xs font-bold ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                      {stats.fileCount}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={`text-xs font-medium flex items-center gap-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                        </svg>
                        Storage
                      </span>
                      <span className={`text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {formatBytes(stats.storageUsed)} / 5 GB
                      </span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${storageColor}`}
                        style={{ width: `${storagePercent}%` }}
                      />
                    </div>
                  </div>
                </>
              )}
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
                  {darkMode ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {darkMode ? 'Dark mode' : 'Light mode'}
                </span>
                <div className={`w-9 h-5 rounded-full transition-colors duration-200 relative ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${darkMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
              </button>
            </div>

            {/* Data management section */}
            <div className={`py-1.5 border-b ${darkMode ? 'border-gray-700/60' : 'border-gray-100'}`}>
              <p className={`px-4 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                Data
              </p>

              <MenuItem
                onClick={handleOpenExport}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                }
                label="Export data"
              />

              <MenuItem
                onClick={handleOpenImport}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                }
                label="Import data"
              />

              <MenuItem
                onClick={handleOpenDelete}
                danger
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
                label="Delete account"
              />
            </div>

            {/* Logout */}
            <div className="py-1.5">
              <MenuItem
                onClick={handleLogout}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                }
                label="Sign out"
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Export Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showExportModal} onClose={() => !exportLoading && setShowExportModal(false)} darkMode={darkMode}>
        <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">Export your data</h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Download all your files as a ZIP archive
              </p>
            </div>
          </div>

          {exportDone ? (
            <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    Export link sent!
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-green-500/80' : 'text-green-600'}`}>
                    Check your email ({user?.email}) — the download link is valid for 30 days. The ZIP can also be imported back into Airstream.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 mb-4 text-sm space-y-2 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <p className="flex items-center gap-2"><span>📁</span> All your uploaded files</p>
                <p className="flex items-center gap-2"><span>📋</span> A manifest with file metadata</p>
                <p className="flex items-center gap-2"><span>📥</span> Can be re-imported into Airstream</p>
                <p className="flex items-center gap-2"><span>⏳</span> Download link expires in 30 days</p>
              </div>

              {exportError && (
                <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  {exportError}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2.5 mt-2">
            <button
              onClick={() => setShowExportModal(false)}
              disabled={exportLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {exportDone ? 'Close' : 'Cancel'}
            </button>
            {!exportDone && (
              <button
                onClick={handleConfirmExport}
                disabled={exportLoading}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-60`}
              >
                {exportLoading ? (
                  <>
                    <Spinner /> Sending…
                  </>
                ) : (
                  'Send export link'
                )}
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* ── Import Modal ─────────────────────────────────────────────────────── */}
      <Modal open={showImportModal} onClose={() => !importLoading && setShowImportModal(false)} darkMode={darkMode}>
        {/* Hidden file input */}
        <input
          ref={importInputRef}
          type="file"
          accept=".zip"
          className="hidden"
          onChange={handleImportFileChange}
        />

        <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-blue-900/40' : 'bg-blue-50'}`}>
              <svg className={`w-5 h-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4-4m0 0l4 4m-4-4v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">Import data</h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Restore from an Airstream export ZIP
              </p>
            </div>
          </div>

          {importLoading ? (
            <div className="text-center py-6">
              <div className={`w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3 ${darkMode ? 'border-blue-400' : 'border-red-500'}`} />
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Importing your files… this may take a while.
              </p>
            </div>
          ) : importResult ? (
            <div className={`rounded-xl p-4 mb-4 ${darkMode ? 'bg-green-900/20 border border-green-800/40' : 'bg-green-50 border border-green-200'}`}>
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
                    Import complete
                  </p>
                  <p className={`text-xs mt-1 ${darkMode ? 'text-green-500/80' : 'text-green-600'}`}>
                    {importResult.message}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className={`rounded-xl p-4 mb-4 text-sm space-y-2 ${darkMode ? 'bg-gray-800 text-gray-300' : 'bg-gray-50 text-gray-600'}`}>
                <p className="flex items-center gap-2"><span>📦</span> Select your Airstream export ZIP file</p>
                <p className="flex items-center gap-2"><span>➕</span> Files will be added to your current account</p>
                <p className="flex items-center gap-2"><span>⚠️</span> Existing files won't be removed or replaced</p>
              </div>

              {importError && (
                <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
                  {importError}
                </p>
              )}
            </>
          )}

          <div className="flex gap-2.5 mt-2">
            <button
              onClick={() => setShowImportModal(false)}
              disabled={importLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              {importResult ? 'Close' : 'Cancel'}
            </button>
            {!importResult && !importLoading && (
              <button
                onClick={() => importInputRef.current?.click()}
                className={`flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
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
        <div className={`p-6 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${darkMode ? 'bg-red-900/40' : 'bg-red-50'}`}>
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold">Delete account</h2>
              <p className={`text-xs mt-0.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                This will permanently delete your account and all files
              </p>
            </div>
          </div>

          <div className={`rounded-xl p-4 mb-4 text-sm ${darkMode ? 'bg-red-900/20 border border-red-800/40 text-red-300' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            <p className="font-medium mb-2">Before you proceed:</p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-start gap-2"><span className="mt-0.5">⏱️</span> Your account will be <strong>permanently deleted in 7 days</strong></li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🔄</span> Sign back in within 7 days to cancel deletion and restore your account</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">📦</span> We recommend exporting your data first</li>
              <li className="flex items-start gap-2"><span className="mt-0.5">🗑️</span> After 7 days, all files are permanently gone</li>
            </ul>
          </div>

          <div className="mb-4">
            <label className={`block text-xs font-medium mb-1.5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Type <span className={`font-bold font-mono ${darkMode ? 'text-red-400' : 'text-red-600'}`}>DELETE</span> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              disabled={deleteLoading}
              className={`w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors font-mono ${
                darkMode
                  ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-600 focus:border-red-500'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-red-500'
              } disabled:opacity-50`}
            />
          </div>

          {deleteError && (
            <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${darkMode ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              {deleteError}
            </p>
          )}

          <div className="flex gap-2.5">
            <button
              onClick={() => setShowDeleteModal(false)}
              disabled={deleteLoading}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              } disabled:opacity-50`}
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== 'DELETE' || deleteLoading}
              className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {deleteLoading ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                  Scheduling…
                </>
              ) : (
                'Delete my account'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ProfileMenu;
