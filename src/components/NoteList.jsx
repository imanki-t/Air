// src/components/NoteList.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';
import NoteEditor from './NoteEditor';

const NoteList = ({ notes, onUpdate, loading }) => {
  const { isDark } = useTheme();
  const [showEditor, setShowEditor] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const handleDelete = async (noteId) => {
    const confirmed = window.confirm('Delete this note?');
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/api/notes/${noteId}`);
      onUpdate();
    } catch (error) {
      alert('Failed to delete note');
    }
  };

  const handleEdit = (note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleCreate = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className={`p-6 rounded-xl animate-pulse ${
            isDark ? 'bg-gray-800' : 'bg-gray-100'
          }`}>
            <div className={`h-6 w-3/4 rounded mb-3 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-4 w-full rounded mb-2 ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
            <div className={`h-4 w-5/6 rounded ${isDark ? 'bg-gray-700' : 'bg-gray-200'}`} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 flex justify-between items-center">
        <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Notes
        </h2>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          + New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className={`text-center py-12 rounded-xl border-2 border-dashed ${
          isDark ? 'border-gray-700 bg-gray-800/30' : 'border-gray-300 bg-gray-50'
        }`}>
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-500">No notes yet</h3>
          <p className="mt-2 text-sm text-gray-400">Create your first note to get started</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map(note => (
            <div
              key={note._id}
              className={`p-6 rounded-xl border transition-all hover:scale-105 cursor-pointer ${
                isDark ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
              style={{ borderLeft: `4px solid ${note.color}` }}
              onClick={() => handleEdit(note)}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className={`font-semibold text-lg flex-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {note.title}
                </h3>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(note._id);
                  }}
                  className="p-1.5 rounded-lg transition-colors text-red-500 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <p className={`text-sm line-clamp-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {note.content || 'No content'}
              </p>
              <div className={`mt-3 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {new Date(note.updatedAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEditor && (
        <NoteEditor
          note={editingNote}
          onSave={onUpdate}
          onClose={() => {
            setShowEditor(false);
            setEditingNote(null);
          }}
        />
      )}
    </>
  );
};

export default NoteList;
