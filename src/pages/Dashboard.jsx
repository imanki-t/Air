// src/pages/Dashboard.jsx - Complete Dashboard
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import FileUpload from '../components/FileUpload';
import FileList from '../components/FileList';
import FolderList from '../components/FolderList';
import NoteList from '../components/NoteList';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Dashboard = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('files');
  const [activeView, setActiveView] = useState('all'); // all, starred, recent, trash
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    // Connect to WebSocket
    const socket = io(API_URL);
    
    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('refreshFileList', () => {
      if (activeTab === 'files') {
        fetchFiles();
      }
    });

    socket.on('refreshFolders', () => {
      if (activeTab === 'folders') {
        fetchFolders();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [activeTab, API_URL]);

  useEffect(() => {
    fetchData();
  }, [activeTab, activeView, selectedFolder]);

  const fetchData = () => {
    if (activeTab === 'files') {
      fetchFiles();
    } else if (activeTab === 'folders') {
      fetchFolders();
    } else if (activeTab === 'notes') {
      fetchNotes();
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/files';
      
      if (activeView === 'starred') {
        endpoint = '/api/files/starred';
      } else if (activeView === 'recent') {
        endpoint = '/api/files/recent';
      } else if (activeView === 'trash') {
        endpoint = '/api/files/trash';
      } else if (selectedFolder) {
        endpoint = `/api/files?folderId=${selectedFolder}`;
      }

      const response = await axios.get(`${API_URL}${endpoint}`);
      setFiles(response.data);
    } catch (error) {
      console.error('Fetch files error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/folders`);
      setFolders(response.data.folders);
    } catch (error) {
      console.error('Fetch folders error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotes = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/notes`);
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Fetch notes error:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1">
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

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search files, folders, or notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${
                isDark 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
              } focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500`}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className={`flex space-x-1 mb-6 p-1 rounded-lg ${
          isDark ? 'bg-gray-800' : 'bg-gray-100'
        }`}>
          {['files', 'folders', 'notes'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setSearchQuery('');
                setSelectedFolder(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                activeTab === tab
                  ? isDark 
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-white text-blue-600 shadow-md'
                  : isDark
                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                {tab === 'files' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                )}
                {tab === 'folders' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                )}
                {tab === 'notes' && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                )}
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </div>
            </button>
          ))}
        </div>

        {/* File Views Filter */}
        {activeTab === 'files' && (
          <div className="mb-6 flex gap-2 flex-wrap">
            {['all', 'starred', 'recent', 'trash'].map((view) => (
              <button
                key={view}
                onClick={() => {
                  setActiveView(view);
                  setSelectedFolder(null);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === view
                    ? isDark
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : isDark
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {view === 'all' && '📁 All Files'}
                {view === 'starred' && '⭐ Starred'}
                {view === 'recent' && '🕒 Recent'}
                {view === 'trash' && '🗑️ Trash'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        <div>
          {activeTab === 'files' && (
            <>
              {activeView !== 'trash' && <FileUpload onUploadSuccess={fetchFiles} />}
              <FileList 
                files={filteredFiles} 
                onUpdate={fetchFiles} 
                loading={loading}
                isTrash={activeView === 'trash'}
              />
            </>
          )}
          
          {activeTab === 'folders' && (
            <FolderList 
              folders={filteredFolders} 
              onUpdate={fetchFolders} 
              loading={loading}
              onSelectFolder={(folderId) => {
                setSelectedFolder(folderId);
                setActiveTab('files');
                setActiveView('all');
              }}
            />
          )}
          
          {activeTab === 'notes' && (
            <NoteList 
              notes={filteredNotes} 
              onUpdate={fetchNotes} 
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
