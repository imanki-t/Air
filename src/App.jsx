import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import axios from 'axios';

function App() {
  const [error, setError] = useState(null);
  const [files, setFiles] = useState([]);

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
    window.onerror = (message, source, lineno, colno, error) => {
      console.error('Global error:', message, error);
      setError(`Error: ${message}`);
      return true;
    };

    if (!import.meta.env.VITE_BACKEND_URL) {
      console.warn('Backend URL not configured. API calls will fail.');
      setError('Backend URL not configured.');
    }

    fetchFiles();

    return () => {
      window.onerror = null;
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
    <div className="min-h-screen p-4 sm:p-6 bg-transparent">
      <h1 className="text-5xl mb-2 text-red-300 font-vintage drop-shadow-lg">Timeless!</h1>
<h2 className="text-2xl mb-8 text-yellow-300 inline-block">wsp bro 🥰</h2>
      <UploadForm refresh={fetchFiles} />
      <FileList files={files} refresh={fetchFiles} />
    </div>
  );
}

export default App;
