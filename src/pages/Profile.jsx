import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import StatsCard from '../components/StatsCard';
import ThemeToggle from '../components/ThemeToggle';

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const { isDark, theme, changeTheme } = useTheme();
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

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/stats`);
      setStats(response.data.stats);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`${API_URL}/api/auth/profile`, formData);
      updateUser(response.data.user);
      setEditing(false);
      alert('Profile updated successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Update failed');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      await axios.put(`${API_URL}/api/auth/change-password`, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      alert('Password changed successfully. Please login again.');
      logout();
    } catch (error) {
      alert(error.response?.data?.error || 'Password change failed');
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className={`text-3xl font-bold mb-8 ${
        isDark ? 'text-white' : 'text-gray-900'
      }`}>
        Profile Settings
      </h1>

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

      {/* Theme Selection */}
      <div className={`rounded-xl p-6 mb-6 ${
        isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Appearance
        </h2>
        <ThemeToggle />
      </div>

      {/* Profile Information */}
      <div className={`rounded-xl p-6 mb-6 ${
        isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Profile Information
        </h2>
        
        {/* Implementation of profile edit form */}
        {/* Include logout button */}
      </div>

      {/* Password Change Section */}
      <div className={`rounded-xl p-6 mb-6 ${
        isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          Security
        </h2>
        {/* Implementation of password change form */}
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
        <button
          onClick={async () => {
            if (confirm('Are you sure? This action cannot be undone.')) {
              try {
                await axios.post(`${API_URL}/api/auth/request-account-deletion`);
                alert('Deletion confirmation email sent. Please check your inbox.');
              } catch (error) {
                alert('Failed to request account deletion');
              }
            }
          }}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
        >
          Delete Account
        </button>
      </div>
    </div>
  );
};

export default Profile;
