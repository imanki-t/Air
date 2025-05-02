// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
import Homepage from './components/Homepage';
import axios from 'axios';
import { FaMoon, FaSun, FaSignOutAlt } from 'react-icons/fa';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();

  // Function to check login status from sessionStorage
  const checkLoginStatus = () => {
    const unlockedBefore = sessionStorage.getItem('access_granted');
    setIsLoggedIn(unlockedBefore === 'true');
  };

  // Function to handle successful login from AccessGate
  const handleAccessGranted = () => {
    setIsLoggedIn(true);
    sessionStorage.setItem('access_granted', 'true');
  };

  // Function to handle logout
  const handleLogout = () => {
    sessionStorage.removeItem('access_granted');
    setIsLoggedIn(false);
    setFiles([]);
  };

  const fetchFiles = async () => {
    if (!isLoggedIn) {
      console.log("Not logged in, skipping file fetch.");
      setFiles([]);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`, { withCredentials: true });
      setFiles(res.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching files:', err);
      if (err.response && err.response.status === 401) {
        setIsLoggedIn(false);
        sessionStorage.removeItem('access_granted');
        setError('Session expired or unauthorized. Please log in.');
      } else {
        setError('Failed to load files.');
      }
      setFiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Global error handler
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      if (!error || !error.response) {
        setError(`Client error: ${message}`);
      }
      return true;
    };

    // Check backend URL
    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Backend not configured. Please set VITE_BACKEND_URL.');
    }

    // Set initial dark mode based on system preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeMediaQuery.matches);
    
    // Listen for dark mode changes
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    // Initial check of login status
    checkLoginStatus();

    return () => {
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      fetchFiles();
    } else {
      setFiles([]);
      if (!error || !error.includes('Session expired')) {
        setError(null);
      }
    }
  }, [isLoggedIn]);

  // Fatal error screen
  if (error && (error.includes('Backend not configured') || error.includes('Client error'))) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg max-w-lg text-center shadow-lg">
          <h1 className="text-2xl font-semibold mb-4">Application Error</h1>
          <p className="mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors duration-300"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Page transition variants
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
    },
    in: {
      opacity: 1,
      y: 0,
    },
    out: {
      opacity: 0,
      y: -20,
    },
  };

  const pageTransition = {
    type: "tween",
    ease: "anticipate",
    duration: 0.5,
  };

  return (
    <div className={`w-full min-h-screen flex flex-col transition-colors duration-500 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Header */}
      <header className={`sticky top-0 z-30 transition-all duration-300 backdrop-blur-md ${
        darkMode 
          ? 'bg-gray-900/80 border-b border-gray-800' 
          : 'bg-white/80 border-b border-gray-100 shadow-sm'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Link to="/">
                  <h1 className="text-3xl font-bold tracking-tight">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
                      Kuwuten
                    </span>
                  </h1>
                </Link>
              </motion.div>
            </div>
            
            {/* Right side buttons */}
            <div className="flex items-center space-x-4">
              {/* Dark Mode Toggle */}
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${
                  darkMode 
                    ? 'bg-gray-800 hover:bg-gray-700' 
                    : 'bg-gray-100 hover:bg-gray-200'
                } transition-colors duration-300`}
                aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {darkMode ? (
                  <FaSun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <FaMoon className="h-5 w-5 text-indigo-600" />
                )}
              </motion.button>
              
              {/* Logout Button - Only show when logged in */}
              {isLoggedIn && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleLogout}
                  className={`flex items-center px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  } transition-colors duration-300`}
                >
                  <FaSignOutAlt className={`h-4 w-4 mr-2 ${
                    darkMode ? 'text-red-400' : 'text-red-600'
                  }`} />
                  <span>Logout</span>
                </motion.button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow w-full">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            {/* Homepage Route */}
            <Route 
              path="/" 
              element={
                <motion.div
                  key="homepage"
                  initial="initial"
                  animate="in"
                  exit="out"
                  variants={pageVariants}
                  transition={pageTransition}
                >
                  <Homepage isLoggedIn={isLoggedIn} darkMode={darkMode} />
                </motion.div>
              } 
            />

            {/* Login Route */}
            <Route
              path="/login"
              element={
                isLoggedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <motion.div
                    key="login"
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                    className="max-w-md mx-auto mt-12"
                  >
                    <AccessGate onAccessGranted={handleAccessGranted} darkMode={darkMode} />
                  </motion.div>
                )
              }
            />

            {/* Dashboard Route */}
            <Route
              path="/dashboard"
              element={
                isLoggedIn ? (
                  <motion.div
                    key="dashboard"
                    initial="initial"
                    animate="in"
                    exit="out"
                    variants={pageVariants}
                    transition={pageTransition}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
                  >
                    {/* Error Display */}
                    {error && error.includes('Failed to load files') && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-4 p-4 rounded-lg text-sm flex items-center ${
                          darkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        {error}
                      </motion.div>
                    )}
                    
                    {/* Upload Form */}
                    <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                    
                    {/* File List */}
                    <div className={`mt-8 ${files.length === 0 && !isLoading ? 'flex justify-center items-center min-h-[400px]' : ''}`}>
                      <FileList 
                        files={files} 
                        refresh={fetchFiles} 
                        darkMode={darkMode} 
                        isLoading={isLoading} 
                      />
                    </div>
                  </motion.div>
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Fallback Route */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`py-6 px-4 transition-colors duration-300 ${
        darkMode ? 'bg-gray-900 text-gray-400 border-t border-gray-800' : 'bg-gray-50 text-gray-500 border-t border-gray-100'
      }`}>
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-sm">
            © {new Date().getFullYear()} KuwuteN • All Rights Reserved
          </p>
        </div>
      </footer>
    </div>
  );
}

// Add missing React Router components
const Link = ({ to, children, className }) => {
  const location = useLocation();
  return (
    <a 
      href={to} 
      onClick={(e) => {
        e.preventDefault();
        window.history.pushState({}, "", to);
        const navEvent = new PopStateEvent('popstate');
        window.dispatchEvent(navEvent);
      }}
      className={className}
    >
      {children}
    </a>
  );
};

export default App;
