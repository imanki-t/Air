// src/services/fileService.js - FRONTEND SERVICE
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

// Create axios instance with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('accessToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`
    }
  };
};

const fileService = {
  /**
   * Get files (optionally filtered by folder)
   */
  async getFiles(folderId = null) {
    try {
      const params = folderId ? { folderId } : {};
      const response = await axios.get(`${API_URL}/api/files`, {
        ...getAuthHeaders(),
        params
      });
      return response.data;
    } catch (error) {
      console.error('Get files error:', error);
      throw error;
    }
  },

  /**
   * Get recent files
   */
  async getRecentFiles(limit = 20) {
    try {
      const response = await axios.get(`${API_URL}/api/files/recent`, {
        ...getAuthHeaders(),
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Get recent files error:', error);
      throw error;
    }
  },

  /**
   * Get starred files
   */
  async getStarredFiles() {
    try {
      const response = await axios.get(`${API_URL}/api/files/starred`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get starred files error:', error);
      throw error;
    }
  },

  /**
   * Get trash files
   */
  async getTrashFiles() {
    try {
      const response = await axios.get(`${API_URL}/api/files/trash`, getAuthHeaders());
      return response.data;
    } catch (error) {
      console.error('Get trash files error:', error);
      throw error;
    }
  },

  /**
   * Toggle star status
   */
  async toggleStar(fileId) {
    try {
      const response = await axios.put(
        `${API_URL}/api/files/${fileId}/star`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Toggle star error:', error);
      throw error;
    }
  },

  /**
   * Move file to trash
   */
  async moveToTrash(fileId) {
    try {
      const response = await axios.put(
        `${API_URL}/api/files/${fileId}/trash`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Move to trash error:', error);
      throw error;
    }
  },

  /**
   * Restore file from trash
   */
  async restoreFromTrash(fileId) {
    try {
      const response = await axios.put(
        `${API_URL}/api/files/${fileId}/restore`,
        {},
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Restore from trash error:', error);
      throw error;
    }
  },

  /**
   * Permanently delete file
   */
  async permanentlyDelete(fileId) {
    try {
      const response = await axios.delete(
        `${API_URL}/api/files/${fileId}/permanent`,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Permanent delete error:', error);
      throw error;
    }
  },

  /**
   * Download file
   */
  async downloadFile(fileId) {
    try {
      const response = await axios.get(
        `${API_URL}/api/files/download/${fileId}`,
        {
          ...getAuthHeaders(),
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      console.error('Download file error:', error);
      throw error;
    }
  },

  /**
   * Get preview URL for file
   */
  getPreviewUrl(fileId) {
    const token = localStorage.getItem('accessToken');
    return `${API_URL}/api/files/preview/${fileId}?token=${token}`;
  },

  /**
   * Generate share link
   */
  async generateShareLink(fileId, options = {}) {
    try {
      const response = await axios.post(
        `${API_URL}/api/files/share/${fileId}`,
        options,
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Generate share link error:', error);
      throw error;
    }
  },

  /**
   * Upload file
   */
  async uploadFile(file, folderId = null, onProgress = null) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) {
        formData.append('folderId', folderId);
      }

      const response = await axios.post(
        `${API_URL}/api/files/upload`,
        formData,
        {
          ...getAuthHeaders(),
          headers: {
            ...getAuthHeaders().headers,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            if (onProgress && progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(percentCompleted);
            }
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Upload file error:', error);
      throw error;
    }
  },

  /**
   * Batch operations
   */
  async batchDelete(fileIds) {
    try {
      const response = await axios.post(
        `${API_URL}/api/files/batch/delete`,
        { ids: fileIds },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Batch delete error:', error);
      throw error;
    }
  },

  async batchStar(fileIds) {
    try {
      const response = await axios.post(
        `${API_URL}/api/files/batch/star`,
        { ids: fileIds },
        getAuthHeaders()
      );
      return response.data;
    } catch (error) {
      console.error('Batch star error:', error);
      throw error;
    }
  }
};

export default fileService;
