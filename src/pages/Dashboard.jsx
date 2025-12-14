// src/pages/Dashboard.jsx - WITH THEME SUPPORT
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

// Services
import authService from '../services/authService';
import folderService from '../services/folderService';
import fileService from '../services/fileService';

// Components
import DashboardLayout from '../components/layout/DashboardLayout';
import FileExplorer from '../components/dashboard/FileExplorer';
import Toast from '../components/Toast';

// Modals
import { CreateFolderModal } from '../components/dashboard/CreateFolderModal';
import { EnhancedUploadModal } from '../components/dashboard/EnhancedUploadModal';
import { ProfileModal } from '../components/dashboard/ProfileModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { ShareModal } from '../components/dashboard/ShareModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Data State
  const [allFolders, setAllFolders] = useState([]);
  const [allFiles, setAllFiles] = useState([]);
  const [currentView, setCurrentView] = useState('my-files');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
    if (currentView !== 'my-files') setSelectedFolder(null);
  }, [currentView]);

  const loadUserData = async () => {
    try {
      const userData = authService.getUser();
      setUser(userData);
      try {
        const profile = await authService.getProfile();
        if (profile?.user && !profile.user.isEmailVerified) {
          navigate('/auth/verify-email');
        } else {
          // Update user with latest data from server
          setUser(profile.user);
          authService.setUser(profile.user);
        }
      } catch (e) {
        console.error('Profile fetch error:', e);
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
      console.error('Failed to load files:', error);
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
      console.error('Failed to load recent files:', error);
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
      console.error('Failed to load starred files:', error);
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
      console.error('Failed to load trash:', error);
      setAllFiles([]);
    } finally {
      setLoading(false);
    }
  };

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
    } catch (error) {
      console.error('Create folder error:', error);
    }
  };

  const handleUploadComplete = () => {
    loadFiles(selectedFolder?._id);
    setShowUpload(false);
  };

  const handleFileAction = async (file, action) => {
    if (action === 'share') {
      setSelectedFile(file);
      setShowShare(true);
    } else if (action === 'download') {
      try {
        const blob = await fileService.downloadFile(file._id);
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', file.filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (e) {
        console.error('Download error:', e);
      }
    } else if (action === 'star') {
      try {
        await fileService.toggleStar(file._id);
        loadFiles(selectedFolder?._id);
      } catch (error) {
        console.error('Star error:', error);
      }
    } else if (action === 'delete') {
      try {
        await fileService.moveToTrash(file._id);
        loadFiles(selectedFolder?._id);
      } catch (error) {
        console.error('Delete error:', error);
      }
    } else if (action === 'preview') {
      if (file.contentType?.startsWith('image/')) {
        window.open(fileService.getPreviewUrl(file._id), '_blank');
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    // Update user state with new theme
    setUser(prev => ({ ...prev, theme: newTheme }));
  };

  const visibleFolders = (allFolders || [])
    .filter(f => {
      if (currentView !== 'my-files') return false;
      if (selectedFolder) return f.parent === selectedFolder._id;
      return !f.parent;
    })
    .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const visibleFiles = allFiles.filter(f =>
    f.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Toast />
      <DashboardLayout
        user={user}
        onLogout={handleLogout}
        currentView={currentView}
        setCurrentView={setCurrentView}
        onProfileClick={() => setShowProfile(true)}
        onSettingsClick={() => setShowSettings(true)}
        onUploadClick={() => setShowUpload(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      >
        <div className="space-y-4 pb-6">
          {/* Header / Breadcrumbs */}
          <div className="flex flex-col gap-3 mb-2">
            <div className="flex items-center gap-2 text-xl text-on-surface">
              {currentView === 'my-files' ? (
                selectedFolder ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleBreadcrumbNavigate}
                      className="hover:underline text-on-surface-variant"
                    >
                      My Files
                    </button>
                    <span className="text-on-surface-variant">/</span>
                    <span className="font-semibold">{selectedFolder.name}</span>
                  </div>
                ) : (
                  'My Files'
                )
              ) : (
                currentView.charAt(0).toUpperCase() + currentView.slice(1)
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-high hover:bg-surface-variant rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <span className="hidden sm:inline">New Folder</span>
              </button>
            </div>
          </div>

          {/* File Explorer Content */}
          <FileExplorer
            files={visibleFiles}
            folders={visibleFolders}
            onFolderClick={handleFolderClick}
            onFileClick={(f) => handleFileAction(f, 'preview')}
            onFileAction={handleFileAction}
            isLoading={loading}
          />
        </div>
      </DashboardLayout>

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
          <EnhancedUploadModal
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
            user={user}
            onClose={() => setShowSettings(false)}
            onThemeChange={handleThemeChange}
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
    </>
  );
};

export default Dashboard;
