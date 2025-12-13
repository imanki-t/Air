// src/components/dashboard/FolderGrid.jsx - UPDATED WITH DEFAULT FOLDERS BOX
import { useState } from 'react';
import folderService from '../../services/folderService';
import { showToast, showConfirm } from '../Toast';

const FolderCard = ({ folder, onClick, onRefresh }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    const confirmed = await showConfirm(
      `Delete folder "${folder.name}"? All files will be moved to root.`
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      await folderService.deleteFolder(folder._id);
      showToast('Folder deleted successfully', 'success');
      onRefresh();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to delete folder', 'error');
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div
      onClick={() => onClick(folder)}
      className="group relative bg-card text-card-foreground rounded-lg border border-border p-5 hover:shadow-md transition-all duration-200 cursor-pointer hover:border-primary/50"
    >
      {/* Menu Button - Only show for non-default folders */}
      {!folder.isDefault && (
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-secondary text-muted-foreground transition-opacity"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 mt-1 w-40 bg-popover text-popover-foreground border border-border rounded-md shadow-md z-20">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Folder Icon */}
      <div className="mb-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-secondary">
          <svg
            className="w-6 h-6 text-primary"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
      </div>

      {/* Folder Info */}
      <div>
        <h3 className="text-base font-medium truncate mb-1 flex items-center gap-2">
          {folder.name}
          {folder.isDefault && (
            <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
              Default
            </span>
          )}
        </h3>
        <p className="text-xs text-muted-foreground">
          {folder.fileCount || 0} files • {formatSize(folder.totalSize || 0)}
        </p>
      </div>
    </div>
  );
};

const FolderGrid = ({ folders, onFolderClick, onRefresh }) => {
  // Separate default and custom folders
  const defaultFolders = folders.filter(f => f.isDefault);
  const customFolders = folders.filter(f => !f.isDefault);

  return (
    <div className="space-y-6">
      {/* Default Folders Section */}
      {defaultFolders.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Quick Access Folders
          </h3>
          <div className="border-2 border-primary/20 bg-primary/5 rounded-lg p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {defaultFolders.map((folder) => (
                <FolderCard
                  key={folder._id}
                  folder={folder}
                  onClick={onFolderClick}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Folders Section */}
      {customFolders.length > 0 && (
        <div>
          {defaultFolders.length > 0 && (
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">
              My Folders
            </h3>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {customFolders.map((folder) => (
              <FolderCard
                key={folder._id}
                folder={folder}
                onClick={onFolderClick}
                onRefresh={onRefresh}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FolderGrid;
