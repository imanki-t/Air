import React, { useState, useEffect } from 'react';
import axios from 'axios';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import FolderList from '../components/FolderList';
import NoteList from '../components/NoteList';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('files'); // files, notes, folders
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'files') {
        const response = await axios.get(`${API_URL}/api/files`);
        setFiles(response.data);
      } else if (activeTab === 'folders') {
        const response = await axios.get(`${API_URL}/api/folders`);
        setFolders(response.data.folders);
      } else if (activeTab === 'notes') {
        const response = await axios.get(`${API_URL}/api/notes`);
        setNotes(response.data.notes);
      }
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Welcome back, {user?.username}!
        </h1>
        <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
          Manage your files, folders, and notes in one place
        </p>
      </div>

      {/* Tabs */}
      <div className={`flex space-x-1 mb-6 p-1 rounded-lg ${
        isDark ? 'bg-gray-800' : 'bg-gray-100'
      }`}>
        {['files', 'folders', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? isDark 
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-blue-600 shadow'
                : isDark
                  ? 'text-gray-400 hover:text-white'
                  : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'files' && (
          <>
            <FileUpload onUploadSuccess={fetchData} />
            <FileList files={files} onUpdate={fetchData} />
          </>
        )}
        {activeTab === 'folders' && (
          <FolderList folders={folders} onUpdate={fetchData} />
        )}
        {activeTab === 'notes' && (
          <NoteList notes={notes} onUpdate={fetchData} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
