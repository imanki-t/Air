// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '../services/authService';
import folderService from '../services/folderService';
import fileService from '../services/fileService';
import DashboardLayout from '../components/layout/DashboardLayout';
import FolderGrid from '../components/dashboard/FolderGrid';
import FileListSection from '../components/dashboard/FileListSection';
import { CreateFolderModal } from '../components/dashboard/CreateFolderModal';
import { UploadModal } from '../components/dashboard/UploadModal';
import { ProfileModal } from '../components/dashboard/ProfileModal';
import { SettingsModal } from '../components/dashboard/SettingsModal';
import { ShareModal } from '../components/dashboard/ShareModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [currentView, setCurrentView] = useState('my-files');
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [storageStats, setStorageStats] = useState({ used: 0, total: 15 * 1024 * 1024 * 1024 }); // 15GB default

  useEffect(() => {
    loadUserData();
    loadFolders();
    loadFiles();
    loadStorageStats();
  }, []);

  useEffect(() => {
    // Load different content based on current view
    if (currentView === 'my-files') {
      loadFiles();
    } else if (currentView === 'recent') {
      loadRecentFiles();
    } else if (currentView === 'starred') {
      loadStarredFiles();
    } else if (currentView === 'trash') {
      loadTrashFiles();
    }
  }, [currentView]);

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
      const filesData = await fileService.getFiles(folderId);
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to load files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentFiles = async () => {
    try {
      const filesData = await fileService.getRecentFiles(20);
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to load recent files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStarredFiles = async () => {
    try {
      const filesData = await fileService.getStarredFiles();
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to load starred files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTrashFiles = async () => {
    try {
      const filesData = await fileService.getTrashFiles();
      setFiles(filesData);
    } catch (error) {
      console.error('Failed to load trash files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await fileService.getStorageStats();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
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
    if (currentView === 'my-files' || currentView === 'folder-view') {
      loadFiles(selectedFolder?._id);
    }
    loadStorageStats();
    setShowUpload(false);
  };

  const handleShare = (file) => {
    setSelectedFile(file);
    setShowShare(true);
  };

  const handleRefresh = () => {
    if (currentView === 'recent') {
      loadRecentFiles();
    } else if (currentView === 'starred') {
      loadStarredFiles();
    } else if (currentView === 'trash') {
      loadTrashFiles();
    } else {
      loadFiles(selectedFolder?._id);
    }
    loadStorageStats();
  };

  const filteredFiles = files.filter(file =>
    file.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    !folder.parent && folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate storage percentage
  const storagePercentage = (storageStats.used / storageStats.total) * 100;
  const storageColor = storagePercentage >= 90 ? 'bg-red-600' : storagePercentage >= 70 ? 'bg-yellow-600' : 'bg-primary';

  // Header search component
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
      storageStats={storageStats}
      storagePercentage={storagePercentage}
      storageColor={storageColor}
      onProfileClick={() => setShowProfile(true)}
      onSettingsClick={() => setShowSettings(true)}
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
            {currentView !== 'trash' && (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium shadow-sm transition-all hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Upload
              </button>
            )}
            {(currentView === 'my-files' || currentView === 'folder-view') && (
              <button
                onClick={() => setShowCreateFolder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-background border border-border hover:bg-secondary text-foreground rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Folder
              </button>
            )}
            {currentView === 'trash' && files.length > 0 && (
              <button
                onClick={async () => {
                  if (window.confirm('Empty trash? This will permanently delete all files.')) {
                    await fileService.emptyTrash();
                    handleRefresh();
                  }
                }}
                className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-md text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Empty Trash
              </button>
            )}
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
                    onRefresh={handleRefresh}
                    onShare={handleShare}
                    viewType="my-files"
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
                    Upload your first file or create a folder to get started with your workspace.
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
                  onShare={handleShare}
                  viewType="folder"
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

          {currentView === 'recent' && (
            <motion.div
              key="recent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Recent Files</h1>
                <p className="text-sm text-muted-foreground">Your recently accessed files</p>
              </div>
              {filteredFiles.length > 0 ? (
                <FileListSection
                  files={filteredFiles}
                  title=""
                  onRefresh={handleRefresh}
                  onShare={handleShare}
                  viewType="recent"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <p className="text-muted-foreground">No recent files</p>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'starred' && (
            <motion.div
              key="starred"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Starred Files</h1>
                <p className="text-sm text-muted-foreground">Files you've marked as important</p>
              </div>
              {filteredFiles.length > 0 ? (
                <FileListSection
                  files={filteredFiles}
                  title=""
                  onRefresh={handleRefresh}
                  onShare={handleShare}
                  viewType="starred"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No starred files</h3>
                  <p className="text-muted-foreground">Star important files to find them here</p>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'trash' && (
            <motion.div
              key="trash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1">Trash</h1>
                <p className="text-sm text-muted-foreground">Files will be automatically deleted after 30 days</p>
              </div>
              {filteredFiles.length > 0 ? (
                <FileListSection
                  files={filteredFiles}
                  title=""
                  onRefresh={handleRefresh}
                  onShare={handleShare}
                  viewType="trash"
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-secondary/50 rounded-full flex items-center justify-center mb-4 text-muted-foreground">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">Trash is empty</h3>
                  <p className="text-muted-foreground">Deleted files will appear here</p>
                </div>
              )}
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
