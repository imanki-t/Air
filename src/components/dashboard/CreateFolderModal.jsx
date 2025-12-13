import React, { useState } from 'react';
import { motion } from 'framer-motion';

export const CreateFolderModal = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6'); // Default primary blue
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const colors = [
    '#3b82f6', // Blue
    '#10b981', // Emerald
    '#f59e0b', // Amber
    '#8b5cf6', // Violet
    '#ef4444', // Red
    '#ec4899', // Pink
    '#14b8a6', // Teal
    '#f97316'  // Orange
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await onCreate({ name, color });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create folder');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card text-card-foreground border border-border rounded-lg shadow-lg max-w-md w-full p-6"
      >
        <h2 className="text-xl font-semibold mb-4">Create New Folder</h2>
        
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Folder Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input placeholder:text-muted-foreground transition-shadow"
              placeholder="Enter folder name"
              required
              autoFocus
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">
              Color Label
            </label>
            <div className="flex flex-wrap gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-all ${color === c ? 'ring-2 ring-offset-2 ring-ring scale-110' : 'hover:scale-105 opacity-80 hover:opacity-100'}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50 shadow-sm"
            >
              {loading ? 'Creating...' : 'Create Folder'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
