import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [showHello, setShowHello] = useState(true);
  const [showLogo, setShowLogo] = useState(true); // To hide logo after 15 seconds

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`);
      setFiles(res.data);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files');
    }
  };

  useEffect(() => {
    // Set up global error handling
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      setError(`Error: ${message}`);
      return true;
    };

    // Check backend URL
    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Backend URL not configured.');
    }

    // Detect dark mode preference and set up listener
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeMediaQuery.matches);

    // Listen for dark mode changes
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    // Fetch files
    fetchFiles();

    // Hide "Hello" after 30 seconds
    const helloTimer = setTimeout(() => {
      setShowHello(false);
    }, 30000);

    // Hide logo after 30 seconds
    const logoTimer = setTimeout(() => {
      setShowLogo(false);
    }, 30000);

    return () => {
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
      clearTimeout(helloTimer);
      clearTimeout(logoTimer);
    };
  }, []);

  // Uniform error page with a dark theme for both modes
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-4">
        <div className="bg-gray-800 bg-opacity-90 p-6 rounded-lg max-w-lg text-center shadow-lg">
          <h1 className="text-2xl font-semibold mb-4">Something went wrong</h1>
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
    <AccessGate>
      <div
        className={`min-h-screen transition-colors duration-300 ${
          darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
        }`}
      >
        {/* Header Section */}
        <header
          className={`p-6 transition-all duration-300 ${
            darkMode ? 'bg-gray-800 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'
          } shadow-md`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="relative flex items-center justify-center">
              {/* Logo positioned to the left */}
              {showLogo && (
                <div className="absolute left-0 w-12 h-12 rounded-full overflow-hidden shadow-lg">
                  <img
                    src="/logo.png"
                    alt="Logo"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {/* Title block always centered */}
              <div className="text-center">
                <h1
                  className={`text-4xl font-vintage tracking-wide ${
                    darkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Timeless
                </h1>
                {showHello && (
                  <h2 className="text-sm sm:text-base font-vintage tracking-wide mt-2 flex justify-center items-center">
                    <span>Hello!</span>
                    <img
                      src="/apple-heart-eyes.png"
                      alt="🥰"
                      className="w-5 h-5 ml-2"
                    />
                  </h2>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <UploadForm refresh={fetchFiles} darkMode={darkMode} />
          <FileList files={files} refresh={fetchFiles} darkMode={darkMode} />
        </main>

        {/* Footer */}
        <footer
          className={`p-4 text-center text-sm ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          © {new Date().getFullYear()} Timeless • All Rights Reserved
        </footer>
      </div>
    </AccessGate>
  );
}

export default App;
