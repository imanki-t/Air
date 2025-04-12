import React, { useState, useEffect } from 'react';
import UploadForm from './components/UploadForm';
import FileList from './components/FileList';
import AccessGate from './components/AccessGate';
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
    <AccessGate>
      <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500">
        <div className="text-center mb-6">
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-1">
            Timeless
          </h1>
          <h2 className="text-xl text-yellow-300 mt-2 flex items-center justify-center gap-2 font-medium tracking-wide">
            WSP Bro
            <img src="/apple-heart-eyes.png" alt="🥰" className="w-8 h-8 inline-block" />
          </h2>
        </div>
        <UploadForm refresh={fetchFiles} />
        <FileList files={files} refresh={fetchFiles} />
      </div>
    </AccessGate>
  );
}

export default App;
