// src/components/dashboard/ProfileModal.jsx - MATERIAL 3 EXPRESSIVE
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Edit2, Check, Mail, Calendar, HardDrive, Shield, AlertTriangle } from 'lucide-react';
import authService from '../../services/authService';
import { showToast, showConfirm } from '../Toast';

export const ProfileModal = ({ user, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    
    if (username.length < 3) {
      showToast('Username must be at least 3 characters', 'error');
      return;
    }

    setLoading(true);
    try {
      const response = await authService.updateProfile(username, user?.theme);
      onUpdate(response.user);
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword.length < 8) {
      showToast('Password must be at least 8 characters', 'error');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      showToast('Password must contain uppercase, lowercase, and number', 'error');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      showToast('Password changed successfully! Please log in again.', 'success');
      setTimeout(() => {
        authService.logout();
        window.location.href = '/auth/login';
      }, 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAccountDeletion = async () => {
    const confirmed = await showConfirm(
      'This will send a confirmation email. You must click the link to permanently delete your account and all data. Continue?'
    );
    
    if (!confirmed) return;

    setLoading(true);
    try {
      await authService.requestAccountDeletion();
      showToast('Account deletion confirmation email sent! Check your inbox.', 'success');
      setTimeout(() => setShowDeleteConfirm(false), 2000);
    } catch (err) {
      showToast(err.response?.data?.error || 'Failed to request account deletion', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const storagePercentage = ((user?.storageUsed || 0) / (user?.storageLimit || 1)) * 100;

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
        <div className="relative bg-gradient-to-br from-primary to-tertiary p-6 sm:p-8">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X size={20} className="text-white" />
          </button>
          
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-3xl font-bold text-white shadow-lg ring-4 ring-white/30">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">
                {user?.username}
              </h2>
              <p className="text-white/80 text-sm flex items-center gap-2 mt-1">
                <Mail size={14} />
                {user?.email}
              </p>
              {user?.isEmailVerified ? (
                <span className="inline-flex items-center gap-1 text-xs bg-white/20 text-white px-2 py-1 rounded-full mt-2">
                  <Check size={12} />
                  Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs bg-yellow-500/30 text-yellow-200 px-2 py-1 rounded-full mt-2">
                  <AlertTriangle size={12} />
                  Not Verified
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Edit2 size={18} className="text-primary" />
                Profile Information
              </h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface-variant mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                    placeholder="Enter username"
                    required
                    minLength={3}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setUsername(user?.username || '');
                    }}
                    className="flex-1 px-4 py-3 bg-surface-container-highest text-on-surface rounded-xl font-medium hover:bg-surface-container-high transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                  <span className="text-sm text-on-surface-variant">Username</span>
                  <span className="font-medium">{user?.username}</span>
                </div>
                <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                  <span className="text-sm text-on-surface-variant">Email</span>
                  <span className="font-medium">{user?.email}</span>
                </div>
              </div>
            )}
          </div>

          {/* Storage Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <HardDrive size={18} className="text-tertiary" />
              Storage Usage
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Used</span>
                <span className="font-medium">{formatBytes(user?.storageUsed || 0)}</span>
              </div>
              
              <div className="relative h-3 bg-surface rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercentage}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className={`h-full rounded-full ${
                    storagePercentage >= 90 ? 'bg-error' : 
                    storagePercentage >= 70 ? 'bg-tertiary' : 'bg-primary'
                  }`}
                />
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total</span>
                <span className="font-medium">{formatBytes(user?.storageLimit || 0)}</span>
              </div>
            </div>
          </div>

          {/* Account Details */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Calendar size={18} className="text-secondary" />
              Account Details
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                <span className="text-sm text-on-surface-variant">Member Since</span>
                <span className="font-medium text-sm">{formatDate(user?.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-surface rounded-xl">
                <span className="text-sm text-on-surface-variant">Last Login</span>
                <span className="font-medium text-sm">{formatDate(user?.lastLogin)}</span>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-surface-container-high rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield size={18} className="text-primary" />
                Security
              </h3>
              {!showChangePassword && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-medium hover:bg-primary/20 transition-colors"
                >
                  Change Password
                </button>
              )}
            </div>

            <AnimatePresence>
              {showChangePassword && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  onSubmit={handleChangePassword}
                  className="space-y-4 overflow-hidden"
                >
                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                      Current Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-on-surface-variant mt-1">
                      At least 8 characters with uppercase, lowercase, and number
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-on-surface-variant mb-2">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-4 py-3 bg-surface rounded-xl border border-outline focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                      required
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-3 bg-primary text-on-primary rounded-xl font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm"
                    >
                      {loading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowChangePassword(false);
                        setPasswordData({
                          currentPassword: '',
                          newPassword: '',
                          confirmPassword: ''
                        });
                      }}
                      className="flex-1 px-4 py-3 bg-surface-container-highest text-on-surface rounded-xl font-medium hover:bg-surface-container-high transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>

          {/* Danger Zone */}
          <div className="bg-error/10 rounded-2xl p-5 border border-error/20">
            <h3 className="text-lg font-semibold text-error mb-4 flex items-center gap-2">
              <AlertTriangle size={18} />
              Danger Zone
            </h3>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="font-medium text-error">Delete Account</p>
                <p className="text-sm text-on-surface-variant mt-1">
                  Permanently delete your account and all data
                </p>
              </div>
              <button
                onClick={handleRequestAccountDeletion}
                disabled={loading}
                className="px-6 py-3 bg-error text-on-error rounded-xl font-medium hover:bg-error/90 transition-colors disabled:opacity-50 shadow-sm whitespace-nowrap"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
