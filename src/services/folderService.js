// src/services/folderService.js
import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL + '/api/folders';

class FolderService {
  async getFolders() {
    const response = await axios.get(API_URL);
    return response.data.folders;
  }

  async getFolderTree() {
    const response = await axios.get(`${API_URL}/tree`);
    return response.data.tree;
  }

  async getFolder(id) {
    const response = await axios.get(`${API_URL}/${id}`);
    return response.data.folder;
  }

  async createFolder(name, parent = null, color = '#3b82f6') {
    const response = await axios.post(API_URL, {
      name,
      parent,
      color
    });
    return response.data.folder;
  }

  async updateFolder(id, data) {
    const response = await axios.put(`${API_URL}/${id}`, data);
    return response.data.folder;
  }

  async deleteFolder(id) {
    const response = await axios.delete(`${API_URL}/${id}`);
    return response.data;
  }

  async getFolderStats(id) {
    const response = await axios.get(`${API_URL}/${id}/stats`);
    return response.data.stats;
  }
}

export default new FolderService();
