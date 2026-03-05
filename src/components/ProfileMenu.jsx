// src/components/ProfileMenu.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024; // 5 GB

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const ProfileMenu = ({ user, darkMode, onDarkModeToggle, onLogout }) => {
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ fileCount: 0, storageUsed: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  const menuRef = useRef(null);
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  // Close on outside click
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

  return (
    <div className="relative" ref={menuRef}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 ${
          darkMode ? 'focus:ring-blue-500' : 'focus:ring-red-400'
        }`}
        aria-label="Profile menu"
        title={user?.name || 'Profile'}
      >
        {user?.picture ? (
          <img
            src={user.picture}
            alt={user.name}
            className={`w-9 h-9 rounded-full border-2 transition-all duration-200 ${
              open
                ? darkMode
                  ? 'border-blue-400'
                  : 'border-red-400'
                : darkMode
                ? 'border-gray-600 hover:border-blue-400'
                : 'border-gray-300 hover:border-red-400'
            }`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div
            className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
              darkMode
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-red-600 border-red-500 text-white'
            }`}
          >
            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
        )}
        <svg
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          } ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
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
            darkMode
              ? 'bg-gray-900 border-gray-700'
              : 'bg-white border-gray-200'
          }`}
        >
          {/* Accent line */}
          <div className={`h-1 w-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`} />

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
                {/* File count */}
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

                {/* Storage bar */}
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
                  <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    {(100 - storagePercent).toFixed(1)}% remaining
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="py-1.5">
            {/* Dark mode toggle */}
            <button
              onClick={handleDarkToggle}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150 ${
                darkMode
                  ? 'text-gray-300 hover:bg-gray-800'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-2.5">
                {darkMode ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
                {darkMode ? 'Light mode' : 'Dark mode'}
              </span>
              {/* Toggle pill */}
              <div className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${darkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${darkMode ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </div>
            </button>

            {/* Separator */}
            <div className={`mx-4 my-1 h-px ${darkMode ? 'bg-gray-700/60' : 'bg-gray-100'}`} />

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors duration-150 ${
                darkMode
                  ? 'text-red-400 hover:bg-gray-800'
                  : 'text-red-600 hover:bg-red-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
