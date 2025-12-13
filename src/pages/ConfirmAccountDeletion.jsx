// src/pages/ConfirmAccountDeletion.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';

const ConfirmAccountDeletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing your request...');

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid deletion link. No token provided.');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/confirm-account-deletion/${token}`,
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
          setMessage('Your account has been permanently deleted. We\'re sorry to see you go.');
          
          // Clear any stored tokens
          localStorage.clear();
          sessionStorage.clear();
          
          // Redirect to home after 3 seconds
          setTimeout(() => {
            navigate('/', { replace: true });
          }, 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Account deletion failed. The link may have expired.');
        }
      } catch (error) {
        console.error('Deletion confirmation error:', error);
        setStatus('error');
        setMessage('An error occurred during account deletion. Please try again.');
      }
    };

    confirmDeletion();
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
          {status === 'processing' && (
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
          {status === 'processing' && 'Deleting Account'}
          {status === 'success' && 'Account Deleted'}
          {status === 'error' && 'Deletion Failed'}
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
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Return to Home
          </button>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span>Redirecting to home...</span>
          </div>
        )}

        {status === 'processing' && (
          <p className="text-sm text-muted-foreground">
            Please wait while we process your request...
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default ConfirmAccountDeletion;
