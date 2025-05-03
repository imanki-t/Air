// App.jsx
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'; // Import useLocation, useNavigate
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
// Import LoginPage and SignupPage
// Corrected import path for LoginPage - ensure .jsx extension is specified
import LoginPage from './components/LoginPage.jsx'; // Corrected Import
import SignupPage from './components/SignupPage.jsx'; // Ensure .jsx extension is specified for SignupPage too
import Homepage from './components/Homepage';
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);
  const [darkMode, setDarkMode] = useState(false);
  // isLoggedIn will now indicate if a valid token is present and user data is loaded
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  // Store user info (e.g., username)
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Condition to check if the header should NOT be shown
  const hideHeader = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup'; // Hide header on signup too

  // Function to handle successful login (called by LoginPage)
  const handleLoginSuccess = ({ token, username }) => {
      localStorage.setItem('token', token); // Store token in localStorage
      setIsLoggedIn(true);
      setUserInfo({ username }); // Store basic user info
      setError(null); // Clear any login errors
      // Navigation handled in LoginPage after fade out
  };

  // Function to handle logout
  const handleLogout = () => {
      localStorage.removeItem('token'); // Remove token
      setIsLoggedIn(false);
      setUserInfo(null); // Clear user info
      setFiles([]); // Clear files on logout
      setError(null); // Clear any errors
      navigate('/login', { replace: true }); // Redirect to login
  };


  const fetchFiles = async () => {
    // Only fetch files if isLoggedIn is true and a token is present
    const token = localStorage.getItem('token');
    if (!isLoggedIn || !token) {
        console.log("Not logged in or no token, skipping file fetch.");
        setFiles([]);
        setError(null);
        return;
    }
    console.log("Fetching files..."); // Debug log
    try {
      // Include authorization header with the token
      const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`, {
          headers: {
              Authorization: `Bearer ${token}` // Include token in headers
          }
      });
      setFiles(res.data);
      setError(null);
      console.log("Files fetched successfully.");
    } catch (err) {
      console.error('Error fetching files:', err);
      // Handle unauthorized access: If backend sends 401, user is not authenticated.
      if (err.response && err.response.status === 401) {
         console.log("Backend returned 401, marking as not logged in.");
         handleLogout(); // Log out user if token is invalid or expired
         setError('Session expired or unauthorized. Please log in.');
      } else {
        setError('Failed to load files.');
      }
      setFiles([]);
    }
  };

  // Effect to check login status on app mount and token change
  useEffect(() => {
      const checkLoginStatus = async () => {
          const token = localStorage.getItem('token');
          if (token) {
              // Optionally verify token with backend or decode it client-side
              // A backend verification is more secure
              try {
                  // Example: Verify token by fetching user info from a protected route
                  const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/auth/me`, {
                      headers: {
                          Authorization: `Bearer ${token}`
                      }
                  });
                  if (res.status === 200 && res.data?.username) {
                      setIsLoggedIn(true);
                      setUserInfo({ username: res.data.username });
                      setError(null); // Clear any previous errors
                      console.log("User authenticated via token:", res.data.username);
                      // If on login page or signup page with a valid token, redirect to dashboard
                      if (location.pathname === '/login' || location.pathname === '/signup') {
                          navigate('/dashboard', { replace: true });
                      }
                  } else {
                      // Token invalid or user data not found
                      console.log("Token validation failed.");
                      handleLogout(); // Log out
                  }
              } catch (err) {
                  console.error("Token verification failed:", err);
                  handleLogout(); // Log out on verification error
              }
          } else {
              setIsLoggedIn(false);
              setUserInfo(null);
          }
      };

      checkLoginStatus(); // Run once on mount

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


    // Cleanup function for effect
    return () => {
      window.onerror = null;
      darkModeMediaQuery.removeEventListener('change', handleDarkModeChange);
    };
  }, []); // Empty dependency array, runs once on mount


   // Effect to fetch files when isLoggedIn changes to true
   useEffect(() => {
       console.log("isLoggedIn state changed:", isLoggedIn);
       if (isLoggedIn) {
           fetchFiles(); // Fetch files only when logged in
       } else {
           // If logged out, clear files and potential file-related error
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

      {/* Conditionally render header: NOT shown on homepage, login, or signup */}
      {!hideHeader && (
        <header
          className={`p-6 shadow-md transition-all duration-300 ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}
        >
          <div className="max-w-6xl mx-auto flex items-center justify-between"> {/* Changed to space-between */}
            <div className="flex items-center space-x-4"> {/* Container for logo and title */}
                 <img src="/android-chrome-512x512.png" alt="KUWUTEN Logo" className="w-12 h-12 rounded-lg"/> {/* Added Logo */}
                <h1 className="text-4xl font-vintage tracking-wide">KUWUTEN</h1>
                 {userInfo && ( // Display username if logged in
                      <span className={`text-sm font-mono ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Logged in as: {userInfo.username}
                      </span>
                  )}
            </div>

            {isLoggedIn && ( // Show Logout button only if logged in
                <button
                    onClick={handleLogout}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                >
                    Logout
                </button>
            )}
          </div>
        </header>
      )}


      {/* Main Content Area */}
      <main className="flex-grow w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col">
        <Routes>
          {/* Homepage Route: Accessible by everyone */}
          <Route path="/" element={<Homepage isLoggedIn={isLoggedIn} />} />

          {/* Login Route: Redirect to dashboard if already logged in */}
          <Route
            path="/login"
            element={
              isLoggedIn ?
              (
                <Navigate to="/dashboard" replace />
              ) : (
                // Pass the handler so LoginPage can notify App when successful.
                <LoginPage onLoginSuccess={handleLoginSuccess} /> // Use LoginPage
              )
            }
          />

           {/* Signup Route: Accessible by everyone */}
           <Route
               path="/signup"
               element={
                  isLoggedIn ?
                  (
                      <Navigate to="/dashboard" replace />
                  ) : (
                      <SignupPage darkMode={darkMode} /> // Use SignupPage
                  )
               }
           />

          {/* Dashboard Route: Protected - requires login */}
          <Route
            path="/dashboard"
            element={
              isLoggedIn ?
              (
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
             
