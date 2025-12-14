import React, { createContext, useContext, useReducer, useCallback } from 'react';

const FileContext = createContext();

export const useFileContext = () => {
  const context = useContext(FileContext);
  if (!context) {
    throw new Error('useFileContext must be used within a FileProvider');
  }
  return context;
};

// Initial State
const initialState = {
  files: [], // Array of all file objects
  folders: [], // Array of all folder objects
  currentFolder: null, // The current folder object (null for root)
  loading: false, // Loading state for async operations
  error: null, // Error message if any
  view: 'grid', // 'grid' or 'list'
  sort: { field: 'updatedAt', direction: 'desc' }, // Sorting configuration
  filter: '', // Search/Filter string
  breadcrumbs: [], // Navigation path
  storageStats: null, // Storage usage data
  selectedIds: [], // Global selection state
};

// Action Types
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  SET_DATA: 'SET_DATA',
  SET_ERROR: 'SET_ERROR',
  SET_VIEW: 'SET_VIEW',
  SET_SORT: 'SET_SORT',
  SET_FILTER: 'SET_FILTER',
  NAVIGATE_FOLDER: 'NAVIGATE_FOLDER',
  ADD_FILE: 'ADD_FILE',
  REMOVE_FILE: 'REMOVE_FILE',
  UPDATE_FILE: 'UPDATE_FILE',
  ADD_FOLDER: 'ADD_FOLDER',
  REMOVE_FOLDER: 'REMOVE_FOLDER',
  UPDATE_FOLDER: 'UPDATE_FOLDER',
  SET_STORAGE_STATS: 'SET_STORAGE_STATS',
  SET_SELECTION: 'SET_SELECTION',
};

// Reducer
const fileReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_DATA:
      return {
        ...state,
        files: action.payload.files || [],
        folders: action.payload.folders || [],
        loading: false,
        error: null,
      };

    case ACTIONS.SET_ERROR:
      return { ...state, loading: false, error: action.payload };

    case ACTIONS.SET_VIEW:
      return { ...state, view: action.payload };

    case ACTIONS.SET_SORT:
      return { ...state, sort: action.payload };

    case ACTIONS.SET_FILTER:
      return { ...state, filter: action.payload };

    case ACTIONS.NAVIGATE_FOLDER:
      return {
        ...state,
        currentFolder: action.payload.folder,
        breadcrumbs: action.payload.breadcrumbs,
        loading: true, // Usually triggers a fetch
      };

    case ACTIONS.ADD_FILE:
      return { ...state, files: [action.payload, ...state.files] };

    case ACTIONS.REMOVE_FILE:
      return { ...state, files: state.files.filter(f => f._id !== action.payload) };

    case ACTIONS.UPDATE_FILE:
      return {
        ...state,
        files: state.files.map(f => f._id === action.payload._id ? action.payload : f),
      };

    case ACTIONS.ADD_FOLDER:
      return { ...state, folders: [action.payload, ...state.folders] };

    case ACTIONS.REMOVE_FOLDER:
      return { ...state, folders: state.folders.filter(f => f._id !== action.payload) };

    case ACTIONS.UPDATE_FOLDER:
        return {
          ...state,
          folders: state.folders.map(f => f._id === action.payload._id ? action.payload : f),
        };

    case ACTIONS.SET_STORAGE_STATS:
      return { ...state, storageStats: action.payload };

    case ACTIONS.SET_SELECTION:
      return { ...state, selectedIds: action.payload };

    default:
      return state;
  }
};

export const FileProvider = ({ children }) => {
  const [state, dispatch] = useReducer(fileReducer, initialState);

  // Helper dispatchers
  const setLoading = useCallback((isLoading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: isLoading });
  }, []);

  const setData = useCallback((files, folders) => {
    dispatch({ type: ACTIONS.SET_DATA, payload: { files, folders } });
  }, []);

  const setError = useCallback((error) => {
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });
  }, []);

  const setView = useCallback((view) => {
    dispatch({ type: ACTIONS.SET_VIEW, payload: view });
  }, []);

  const setSort = useCallback((field, direction) => {
    dispatch({ type: ACTIONS.SET_SORT, payload: { field, direction } });
  }, []);

  const setFilter = useCallback((query) => {
    dispatch({ type: ACTIONS.SET_FILTER, payload: query });
  }, []);

  const navigateFolder = useCallback((folder, breadcrumbs = []) => {
    dispatch({ type: ACTIONS.NAVIGATE_FOLDER, payload: { folder, breadcrumbs } });
  }, []);

  // CRUD Helpers (Optimistic UI updates)
  const addFile = useCallback((file) => {
    dispatch({ type: ACTIONS.ADD_FILE, payload: file });
  }, []);

  const removeFile = useCallback((fileId) => {
    dispatch({ type: ACTIONS.REMOVE_FILE, payload: fileId });
  }, []);

  const updateFile = useCallback((file) => {
    dispatch({ type: ACTIONS.UPDATE_FILE, payload: file });
  }, []);

  const addFolder = useCallback((folder) => {
    dispatch({ type: ACTIONS.ADD_FOLDER, payload: folder });
  }, []);

  const removeFolder = useCallback((folderId) => {
    dispatch({ type: ACTIONS.REMOVE_FOLDER, payload: folderId });
  }, []);

  const updateFolder = useCallback((folder) => {
    dispatch({ type: ACTIONS.UPDATE_FOLDER, payload: folder });
  }, []);

  const setStorageStats = useCallback((stats) => {
    dispatch({ type: ACTIONS.SET_STORAGE_STATS, payload: stats });
  }, []);

  const setSelection = useCallback((ids) => {
    dispatch({ type: ACTIONS.SET_SELECTION, payload: ids });
  }, []);

  const value = {
    ...state,
    setLoading,
    setData,
    setError,
    setView,
    setSort,
    setFilter,
    navigateFolder,
    addFile,
    removeFile,
    updateFile,
    addFolder,
    removeFolder,
    updateFolder,
    setStorageStats,
    setSelection,
  };

  return (
    <FileContext.Provider value={value}>
      {children}
    </FileContext.Provider>
  );
};
