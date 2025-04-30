 import React, { useState, useEffect } from 'react';
 import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Import routing components 
 import axios from 'axios';

 import UploadForm from './components/UploadForm'; // 
 import FileList from './components/FileList'; // 
 import AccessGate from './components/AccessGate'; // 
 import Homepage from './components/Homepage'; // Import the new Homepage component

 // --- Protected Route Component ---
 // This component checks if the user is authenticated (based on AccessGate's logic).
 // If authenticated, it renders the requested component (children).
 // If not, it redirects to the login page (Homepage at '/').
 const ProtectedRoute = ({ children }) => {
   const isAuthenticated = sessionStorage.getItem('access_granted') === 'true';
   const location = useLocation();

   if (!isAuthenticated) {
     // Redirect them to the / page, but save the current location they were
     // trying to go to in case you want to redirect them back after login.
     // For this setup, AccessGate handles the login logic on the root path.
     // We just need to ensure they land there if not authenticated.
     console.log('ProtectedRoute: Not authenticated, redirecting to /');
     return <Navigate to="/" state={{ from: location }} replace />;
   }

   return children;
 };

 // --- Main App Component ---
 function App() {
   const [error, setError] = useState(null); // 
   const [files, setFiles] = useState([]); // 
   const [darkMode, setDarkMode] = useState(false); // 
   const [isLoadingFiles, setIsLoadingFiles] = useState(true); // Add loading state

   // Fetch files logic remains the same
   const fetchFiles = async () => { // 
     setIsLoadingFiles(true); // Start loading
     try {
       const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/files`); // 
       setFiles(res.data); // 
       setError(null); // Clear previous errors on success
     } catch (err) {
       console.error('Error fetching files:', err); // 
       setError('Failed to load files. Please ensure the backend is running and accessible.'); // More specific error 
       setFiles([]); // Clear files on error
     } finally {
       setIsLoadingFiles(false); // Stop loading
     }
   };

   // Effect for dark mode, error handling, and initial fetch remains similar
   useEffect(() => { // 
     // Global error handler
     window.onerror = (message, source, lineno, colno, error) => { // 
       console.error('Global error:', message, error); // 
       setError(`A critical error occurred: ${message}`); // 
       return true; // 
     };

     // Check backend URL config
     if (!import.meta.env.VITE_BACKEND_URL) { // 
       console.warn('Backend URL (VITE_BACKEND_URL) is not configured in your .env file. API calls will fail.'); // 
       setError('Application not configured. Backend URL is missing.'); // 
       setIsLoadingFiles(false);
       return; // Stop further execution if config is missing
     }

     // Dark mode setup
     const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)'); // 
     setDarkMode(darkModeMediaQuery.matches); // 
     const handleDarkModeChange = (e) => setDarkMode(e.matches); // 
     darkModeMediaQuery.addEventListener('change', handleDarkModeChange); // 

     // Initial fetch is now triggered inside the dashboard route's effect if needed,
     // or potentially after successful login via AccessGate.
     // fetchFiles(); // Remove initial fetch from here

     return () => {
       window.onerror = null; // 
       darkModeMediaQuery.removeEventListener('change', handleDarkModeChange); // 
     };
   }, []); // Run once on mount

   // --- Render Logic ---

   // Global Error Display (covers config issues etc.)
   if (error && !error.startsWith('Failed to load files')) { // Only show critical errors fullscreen 
     return (
       <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-900 text-white p-4">
         <div className="bg-red-800 bg-opacity-90 p-8 rounded-lg max-w-lg text-center shadow-2xl">
           <h1 className="text-3xl font-semibold mb-4">Application Error</h1>
           <p className="mb-6 text-red-100">{error}</p> {/* */}
           <button
             onClick={() => window.location.reload()} // 
             className="px-5 py-2 bg-white text-red-700 hover:bg-red-100 rounded font-medium transition-colors" // 
           >
             Reload Page
           </button>
         </div>
       </div>
     );
   }

   // --- Routing Setup ---
   return (
     <Routes>
       {/* Route 1: Homepage or AccessGate */}
       <Route
         path="/"
         element={
           // AccessGate now decides whether to show Login form or Homepage/Dashboard
           // We modify AccessGate to handle this: If already logged in (session),
           // it could potentially redirect to /dashboard immediately.
           // Otherwise, it shows the login OR the new Homepage based on its internal state.
           // For simplicity here, AccessGate will show the login if needed,
           // otherwise, the Homepage is shown by default on '/'.
           <AccessGate showLoginContent={(passProps) => <Homepage darkMode={darkMode} {...passProps} />}>
             {/* If AccessGate unlocks, it should ideally trigger navigation to /dashboard */}
             {/* This requires AccessGate to use navigate() from react-router-dom */}
             <Navigate to="/dashboard" replace />
           </AccessGate>
         }
       />

       {/* Route 2: Dashboard (Protected) */}
       <Route
         path="/dashboard"
         element={
           <ProtectedRoute>
             {/* This is the main application content area */}
             <div
               className={cn( // 
                 'w-full min-h-screen flex flex-col transition-colors duration-300',
                 darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900' // Changed light mode bg slightly
               )}
             >
               {/* Dashboard Header */}
               <header
                 className={cn( // 
                   'p-4 sm:p-6 shadow-md transition-colors duration-300 border-b', // Added border-b
                   darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200' // 
                 )}
               >
                 <div className="max-w-7xl mx-auto flex items-center justify-between"> {/* Changed to justify-between */}
                   <div className="flex items-center">
                     <img className="h-8 w-auto" src={darkMode ? '/kuwuten-logo-dark.png' : '/kuwuten-logo-light.png'} alt="Kuwuten Logo" />
                     <h1 className="text-2xl font-semibold ml-3 tracking-tight hidden sm:block"> {/* Adjusted header text */}
                       Kuwuten Dashboard
                     </h1>
                   </div>
                   {/* Maybe add a logout button here later */}
                 </div>
               </header>

               {/* Main Dashboard Content */}
               <main className="flex-grow w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col"> {/* Changed max-w */}
                 {/* Fetch files when dashboard loads */}
                 <DashboardContent
                   files={files} // 
                   fetchFiles={fetchFiles}
                   darkMode={darkMode}
                   isLoading={isLoadingFiles}
                   error={error?.startsWith('Failed to load files') ? error : null} // Pass only file loading errors 
                 />
               </main>

               {/* Dashboard Footer */}
               <footer
                 className={cn( // 
                   'p-4 text-center text-xs border-t', // Smaller footer text, added border-t
                   darkMode ? 'text-gray-500 border-gray-700' : 'text-gray-500 border-gray-200' // 
                 )}
               >
                 © {new Date().getFullYear()} Kuwuten • Secure File Management {/* */}
               </footer>
             </div>
           </ProtectedRoute>
         }
       />

       {/* Optional: Add a 404 Not Found Route */}
       <Route path="*" element={<NotFound darkMode={darkMode} />} />

     </Routes>
   );
 }

 // --- Helper Component for Dashboard Content ---
 // This helps manage the state and effects specific to the dashboard view
 const DashboardContent = ({ files, fetchFiles, darkMode, isLoading, error }) => {
   useEffect(() => {
     // Fetch files when this component mounts (i.e., dashboard is accessed)
     fetchFiles();
   }, [fetchFiles]); // Dependency array ensures fetchFiles is stable

   return (
     <>
       <UploadForm refresh={fetchFiles} darkMode={darkMode} /> {/* */}
       {/* Conditional Rendering for FileList based on loading and error state */}
       {error && (
         <div className={`mt-6 p-4 rounded-md text-center ${darkMode ? 'bg-red-900/50 text-red-300 border border-red-700' : 'bg-red-100 text-red-700 border border-red-300'}`}>
           <p className="font-medium">Error loading files:</p>
           <p className="text-sm">{error}</p>
           <button
             onClick={fetchFiles}
             className={`mt-3 px-4 py-1.5 text-sm rounded ${darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'}`}
           >
             Retry
           </button>
         </div>
       )}
       {/* Pass isLoading state to FileList */}
       <div className={`flex-grow mt-6 ${files.length === 0 && !isLoading && !error ? 'flex justify-center items-center' : ''}`}> {/* */}
         <FileList files={files} refresh={fetchFiles} darkMode={darkMode} isLoading={isLoading} /> {/* */}
       </div>
     </>
   );
 };

 // --- Simple Not Found Component ---
 const NotFound = ({ darkMode }) => (
   <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}>
     <h1 className="text-6xl font-bold text-blue-500 mb-4">404</h1>
     <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
     <p className="mb-8 text-center max-w-md">Oops! The page you are looking for does not exist. It might have been moved or deleted.</p>
     <Link to="/" className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
       Go to Homepage
     </Link>
   </div>
 );


 export default App; // 
