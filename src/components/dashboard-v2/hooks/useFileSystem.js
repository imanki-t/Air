import { useState, useCallback, useEffect } from 'react';
import { useFileContext } from '../context/FileContext';
import fileService from '../../../services/fileService';
import folderService from '../../../services/folderService';

/**
 * Custom Hook for File System Operations
 */
export const useFileSystem = () => {
  const {
    files,
    folders,
    currentFolder,
    setLoading,
    setData,
    setError,
    navigateFolder,
    addFile,
    removeFile,
    updateFile,
    addFolder,
    removeFolder,
    updateFolder,
    setStorageStats
  } = useFileContext();

  // Fetch all data (Client-side filtering approach as per requirement)
  const refreshData = useCallback(async (folderId = null) => {
    setLoading(true);
    try {
      const [fetchedFiles, fetchedFolders] = await Promise.all([
        fileService.getFiles(folderId),
        folderService.getFolders() // This fetches ALL folders, we filter client side
      ]);

      setData(fetchedFiles, fetchedFolders);

      // Update storage stats
      try {
        const stats = await fileService.getStorageStats();
        setStorageStats(stats);
      } catch (e) {
        console.warn('Failed to fetch stats', e);
      }

    } catch (err) {
      console.error('File System Error:', err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setLoading, setData, setError, setStorageStats]);

  // Navigate to a specific folder
  const openFolder = useCallback((folder) => {
    const buildBreadcrumbs = (targetFolder, allFolders) => {
        const crumbs = [];
        let current = targetFolder;
        while (current) {
            crumbs.unshift({ id: current._id, name: current.name });
            if (current.parent) {
                current = allFolders.find(f => f._id === current.parent);
            } else {
                current = null;
            }
        }
        return crumbs;
    };

    const breadcrumbs = folder ? buildBreadcrumbs(folder, folders) : [];

    navigateFolder(folder, breadcrumbs);
    refreshData(folder?._id);

  }, [folders, navigateFolder, refreshData]);

  // Create New Folder
  const createNewFolder = useCallback(async (name, color) => {
    try {
      const parentId = currentFolder ? currentFolder._id : null;
      const newFolder = await folderService.createFolder(name, parentId, color);
      addFolder(newFolder);
      return newFolder;
    } catch (err) {
      throw err;
    }
  }, [currentFolder, addFolder]);

  // Upload File logic is handled in useUploader, but here is the completion handler
  const handleUploadSuccess = useCallback((fileData) => {
    addFile(fileData);
    // Update stats
    fileService.getStorageStats().then(setStorageStats).catch(() => {});
  }, [addFile, setStorageStats]);

  // Delete Items (Batch or Single)
  const deleteItems = useCallback(async (fileIds = [], folderIds = []) => {
    try {
      // Optimistic Update
      fileIds.forEach(id => removeFile(id));
      folderIds.forEach(id => removeFolder(id));

      // Server Requests
      if (fileIds.length > 0) await fileService.batchTrash(fileIds);
      // Folder batch delete might not exist in service, loop them
      for (const id of folderIds) {
        await folderService.deleteFolder(id);
      }

      // Refresh stats
      const stats = await fileService.getStorageStats();
      setStorageStats(stats);

    } catch (err) {
      // Revert would go here in a robust system
      console.error('Delete failed', err);
      refreshData(currentFolder?._id); // Force sync
      throw err;
    }
  }, [removeFile, removeFolder, currentFolder, refreshData, setStorageStats]);

  // Star/Unstar
  const toggleStar = useCallback(async (file) => {
    try {
        const updatedFile = { ...file, isStarred: !file.isStarred };
        updateFile(updatedFile); // Optimistic
        await fileService.toggleStar(file._id);
    } catch (err) {
        updateFile(file); // Revert
        console.error('Star failed', err);
    }
  }, [updateFile]);

  // Rename File
  const renameFile = useCallback(async (fileId, newName) => {
      console.warn("Rename file API not explicitly confirmed.");
  }, []);


  return {
    refreshData,
    openFolder,
    createNewFolder,
    handleUploadSuccess,
    deleteItems,
    toggleStar,
    renameFile
  };
};
