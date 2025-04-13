import React, { useState, useEffect } from 'react';    
import UploadForm from './components/UploadForm';    
import FileList from './components/FileList';    
import AccessGate from './components/AccessGate';    
import axios from 'axios';    
    
function App() {    
  const [error, setError] = useState(null);    
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
    
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
    
    // Fetch files
    fetchFiles();      
    
    return () => {      
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
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
    
  return (    
    <AccessGate>    
      <div className={`min-h-screen transition-colors duration-300 ${
        darkMode 
          ? 'bg-gray-900 text-white' 
          : 'bg-gray-50 text-gray-900'
      }`}>
        {/* Header Section */}
        <header className={`p-6 ${
          darkMode 
            ? 'bg-black' 
            : 'bg-white shadow-sm'
        }`}>
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col space-y-1">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo.png" 
                  alt="Logo" 
                  className="w-12 h-12 object-contain" 
                />
                <h1 className={`text-4xl font-sans font-black tracking-tight ${
                  darkMode
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-700'
                }`}>
                  Timeless
                </h1>
              </div>
              <div className="ml-14">
                <h2 className={`text-lg flex items-center gap-2 font-light ${
                  darkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span className="tracking-wide">wsp bro</span>
                  <img 
                    src="/apple-heart-eyes.png" 
                    alt="🥰" 
                    className="w-5 h-5 inline-block" 
                  />
                </h2>
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
