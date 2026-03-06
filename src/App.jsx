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

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [authChecked, setAuthChecked] = useState(false); // prevent flash

  const location = useLocation();
  const hideHeader = location.pathname === '/' || location.pathname === '/login';
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
        // Apply saved dark mode preference
        setDarkMode(userData.darkMode ?? false);
      } catch (err) {
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

  // ─── Loading splash ──────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-gray-900' : 'bg-white'}`}
      >
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
    <footer
      className={`py-4 text-center text-xs border-t ${
        darkMode ? 'text-gray-500 border-gray-800' : 'text-gray-400 border-gray-200'
      }`}
    >
      Airstream &copy; {new Date().getFullYear()}
    </footer>
  );

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div
      className={`min-h-screen flex flex-col relative ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
    >
      {/* Header */}
      {!hideHeader && (
        <header
          className={`sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3 border-b backdrop-blur-md ${
            darkMode
              ? 'bg-gray-900/90 border-gray-800 text-white'
              : 'bg-white/90 border-gray-200 text-gray-900'
          }`}
        >
          <span
            className={`text-2xl font-extrabold tracking-tight select-none ${
              darkMode
                ? 'text-white'
                : 'bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent'
            }`}
          >
            Airstream
          </span>
          <div className="flex items-center gap-2">
            {/* Dark mode toggle */}
            <button
              onClick={handleDarkModeToggle}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'text-yellow-400 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'
              }`}
              aria-label="Toggle dark mode"
              title="Toggle dark mode"
            >
              {darkMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
            {isLoggedIn && (
              <ProfileMenu user={user} darkMode={darkMode} onLogout={handleLogout} />
            )}
          </div>
        </header>
      )}

      {/* Grid background */}
      {darkMode && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            backgroundColor: '#0f172a',
            zIndex: 0,
          }}
        />
      )}
      {!darkMode && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            backgroundColor: '#ffffff',
            zIndex: 0,
          }}
        />
      )}

      <main className="flex-grow relative z-10 px-2 sm:px-4 pb-4">
        <Routes>
          {/* Home — always accessible; Homepage receives isLoggedIn to show "Go to Dashboard" */}
          <Route
            path="/"
            element={<Homepage isLoggedIn={isLoggedIn} />}
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <SignUp onAccessGranted={handleAccessGranted} darkMode={darkMode} />
              )
            }
          />

          {/* Dashboard (protected) */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <div className="relative z-10 flex flex-col h-full">
                  {error && error.includes('Failed to load files') && (
                    <div
                      className={`mb-4 p-3 rounded-md text-sm ${
                        darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {error}
                    </div>
                  )}

                  {/* Upload bar */}
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />

                  {/* Folder section — sits between upload bar and file list */}
                  <FolderList
                    darkMode={darkMode}
                    files={files}
                    folders={folders}
                    onFoldersChanged={fetchFolders}
                  />

                  {/* File list */}
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    <FileList
                      files={files}
                      refresh={fetchFiles}
                      darkMode={darkMode}
                      isLoading={false}
                      folders={folders}
                      onFoldersChanged={fetchFolders}
                    />
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to={isLoggedIn ? '/dashboard' : '/'} replace />} />
        </Routes>
      </main>

      {showFooter && renderFooter()}
    </div>
  );
}

export default App;
