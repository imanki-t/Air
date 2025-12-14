// src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useTheme } from '../context/ThemeContext';

const ForgotPassword = () => {
  const { isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await axios.post(`${API_URL}/api/auth/forgot-password`, { email });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={`min-h-screen flex items-center justify-center py-12 px-4 ${
        isDark ? 'bg-gray-950' : 'bg-gray-50'
      }`}>
        <div className={`max-w-md w-full text-center p-8 rounded-2xl ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Check your email
          </h2>
          <p className={`mb-6 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            If an account exists with this email, we've sent password reset instructions.
          </p>
          <Link
            to="/login"
            className="inline-block px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/airstream.png" alt="Airstream" className="h-12 w-12" />
            <span className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              AIRSTREAM
            </span>
          </Link>
          <h2 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>
            Reset your password
          </h2>
          <p className={`mt-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <div className={`rounded-2xl shadow-xl p-8 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className={`rounded-lg p-4 ${
                isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${isDark ? 'text-red-400' : 'text-red-800'}`}>
                  {error}
                </p>
              </div>
            )}

            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`appearance-none rounded-lg relative block w-full px-4 py-3 border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                placeholder="Enter your email"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              to="/login"
              className={`text-sm ${
                isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
              } transition-colors`}
            >
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
