// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'; // Import Routes, Route, Navigate
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate'; // Your existing AccessGate
import Homepage from './components/Homepage'; // Import the new Homepage
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false); // State to track login status

  // Function to check login status (adapting from AccessGate's sessionStorage logic)
  // A more robust solution would involve checking a secure, httpOnly cookie or backend session state.
  const checkLoginStatus = () => {
    const unlockedBefore = sessionStorage.getItem('access_granted');
    setIsLoggedIn(unlockedBefore === 'true');
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`);
      setFiles(res.data);
    } catch (err) {
      console.error('Error fetching files:', err);
      // Consider handling unauthorized access here (e.g., if backend sends 401)
      if (err.response && err.response.status === 401) {
         setIsLoggedIn(false); // User is no longer authenticated
         sessionStorage.removeItem('access_granted'); // Clear client-side state
      }
      setError('Failed to load files');
    }
  };

  useEffect(() => {
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      setError(`Error: ${message}`);
      return true;
    };

    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Not configured yet.');
    }

    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeMediaQuery.matches);
    const handleDarkModeChange = (e) => setDarkMode(e.matches);
    darkModeMediaQuery.addEventListener('change', handleDarkModeChange);

    // Check login status on app load
    checkLoginStatus();

    // Fetch files only if potentially logged in (adjust based on your auth flow)
    if (sessionStorage.getItem('access_granted') === 'true') {
       fetchFiles();
    }


    return () => {
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []); // Empty dependency array means this effect runs once on mount

   // Effect to re-fetch files when isLoggedIn changes to true
   useEffect(() => {
       if (isLoggedIn) {
           fetchFiles();
       }
   }, [isLoggedIn]);


  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-white p-4">
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
    <div className={`w-full min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header Section (You might want to make this always visible or conditionally show it) */}
      <header
        className={`p-6 shadow-md transition-all duration-300 ${
          darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}
      >
        <div className="max-w-6xl mx-auto flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-4xl font-vintage tracking-wide">KUWUTEN</h1>
            {/* You can keep or remove the 'Hello' message based on your preference */}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col">
        <Routes>
          {/* Homepage Route */}
          <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} />} />

          {/* Login/Access Gate Route */}
          {/* When AccessGate unlocks, it should update isLoggedIn state and potentially navigate */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                <Navigate to="/dashboard" replace /> // Redirect to dashboard if already logged in
              ) : (
                 // Pass a prop to AccessGate to notify App when access is granted
                <AccessGate onAccessGranted={() => setIsLoggedIn(true)} />
              )
            }
          />

          {/* Dashboard Route - Protected */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                <>
                  {/* Render Dashboard components */}
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    {/* Pass files and refresh to FileList */}
                    <FileList files={files} refresh={fetchFiles} darkMode={darkMode} />
                  </div>
                </>
              ) : (
                <Navigate to="/login" replace /> // Redirect to login if not logged in
              )
            }
          />

           {/* Fallback Route (Optional: Redirect to homepage or a 404 page) */}
           <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {/* Footer (Optional: You might want to make this always visible) */}
      <footer
        className={`p-4 text-center text-sm ${
          darkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        © {new Date().getFullYear()} KuwuteN • All Rights Reserved
      </footer>
    </div>
  );
}

export default App;
