// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import FolderList from './components/FolderList';
import SignUp from './components/SignUp';
import Homepage from './components/Homepage';
import ProfileMenu from './components/ProfileMenu';
import axios from 'axios';

// Global axios setting: always send cookies
axios.defaults.withCredentials = true;

// ─── Axios response interceptor: auto-refresh on 401 ────────────────────────
// When any API call gets a 401, attempt POST /api/auth/refresh once.
// If refresh succeeds the new JWT cookie is set and the original request retries.
// If refresh fails the user is sent to /signup via a page reload (simplest
// approach given auth state lives in App and the interceptor is module-level).
let isRefreshing = false;
let refreshQueue = []; // callbacks waiting for the refresh to complete

const processQueue = (error) => {
  refreshQueue.forEach((cb) => (error ? cb.reject(error) : cb.resolve()));
  refreshQueue = [];
};

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // Only intercept 401s that haven't already been retried, and skip the
    // refresh + auth endpoints themselves to avoid infinite loops.
    if (
      error.response?.status === 401 &&
      !original._retried &&
      !original.url?.includes('/api/auth/refresh') &&
      !original.url?.includes('/api/auth/me') &&
      !original.url?.includes('/api/auth/google')
    ) {
      if (isRefreshing) {
        // Another request is already refreshing — queue this one
        return new Promise((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then(() => {
          original._retried = true;
          return axios(original);
        });
      }
      original._retried = true;
      isRefreshing = true;
      try {
        await axios.post(`${BACKEND_URL}/api/auth/refresh`);
        processQueue(null);
        return axios(original); // retry with the new JWT cookie
      } catch (refreshErr) {
        processQueue(refreshErr);
        // Refresh failed — force re-login
        window.location.href = '/signup';
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [hideFolderFiles, setHideFolderFiles] = useState(false);

  const location = useLocation();
  const hideHeader = location.pathname === '/' || location.pathname === '/signup';
  const showFooter = location.pathname === '/dashboard';

  // ─── Check existing session on mount ────────────────────────────────────────
  useEffect(() => {
    if (!BACKEND_URL) {
      setError('Backend not configured. Please set VITE_BACKEND_URL.');
      setAuthChecked(true);
      return;
    }

    const checkSession = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
        const userData = res.data;
        setUser(userData);
        setIsLoggedIn(true);
        setDarkMode(userData.darkMode ?? false);
        setHideFolderFiles(userData.hideFolderFiles ?? false);
      } catch (err) {
        // JWT expired (common after 15 min) — try to refresh before giving up.
        // This is what keeps rememberMe users logged in across page reloads.
        if (err.response?.status === 401) {
          try {
            await axios.post(`${BACKEND_URL}/api/auth/refresh`);
            // Refresh issued a new JWT cookie — retry /me
            const res2 = await axios.get(`${BACKEND_URL}/api/auth/me`);
            const userData = res2.data;
            setUser(userData);
            setIsLoggedIn(true);
            setDarkMode(userData.darkMode ?? false);
            setHideFolderFiles(userData.hideFolderFiles ?? false);
            return;
          } catch (_) {
            // Refresh token also expired or invalid — user must log in again
          }
        }
        setIsLoggedIn(false);
        setUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    checkSession();
  }, []);

  // ─── Fetch files ─────────────────────────────────────────────────────────────
  const fetchFiles = useCallback(async () => {
    if (!BACKEND_URL) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`);
      setFiles(res.data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files. Please try again.');
    }
  }, []);

  // ─── Fetch folders ────────────────────────────────────────────────────────────
  const fetchFolders = useCallback(async () => {
    if (!BACKEND_URL || !isLoggedIn) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/folders`);
      setFolders(res.data || []);
    } catch (err) {
      console.error('Failed to load folders:', err);
    }
  }, [isLoggedIn]);

  // ─── Load files + folders when authenticated ─────────────────────────────────
  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles();
      fetchFolders();
    }
  }, [isLoggedIn, fetchFiles, fetchFolders]);

  // ─── Auth handlers ────────────────────────────────────────────────────────────
  const handleAccessGranted = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setDarkMode(userData.darkMode ?? false);
    setHideFolderFiles(userData.hideFolderFiles ?? false);
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await axios.post(`${BACKEND_URL}/api/auth/logout`);
    } catch (_) {}
    setIsLoggedIn(false);
    setUser(null);
    setFiles([]);
    setFolders([]);
  }, []);

  const handleDarkModeToggle = useCallback(async () => {
    const next = !darkMode;
    setDarkMode(next);
    try {
      await axios.patch(`${BACKEND_URL}/api/auth/preferences`, { darkMode: next });
    } catch (_) {}
  }, [darkMode]);

  const handleHideFolderFilesToggle = useCallback(async () => {
    const next = !hideFolderFiles;
    setHideFolderFiles(next);
    try {
      await axios.patch(`${BACKEND_URL}/api/auth/preferences`, { hideFolderFiles: next });
    } catch (_) {}
  }, [hideFolderFiles]);

  // ─── Loading splash ──────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="flex flex-col items-center gap-3">
          <svg
            className={`animate-spin h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-red-500'}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      </div>
    );
  }

  // ─── Footer ──────────────────────────────────────────────────────────────────
  const renderFooter = () => (
    <footer className={`relative z-10 border-t mt-auto ${darkMode ? 'border-gray-800 bg-gray-950/80' : 'border-gray-200 bg-white/80'} backdrop-blur-sm`}>
      <div className="w-full px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">

          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-5 w-5 flex-shrink-0" aria-label="Airstream logo">
              <circle cx="250" cy="250" r="210" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" />
              <circle cx="250" cy="172" r="30" fill={darkMode ? '#6b7280' : '#9ca3af'} />
              <polyline points="155,218 250,330 345,218" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`text-xs font-bold tracking-widest uppercase ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
              Airstream
            </span>
          </div>

          {/* Links + copyright */}
          <div className={`flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
            <a
              href="https://quickwitty.onrender.com/contacts"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors duration-150 ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
            >
              Contact
            </a>
            <span className="opacity-30">·</span>
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className={`transition-colors duration-150 ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
            >
              Privacy
            </a>
            <span className="opacity-30">·</span>
            <span>© {new Date().getFullYear()} Airstream Cloud</span>
          </div>

        </div>
      </div>
    </footer>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen flex flex-col relative ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Header */}
      {!hideHeader && (
        <header className={`sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md ${
          darkMode ? 'bg-gray-900/90 border-gray-800 text-white' : 'bg-white/90 border-gray-200 text-gray-900'
        }`}>
          <div className="flex items-center gap-2.5">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-8 w-8 select-none flex-shrink-0" aria-label="Airstream logo">
              <circle cx="250" cy="250" r="210" fill="none" stroke={darkMode ? '#ffffff' : '#000000'} strokeWidth="36" />
              <circle cx="250" cy="172" r="30" fill={darkMode ? '#ffffff' : '#000000'} />
              <polyline points="155,218 250,330 345,218" fill="none" stroke={darkMode ? '#ffffff' : '#000000'} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className={`text-2xl font-black tracking-widest select-none uppercase ${
              darkMode ? 'text-white' : 'bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent'
            }`}>
              AIRSTREAM
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isLoggedIn && (
              <ProfileMenu
                user={user}
                darkMode={darkMode}
                onLogout={handleLogout}
                onDarkModeToggle={handleDarkModeToggle}
                onFilesRefresh={fetchFiles}
                hideFolderFiles={hideFolderFiles}
                onHideFolderFilesToggle={handleHideFolderFilesToggle}
              />
            )}
          </div>
        </header>
      )}

      {/* Grid background */}
      {darkMode && (
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)`,
          backgroundSize: '30px 30px', backgroundColor: '#0f172a', zIndex: 0,
        }} />
      )}
      {!darkMode && (
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)`,
          backgroundSize: '30px 30px', backgroundColor: '#ffffff', zIndex: 0,
        }} />
      )}

      <main className={`flex-grow relative z-10 pb-4 ${hideHeader ? '' : 'px-2 sm:px-4'}`}>
        <Routes>
          <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} />} />
          <Route
            path="/signup"
            element={isLoggedIn ? <Navigate to="/dashboard" replace /> : <SignUp onAccessGranted={handleAccessGranted} darkMode={darkMode} />}
          />
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <div className="relative z-10 flex flex-col h-full">
                  {error && error.includes('Failed to load files') && (
                    <div className={`mb-4 p-3 rounded-md text-sm ${darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>
                      {error}
                    </div>
                  )}
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                  <FolderList
                    darkMode={darkMode}
                    files={files}
                    folders={folders}
                    onFoldersChanged={fetchFolders}
                  />
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    <FileList
                      files={files}
                      refresh={fetchFiles}
                      darkMode={darkMode}
                      isLoading={false}
                      folders={folders}
                      onFoldersChanged={fetchFolders}
                      hideFolderFiles={hideFolderFiles}
                    />
                  </div>
                </div>
              ) : (
                <Navigate to="/signup" replace />
              )
            }
          />
          <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/'} replace />} />
        </Routes>
      </main>

      {showFooter && renderFooter()}
    </div>
  );
}

export default App;
