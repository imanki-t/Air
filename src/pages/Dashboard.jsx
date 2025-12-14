// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Services
import authService from '../services/authService';
import folderService from '../services/folderService';
import fileService from '../services/fileService';

// Hooks
import { useFileManager } from '../hooks/useFileManager';

// Components
import DashboardLayout from '../components/layout/DashboardLayout';
import FileExplorer from '../components/dashboard/FileExplorer';
import M3Snackbar, { showSnackbar } from '../components/m3/M3Snackbar';

// Modals
import { CreateFolderModal } from '../components/dashboard/CreateFolderModal';
import { UploadModal } from '../components/dashboard/UploadModal';
import { ProfileModal } from '../components/dashboard/ProfileModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { ShareModal } from '../components/dashboard/ShareModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Data State
  const [allFolders, setAllFolders] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [currentView, setCurrentView] = useState('my-files'); // 'my-files', 'recent', 'starred', 'trash'
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);

  // Use the custom hook for file logic
  const fileManager = useFileManager(allFiles, 'date', 'desc');

  // Modal States
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Initial Load
  useEffect(() => {
    loadUserData();
    loadFolders();
    loadFiles();
  }, []);

  // View Switching Logic
  useEffect(() => {
    if (currentView === 'my-files') {
      loadFiles();
    } else if (currentView === 'recent') {
      loadRecentFiles();
    } else if (currentView === 'starred') {
      loadStarredFiles();
    } else if (currentView === 'trash') {
      loadTrashFiles();
    }
    // Reset selection when changing main views
    if (currentView !== 'my-files') setSelectedFolder(null);
  }, [currentView]);

  // --- Data Loading Functions ---

  const loadUserData = async () => {
    try {
      const userData = authService.getUser();
      setUser(userData);
      try {
          const profile = await authService.getProfile();
          if (profile && profile.user && !profile.user.isEmailVerified) navigate('/auth/verify-email');
      } catch (e) {
          // Ignore
      }
    } catch (error) {
      console.error('Failed to load user:', error);
      navigate('/auth/login');
    }
  };

  const loadFolders = async () => {
    try {
      const foldersData = await folderService.getFolders();
      setAllFolders(Array.isArray(foldersData) ? foldersData : []);
    } catch (error) {
      console.error('Failed to load folders:', error);
      setAllFolders([]);
    }
  };

  const loadFiles = async (folderId = null) => {
    setLoading(true);
    try {
      const targetFolderId = folderId || (currentView === 'my-files' && selectedFolder?._id) || null;
      const filesData = await fileService.getFiles(targetFolderId);
      setAllFiles(Array.isArray(filesData) ? filesData : []);
    } catch (error) {
      showSnackbar('Failed to load files', 'Retry', () => loadFiles(folderId));
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentFiles = async () => {
    setLoading(true);
    try {
      const filesData = await fileService.getRecentFiles(20);
      setAllFiles(Array.isArray(filesData) ? filesData : []);
    } catch (error) {
       showSnackbar('Failed to load recent files');
       setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadStarredFiles = async () => {
    setLoading(true);
    try {
      const filesData = await fileService.getStarredFiles();
      setAllFiles(Array.isArray(filesData) ? filesData : []);
    } catch (error) {
      showSnackbar('Failed to load starred files');
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTrashFiles = async () => {
    setLoading(true);
    try {
      const filesData = await fileService.getTrashFiles();
      setAllFiles(Array.isArray(filesData) ? filesData : []);
    } catch (error) {
      showSnackbar('Failed to load trash');
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

  // --- Handlers ---

  const handleLogout = async () => {
    await authService.logout();
    navigate('/auth/login');
  };

  const handleFolderClick = (folder) => {
    setSelectedFolder(folder);
    setCurrentView('my-files');
    loadFiles(folder._id);
  };

  const handleBreadcrumbNavigate = () => {
    setSelectedFolder(null);
    loadFiles(null);
  };

  const handleCreateFolder = async (folderData) => {
    try {
      await folderService.createFolder(folderData.name, selectedFolder?._id, folderData.color);
      await loadFolders();
      setShowCreateFolder(false);
      showSnackbar('Folder created');
    } catch (error) {
      showSnackbar('Failed to create folder');
    }
  };

  const handleUploadComplete = () => {
    loadFiles(selectedFolder?._id);
    setShowUpload(false);
    showSnackbar('Upload complete');
  };

  const handleFileAction = async (file, action) => {
    if (action === 'preview') {
      if (file.contentType?.startsWith('image/')) {
         window.open(fileService.getPreviewUrl(file._id), '_blank');
      } else {
         try {
            const blob = await fileService.downloadFile(file._id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', file.filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            showSnackbar('Download started');
         } catch (e) {
            showSnackbar('Download failed');
         }
      }
    } else if (action === 'menu') {
       setSelectedFile(file);
       setShowShare(true);
    }
  };

  // --- Render Helpers ---

  const visibleFolders = (allFolders || []).filter(f => {
    if (currentView !== 'my-files') return false;
    if (selectedFolder) return f.parent === selectedFolder._id;
    return !f.parent;
  }).filter(f =>
    f.name.toLowerCase().includes(fileManager.searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      user={user}
      onLogout={handleLogout}
      currentView={currentView}
      setCurrentView={setCurrentView}
      onProfileClick={() => setShowProfile(true)}
      onSettingsClick={() => setShowSettings(true)}
      onUploadClick={() => setShowUpload(true)}
      searchQuery={fileManager.searchQuery}
      setSearchQuery={fileManager.setSearchQuery}
    >
      <M3Snackbar />

      <div className="space-y-4">
        {/* Header / Breadcrumbs / View Toggle */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
           <div className="flex items-center gap-2 text-xl text-on-surface">
              {currentView === 'my-files' ? (
                selectedFolder ? (
                  <div className="flex items-center gap-2">
                    <button onClick={handleBreadcrumbNavigate} className="hover:underline text-on-surface-variant">My Files</button>
                    <span className="text-on-surface-variant">/</span>
                    <span className="font-semibold">{selectedFolder.name}</span>
                  </div>
                ) : 'My Files'
              ) : (
                currentView.charAt(0).toUpperCase() + currentView.slice(1)
              )}
           </div>

           <div className="flex items-center gap-2 self-end md:self-auto">
              <div className="bg-surface-container-high rounded-lg p-1 flex">
                 <button
                   onClick={() => fileManager.setViewType('list')}
                   className={`p-2 rounded-md ${fileManager.viewType === 'list' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                 </button>
                 <button
                   onClick={() => fileManager.setViewType('grid')}
                   className={`p-2 rounded-md ${fileManager.viewType === 'grid' ? 'bg-surface shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                 >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                 </button>
              </div>
              <button
                onClick={() => setShowCreateFolder(true)}
                className="hidden md:flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant rounded-lg text-sm font-medium transition-colors"
              >
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                 New Folder
              </button>
           </div>
        </div>

        {/* File Explorer Content */}
        {loading ? (
           <div className="flex justify-center py-20">
              <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
           </div>
        ) : (
           <FileExplorer
              files={fileManager.files}
              folders={visibleFolders}
              viewType={fileManager.viewType}
              onFolderClick={handleFolderClick}
              onFileClick={(f) => handleFileAction(f, 'preview')}
              onFileAction={handleFileAction}
              isLoading={loading}
           />
        )}
      </div>

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

      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onUpdate={(updatedUser) => {
              setUser(updatedUser);
              authService.setUser(updatedUser);
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showShare && selectedFile && (
          <ShareModal
            file={selectedFile}
            onClose={() => {
              setShowShare(false);
              setSelectedFile(null);
            }}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
};

export default Dashboard;
