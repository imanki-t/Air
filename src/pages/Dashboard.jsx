// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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

      const profile = await authService.getProfile();
      if (!profile.user.isEmailVerified) {
        navigate('/auth/verify-email');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/auth/login');
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
      navigate('/auth/login');
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="inline-block w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full mb-4"
          />
          <p className="text-gray-400 text-lg">Loading your workspace...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-950 via-purple-950/50 to-slate-950 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/4 -left-20 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 50, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -50, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar
        user={user}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        {/* Top Bar */}
        <motion.header
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="bg-slate-900/50 backdrop-blur-xl border-b border-purple-500/20 px-6 py-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center flex-1 max-w-2xl">
              <div className="relative w-full">
                <motion.input
                  whileFocus={{ scale: 1.01 }}
                  type="text"
                  placeholder="Search files and folders..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-purple-500/20 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-500"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-6">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 20px rgba(168, 85, 247, 0.5)" }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/30"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-6 py-3 bg-slate-800/50 backdrop-blur-xl border border-purple-500/20 text-gray-300 rounded-xl font-medium hover:border-purple-500/40 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </motion.button>
            </div>
          </div>
        </motion.header>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {currentView === 'my-files' && !selectedFolder && (
              <motion.div
                key="my-files"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Breadcrumb */}
                <div className="mb-8">
                  <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 bg-clip-text text-transparent"
                  >
                    My Workspace
                  </motion.h1>
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-400 mt-2"
                  >
                    {filteredFolders.length} folders, {filteredFiles.length} files
                  </motion.p>
                </div>

                {/* Folders Grid */}
                {filteredFolders.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                  >
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                      <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                      Folders
                    </h2>
                    <FolderGrid
                      folders={filteredFolders}
                      onFolderClick={handleFolderClick}
                      onRefresh={loadFolders}
                    />
                  </motion.div>
                )}

                {/* Recent Files */}
                {filteredFiles.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <FileListSection
                      files={filteredFiles}
                      title="Recent Files"
                      onRefresh={() => loadFiles()}
                    />
                  </motion.div>
                )}

                {/* Empty State */}
                {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="relative mb-8"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full blur-2xl opacity-20" />
                      <svg
                        className="relative w-32 h-32 text-purple-400/50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-white mb-2">No files yet</h3>
                    <p className="text-gray-400 mb-8 text-center max-w-md">
                      Get started by uploading your first file or creating a folder
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(168, 85, 247, 0.5)" }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowUpload(true)}
                      className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium shadow-lg shadow-purple-500/30"
                    >
                      Upload Your First File
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {currentView === 'folder-view' && selectedFolder && (
              <motion.div
                key="folder-view"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Breadcrumb */}
                <div className="mb-8">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
                    <motion.button
                      whileHover={{ x: -5 }}
                      onClick={handleBackToAllFolders}
                      className="hover:text-purple-400 transition-colors flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                      My Workspace
                    </motion.button>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="text-white font-medium">{selectedFolder.name}</span>
                  </div>
                  <motion.h1
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-teal-400 bg-clip-text text-transparent"
                  >
                    {selectedFolder.name}
                  </motion.h1>
                  <motion.p
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-gray-400 mt-2"
                  >
                    {filteredFiles.length} files
                  </motion.p>
                </div>

                {/* Files in Folder */}
                {filteredFiles.length > 0 ? (
                  <FileListSection
                    files={filteredFiles}
                    title={`Files in ${selectedFolder.name}`}
                    onRefresh={() => loadFiles(selectedFolder._id)}
                  />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center py-20"
                  >
                    <motion.svg
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="w-32 h-32 text-purple-400/50 mb-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </motion.svg>
                    <h3 className="text-2xl font-bold text-white mb-2">This folder is empty</h3>
                    <p className="text-gray-400">Upload files to this folder to get started</p>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showCreateFolder && (
          <CreateFolderModal
            onClose={() => setShowCreateFolder(false)}
            onCreate={handleCreateFolder}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showUpload && (
          <UploadModal
            folderId={selectedFolder?._id}
            onClose={() => setShowUpload(false)}
            onComplete={handleUploadComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dashboard;
