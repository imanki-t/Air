// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '../services/authService';
import folderService from '../services/folderService';
import axios from 'axios';
import DashboardLayout from '../components/layout/DashboardLayout';
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

  // Search Bar Component for Header
  const HeaderSearch = (
    <div className="relative w-full max-w-md hidden sm:block">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        placeholder="Search files..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full pl-9 pr-4 py-2 bg-secondary/50 border border-transparent focus:border-input focus:bg-background rounded-md text-sm transition-all focus:ring-2 focus:ring-ring"
      />
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      currentView={currentView}
      setCurrentView={setCurrentView}
      headerActions={HeaderSearch}
    >
      <div className="space-y-8">
        {/* Action Bar (Mobile Search + Buttons) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="sm:hidden">
             <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-secondary/50 border border-transparent focus:border-input focus:bg-background rounded-md text-sm transition-all focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-3">
             <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium shadow-sm transition-all hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Upload
            </button>
            <button
              onClick={() => setShowCreateFolder(true)}
              className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground rounded-md text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Folder
            </button>
          </div>
        </div>

        {/* Content Views */}
        <AnimatePresence mode="wait">
          {currentView === 'my-files' && !selectedFolder && (
            <motion.div
              key="my-files"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Folders */}
              {filteredFolders.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    Folders
                  </h2>
                  <FolderGrid
                    folders={filteredFolders}
                    onFolderClick={handleFolderClick}
                    onRefresh={loadFolders}
                  />
                </section>
              )}

              {/* Files */}
              {filteredFiles.length > 0 && (
                <section>
                   <FileListSection
                    files={filteredFiles}
                    title="Recent Files"
                    onRefresh={() => loadFiles()}
                  />
                </section>
              )}

              {/* Empty State */}
              {filteredFolders.length === 0 && filteredFiles.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No files yet</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm">
                    Upload your first file or create a folder to get started with your professional workspace.
                  </p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
                  >
                    Upload File
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'folder-view' && selectedFolder && (
             <motion.div
              key="folder-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {/* Breadcrumb */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
                <button
                  onClick={handleBackToAllFolders}
                  className="hover:text-foreground transition-colors flex items-center gap-1"
                >
                  My Workspace
                </button>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-foreground font-medium">{selectedFolder.name}</span>
              </div>

              <div className="mb-6">
                <h1 className="text-2xl font-bold text-foreground">{selectedFolder.name}</h1>
                <p className="text-sm text-muted-foreground mt-1">{filteredFiles.length} files</p>
              </div>

              {filteredFiles.length > 0 ? (
                <FileListSection
                  files={filteredFiles}
                  title={`Files in ${selectedFolder.name}`}
                  onRefresh={() => loadFiles(selectedFolder._id)}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-muted-foreground">This folder is empty.</p>
                  <button
                    onClick={() => setShowUpload(true)}
                    className="mt-4 px-4 py-2 text-sm text-primary hover:underline"
                  >
                    Upload a file here
                  </button>
                </div>
              )}
            </motion.div>
          )}

           {/* Placeholder views for other navigation items if needed */}
           {currentView !== 'my-files' && currentView !== 'folder-view' && (
             <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20"
             >
                <p className="text-muted-foreground">This view is not implemented yet.</p>
                <button
                  onClick={() => setCurrentView('my-files')}
                  className="mt-4 text-primary hover:underline"
                >
                  Go back home
                </button>
             </motion.div>
           )}
        </AnimatePresence>
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
    </DashboardLayout>
  );
};

export default Dashboard;
