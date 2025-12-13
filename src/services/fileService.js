// src/services/fileService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api/files';

class FileService {
  // Upload file
  async uploadFile(formData, onProgress) {
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress
    });
    return response.data;
  }

  // Get all files
  async getFiles(folderId = null) {
    const url = folderId ? `${API_URL}?folderId=${folderId}` : API_URL;
    const response = await axios.get(url);
    return response.data;
  }

  // Get file by ID
  async getFile(id) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data;
  }

  // Download file
  async downloadFile(id) {
    const response = await axios.get(`${API_URL}/download/${id}`, {
      responseType: 'blob'
    });
    return response.data;
  }

  // Delete file
  async deleteFile(id) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  }

  // Move file to folder
  async moveFile(id, folderId) {
    const response = await axios.put(`${API_URL}/${id}/move`, { folderId });
    return response.data;
  }

  // Star/unstar file
  async toggleStar(id) {
    const response = await axios.put(`${API_URL}/${id}/star`);
    return response.data;
  }

  // Get starred files
  async getStarredFiles() {
    const response = await axios.get(`${API_URL}/starred`);
    return response.data;
  }

  // Get recent files
  async getRecentFiles(limit = 20) {
    const response = await axios.get(`${API_URL}/recent?limit=${limit}`);
    return response.data;
  }

  // Move to trash
  async moveToTrash(id) {
    const response = await axios.put(`${API_URL}/${id}/trash`);
    return response.data;
  }

  // Restore from trash
  async restoreFromTrash(id) {
    const response = await axios.put(`${API_URL}/${id}/restore`);
    return response.data;
  }

  // Get trash files
  async getTrashFiles() {
    const response = await axios.get(`${API_URL}/trash`);
    return response.data;
  }

  // Permanently delete file
  async permanentlyDelete(id) {
    const response = await axios.delete(`${API_URL}/${id}/permanent`);
    return response.data;
  }

  // Empty trash
  async emptyTrash() {
    const response = await axios.delete(`${API_URL}/trash/empty`);
    return response.data;
  }

  // Generate share link with options
  async generateShareLink(id, options = {}) {
    const response = await axios.post(`${API_URL}/share/${id}`, options);
    return response.data;
  }

  // Get shared file
  async getSharedFile(shareId) {
    const response = await axios.get(`${API_URL}/share/${shareId}`);
    return response.data;
  }

  // Revoke share link
  async revokeShareLink(id) {
    const response = await axios.delete(`${API_URL}/share/${id}`);
    return response.data;
  }

  // Search files
  async searchFiles(query) {
    const response = await axios.get(`${API_URL}/search?q=${encodeURIComponent(query)}`);
    return response.data;
  }

  // Get file preview URL
  getPreviewUrl(id) {
    return `${API_URL}/preview/${id}`;
  }

  // Batch operations
  async batchDelete(ids) {
    const response = await axios.post(`${API_URL}/batch/delete`, { ids });
    return response.data;
  }

  async batchMove(ids, folderId) {
    const response = await axios.post(`${API_URL}/batch/move`, { ids, folderId });
    return response.data;
  }

  async batchStar(ids) {
    const response = await axios.post(`${API_URL}/batch/star`, { ids });
    return response.data;
  }

  async batchTrash(ids) {
    const response = await axios.post(`${API_URL}/batch/trash`, { ids });
    return response.data;
  }

  // Get storage statistics
  async getStorageStats() {
    const response = await axios.get(`${API_URL}/storage/stats`);
    return response.data;
  }
}

export default new FileService();
