import React, { useState, useEffect } from 'react';    
import UploadForm from './components/UploadForm';    
import FileList from './components/FileList';    
import AccessGate from './components/AccessGate';    
import axios from 'axios';    
    
function App() {    
  const [error, setError] = useState(null);    
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [animationProgress, setAnimationProgress] = useState(0);
    
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
    // Set up error handling
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
    
    // Detect dark mode preference
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeMediaQuery.matches);
    
    // Listen for changes in dark mode preference
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);
    
    // Set up color animation
    const animationInterval = setInterval(() => {
      setAnimationProgress((prev) => (prev >= 100 ? 0 : prev + 0.2));
    }, 50);
    
    // Fetch files
    fetchFiles();      
    
    return () => {      
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
      clearInterval(animationInterval);
    };    
  }, []);    
    
  if (error) {    
    return (    
      <div className="min-h-screen p-4 bg-red-900 text-white flex items-center justify-center">    
        <div className="bg-black bg-opacity-50 p-6 rounded-lg max-w-lg">    
          <h1 className="text-2xl mb-4">Something went wrong</h1>    
          <p className="mb-4">{error}</p>    
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
  
  // Calculate header background colors based on animation progress
  const calculateHeaderBackground = () => {
    // Target colors: start with dark/light mode colors and transition to deep red
    const startRed = darkMode ? 0 : 255;
    const startGreen = darkMode ? 0 : 255;
    const startBlue = darkMode ? 0 : 255;
    
    const endRed = 150;
    const endGreen = 30;
    const endBlue = 30;
    
    // Calculate current color based on progress
    const factor = Math.sin(animationProgress / 25) * 0.5 + 0.5; // oscillate between 0 and 1
    
    const red = Math.round(startRed + (endRed - startRed) * factor);
    const green = Math.round(startGreen + (endGreen - startGreen) * factor);
    const blue = Math.round(startBlue + (endBlue - startBlue) * factor);
    
    return `rgb(${red}, ${green}, ${blue})`;
  };
    
  return (    
    <AccessGate>    
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-900 text-white' 
          : 'bg-gray-50 text-gray-900'
      }`}>
        {/* Animated Header Section */}
        <header 
          className={`p-6 transition-all duration-300 ${
            darkMode 
              ? 'text-white' 
              : 'text-white shadow-sm'
          }`}
          style={{ 
            background: calculateHeaderBackground(),
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}
        >
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Circular Logo */}
                <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-purple-500 shadow-lg">
                  <img 
                    src="/logo.png" 
                    alt="Logo" 
                    className="w-full h-full object-cover" 
                  />
                </div>
                <div>
                  <h1 className="text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    textShadow: darkMode ? '0 0 20px rgba(129, 140, 248, 0.5)' : 'none' 
                  }}>
                    Timeless
                  </h1>
                  {/* Aligned "Void!" text */}
                  <h2 className="text-lg font-light text-white flex items-center"
                  style={{ 
                    fontFamily: "'Inter', sans-serif",
                    fontWeight: 300,
                    letterSpacing: '0.05em',
                    textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                  }}>
                    <span className="tracking-wide">Void!</span>
                    <img 
                      src="/apple-heart-eyes.png" 
                      alt="🥰" 
                      className="w-5 h-5 ml-2 inline-block" 
                    />
                  </h2>
                </div>
              </div>
              
              {/* Optional: Theme toggle button */}
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-full ${darkMode ? 'bg-gray-700' : 'bg-purple-100'}`}
                aria-label="Toggle theme"
              >
                {darkMode ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <UploadForm refresh={fetchFiles} darkMode={darkMode} />      
          <FileList files={files} refresh={fetchFiles} darkMode={darkMode} />      
        </main>
        
        {/* Footer */}
        <footer className={`p-4 text-center text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          © {new Date().getFullYear()} Timeless • All Rights Reserved
        </footer>
      </div>      
    </AccessGate>      
  );      
}  
    
export default App;
