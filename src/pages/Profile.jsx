// src/pages/Profile.jsx - Complete Profile Page
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatsCard from '../components/StatsCard';
import ThemeToggle from '../components/ThemeToggle';

const Profile = () => {
  const navigate = useNavigate();
  const { user, logout, updateUser } = useAuth();
  const { isDark } = useTheme();
  
  const [stats, setStats] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || ''
  });
  const [changePasswordMode, setChangePasswordMode] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (message.text) {
      const timer = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/stats`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, formData);
      updateUser(response.data.user);
      setEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      
      if (formData.email !== user?.email) {
        setMessage({ 
          type: 'info', 
          text: 'Email updated! Please check your inbox to verify your new email address.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to update profile' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await axios.put(`${API_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setMessage({ type: 'success', text: 'Password changed! Redirecting to login...' });
      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to change password' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Are you absolutely sure? This action cannot be undone. All your files, folders, and data will be permanently deleted.'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'Last chance! Type your username to confirm deletion.'
    );

    if (!doubleConfirm) return;

    try {
      await axios.post(`${API_URL}/api/auth/request-account-deletion`);
      setMessage({ 
        type: 'success', 
        text: 'Deletion confirmation email sent. Please check your inbox.' 
      });
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'Failed to request account deletion' 
      });
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Are you sure you want to logout?');
    if (confirmed) {
      await logout();
      navigate('/login');
    }
  };

  return (
    <div className="flex-1">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className={`text-3xl font-bold mb-8 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Profile & Settings
        </h1>

        {/* Message Display */}
        {message.text && (
          <div className={`mb-6 rounded-lg p-4 ${
            message.type === 'success' 
              ? isDark ? 'bg-green-900/30 border border-green-800' : 'bg-green-50 border border-green-200'
              : message.type === 'error'
              ? isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
              : isDark ? 'bg-blue-900/30 border border-blue-800' : 'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex items-center">
              <svg className={`h-5 w-5 ${
                message.type === 'success' 
                  ? 'text-green-500' 
                  : message.type === 'error' 
                  ? 'text-red-500' 
                  : 'text-blue-500'
              }`} fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className={`ml-3 text-sm ${
                message.type === 'success' 
                  ? isDark ? 'text-green-400' : 'text-green-800'
                  : message.type === 'error'
                  ? isDark ? 'text-red-400' : 'text-red-800'
                  : isDark ? 'text-blue-400' : 'text-blue-800'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatsCard
              title="Total Files"
              value={stats.totalFiles}
              icon="📁"
              isDark={isDark}
            />
            <StatsCard
              title="Storage Used"
              value={formatBytes(stats.storageUsed)}
              subtitle={`${stats.storagePercentage}% of ${formatBytes(stats.storageLimit)}`}
              icon="💾"
              isDark={isDark}
              progress={parseFloat(stats.storagePercentage)}
            />
            <StatsCard
              title="Folders"
              value={stats.totalFolders}
              icon="📂"
              isDark={isDark}
            />
            <StatsCard
              title="Notes"
              value={stats.totalNotes}
              icon="📝"
              isDark={isDark}
            />
          </div>
        )}

        {/* More Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <StatsCard
              title="Starred Files"
              value={stats.starredFiles}
              icon="⭐"
              isDark={isDark}
            />
            <StatsCard
              title="Shared Files"
              value={stats.sharedFiles}
              icon="🔗"
              isDark={isDark}
            />
            <StatsCard
              title="Account Age"
              value={`${stats.accountAge} days`}
              icon="📅"
              isDark={isDark}
            />
          </div>
        )}

        {/* Appearance Section */}
        <div className={`rounded-xl p-6 mb-6 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Appearance
          </h2>
          <p className={`text-sm mb-4 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Choose how Airstream looks to you. Select a theme or sync with your system settings.
          </p>
          <ThemeToggle />
        </div>

        {/* Profile Information */}
        <div className={`rounded-xl p-6 mb-6 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Profile Information
            </h2>
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                Edit Profile
              </button>
            )}
          </div>

          {editing ? (
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Username
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
                  required
                />
                <p className={`mt-1 text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                  Changing your email will require verification
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className={`flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50`}
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      username: user?.username || '',
                      email: user?.email || ''
                    });
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
          ) : (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Username
                </label>
                <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {user?.username}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Email
                </label>
                <div className="flex items-center gap-2">
                  <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    {user?.email}
                  </p>
                  {user?.isEmailVerified ? (
                    <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 rounded-full">
                      Not Verified
                    </span>
                  )}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Member Since
                </label>
                <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {formatDate(user?.createdAt)}
                </p>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1 ${
                  isDark ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  Last Login
                </label>
                <p className={`text-lg ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {stats?.lastLogin ? formatDate(stats.lastLogin) : 'N/A'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Security Section */}
        <div className={`rounded-xl p-6 mb-6 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className={`text-xl font-semibold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>
              Security
            </h2>
            {!changePasswordMode && (
              <button
                onClick={() => setChangePasswordMode(true)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isDark
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                }`}
              >
                Change Password
              </button>
            )}
          </div>

          {changePasswordMode ? (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className={`w-full px-4 py-2 rounded-lg border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300'
                  } focus:outline-none focus:ring-2 focus:ring-purple-500/20`}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setChangePasswordMode(false);
                    setPasswordData({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: ''
                    });
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
          ) : (
            <p className={isDark ? 'text-gray-400' : 'text-gray-600'}>
              Keep your account secure by using a strong password and changing it regularly.
            </p>
          )}
        </div>

        {/* Logout Section */}
        <div className={`rounded-xl p-6 mb-6 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Session
          </h2>
          <p className={`mb-4 text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Sign out of your account on this device
          </p>
          <button
            onClick={handleLogout}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300'
            }`}
          >
            Logout
          </button>
        </div>

        {/* Danger Zone */}
        <div className={`rounded-xl p-6 border-2 ${
          isDark ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'
        }`}>
          <h2 className={`text-xl font-semibold mb-2 ${
            isDark ? 'text-red-400' : 'text-red-600'
          }`}>
            Danger Zone
          </h2>
          <p className={`mb-4 text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Once you delete your account, there is no going back. Please be certain.
          </p>
          <ul className={`mb-4 text-sm space-y-1 ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            <li>• All your files will be permanently deleted</li>
            <li>• All your folders and organization will be lost</li>
            <li>• All your notes will be removed</li>
            <li>• Your shared links will stop working</li>
            <li>• This action cannot be undone</li>
          </ul>
          <button
            onClick={handleDeleteAccount}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
