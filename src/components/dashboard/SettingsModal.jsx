// src/components/dashboard/SettingsModal.jsx - MATERIAL 3 EXPRESSIVE WITH SHARED LINKS
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Palette, 
  Sun, 
  Moon, 
  Monitor, 
  Link2, 
  Trash2, 
  Copy, 
  ExternalLink,
  Calendar,
  Eye,
  Share2
} from 'lucide-react';
import axios from 'axios';
import authService from '../../services/authService';
import { showToast, showConfirm } from '../Toast';

export const SettingsModal = ({ onClose, user, onThemeChange }) => {
  const [theme, setTheme] = useState('system');
  const [sharedLinks, setSharedLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLinks, setLoadingLinks] = useState(true);

  useEffect(() => {
    const savedTheme = user?.theme || localStorage.getItem('theme') || 'system';
    setTheme(savedTheme);
    loadSharedLinks();
  }, [user]);

  const loadSharedLinks = async () => {
    setLoadingLinks(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/shared-links`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Filter out expired and voided links
      const activeLinks = (response.data || []).filter(link => 
        !link.metadata?.shareVoided && 
        (!link.metadata?.shareExpires || new Date(link.metadata.shareExpires) > new Date())
      );
      
      setSharedLinks(activeLinks);
    } catch (error) {
      console.error('Load shared links error:', error);
      // If endpoint doesn't exist yet, show empty state
      setSharedLinks([]);
    } finally {
      setLoadingLinks(false);
    }
  };

  const handleThemeChange = async (newTheme) => {
    setTheme(newTheme);
    setLoading(true);

    try {
      // Update in backend
      await authService.updateProfile(user?.username, newTheme);
      
      // Update in localStorage
      localStorage.setItem('theme', newTheme);
      
      // Apply theme
      applyTheme(newTheme);
      
      // Notify parent
      if (onThemeChange) {
        onThemeChange(newTheme);
      }
      
      showToast('Theme updated successfully', 'success');
    } catch (error) {
      console.error('Theme update error:', error);
      showToast('Failed to update theme', 'error');
    } finally {
      setLoading(false);
    }
  };

  const applyTheme = (theme) => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // System preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const handleCopyLink = async (link) => {
    try {
      const fullUrl = `${import.meta.env.VITE_BACKEND_URL}/s/${link.metadata.shareId}`;
      await navigator.clipboard.writeText(fullUrl);
      showToast('Link copied to clipboard', 'success');
    } catch (error) {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleDeleteLink = async (link) => {
    const confirmed = await showConfirm(
      `Delete share link for "${link.metadata.filename}"? This will revoke access.`
    );
    
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('accessToken');
      await axios.delete(
        `${import.meta.env.VITE_BACKEND_URL}/api/files/share/${link._id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      showToast('Share link deleted', 'success');
      loadSharedLinks();
    } catch (error) {
      console.error('Delete link error:', error);
      showToast('Failed to delete link', 'error');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never expires';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Expires today';
    if (diffDays === 1) return 'Expires tomorrow';
    if (diffDays <= 7) return `Expires in ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const themeOptions = [
    {
      id: 'light',
      label: 'Light',
      icon: Sun,
      description: 'Light mode',
      gradient: 'from-yellow-400 to-orange-400'
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: Moon,
      description: 'Dark mode',
      gradient: 'from-indigo-500 to-purple-600'
    },
    {
      id: 'system',
      label: 'System',
      icon: Monitor,
      description: 'Match system',
      gradient: 'from-blue-500 to-cyan-500'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="bg-surface-container text-on-surface rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-secondary to-tertiary p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg">
              <Palette size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <p className="text-white/80 text-sm">Customize your experience</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Appearance Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette size={18} className="text-primary" />
              Appearance
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = theme === option.id;
                
                return (
                  <button
                    key={option.id}
                    onClick={() => handleThemeChange(option.id)}
                    disabled={loading}
                    className={`relative p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-lg'
                        : 'border-outline hover:border-outline-variant hover:bg-surface'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${option.gradient} flex items-center justify-center mb-3 mx-auto`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <p className="font-medium text-center">{option.label}</p>
                    <p className="text-xs text-on-surface-variant text-center mt-1">
                      {option.description}
                    </p>
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-2 right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center"
                      >
                        <svg className="w-4 h-4 text-on-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shared Links Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Share2 size={18} className="text-tertiary" />
                Shared Links
              </h3>
              <span className="text-sm text-on-surface-variant">
                {sharedLinks.length} active
              </span>
            </div>

            {loadingLinks ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : sharedLinks.length === 0 ? (
              <div className="text-center py-8">
                <Link2 size={48} className="mx-auto text-on-surface-variant/30 mb-3" />
                <p className="text-on-surface-variant">No active shared links</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  Share files to see them here
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sharedLinks.map((link) => (
                  <motion.div
                    key={link._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-surface rounded-xl p-4 border border-outline-variant hover:border-outline transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Link2 size={18} className="text-primary" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate" title={link.metadata.filename}>
                          {link.metadata.filename}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-on-surface-variant">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {formatDate(link.metadata.shareExpires)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => handleCopyLink(link)}
                          className="p-2 rounded-lg hover:bg-surface-container-highest transition-colors"
                          title="Copy link"
                        >
                          <Copy size={16} />
                        </button>
                        <button
                          onClick={() => window.open(`${import.meta.env.VITE_BACKEND_URL}/s/${link.metadata.shareId}`, '_blank')}
                          className="p-2 rounded-lg hover:bg-surface-container-highest transition-colors"
                          title="Open link"
                        >
                          <ExternalLink size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteLink(link)}
                          className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                          title="Delete link"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* About Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <h3 className="text-lg font-semibold mb-3">About</h3>
            <div className="space-y-2 text-sm text-on-surface-variant">
              <p>Airstream v3.0.0</p>
              <p>© {new Date().getFullYear()} Airstream. All rights reserved.</p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
