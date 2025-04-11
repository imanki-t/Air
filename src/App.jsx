import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';

function App() {
  const [error, setError] = useState(null);

  // Add this to help debug on production
  useEffect(() => {
    // Global error handler to prevent white screens
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      setError(`Error: ${message}`);
      return true; // Prevents the default error handling
    };
    
    // Check if backend URL is available
    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Backend URL not configured. Please check environment variables.');
    }
    
    return () => {
      window.onerror = null;
    };
  }, []);

  // Render error message if something went wrong
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
    <div className="min-h-screen p-4 sm:p-6 bg-black bg-opacity-50">
      <h1 className="text-4xl mb-8 text-yellow-300 inline-block">wsp bro 🥰</h1>
      <UploadForm />
      <FileList />
    </div>
  );
}

export default App;
