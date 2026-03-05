// src/App.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
import Homepage from './components/Homepage';
import ProfileMenu from './components/ProfileMenu';
import axios from 'axios';

// Global axios setting: always send cookies
axios.defaults.withCredentials = true;

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
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
      } catch {
        // No valid session – fall through to login
        setIsLoggedIn(false);
        setUser(null);
        // Fallback to system dark mode
        setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
      } finally {
        setAuthChecked(true);
      }
    };

    checkSession();

    // Listen for system dark-mode changes only when not logged in
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMqChange = (e) => {
      if (!isLoggedIn) setDarkMode(e.matches);
    };
    mq.addEventListener('change', handleMqChange);

    return () => mq.removeEventListener('change', handleMqChange);
  }, []); // eslint-disable-line

  // ─── Global JS error handler ─────────────────────────────────────────────
  useEffect(() => {
    const handleGlobalError = (message, _src, _line, _col, err) => {
      if (!err?.response && !message?.includes('Backend not configured')) {
        setError(`Client error: ${message}`);
      }
      return true;
    };
    window.onerror = handleGlobalError;
    return () => { window.onerror = null; };
  }, []);

  // ─── Fetch files whenever login state changes ────────────────────────────
  const fetchFiles = useCallback(async () => {
    if (!isLoggedIn) {
      setFiles([]);
      return;
    }
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`);
      setFiles(res.data);
      setError(null);
    } catch (err) {
      if (err.response?.status === 401) {
        // Don't immediately boot the user — the session cookie may not have
        // propagated yet right after a fresh Google sign-in (cross-origin timing).
        // Give it a short grace period before treating the 401 as a real logout.
        setError('Session expired. Please sign in again.');
        setTimeout(() => {
          setIsLoggedIn(false);
          setUser(null);
        }, 2000);
      } else {
        setError('Failed to load files.');
      }
      setFiles([]);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles();
    } else {
      setFiles([]);
    }
  }, [isLoggedIn, fetchFiles]);

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleAccessGranted = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setDarkMode(userData?.darkMode ?? false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUser(null);
    setFiles([]);
    setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  };

  const handleDarkModeToggle = (newMode) => {
    setDarkMode(newMode);
  };

  // ─── Header ──────────────────────────────────────────────────────────────
  const renderHeader = () => (
    <header
      className={`sticky top-0 z-40 shadow-sm transition-all duration-300 ${
        darkMode
          ? 'bg-gray-950 border-b border-gray-800'
          : 'bg-white border-b border-gray-200'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo / brand */}
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${
              darkMode
                ? 'bg-gradient-to-br from-blue-500 to-blue-700'
                : 'bg-gradient-to-br from-red-500 to-red-700'
            }`}
          >
            <img src="/airstream.png" className="w-5 h-5" alt="" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1
            className={`text-xl font-bold tracking-widest select-none ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            AIRSTREAM
          </h1>
        </div>

        {/* Right side: profile menu (only when logged in) */}
        {isLoggedIn && user && (
          <ProfileMenu
            user={user}
            darkMode={darkMode}
            onDarkModeToggle={handleDarkModeToggle}
            onLogout={handleLogout}
          />
        )}
      </div>
    </header>
  );

  const renderFooter = () => (
    <footer className={`p-4 text-center text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
      © {new Date().getFullYear()} Airstream • All Rights Reserved
    </footer>
  );

  // ─── Splash / loading while checking auth ────────────────────────────────
  if (!authChecked) {
    return (
      <div
        className={`w-full min-h-screen flex items-center justify-center transition-colors duration-300 ${
          darkMode ? 'bg-gray-950' : 'bg-white'
        }`}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className={`w-10 h-10 rounded-full border-4 border-t-transparent animate-spin ${
              darkMode ? 'border-blue-500' : 'border-red-500'
            }`}
          />
          <p className={`text-sm font-medium tracking-widest ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            AIRSTREAM
          </p>
        </div>
      </div>
    );
  }

  // ─── Critical config error page ──────────────────────────────────────────
  if (error && (error.includes('Backend not configured') || error.includes('Client error'))) {
    return (
      <div className={`w-full min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
        {renderHeader()}
        <div className="flex-grow flex items-center justify-center p-4">
          <div className={`p-6 rounded-xl max-w-lg text-center shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <h1 className="text-2xl font-semibold mb-4">Application Error</h1>
            <p className="mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Reload Page
            </button>
          </div>
        </div>
        {renderFooter()}
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────────────
  return (
    <div
      className={`w-full min-h-screen flex flex-col transition-colors duration-300 ${
        darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {!hideHeader && renderHeader()}

      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col relative overflow-hidden">
        {/* Dashboard grid background */}
        {location.pathname === '/dashboard' && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: darkMode
                ? `linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)`
                : `linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px),
                   linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              backgroundColor: darkMode ? '#0f172a' : '#ffffff',
              zIndex: 0,
            }}
          />
        )}

        <Routes>
          {/* Home: if logged in, go to dashboard; else show homepage */}
          <Route
            path="/"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Homepage isLoggedIn={isLoggedIn} />
              )
            }
          />

          {/* Login */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <AccessGate onAccessGranted={handleAccessGranted} darkMode={darkMode} />
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
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    <FileList files={files} refresh={fetchFiles} darkMode={darkMode} isLoading={false} />
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
