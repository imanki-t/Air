// src/components/dashboard/FolderGrid.jsx
import React, { useState } from 'react';
import folderService from '../../services/folderService';

const FolderCard = ({ folder, onClick, onRefresh }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async (e) => {
    e.stopPropagation(); // Stop propagation from the button
    if (!window.confirm(`Delete folder "${folder.name}"?`)) return;

    setLoading(true);
    try {
      await folderService.deleteFolder(folder._id);
      onRefresh();
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete folder');
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
      {/* Menu Button */}
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

        {/* Dropdown Menu */}
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
                disabled={loading || folder.isDefault}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-destructive/10 text-destructive disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {folder.isDefault ? 'Default' : 'Delete'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Folder Icon */}
      <div className="mb-4">
         {/* Use a subtle tint based on folder color, or just primary color if minimal */}
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center bg-secondary"
        >
          <svg
            className="w-6 h-6 text-primary"
            fill="currentColor" // Changed to fill for a solid look, or stroke for outline
            viewBox="0 0 24 24"
          >
             <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        </div>
      </div>

      {/* Folder Info */}
      <div>
        <h3 className="text-base font-medium truncate mb-1">
          {folder.name}
        </h3>
        <p className="text-xs text-muted-foreground">
          {folder.fileCount || 0} files • {formatSize(folder.totalSize || 0)}
        </p>
      </div>
    </div>
  );
};

const FolderGrid = ({ folders, onFolderClick, onRefresh }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {folders.map((folder) => (
        <FolderCard
          key={folder._id}
          folder={folder}
          onClick={onFolderClick}
          onRefresh={onRefresh}
        />
      ))}
    </div>
  );
};

export default FolderGrid;
