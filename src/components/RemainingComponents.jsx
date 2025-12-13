// src/components/RemainingComponents.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';

// VerifyEmailNotice Component
export const VerifyEmailNotice = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const [resending, setResending] = useState(false);
  const [message, setMessage] = useState('');
  const [checking, setChecking] = useState(false);

  // Check verification status on mount
  useEffect(() => {
    const checkVerificationStatus = async () => {
      try {
        const profile = await authService.getProfile();
        if (profile.user.isEmailVerified) {
          // Update local storage with verified status
          authService.setUser(profile.user);
          navigate('/dashboard');
        }
      } catch (error) {
        console.error('Failed to check verification status:', error);
      }
    };

    // Only check if user is logged in
    if (authService.isAuthenticated()) {
      checkVerificationStatus();
    }
  }, [navigate]);

  const handleResend = async () => {
    setResending(true);
    setMessage('');
    try {
      await authService.resendVerification(email);
      setMessage('Verification email sent! Check your inbox.');
    } catch (error) {
      setMessage('Failed to resend email. Try again later.');
    } finally {
      setResending(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setMessage('');
    try {
      const profile = await authService.getProfile();
      if (profile.user.isEmailVerified) {
        // Update local storage
        authService.setUser(profile.user);
        setMessage('Email verified! Redirecting...');
        setTimeout(() => navigate('/dashboard'), 1500);
      } else {
        setMessage('Email not verified yet. Please check your inbox and click the verification link.');
      }
    } catch (error) {
      setMessage('Failed to check status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Verify Your Email</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          We've sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
        </p>
        {message && (
          <div className={`mb-4 p-3 border rounded-lg text-sm ${
            message.includes('verified') || message.includes('sent')
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-400'
              : message.includes('Failed') || message.includes('not verified')
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-400'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-400'
          }`}>
            {message}
          </div>
        )}
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 mb-3"
        >
          {checking ? 'Checking...' : 'I\'ve Verified My Email'}
        </button>
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-3"
        >
          {resending ? 'Resending...' : 'Resend Email'}
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

// ForgotPassword Component
export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      await authService.forgotPassword(email);
      setMessage('Password reset link sent! Check your email.');
    } catch (err) {
      setError('Failed to send reset link. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 text-center">Forgot Password?</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6 text-center">
          Enter your email and we'll send you a reset link
        </p>
        
        <form onSubmit={handleSubmit}>
          {message && (
            <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-400 text-sm">
              {message}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-4"
            required
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 mb-4"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link to="/login" className="block text-center text-blue-600 dark:text-blue-400 hover:text-blue-700">
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
};
