// src/pages/VerifyEmail.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        // Call the backend to verify the email
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-email/${token}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          
          // Update user in local storage if they're already logged in
          if (authService.isAuthenticated()) {
            authService.setUser(data.user);
            // Redirect to workspace after 2 seconds
            setTimeout(() => {
              navigate('/workspace', { replace: true });
            }, 2000);
          } else {
            // Redirect to login after 2 seconds
            setTimeout(() => {
              navigate('/auth/login', { 
                replace: true,
                state: { 
                  message: 'Email verified! Please log in to continue.',
                  verified: true 
                }
              });
            }, 2000);
          }
        } else {
          setStatus('error');
          setMessage(data.error || 'Verification failed. The link may have expired.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground px-4 relative">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-card border border-border rounded-lg shadow-lg p-8 text-center"
      >
        {/* Status Icon */}
        <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-6">
          {status === 'verifying' && (
            <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          )}
          
          {status === 'success' && (
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          
          {status === 'error' && (
            <svg className="w-8 h-8 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Status Title */}
        <h1 className="text-2xl font-bold mb-2">
          {status === 'verifying' && 'Verifying Email'}
          {status === 'success' && 'Verification Successful!'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        {/* Status Message */}
        <p className={`text-sm mb-6 ${
          status === 'success' ? 'text-green-600 dark:text-green-400' : 
          status === 'error' ? 'text-destructive' : 
          'text-muted-foreground'
        }`}>
          {message}
        </p>

        {/* Action Buttons */}
        {status === 'error' && (
          <div className="space-y-3">
            <button
              onClick={() => navigate('/auth/verify-email', { 
                state: { email: searchParams.get('email') } 
              })}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Request New Verification Link
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span>Redirecting...</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;
