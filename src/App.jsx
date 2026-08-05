// src/App.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import UploadForm from './components/UploadForm';
import UserNotesDashboard from './components/UserNotesDashboard';
import FileList from './components/FileList';
import FolderList from './components/FolderList';
import SignUp from './components/SignUp';
import Homepage from './components/Homepage';
import PrivacyPolicy from './components/PrivacyPolicy';
import ProfileMenu from './components/ProfileMenu';
import axios from 'axios';
import { saveFileListCache, getFileListCache, clearFileListCache } from './fileStore';

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
  const [darkMode, setDarkMode] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [themeMode, setThemeMode] = useState('system');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [hideFolderFiles, setHideFolderFiles] = useState(false);

  const location = useLocation();
  const hideHeader = location.pathname === '/' || location.pathname === '/signup';
  const showFooter = location.pathname === '/dashboard';

  // ─── Check existing session on mount ────────────────────────────────────────
  useEffect(() => {
    if (!BACKEND_URL) {
      setError('Backend not configured. Please set VITE_BACKEND_URL.');
      return;
    }

    const checkSession = async () => {
      try {
        const res = await axios.get(`${BACKEND_URL}/api/auth/me`);
        const userData = res.data;
        setUser(userData);
        setIsLoggedIn(true);
        setDarkMode(userData.darkMode ?? false);
        setThemeMode(userData.themeMode ?? 'system');
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
            setThemeMode(userData.themeMode ?? 'system');
            setHideFolderFiles(userData.hideFolderFiles ?? false);
            return;
          } catch (_) {
            // Refresh token also expired or invalid — user must log in again
          }
        }
        setIsLoggedIn(false);
        setUser(null);
      }
    };

    checkSession();
  }, []);

  // ─── Files: caching + sync refs ────────────────────────────────────────────
  // lastSyncedAtRef: server timestamp of the last successful sync — sent back
  //   as ?since= so the next sync only pulls what actually changed (delta sync).
  // lastEtagRef: ETag from the last full ("everything") fetch — sent back as
  //   If-None-Match so an unchanged library returns a bodyless 304.
  const lastSyncedAtRef = useRef(null);
  const lastEtagRef = useRef(null);
  const INITIAL_PAGE_SIZE = 50;

  // Merge a sync result (new/changed files + deletedIds) into local state and
  // mirror it into the IndexedDB cache so the next app launch can boot from it.
  const applySyncResult = useCallback((changedFiles, deletedIds, syncedAt) => {
    setFiles((prev) => {
      const byId = new Map(prev.map((f) => [String(f._id), f]));
      for (const f of changedFiles || []) byId.set(String(f._id), f);
      for (const id of deletedIds || []) byId.delete(String(id));
      const merged = Array.from(byId.values());
      saveFileListCache(merged, syncedAt).catch(() => {});
      return merged;
    });
    if (syncedAt) lastSyncedAtRef.current = syncedAt;
  }, []);

  // ─── Full fetch — ETag-conditional so a re-fetch with nothing changed costs
  // just a 304 with no body. Used for the very first sync and explicit "hard
  // refresh" actions (e.g. the profile menu's refresh button).
  const fetchFiles = useCallback(async () => {
    if (!BACKEND_URL) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`, {
        headers: lastEtagRef.current ? { 'If-None-Match': lastEtagRef.current } : {},
        validateStatus: (s) => s === 200 || s === 304,
      });
      if (res.status === 304) {
        setError(null);
        return; // nothing changed since our last full fetch
      }
      lastEtagRef.current = res.headers?.etag || null;
      applySyncResult(res.data?.files || [], res.data?.deletedIds || [], res.data?.syncedAt);
      setError(null);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files. Please try again.');
    }
  }, [applySyncResult]);

  // ─── Delta sync — only pulls files changed since the last successful sync,
  // plus which files were deleted. Falls back to a full fetch if we don't yet
  // have a sync cursor (e.g. cache was empty).
  const syncFiles = useCallback(async () => {
    if (!BACKEND_URL) return;
    if (!lastSyncedAtRef.current) return fetchFiles();
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`, {
        params: { since: lastSyncedAtRef.current },
      });
      applySyncResult(res.data?.files || [], res.data?.deletedIds || [], res.data?.syncedAt);
      setError(null);
    } catch (err) {
      console.error('Delta sync failed:', err);
    }
  }, [fetchFiles, applySyncResult]);

  // ─── First-ever load on a device (no cache yet): paint fast with just the
  // most recent files, then quietly backfill the rest so pagination beyond
  // the first page keeps working — instead of blocking the first paint on
  // downloading the entire library.
  const fetchInitialPage = useCallback(async () => {
    if (!BACKEND_URL) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`, {
        params: { limit: INITIAL_PAGE_SIZE },
      });
      applySyncResult(res.data?.files || [], [], res.data?.syncedAt);
      setError(null);
    } catch (err) {
      console.error('Failed to load files:', err);
      setError('Failed to load files. Please try again.');
      return;
    }
    try {
      const full = await axios.get(`${BACKEND_URL}/api/files`, {
        headers: lastEtagRef.current ? { 'If-None-Match': lastEtagRef.current } : {},
        validateStatus: (s) => s === 200 || s === 304,
      });
      if (full.status === 200) {
        lastEtagRef.current = full.headers?.etag || null;
        applySyncResult(full.data?.files || [], full.data?.deletedIds || [], full.data?.syncedAt);
      }
    } catch (err) {
      console.error('Background backfill failed:', err);
    }
  }, [applySyncResult]);

  // ─── Quick-refresh specific files (bandwidth-friendly) ───────────────────────
  // Re-fetches only the given file ids (e.g. the page currently on screen) and
  // merges the fresh metadata/icon info into the existing files array, instead
  // of re-downloading the entire library.
  const refreshFilesByIds = useCallback(async (ids) => {
    if (!BACKEND_URL || !ids || ids.length === 0) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/api/files`, {
        params: { ids: ids.join(',') },
      });
      applySyncResult(res.data?.files || [], [], null); // targeted refresh — don't advance the sync cursor
      setError(null);
    } catch (err) {
      console.error('Quick refresh failed:', err);
    }
  }, [applySyncResult]);

  // ─── A file just finished uploading in this tab — add it locally from the
  // upload response instead of waiting on any refetch or the socket echo.
  const addUploadedFile = useCallback((fileData) => {
    if (!fileData?._id) return;
    setFiles((prev) => {
      if (prev.some((f) => String(f._id) === String(fileData._id))) return prev;
      const merged = [fileData, ...prev];
      saveFileListCache(merged, lastSyncedAtRef.current).catch(() => {});
      return merged;
    });
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
  // Boot instantly from the IndexedDB cache if one exists, then reconcile with
  // the server via delta sync; otherwise do the paginated first-ever load.
  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    (async () => {
      const cached = await getFileListCache().catch(() => null);
      if (cancelled) return;
      if (cached?.files?.length) {
        setFiles(cached.files);
        lastSyncedAtRef.current = cached.syncedAt || null;
        syncFiles();
      } else {
        fetchInitialPage();
      }
    })();
    fetchFolders();
    return () => { cancelled = true; };
  }, [isLoggedIn, fetchFolders]);

  // ─── Live updates over Socket.IO ──────────────────────────────────────────────
  // A single shared connection patches file state in place (new upload, icon
  // change, delete) so other open tabs/devices update instantly without any
  // polling or refetch. This is what makes "R" a manual fallback rather than
  // the primary way files stay in sync.
  useEffect(() => {
    if (!isLoggedIn || !BACKEND_URL) return;
    const socket = io(BACKEND_URL, { withCredentials: true });

    socket.on('fileAdded', (newFile) => {
      if (!newFile?._id) return;
      setFiles((prev) => {
        if (prev.some((f) => String(f._id) === String(newFile._id))) return prev;
        const merged = [newFile, ...prev];
        saveFileListCache(merged, lastSyncedAtRef.current).catch(() => {});
        return merged;
      });
    });

    socket.on('fileIconUpdated', ({ fileId, customIconDriveId, customIconUrl, customIcon } = {}) => {
      if (!fileId) return;
      setFiles((prev) => {
        const merged = prev.map((f) => (String(f._id) === String(fileId)
          ? {
              ...f,
              customIconDriveId,
              customIconUrl,
              customIcon,
              metadata: { ...f.metadata, customIconDriveId, customIconUrl, customIcon },
            }
          : f));
        saveFileListCache(merged, lastSyncedAtRef.current).catch(() => {});
        return merged;
      });
    });

    socket.on('fileDeleted', ({ fileId } = {}) => {
      if (!fileId) return;
      setFiles((prev) => {
        const merged = prev.filter((f) => String(f._id) !== String(fileId));
        saveFileListCache(merged, lastSyncedAtRef.current).catch(() => {});
        return merged;
      });
    });

    socket.on('refreshFolderList', () => {
      fetchFolders();
    });

    return () => socket.disconnect();
  }, [isLoggedIn, fetchFolders]);

  // ─── Auth handlers ────────────────────────────────────────────────────────────
  const handleAccessGranted = useCallback((userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    setDarkMode(userData.darkMode ?? false);
    setThemeMode(userData.themeMode ?? 'system');
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
    lastSyncedAtRef.current = null;
    lastEtagRef.current = null;
    clearFileListCache().catch(() => {});
  }, []);

  const handleThemeModeChange = useCallback(async (mode) => {
    let isDark;
    if (mode === 'system') isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    else isDark = mode === 'dark';
    setThemeMode(mode);
    setDarkMode(isDark);
    try {
      await axios.patch(`${BACKEND_URL}/api/auth/preferences`, { darkMode: isDark, themeMode: mode });
    } catch (_) {}
  }, []);

  const handleHideFolderFilesToggle = useCallback(async () => {
    const next = !hideFolderFiles;
    setHideFolderFiles(next);
    try {
      await axios.patch(`${BACKEND_URL}/api/auth/preferences`, { hideFolderFiles: next });
    } catch (_) {}
  }, [hideFolderFiles]);

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
    <div className={`min-h-screen w-full overflow-x-hidden flex flex-col relative ${darkMode ? 'dark bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
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
                themeMode={themeMode}
                onLogout={handleLogout}
                onThemeModeChange={handleThemeModeChange}
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

      <main className={`flex-grow relative z-10 pt-4 sm:pt-6 pb-4 ${hideHeader ? '' : 'px-2 sm:px-4'}`}>
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
                  <div className="w-full max-w-7xl mx-auto mb-6">
                    {/* Mobile: full-width upload box only */}
                    <div className="block lg:hidden">
                      <UploadForm refresh={fetchFiles} onUploaded={addUploadedFile} darkMode={darkMode} />
                    </div>
                    {/* Desktop: 50/50 split — upload + notes */}
                    <div className="hidden lg:grid lg:grid-cols-2 gap-4 xl:gap-6 items-stretch">
                      <UploadForm refresh={fetchFiles} onUploaded={addUploadedFile} darkMode={darkMode} />
                      <UserNotesDashboard user={user} darkMode={darkMode} />
                    </div>
                  </div>
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
                      onQuickRefresh={refreshFilesByIds}
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
