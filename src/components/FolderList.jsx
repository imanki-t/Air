// src/components/FolderList.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const FolderList = ({ folders, onUpdate, loading, onSelectFolder }) => {
  const { isDark } = useTheme();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState(null);
  const [formData, setFormData] = useState({ name: '', color: '#3b82f6' });
  const [submitting, setSubmitting] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const colors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#ec4899', '#6b7280'
  ];

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (editingFolder) {
        await axios.put(`${API_URL}/api/folders/${editingFolder._id}`, formData);
      } else {
        await axios.post(`${API_URL}/api/folders`, formData);
      }
      setShowCreateModal(false);
      setEditingFolder(null);
      setFormData({ name: '', color: '#3b82f6' });
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (folder) => {
    if (folder.isDefault) {
      alert('Cannot delete default folders');
      return;
    }

    const confirmed = window.confirm(`Delete folder "${folder.name}"?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/api/folders/${folder._id}`);
      onUpdate();
    } catch (error) {
      alert(error.response?.data?.error || 'Delete failed');
    }
  };

  const handleEdit = (folder) => {
    setEditingFolder(folder);
    setFormData({ name: folder.name, color: folder.color });
    setShowCreateModal(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`p-6 rounded-xl animate-pulse ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <div className={`h-6 w-3/4 rounded mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-4 w-1/2 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Folders
        </h2>
        <button
          onClick={() => {
            setEditingFolder(null);
            setFormData({ name: '', color: '#3b82f6' });
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + New Folder
        </button>
      </div>

      {folders.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
          isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
        }`}>
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-500">No folders yet</h3>
          <p className="mt-2 text-sm text-gray-400">Create your first folder to organize files</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map(folder => (
            <div
              key={folder._id}
              className={`p-6 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
                isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => onSelectFolder && onSelectFolder(folder._id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: folder.color + '20' }}
                  >
                    <svg
                      className="w-6 h-6"
                      style={{ color: folder.color }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      {folder.name}
                    </h3>
                    {folder.isDefault && (
                      <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        Default
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(folder)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isDark ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  {!folder.isDefault && (
                    <button
                      onClick={() => handleDelete(folder)}
                      className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {folder.fileCount || 0} files
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className={`max-w-md w-full rounded-xl p-6 ${
            isDark ? 'bg-gray-900' : 'bg-white'
          }`}>
            <h3 className={`text-xl font-semibold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {editingFolder ? 'Edit Folder' : 'Create New Folder'}
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Folder Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  placeholder="Enter folder name"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Color
                </label>
                <div className="flex gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        formData.color === color ? 'border-white scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : editingFolder ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingFolder(null);
                    setFormData({ name: '', color: '#3b82f6' });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isDark
                      ? 'bg-gray-800 hover:bg-gray-700 text-white'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FolderList;
