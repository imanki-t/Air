import React, { useEffect, useState, useMemo } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { FileProvider, useFileContext } from './context/FileContext';
import { DashboardLayout } from './layout/DashboardLayout';
import { FileGrid } from './layout/FileGrid';
import { FileList } from './layout/FileList';
import { useFileSystem } from './hooks/useFileSystem';
import { useUploader } from './hooks/useUploader';
import { useSortAndFilter } from './hooks/useSortAndFilter';
import { usePagination } from './hooks/usePagination';
import { UploadManager } from './features/UploadManager';
import { ProfileSettings } from './features/ProfileSettings';
import { ShareDialog } from './features/ShareDialog';
import { FilePreview } from './features/FilePreview';
import { Modal } from './ui/surfaces/Modal';
import { TextField } from './ui/inputs/TextField';
import { FilledButton } from './ui/buttons/FilledButton';
import { TextButton } from './ui/buttons/TextButton';
import { Toast } from './ui/feedback/Toast';
import { Spinner } from './ui/feedback/Spinner';
import { IconButton } from './ui/buttons/IconButton';
import authService from '../../services/authService';

/**
 * Internal Dashboard Component
 * Contains the wiring for the UI and Business Logic
 */
const DashboardContent = () => {
  const {
    files,
    folders,
    loading,
    view,
    currentFolder,
    sort,
    filter,
    setView
  } = useFileContext();

  const { refreshData, createNewFolder, handleUploadSuccess, deleteItems, renameFile, openFolder } = useFileSystem();
  const { uploads, startUpload, cancelUpload, clearCompleted } = useUploader(handleUploadSuccess);

  // Local UI State
  const [user, setUser] = useState(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFileForAction, setSelectedFileForAction] = useState(null);
  const [actionType, setActionType] = useState(null); // 'share', 'preview', 'rename', 'delete'
  const [newFolderName, setNewFolderName] = useState('');
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });

  // Load Initial Data
  useEffect(() => {
    refreshData(currentFolder?._id);
    loadUser();
  }, [refreshData, currentFolder]);

  const loadUser = async () => {
      try {
          // Verify auth logic from original dashboard
          const userData = authService.getUser();
          if (!userData) {
               // Assuming parent/router handles redirect, but we can enforce
               window.location.href = '/auth/login';
               return;
          }

          const profile = await authService.getProfile();
          if (profile?.user && !profile.user.isEmailVerified) {
               window.location.href = '/auth/verify-email';
               return;
          }

          setUser(profile.user);
          authService.setUser(profile.user);
      } catch (e) {
          console.error("Failed to load user profile", e);
          window.location.href = '/auth/login';
      }
  };

  // Event Listeners for global actions (from Sidebar/TopBar)
  useEffect(() => {
    const handleOpenCreate = () => setShowCreateFolder(true);
    const handleOpenSettings = () => setShowSettings(true);
    const handleGlobalAction = (e) => {
        const { action, selectedIds } = e.detail;
        if (action === 'delete') {
            if (confirm(`Are you sure you want to delete ${selectedIds.length} items?`)) {
                deleteItems(selectedIds, []) // Assuming IDs are mixed or mostly files for now
                    .then(() => setToast({ show: true, message: 'Items deleted' }))
                    .catch(() => setToast({ show: true, message: 'Failed to delete items' }));
            }
        } else if (action === 'share') {
             // For batch share, we might need a different UI or loop
             // For simplicity, just pick first
             const fileToShare = files.find(f => f._id === selectedIds[0]);
             if (fileToShare) {
                 setSelectedFileForAction(fileToShare);
                 setActionType('share');
             }
        } else if (action === 'download') {
            // Batch download logic
            selectedIds.forEach(id => {
                 window.open(`/api/files/download/${id}`);
            });
        }
    };

    document.addEventListener('OPEN_CREATE_MODAL', handleOpenCreate);
    document.addEventListener('OPEN_SETTINGS', handleOpenSettings);
    document.addEventListener('GLOBAL_ACTION', handleGlobalAction);

    return () => {
        document.removeEventListener('OPEN_CREATE_MODAL', handleOpenCreate);
        document.removeEventListener('OPEN_SETTINGS', handleOpenSettings);
        document.removeEventListener('GLOBAL_ACTION', handleGlobalAction);
    };
  }, [files, deleteItems]);

  // Filtering & Sorting
  const { sortedFiles, sortedFolders } = useSortAndFilter(files, folders, sort, filter);

  // Pagination (only for files in this view)
  const {
    currentItems: paginatedFiles,
    currentPage,
    maxPage,
    nextPage,
    prevPage
  } = usePagination(sortedFiles, 50);

  // Handlers
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
        await createNewFolder(newFolderName);
        setShowCreateFolder(false);
        setNewFolderName('');
        setToast({ show: true, message: 'Folder created successfully' });
    } catch (e) {
        setToast({ show: true, message: 'Failed to create folder' });
    }
  };

  const onDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
          droppedFiles.forEach(file => startUpload(file, currentFolder?._id));
      }
  };

  const handleFileClick = (file) => {
      setSelectedFileForAction(file);
      setActionType('preview');
  };

  return (
    <div
        className="h-full flex flex-col relative"
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={onDrop}
    >
      <DashboardLayout>
        {/* Toolbar / Breadcrumbs Area could go here */}

        <div className="flex items-center justify-between mb-4 px-1">
             <h2 className="text-2xl font-normal text-on-surface">
                 {currentFolder ? currentFolder.name : 'My Files'}
             </h2>
             <div className="flex items-center gap-2">
                 <IconButton
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>}
                    selected={view === 'grid'}
                    onClick={() => setView('grid')}
                    size="small"
                 />
                 <IconButton
                    icon={<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>}
                    selected={view === 'list'}
                    onClick={() => setView('list')}
                    size="small"
                 />
             </div>
        </div>

        {loading && sortedFiles.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
                <Spinner size="large" />
            </div>
        ) : (
            <>
                {view === 'grid' ? (
                    <FileGrid
                        files={paginatedFiles}
                        folders={sortedFolders}
                        onFileClick={handleFileClick}
                        onFolderClick={openFolder}
                    />
                ) : (
                    <FileList
                        files={paginatedFiles}
                        folders={sortedFolders}
                        onFileClick={handleFileClick}
                        onFolderClick={openFolder}
                    />
                )}

                {/* Pagination Controls */}
                {maxPage > 1 && (
                    <div className="flex justify-center mt-8 gap-4 items-center">
                        <TextButton label="Previous" onClick={prevPage} disabled={currentPage === 1} />
                        <span className="text-sm text-on-surface-variant">
                            Page {currentPage} of {maxPage}
                        </span>
                        <TextButton label="Next" onClick={nextPage} disabled={currentPage === maxPage} />
                    </div>
                )}
            </>
        )}
      </DashboardLayout>

      {/* Feature Overlays */}
      <UploadManager
        uploads={uploads}
        onClose={clearCompleted}
        onCancel={cancelUpload}
      />

      <Toast
        isVisible={toast.show}
        message={toast.message}
        onDismiss={() => setToast({ ...toast, show: false })}
      />

      {/* Modals */}
      <Modal
        isOpen={showCreateFolder}
        onClose={() => setShowCreateFolder(false)}
        title="New Folder"
        actions={
            <>
                <TextButton label="Cancel" onClick={() => setShowCreateFolder(false)} />
                <FilledButton label="Create" onClick={handleCreateFolder} />
            </>
        }
      >
          <div className="pt-2">
            <TextField
                label="Folder Name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
          </div>
      </Modal>

      <ProfileSettings
         isOpen={showSettings}
         onClose={() => setShowSettings(false)}
         user={user}
         onUpdate={async (data) => {
             // Implement update logic here
             // await authService.updateProfile(data);
             // setUser({...user, ...data});
             setToast({ show: true, message: 'Profile updated' });
         }}
      />

      {selectedFileForAction && (
          <>
            <ShareDialog
                isOpen={actionType === 'share'}
                onClose={() => { setActionType(null); setSelectedFileForAction(null); }}
                file={selectedFileForAction}
            />
            <FilePreview
                isOpen={actionType === 'preview'}
                onClose={() => { setActionType(null); setSelectedFileForAction(null); }}
                file={selectedFileForAction}
            />
          </>
      )}
    </div>
  );
};

/**
 * Main Entry Point for the V2 Dashboard
 * Wraps the content with necessary Providers
 */
const DashboardV2 = () => {
  return (
    <ThemeProvider>
      <FileProvider>
        <DashboardContent />
      </FileProvider>
    </ThemeProvider>
  );
};

export default DashboardV2;
