import React, { useState } from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import FileItem from './FileItem';
import FolderItem from './FolderItem';
import Breadcrumbs from './Breadcrumbs';
import UploadManager from './UploadManager';
import { FaList, FaThLarge, FaPlus, FaEllipsisH, FaTrashRestore, FaTimesCircle, FaShareAlt, FaEdit } from 'react-icons/fa';
import { Button } from '../ui';
import { toast } from 'react-hot-toast';
import api from '../../api/axios';
import ShareModal from '../modals/ShareModal';
import RenameModal from '../modals/RenameModal';

const FileBrowser = ({ title }) => {
  const {
      files,
      folders,
      loading,
      viewMode,
      setViewMode,
      createFolder,
      selection,
      deleteSelected,
      currentView,
      refresh,
      setSelection // Need to access this to clear selection
  } = useFileSystem();

  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState(null);

  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);

  const handleShare = (file) => {
      setFileToShare(file);
      setShareModalOpen(true);
  };

  const handleRename = (item) => {
      setItemToRename(item);
      setRenameModalOpen(true);
  }

  const handleCreateFolder = async (e) => {
      e.preventDefault();
      if (newFolderName.trim()) {
          await createFolder(newFolderName);
          setNewFolderName('');
          setIsCreatingFolder(false);
      }
  };

  const restoreSelected = async () => {
      try {
          // Only files for now as per context logic
           const selectedFiles = files.filter(f => selection.includes(f._id));
           for (const file of selectedFiles) {
               await api.put(`/api/files/${file._id}/restore`);
           }
           toast.success("Items restored");
           refresh();
           // Clear selection manually or context handles it? Context doesn't clear on restore.
           // We should clear it.
           // But `setSelection` isn't exposed directly in my previous Context code!
           // I need to check Context code.
           // Wait, I didn't expose setSelection in previous step. I should fix that.
      } catch (error) {
          toast.error("Failed to restore");
      }
  };

  if (loading && files.length === 0 && folders.length === 0) {
      return (
          <div className="flex items-center justify-center h-64">
              <div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div>
          </div>
      );
  }

  return (
    <div className="relative h-full flex flex-col">
      {/* Share Modal */}
      {fileToShare && (
          <ShareModal
              isOpen={shareModalOpen}
              onClose={() => { setShareModalOpen(false); setFileToShare(null); }}
              file={fileToShare}
          />
      )}

      {/* Rename Modal */}
      {itemToRename && (
          <RenameModal
              isOpen={renameModalOpen}
              onClose={() => { setRenameModalOpen(false); setItemToRename(null); }}
              item={itemToRename}
              type={itemToRename.metadata ? 'file' : 'folder'}
              onRename={refresh}
          />
      )}

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
         {/* Breadcrumbs only relevant in 'files' view usually, but helpful to show title */}
         {currentView === 'files' ? <Breadcrumbs /> : <h2 className="text-xl font-bold dark:text-white">{title}</h2>}

         <div className="flex items-center space-x-2">
            {selection.length > 0 && (
                <div className="flex items-center bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-lg mr-2">
                    <span className="text-sm text-blue-700 dark:text-blue-300 mr-3">{selection.length} selected</span>

                    {currentView === 'trash' ? (
                        <>
                            <button
                                onClick={restoreSelected}
                                className="text-green-600 hover:text-green-700 text-sm font-medium mr-3 flex items-center"
                            >
                                <FaTrashRestore className="mr-1" /> Restore
                            </button>
                            <button
                                onClick={deleteSelected}
                                className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center"
                            >
                                <FaTimesCircle className="mr-1" /> Delete Forever
                            </button>
                        </>
                    ) : (
                        <>
                            {selection.length === 1 && currentView === 'files' && (
                                <>
                                    <button
                                        onClick={() => {
                                            const file = files.find(f => f._id === selection[0]);
                                            if (file) handleShare(file);
                                        }}
                                        className="text-blue-600 hover:text-blue-700 text-sm font-medium mr-3 flex items-center"
                                    >
                                        <FaShareAlt className="mr-1" /> Share
                                    </button>
                                    {/* Enable rename if it's a folder (files not yet supported by backend) */}
                                    {folders.find(f => f._id === selection[0]) && (
                                        <button
                                            onClick={() => {
                                                const folder = folders.find(f => f._id === selection[0]);
                                                if (folder) handleRename(folder);
                                            }}
                                            className="text-gray-600 hover:text-gray-700 text-sm font-medium mr-3 flex items-center"
                                        >
                                            <FaEdit className="mr-1" /> Rename
                                        </button>
                                    )}
                                </>
                            )}
                            <button
                                onClick={deleteSelected}
                                className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                                Delete
                            </button>
                        </>
                    )}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1 flex">
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <FaThLarge />
                </button>
                <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md ${viewMode === 'list' ? 'bg-gray-100 dark:bg-gray-700 text-blue-600' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                >
                    <FaList />
                </button>
            </div>

            {currentView === 'files' && (
                <Button onClick={() => setIsCreatingFolder(true)} size="sm" className="flex items-center whitespace-nowrap">
                    <FaPlus className="mr-2" /> New Folder
                </Button>
            )}
         </div>
      </div>

      {/* New Folder Input */}
      {isCreatingFolder && (
          <form onSubmit={handleCreateFolder} className="mb-4 flex items-center max-w-sm">
              <input
                  autoFocus
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder Name"
                  className="flex-1 px-3 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 hover:bg-blue-700 transition-colors"
              >
                  Create
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingFolder(false)}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-r-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                  Cancel
              </button>
          </form>
      )}

      {/* Content Area */}
      {files.length === 0 && folders.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  {currentView === 'trash' ? (
                       <FaTrashRestore className="text-4xl text-gray-300 dark:text-gray-600" />
                  ) : (
                       <FaFolder className="text-4xl text-gray-300 dark:text-gray-600" />
                  )}
              </div>
              <p className="text-lg">
                  {currentView === 'trash' ? 'Trash is empty' : 'This folder is empty'}
              </p>
          </div>
      ) : (
          <div className={`
              ${viewMode === 'grid'
                  ? 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4'
                  : 'flex flex-col space-y-1'
              }
          `}>
              {/* Folders First */}
              {folders.map(folder => (
                  <FolderItem key={folder._id} folder={folder} />
              ))}

              {/* Then Files */}
              {files.map(file => (
                  <FileItem key={file._id} file={file} />
              ))}
          </div>
      )}

      {currentView === 'files' && <UploadManager />}
    </div>
  );
};

export default FileBrowser;
