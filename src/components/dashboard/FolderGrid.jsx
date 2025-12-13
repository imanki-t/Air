// src/components/dashboard/FolderGrid.jsx
import React, { useState } from 'react';
import folderService from '../../services/folderService';

const FolderCard = ({ folder, onClick, onRefresh }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
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

  return (
    <div
      onClick={() => onClick(folder)}
      className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 cursor-pointer"
    >
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-opacity"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              disabled={loading || folder.isDefault}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              {folder.isDefault ? 'Cannot Delete' : 'Delete'}
            </button>
          </div>
        )}
      </div>

      {/* Folder Icon with Color */}
      <div className="mb-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: folder.color + '20' }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: folder.color }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
        </div>
      </div>

      {/* Folder Info */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          {folder.name}
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {folder.fileCount || 0} files • {formatSize(folder.totalSize || 0)}
        </p>
      </div>

      {/* Default Badge */}
      {folder.isDefault && (
        <div className="mt-3">
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
            Default
          </span>
        </div>
      )}
    </div>
  );
};

const formatSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
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
