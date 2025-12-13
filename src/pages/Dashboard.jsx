// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/authService';
import folderService from '../services/folderService';
import axios from 'axios';
import Sidebar from '../components/dashboard/Sidebar';
import FolderGrid from '../components/dashboard/FolderGrid';
import FileListSection from '../components/dashboard/FileListSection';
import { CreateFolderModal } from '../components/dashboard/CreateFolderModal';
import { UploadModal } from '../components/dashboard/UploadModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentView, setCurrentView] = useState('my-files');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUserData();
    loadFolders();
    loadFiles();
  }, []);

  const loadUserData = async () => {
    try {
      const userData = authService.getUser();
      setUser(userData);

      // Verify email status
      const profile = await authService.getProfile();
      if (!profile.user.isEmailVerified) {
        navigate('/verify-email-notice');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/login');
    }
  };

  const loadFolders = async () => {
    try {
      const foldersData = await folderService.getFolders();
      setFolders(foldersData);
    } catch (error) {
      console.error('Failed to load folders:', error);
    }
  };

  const loadFiles = async (folderId = null) => {
    try {
      const url = folderId 
        ? `${import.meta.env.VITE_BACKEND_URL}/api/files?folderId=${folderId}`
        : `${import.meta.env.VITE_BACKEND_URL}/api/files`;
      
      const response = await axios.get(url);
      setFiles(response.data);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await authService.logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    setCurrentView('folder-view');
    loadFiles(folder._id);
  };

  const handleBackToAllFolders = () => {
    setSelectedFolder(null);
    setCurrentView('my-files');
    loadFiles();
  };

  const handleCreateFolder = async (folderData) => {
    try {
      await folderService.createFolder(
        folderData.name,
        selectedFolder?._id,
        folderData.color
      );
      await loadFolders();
      setShowCreateFolder(false);
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw error;
    }
  };

  const handleUploadComplete = () => {
    loadFiles(selectedFolder?._id);
    setShowUpload(false);
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    !folder.parent && folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <Sidebar
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 max-w-2xl">
              <div className="relative w-full">
                <input
                  type="text"
                  placeholder="Search your cloud..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-6">
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </button>

              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentView === 'my-files' && !selectedFolder && (
            <>
              {/* Breadcrumb */}
              <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Files</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {filteredFolders.length} folders, {filteredFiles.length} files
                </p>
              </div>

              {/* Folders Grid */}
              {filteredFolders.length > 0 && (
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Folders</h2>
                  </div>
                  <FolderGrid
                    folders={filteredFolders}
                    onFolderClick={handleFolderClick}
                    onRefresh={loadFolders}
                  />
                </div>
              )}

              {/* Recent Files */}
              {filteredFiles.length > 0 && (
                <FileListSection
                  files={filteredFiles}
                  title="Recent Files"
                  onRefresh={() => loadFiles()}
                />
              )}

              {/* Empty State */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-24 w-24 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No files yet</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Get started by uploading your first file</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              )}
            </>
          )}

          {currentView === 'folder-view' && selectedFolder && (
            <>
              {/* Breadcrumb */}
              <div className="mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <button onClick={handleBackToAllFolders} className="hover:text-blue-600 dark:hover:text-blue-400">
                    My Files
                  </button>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="font-medium text-gray-900 dark:text-white">{selectedFolder.name}</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedFolder.name}</h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">{filteredFiles.length} files</p>
              </div>

              {/* Files in Folder */}
              {filteredFiles.length > 0 ? (
                <FileListSection
                  files={filteredFiles}
                  title={`Files in ${selectedFolder.name}`}
                  onRefresh={() => loadFiles(selectedFolder._id)}
                />
              ) : (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-24 w-24 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">This folder is empty</h3>
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Upload files to this folder to get started</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      {showCreateFolder && (
        <CreateFolderModal
          onClose={() => setShowCreateFolder(false)}
          onCreate={handleCreateFolder}
        />
      )}

      {showUpload && (
        <UploadModal
          folderId={selectedFolder?._id}
          onClose={() => setShowUpload(false)}
          onComplete={handleUploadComplete}
        />
      )}
    </div>
  );
};

export default Dashboard;
