import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { toast } from 'react-hot-toast';

const FileSystemContext = createContext(null);

export const useFileSystem = () => useContext(FileSystemContext);

export const FileSystemProvider = ({ children }) => {
  const [currentFolder, setCurrentFolder] = useState(null); // null means root
  const [folderPath, setFolderPath] = useState([]);
  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selection, setSelection] = useState([]);
  const [viewMode, setViewMode] = useState('grid');

  // New state for special views
  const [currentView, setCurrentView] = useState('files'); // files, recent, starred, trash

  const refresh = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // Detect view based on URL is handled by the component using this context,
    // but the fetch logic needs to know what to fetch.
    // We can check window.location.pathname here or expose a method to set view.
    // Simpler: The FileBrowser component will call a "setView" or we check URL here.
    const path = window.location.pathname;
    if (path.includes('/dashboard/recent')) setCurrentView('recent');
    else if (path.includes('/dashboard/starred')) setCurrentView('starred');
    else if (path.includes('/dashboard/trash')) setCurrentView('trash');
    else setCurrentView('files');
  }, [window.location.pathname]);

  useEffect(() => {
    const fetchContents = async () => {
      if (!localStorage.getItem('accessToken')) return;

      setLoading(true);
      try {
        let endpoint = '/api/files';

        if (currentView === 'recent') endpoint = '/api/files/recent';
        else if (currentView === 'starred') endpoint = '/api/files/starred';
        else if (currentView === 'trash') endpoint = '/api/files/trash';

        const [filesRes, foldersRes] = await Promise.all([
             api.get(endpoint),
             // Only fetch folders if in normal file view
             currentView === 'files' ? api.get('/api/folders') : Promise.resolve({ data: [] })
        ]);

        let fetchedFiles = filesRes.data;
        let fetchedFolders = foldersRes.data;

        // Filter Logic
        if (currentView === 'files') {
            const currentFolderId = currentFolder ? currentFolder._id : null;
            fetchedFiles = fetchedFiles.filter(f => (f.folderId || null) === (currentFolderId || null) && !f.metadata.isTrashed);
            fetchedFolders = fetchedFolders.filter(f => (f.parent || null) === (currentFolderId || null));
        }
        // For recent/starred/trash, the backend usually returns the flat list we need.
        // We might need to ensure Trash items are not shown in Recent/Starred if backend doesn't filter them (Backend code looked like it handles it).

        setFiles(fetchedFiles);
        setFolders(fetchedFolders);

      } catch (error) {
        console.error("Error fetching file system:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchContents();
  }, [currentFolder, refreshTrigger, currentView]);

  const navigateToFolder = (folder) => {
      if (currentView !== 'files') {
          // If in special view, double clicking folder (if any) should probably switch to file view?
          // Or if we support hierarchy in Trash? (Usually flat).
          // Let's force switch to 'files' view if navigating.
          setCurrentView('files');
          // Update URL? The breadcrumb component uses this.
          // We need to sync with Router. Ideally this context is controlled BY the router.
          // But for now, let's just update state.
      }
      setCurrentFolder(folder);
      setSelection([]);
      if (folder) {
          const index = folderPath.findIndex(f => f._id === folder._id);
          if (index !== -1) {
              setFolderPath(prev => prev.slice(0, index + 1));
          } else {
              setFolderPath(prev => [...prev, folder]);
          }
      } else {
          setFolderPath([]);
      }
  };

  const createFolder = async (name) => {
      try {
          await api.post('/api/folders', {
              name,
              parent: currentFolder ? currentFolder._id : null
          });
          toast.success("Folder created");
          refresh();
      } catch (error) {
          toast.error("Failed to create folder");
      }
  };

  const toggleSelection = (id, multiSelect) => {
      if (multiSelect) {
          setSelection(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      } else {
          setSelection(prev => prev.includes(id) && prev.length === 1 ? [] : [id]);
      }
  };

  const deleteSelected = async () => {
      if (selection.length === 0) return;
      try {
          const selectedFiles = files.filter(f => selection.includes(f._id));
          const selectedFolders = folders.filter(f => selection.includes(f._id));

          if (currentView === 'trash') {
             // Permanent Delete or Restore?
             // We need separate actions for Trash view.
             // This default deleteSelected will act as "Move to Trash" for normal views.
             // For Trash view, we should probably have specific buttons "Restore" / "Delete Forever".
             // If we call this in Trash view, let's assume "Delete Forever".
              for (const file of selectedFiles) {
                  await api.delete(`/api/files/${file._id}/permanent`);
              }
              toast.success("Items deleted permanently");
          } else {
              // Move to Trash
              if (selectedFiles.length > 0) {
                 await api.post('/api/files/batch/delete', { ids: selectedFiles.map(f => f._id) });
              }
              for (const folder of selectedFolders) {
                  await api.delete(`/api/folders/${folder._id}`);
              }
              toast.success("Moved to Trash");
          }

          setSelection([]);
          refresh();
      } catch (error) {
          console.error(error);
          toast.error("Failed to delete items");
      }
  };

  return (
    <FileSystemContext.Provider value={{
      currentFolder,
      folderPath,
      files,
      folders,
      loading,
      selection,
      viewMode,
      setViewMode,
      navigateToFolder,
      createFolder,
      toggleSelection,
      deleteSelected,
      refresh,
      currentView,
      setCurrentView
    }}>
      {children}
    </FileSystemContext.Provider>
  );
};
