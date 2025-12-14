// src/components/NoteEditor.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const NoteEditor = ({ note, onSave, onClose }) => {
  const { isDark } = useTheme();
  const [formData, setFormData] = useState({
    title: note?.title || '',
    content: note?.content || '',
    color: note?.color || '#fbbf24'
  });

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const colors = [
    '#fbbf24', '#ef4444', '#10b981', '#3b82f6',
    '#8b5cf6', '#ec4899', '#6b7280'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (note?._id) {
        await axios.put(`${API_URL}/api/notes/${note._id}`, formData);
      } else {
        await axios.post(`${API_URL}/api/notes`, formData);
      }
      onSave();
      onClose();
    } catch (error) {
      alert('Failed to save note');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className={`max-w-2xl w-full mx-4 rounded-xl p-6 ${
        isDark ? 'bg-gray-900' : 'bg-white'
      }`}>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Note title"
            value={formData.title}
            onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            className={`w-full px-4 py-2 mb-4 rounded-lg border ${
              isDark 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300'
            }`}
            required
          />
          
          <textarea
            placeholder="Note content"
            value={formData.content}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            rows={10}
            className={`w-full px-4 py-2 mb-4 rounded-lg border ${
              isDark 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300'
            }`}
          />

          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              {colors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className={`w-8 h-8 rounded-full border-2 ${
                    formData.color === color ? 'border-gray-900' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2 rounded-lg ${
                isDark 
                  ? 'bg-gray-800 hover:bg-gray-700 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NoteEditor;
