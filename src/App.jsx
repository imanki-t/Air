import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
import axios from 'axios';

// Utility for conditional class names (assuming you have this or similar)
const cn = (...classes) => classes.filter(Boolean).join(' ');

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Added loading state
  const [darkMode, setDarkMode] = useState(false);
  const [showHello, setShowHello] = useState(true);

  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const fetchFiles = async () => {
    setIsLoading(true); // Start loading
    setError(null); // Clear previous errors
    try {
      const res = await axios.get(`${backendUrl}/api/files`);
      setFiles(res.data || []); // Ensure files is always an array
    } catch (err) {
      console.error('Error fetching files:', err);
      // Handle specific errors if needed, e.g., network error vs. server error
      setError(err.response?.data?.message || 'Failed to load files. Please check your connection or the server.');
      setFiles([]); // Clear files on error
    } finally {
        setIsLoading(false); // Stop loading regardless of outcome
    }
  };

  useEffect(() => {
    // Global error handling (optional, consider more specific error boundaries)
    // window.onerror = (message, source, lineno, colno, error) => {
    //   console.error('Global error:', message, error);
    //   setError(`Unhandled Error: ${message}`);
    //   return true;
    // };

    if (!backendUrl) {
      console.warn('Backend URL (VITE_BACKEND_URL) is not configured. API calls will fail.');
      setError('Application configuration error: Backend URL is missing.');
      setIsLoading(false);
      return; // Prevent further execution if config is missing
    }

    // --- Dark Mode Handling ---
    let darkModeMediaQuery;
    try {
        darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        setDarkMode(darkModeMediaQuery.matches);
        const handleDarkModeChange = (e) => setDarkMode(e.matches);
        darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
    } catch (mediaError) {
        console.warn("Could not set up dark mode listener:", mediaError);
        // Fallback or default mode can be set here if needed
        setDarkMode(false); // Default to light mode if detection fails
    }


    // Fetch files on initial mount
    fetchFiles();

    // Hide "Hello" message after 30 seconds
    const helloTimer = setTimeout(() => {
      setShowHello(false);
    }, 30000); // Consider making this duration shorter (e.g., 5-10 seconds)

    // Cleanup function
    return () => {
      // window.onerror = null; // Remove global handler if set
      if (darkModeMediaQuery) {
          try {
            darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
          } catch (cleanupError) {
              console.warn("Could not remove dark mode listener:", cleanupError);
          }
      }
      clearTimeout(helloTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Render Error State ---
  if (error && !isLoading) { // Show error only if not also loading
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
        <div className={`p-6 rounded-lg max-w-lg w-full text-center shadow-xl border ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
          <h1 className={`text-xl sm:text-2xl font-semibold mb-4 ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 inline-block mr-2 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Oops! Something went wrong
          </h1>
          <p className={`mb-6 text-sm sm:text-base ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{error}</p>
          <button
            onClick={() => window.location.reload()} // Simple reload for now
            className={`px-5 py-2 rounded-md font-medium transition-colors duration-200 ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // --- Render Main Application ---
  return (
    <AccessGate> {/* Assuming AccessGate handles authentication/authorization */}
      <div
        className={cn(
            `w-full min-h-screen flex flex-col transition-colors duration-300 font-sans`, // Added font-sans as a base
             darkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-50 text-gray-800'
        )}
      >
        {/* Header Section */}
        <header
          // Added a subtle bottom border
          className={cn(`p-4 sm:p-6 shadow-md sticky top-0 z-40 backdrop-blur-md`,
             darkMode ? 'bg-gray-800/80 border-b border-gray-700/50' : 'bg-white/80 border-b border-gray-200/50'
          )}
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Left column: Logo */}
            {/* Adjusted size and added subtle hover effect */}
            <div className="flex-shrink-0">
                <img
                  src="/logo.png" // Make sure this path is correct
                  alt="Logo"
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-md transition-transform duration-200 hover:scale-105"
                />
            </div>

            {/* Center column: Title & Subtitle */}
            {/* Removed sm:text-base duplication for Hello */}
            <div className="text-center px-4">
              <h1 className="text-3xl sm:text-4xl font-vintage tracking-wide">
                Timeless
              </h1>
              {showHello && (
                <div className="text-xs sm:text-sm font-vintage tracking-wide mt-1 flex justify-center items-center animate-pulse duration-1000">
                  <span>Hello!</span>
                  <img
                    src="/apple-heart-eyes.png" // Ensure this path is correct
                    alt="Heart Eyes Emoji"
                    className="w-4 h-4 sm:w-5 sm:h-5 ml-1.5"
                  />
                </div>
              )}
            </div>

            {/* Right column: Spacer to balance layout */}
            {/* Ensured spacer matches logo width */}
            <div className="flex-shrink-0 w-10 sm:w-12"></div>
          </div>
        </header>

        {/* Main Content */}
        {/* Added role="main" for accessibility */}
        <main role="main" className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col">
          {/* Upload Form */}
          <UploadForm refresh={fetchFiles} darkMode={darkMode} />

          {/* File List Area */}
          {/* Removed flex-grow and centering from wrapper div */}
          {/* Added top margin for spacing */}
          <div className="mt-8">
            <FileList
                files={files}
                refresh={fetchFiles}
                darkMode={darkMode}
                isLoading={isLoading} // Pass loading state to FileList
            />
          </div>
        </main>

        {/* Footer */}
        {/* Added subtle top border */}
        <footer
          className={cn(`p-4 text-center text-xs sm:text-sm border-t`,
            darkMode ? 'text-gray-500 border-gray-700/50' : 'text-gray-500 border-gray-200/50'
          )}
        >
          © {new Date().getFullYear()} Timeless • All Rights Reserved
        </footer>
      </div>
    </AccessGate>
  );
}

export default App;
