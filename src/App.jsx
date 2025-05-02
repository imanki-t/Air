// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import useLocation
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate'; // Your existing AccessGate
import Homepage from './components/Homepage'; // Import the new Homepage
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState useState(false);
  // State to track login status - managed in App.jsx now
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Use useLocation hook to get the current route
  const location = useLocation();
  // Condition to check if the header should NOT be shown
  const hideHeader = location.pathname === '/' || location.pathname === '/login';

  // Function to check login status from sessionStorage
  // A more robust solution would involve checking a secure, httpOnly cookie or backend session state.
  const checkLoginStatus = () => {
    const unlockedBefore = sessionStorage.getItem('access_granted');
    setIsLoggedIn(unlockedBefore === 'true');
  };

  // Function to handle successful login from AccessGate
  const handleAccessGranted = () => {
      setIsLoggedIn(true);
      // Optionally navigate here if needed, though Navigate component in Route handles it
      // navigate('/dashboard');
  };


  const fetchFiles = async () => {
    // Only fetch files if isLoggedIn is true.
    // This prevents unauthorized attempts if a user manually clears sessionStorage but the backend is still protected.
    if (!isLoggedIn) {
        console.log("Not logged in, skipping file fetch.");
        setFiles([]); // Clear files if not logged in
        setError(null); // Clear file loading error if any
        return;
    }
    console.log("Fetching files..."); // Debug log
    try {
      // Include credentials (like cookies) if your backend session uses them
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`, { withCredentials: true });
      setFiles(res.data);
      setError(null); // Clear any previous error
      console.log("Files fetched successfully."); // Debug log
    } catch (err) {
      console.error('Error fetching files:', err);
      // Handle unauthorized access: If backend sends 401, user is not authenticated.
      if (err.response && err.response.status === 401) {
         console.log("Backend returned 401, marking as not logged in."); // Debug log
         setIsLoggedIn(false); // User is no longer authenticated
         sessionStorage.removeItem('access_granted'); // Clear client-side state (important for UI sync)
         setError('Session expired or unauthorized. Please log in.'); // Set a user-friendly error
      } else {
        setError('Failed to load files.'); // Generic error for other issues
      }
      setFiles([]); // Clear files on error
    }
  };

  useEffect(() => {
    // Global error handler for unexpected JS errors
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      // Avoid overwriting specific API errors unless it's a different type of error
      if (!error || !error.response) { // Only set error if it's not an Axios response error
         setError(`Client error: ${message}`);
      }
      return true; // Prevent default browser error handling
    };

    // Check if backend URL is configured
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

    // Initial check of login status on app mount
    checkLoginStatus();

    // Cleanup function for effect
    return () => {
      window.onerror = null; // Remove global error handler
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange); // Remove listener
    };
  }, []); // Empty dependency array means this effect runs once on mount

   // Effect to fetch files when isLoggedIn changes to true
   // This runs after the initial mount if checkLoginStatus sets isLoggedIn to true
   // and runs whenever handleAccessGranted sets isLoggedIn to true
   useEffect(() => {
       console.log("isLoggedIn state changed:", isLoggedIn); // Debug log
       if (isLoggedIn) {
           fetchFiles(); // Fetch files only when logged in
       } else {
           // If somehow logged out, clear files and potential file-related error
           setFiles([]);
           // Keep network-related errors if isLoggedIn became false due to 401
           if (!error || !error.includes('Session expired')) {
               setError(null);
           }
       }
   }, [isLoggedIn]); // Depend on isLoggedIn state

  // Show a fatal error screen if the backend URL is missing or a critical global error occurs
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
    <div className={`w-full min-h-screen flex flex-col transition-colors duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>

      {/* Conditionally render header: NOT shown on homepage or login page */}
      {!hideHeader && ( // <-- Updated conditional rendering here
        <header
          className={`p-6 shadow-md transition-all duration-300 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-4xl font-vintage tracking-wide">KUWUTEN</h1>
              {/* You could add navigation links here */}
            </div>
          </div>
        </header>
      )}


      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col">
        <Routes>
          {/* Homepage Route: Accessible by everyone */}
          <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} />} />

          {/* Login/Access Gate Route: Redirect to dashboard if already logged in */}
          <Route
            path="/login"
            element={
              isLoggedIn ? (
                // If logged in, redirect to dashboard to avoid seeing login page
                <Navigate to="/dashboard" replace />
              ) : (
                // If not logged in, show the AccessGate.
                // Pass the handler so AccessGate can notify App when successful.
                <AccessGate onAccessGranted={handleAccessGranted} />
              )
            }
          />

          {/* Dashboard Route: Protected - requires login */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ? (
                // If logged in, show the dashboard content
                <>
                  {/* Display file loading errors here if any */}
                  {error && error.includes('Failed to load files') && (
                      <div className={`mb-4 p-3 rounded-md text-sm ${darkMode ? 'bg-red-900/50 text-red-300' : 'bg-red-100 text-red-700'}`}>
                          {error}
                      </div>
                  )}
                  {/* Render Dashboard components */}
                  <UploadForm refresh={fetchFiles} darkMode={darkMode} />
                  <div className={`flex-grow ${files.length === 0 ? 'flex justify-center items-center' : ''}`}>
                    {/* Pass files and refresh to FileList */}
                    {/* Pass isLoggedIn and fetchFiles to FileList if FileList needs to trigger re-auth */}
                    <FileList files={files} refresh={fetchFiles} darkMode={darkMode} isLoading={false} /> {/* Add isLoading prop if you have one */}
                  </div>
                </>
              ) : (
                // If not logged in, redirect to the login page
                <Navigate to="/login" replace />
              )
            }
          />

           {/* Fallback Route (Optional: Redirect to homepage or a 404 page) */}
           {/* This catches any paths that don't match the defined routes */}
           <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </main>

      {/* Footer (Optional: You might only show this when logged in or always) */}
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
                  
