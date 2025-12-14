// src/pages/ConfirmDeletion.jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const ConfirmDeletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [status, setStatus] = useState('pending'); // pending, processing, success, error
  const [message, setMessage] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const API_URL = import.meta.env.VITE_BACKEND_URL;
  const token = searchParams.get('token');

  const handleConfirmDelete = async () => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid deletion link');
      return;
    }

    setStatus('processing');
    setConfirmed(true);

    try {
      const response = await axios.get(`${API_URL}/api/auth/confirm-account-deletion/${token}`);
      setStatus('success');
      setMessage(response.data.message);
      
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (error) {
      setStatus('error');
      setMessage(error.response?.data?.error || 'Account deletion failed');
    }
  };

  if (!token) {
    return (
      <div className={`min-h-screen flex items-center justify-center py-12 px-4 ${
        isDark ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className={`max-w-md w-full text-center p-8 rounded-2xl ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Invalid Link
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            This deletion link is invalid or has expired.
          </p>
          <Link
            to="/"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className={`max-w-md w-full p-8 rounded-2xl ${
        isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      }`}>
        {status === 'pending' && (
          <>
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-4 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Delete Account
            </h2>
            <div className={`p-4 rounded-lg mb-6 ${
              isDark ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-medium mb-2 ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                ⚠️ This action is permanent and cannot be undone!
              </p>
              <ul className={`text-sm space-y-1 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                <li>• All your files will be permanently deleted</li>
                <li>• All your folders will be removed</li>
                <li>• All your notes will be erased</li>
                <li>• Your shared links will stop working</li>
                <li>• Your account data will be completely removed</li>
              </ul>
            </div>
            <p className={`text-center mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Are you absolutely sure you want to delete your account?
            </p>
            <div className="space-y-3">
              <button
                onClick={handleConfirmDelete}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
              >
                Yes, Delete My Account
              </button>
              <Link
                to="/profile"
                className={`block w-full px-4 py-3 text-center rounded-lg font-medium transition-colors ${
                  isDark
                    ? 'bg-gray-800 hover:bg-gray-700 text-white'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-900'
                }`}
              >
                Cancel
              </Link>
            </div>
          </>
        )}

        {status === 'processing' && (
          <>
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-red-600 mx-auto mb-4"></div>
            <h2 className={`text-2xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Deleting Account...
            </h2>
            <p className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              Please wait while we permanently delete your account and all data
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Account Deleted
            </h2>
            <p className={`mb-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {message}
            </p>
            <p className={`text-sm text-center ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
              Redirecting to homepage...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-4">
              <svg className="w-16 h-16 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className={`text-2xl font-bold mb-2 text-center ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Deletion Failed
            </h2>
            <p className={`mb-6 text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {message}
            </p>
            <Link
              to="/profile"
              className="block w-full px-4 py-3 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Back to Profile
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmDeletion;
