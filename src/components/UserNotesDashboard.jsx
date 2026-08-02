import React, { useState, useEffect } from 'react';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const formatBytes = (bytes) => {
  if (bytes === null || bytes === undefined || isNaN(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Clean SVG Icons
const Icon = {
  Pin: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  PinSolid: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  Edit: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  Trash: ({ className = "w-3.5 h-3.5" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Plus: ({ className = "w-4 h-4" }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
};

const UserNotesDashboard = ({ user, darkMode }) => {
  const [stats, setStats] = useState({ fileCount: 0, storageUsed: 0, storageLimit: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Notes state
  const storageKey = `airstream_notes_${user?._id || user?.id || 'default'}`;
  const [notes, setNotes] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [
      { id: '1', text: 'Welcome to Airstream Cloud! Keep your important links & notes pinned here.', pinned: true, createdAt: new Date().toISOString() },
    ];
  });

  const [newNoteText, setNewNoteText] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');

  // Persist notes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notes));
    } catch (_) {}
  }, [notes, storageKey]);

  // Fetch drive stats
  useEffect(() => {
    if (!user) return;
    setLoadingStats(true);
    axios
      .get(`${BACKEND_URL}/api/auth/stats`, { withCredentials: true })
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Stats fetch error:', err))
      .finally(() => setLoadingStats(false));
  }, [user]);

  const appUsed = stats.storageUsed || 0;
  const driveLimit = stats.driveQuota?.limit || stats.storageLimit || 5368709120000;
  const driveTotal = stats.driveQuota?.usage || 0;

  // Note actions
  const addNote = (e) => {
    e?.preventDefault();
    if (!newNoteText.trim()) return;
    const newNote = {
      id: Date.now().toString(),
      text: newNoteText.trim(),
      pinned: false,
      createdAt: new Date().toISOString(),
    };
    setNotes([newNote, ...notes]);
    setNewNoteText('');
  };

  const deleteNote = (id) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const togglePin = (id) => {
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n))
    );
  };

  const startEditing = (note) => {
    setEditingId(note.id);
    setEditText(note.text);
  };

  const saveEdit = (id) => {
    if (!editText.trim()) return;
    setNotes(
      notes.map((n) => (n.id === id ? { ...n, text: editText.trim() } : n))
    );
    setEditingId(null);
    setEditText('');
  };

  // Sort notes: pinned first, then newest
  const sortedNotes = [...notes].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div
      className={`h-full flex flex-col justify-between rounded-2xl p-5 sm:p-6 shadow-xl border transition-all duration-300 ${
        darkMode ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-gray-200 text-gray-900 shadow-gray-200/50'
      }`}
    >
      {/* ── User Profile Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="w-11 h-11 rounded-full border-2 border-blue-500/40 object-cover flex-shrink-0"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-base flex items-center justify-center flex-shrink-0 shadow-md">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm sm:text-base truncate">{user?.name || 'User Profile'}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 uppercase tracking-wider shrink-0">
                Connected
              </span>
            </div>
            <p className={`text-xs truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{user?.email}</p>
          </div>
        </div>

        {/* Drive Storage Pill */}
        <div className={`hidden sm:flex flex-col items-end px-3 py-1.5 rounded-xl border text-right ${
          darkMode ? 'bg-slate-950/60 border-white/10' : 'bg-gray-50 border-gray-200'
        }`}>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-400">Drive Storage</span>
          <span className="text-xs font-bold font-mono">
            {formatBytes(driveTotal)} / {formatBytes(driveLimit)}
          </span>
        </div>
      </div>

      {/* ── Pinned Quick Notes Notepad ── */}
      <div className="flex-1 flex flex-col min-h-0 justify-between">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Icon.Pin className="w-4 h-4 text-blue-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-blue-400">Pinned Quick Notes</h4>
          </div>
          <span className={`text-[11px] font-mono ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Add Note Form */}
        <form onSubmit={addNote} className="flex items-center gap-2 mb-3 flex-shrink-0">
          <input
            type="text"
            placeholder="Write a quick note or pin important text..."
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            className={`flex-1 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border outline-none transition-all ${
              darkMode
                ? 'bg-slate-950/60 border-white/15 text-white placeholder-gray-500 focus:border-blue-500'
                : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600'
            }`}
          />
          <button
            type="submit"
            disabled={!newNoteText.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-md disabled:opacity-40 shrink-0 flex items-center gap-1.5"
          >
            <Icon.Plus className="w-3.5 h-3.5" />
            Add Note
          </button>
        </form>

        {/* Notes List (No empty text when empty) */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar min-h-0">
          {sortedNotes.map((note) => (
            <div
              key={note.id}
              className={`p-2.5 rounded-xl border transition-all flex items-start justify-between gap-2.5 ${
                note.pinned
                  ? darkMode
                    ? 'bg-blue-950/40 border-blue-500/40 shadow-sm'
                    : 'bg-blue-50/80 border-blue-300 shadow-sm'
                  : darkMode
                  ? 'bg-slate-950/40 border-white/10'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              {editingId === note.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit(note.id)}
                    autoFocus
                    className={`flex-1 px-2.5 py-1 rounded-lg text-xs border outline-none ${
                      darkMode ? 'bg-slate-900 border-blue-500 text-white' : 'bg-white border-blue-600 text-gray-900'
                    }`}
                  />
                  <button
                    onClick={() => saveEdit(note.id)}
                    className="px-2.5 py-1 bg-green-600 text-white text-[11px] font-bold rounded-lg hover:bg-green-500"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed break-words font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                    {note.text}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => togglePin(note.id)}
                  title={note.pinned ? 'Unpin note' : 'Pin note to top'}
                  className={`p-1.5 rounded-lg transition-colors ${
                    note.pinned
                      ? 'text-amber-400 bg-amber-400/20'
                      : darkMode
                      ? 'text-gray-400 hover:text-white hover:bg-white/10'
                      : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {note.pinned ? <Icon.PinSolid className="w-3.5 h-3.5 text-amber-400" /> : <Icon.Pin className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => startEditing(note)}
                  title="Edit note"
                  className={`p-1.5 rounded-lg transition-colors ${
                    darkMode ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon.Edit />
                </button>
                <button
                  onClick={() => deleteNote(note.id)}
                  title="Delete note"
                  className={`p-1.5 rounded-lg transition-colors ${
                    darkMode ? 'text-red-400 hover:bg-red-900/30' : 'text-red-500 hover:bg-red-100'
                  }`}
                >
                  <Icon.Trash />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UserNotesDashboard;
