// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
import Homepage from './components/Homepage'; // Import the new Homepage
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const location = useLocation();
  const hideHeader = location.pathname === '/' || location.pathname === '/login';
  // Determine if footer should be shown (only on dashboard)
  const showFooter = location.pathname === '/dashboard';

  const handleAccessGranted = () => {
      setIsLoggedIn(true);
  };

  const fetchFiles = async () => {
    if (!isLoggedIn) {
        console.log("Not logged in, skipping file fetch.");
        setFiles([]);
        setError(null); // Clear error when logging out
        return;
    }
    console.log("Fetching files...");
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`);
      setFiles(res.data);
      setError(null);
      console.log("Files fetched successfully.");
    } catch (err) {
      console.error('Error fetching files:', err);
      if (err.response && err.response.status === 401) {
         console.log("Backend returned 401, marking as not logged in.");
         setIsLoggedIn(false);
         // Only set session expired error if it's the primary issue
         if (!error || !error.includes('Backend not configured') || !error.includes('Client error')) {
            setError('Session expired or unauthorized. Please log in.');
         }
      } else {
        setError('Failed to load files.');
      }
      setFiles([]);
    }
  };

  useEffect(() => {
    // Global error handler for unhandled errors
    const handleGlobalError = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      // Avoid overwriting critical config/client errors with generic ones
      if (!error || !error.response) {
          if (!error || !error.message || !error.message.includes('Backend not configured')) {
               setError(`Client error: ${message}`);
          }
      }
      return true; // Prevent default handling
    };

    window.onerror = handleGlobalError;

    // Check for backend URL configuration
    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Backend not configured. Please set VITE_BACKEND_URL.');
    }

    // Dark mode media query listener
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeMediaQuery.matches);
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    // Cleanup function
    return () => {
      window.onerror = null; // Remove global error handler
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []); // Empty dependency array ensures this runs only once on mount

   useEffect(() => {
       console.log("isLoggedIn state changed:", isLoggedIn);
       if (isLoggedIn) {
           fetchFiles();
       } else {
           // Clear files and specific login errors when logged out
           setFiles([]);
           if (error && error.includes('Session expired')) {
               setError(null);
           }
       }
   }, [isLoggedIn]); // Dependency on isLoggedIn state

  // Render a critical error screen if backend is not configured or major client error occurs
  if (error && (error.includes('Backend not configured') || error.includes('Client error'))) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg max-w-lg text-center shadow-lg">
          <h1 className="text-2xl font-semibold mb-4">Application Error</h1>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Conditionally render header: NOT shown on homepage or login page */}
      {!hideHeader && (
        <header
          className={`p-6 shadow-md transition-all duration-300 ${
            darkMode ? 'bg-gray-950 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-center">
            <div className="text-center">
              <h1 className={`text-4xl font-vintage tracking-wide ${darkMode ? 'text-white' : 'text-gray-900'}`}>KUWUTEN</h1>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col relative overflow-hidden">
        {/* Added homepage grid background to dashboard */}
        {location.pathname === '/dashboard' && (
          <div
            className={`absolute inset-0`}
            style={{
              backgroundImage: darkMode
                ? `linear-gradient(to right, rgba(66, 135, 245, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(66, 135, 245, 0.2) 1px, transparent 1px)`
                : `linear-gradient(to right, rgba(139, 0, 0, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 0, 0, 0.3) 1px, transparent 1px)`,
              backgroundSize: '30px 30px',
              backgroundColor: darkMode ? '#0f172a' : '#ffffff',
              zIndex: 0, // Ensure grid is behind content
            }}
          ></div>
        )}

        <Routes>
          <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} />} />
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
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <div className="relative z-10 flex flex-col h-full"> {/* Added wrapper div with z-index */}
                  {error && error.includes('Failed to load files') && (
                      <div className={`mb-4 p-3 rounded-md text-sm ${darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>
                          {error}
                      </div>
                  )}
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    {/* Pass error related to file fetching to FileList if needed, or handle display here */}
                    <FileList files={files} refresh={fetchFiles} darkMode={darkMode} isLoading={false} />
                  </div>
                </div>
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
           <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Conditionally render footer only on the dashboard page */}
      {showFooter && (
        <footer
          className={`p-4 text-center text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          © {new Date().getFullYear()} KuwuteN • All Rights Reserved
        </footer>
      )}
    </div>
  );
}

export default App;
