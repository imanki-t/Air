// src/components/RemainingComponents.jsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import authService from '../services/authService';
import ThemeToggle from './ThemeToggle';

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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative">
       <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6 text-primary">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-2">Verify Your Email</h1>
        <p className="text-muted-foreground mb-6">
          We've sent a verification link to <strong>{email}</strong>. Click the link to activate your account.
        </p>
        {message && (
          <div className={`mb-4 p-3 border rounded-md text-sm ${
            message.includes('verified') || message.includes('sent')
              ? 'bg-green-500/10 border-green-500/20 text-green-600 dark:text-green-400'
              : message.includes('Failed') || message.includes('not verified')
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400'
          }`}>
            {message}
          </div>
        )}
        <button
          onClick={handleCheckStatus}
          disabled={checking}
          className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 mb-3 transition-colors"
        >
          {checking ? 'Checking...' : 'I\'ve Verified My Email'}
        </button>
        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/80 disabled:opacity-50 mb-3 transition-colors"
        >
          {resending ? 'Resending...' : 'Resend Email'}
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
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
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative">
       <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
           <h1 className="text-2xl font-bold mb-2">Forgot Password?</h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a reset link
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div className="space-y-1">
             <label className="text-sm font-medium leading-none">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
             className="w-full inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 shadow-sm"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>

          <Link to="/login" className="block text-center text-sm text-primary hover:text-primary/80 transition-colors mt-4">
            Back to Login
          </Link>
        </form>
      </div>
    </div>
  );
};
