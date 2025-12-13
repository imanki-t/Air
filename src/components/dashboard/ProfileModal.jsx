// src/components/dashboard/ProfileModal.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import authService from '../../services/authService';

export const ProfileModal = ({ user, onClose, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    setUsername(user?.username || '');
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      setLoading(false);
      return;
    }

    try {
      const response = await authService.updateProfile(username);
      onUpdate(response.user);
      setMessage('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validate passwords
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setPasswordError('Password must contain uppercase, lowercase, and number');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.changePassword(
        passwordData.currentPassword,
        passwordData.newPassword
      );
      setPasswordSuccess('Password changed successfully! Please log in again.');
      setTimeout(() => {
        authService.logout();
        window.location.href = '/auth/login';
      }, 2000);
    } catch (err) {
      setPasswordError(err.response?.data?.error || 'Failed to change password');
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

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card text-card-foreground border border-border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border p-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Profile Settings</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Success/Error Messages */}
          {message && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md text-green-600 dark:text-green-400 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Profile Information Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
            
            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-2xl font-bold">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                {user?.isEmailVerified ? (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    Not Verified
                  </span>
                )}
              </div>
            </div>

            {/* Username Edit Form */}
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input placeholder:text-muted-foreground transition-shadow"
                    placeholder="Enter username"
                    required
                    minLength={3}
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setUsername(user?.username || '');
                      setError('');
                    }}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                  <div>
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium">{user?.username}</p>
                  </div>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-primary hover:text-primary/80 transition-colors"
                  >
                    Edit
                  </button>
                </div>
                <div className="p-3 bg-secondary/50 rounded-md">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            )}
          </div>

          {/* Account Details */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Details</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-medium">{formatDate(user?.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-md">
                <div>
                  <p className="text-sm text-muted-foreground">Last Login</p>
                  <p className="font-medium">{formatDate(user?.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Password Change Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Security</h3>
              {!showChangePassword && (
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="text-sm text-primary hover:text-primary/80 transition-colors"
                >
                  Change Password
                </button>
              )}
            </div>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="space-y-4 p-4 bg-secondary/30 rounded-md">
                {passwordSuccess && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md text-green-600 dark:text-green-400 text-sm">
                    {passwordSuccess}
                  </div>
                )}
                {passwordError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm">
                    {passwordError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input"
                    required
                    minLength={8}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    At least 8 characters with uppercase, lowercase, and number
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-ring focus:border-input"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                      setPasswordError('');
                      setPasswordSuccess('');
                    }}
                    className="flex-1 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Danger Zone */}
          <div className="pt-6 border-t border-border">
            <h3 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h3>
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-destructive">Delete Account</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
                      alert('Account deletion feature will be implemented by your backend team.');
                    }
                  }}
                  className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors text-sm whitespace-nowrap ml-4"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
