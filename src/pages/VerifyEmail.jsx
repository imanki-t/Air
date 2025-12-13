import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';
import { MailCheck, XCircle, Loader2, ArrowRight } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Verifying your email address...');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid verification link. No token provided.');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-email/${token}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Email verified successfully.');
          
          if (authService.isAuthenticated()) {
            authService.setUser(data.user);
            setTimeout(() => navigate('/workspace', { replace: true }), 2000);
          } else {
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
          setMessage(data.error || 'Verification failed. Link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Connection failed. Please try again.');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-8 text-center"
      >
        <div className="flex justify-center mb-8">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500
             ${status === 'verifying' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400' : ''}
             ${status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : ''}
             ${status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}
           `}>
             {status === 'verifying' && <Loader2 className="w-8 h-8 animate-spin" />}
             {status === 'success' && <MailCheck className="w-8 h-8" />}
             {status === 'error' && <XCircle className="w-8 h-8" />}
           </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          {status === 'verifying' && 'Verifying Email'}
          {status === 'success' && 'Email Verified'}
          {status === 'error' && 'Verification Failed'}
        </h1>

        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {message}
        </p>

        {status === 'error' && (
          <div className="space-y-3">
             <button
              onClick={() => navigate('/auth/verify-email', { 
                state: { email: searchParams.get('email') } 
              })}
              className="w-full flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
            >
              Request New Link
            </button>
            <button
              onClick={() => navigate('/auth/login')}
              className="w-full flex items-center justify-center rounded-md bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all"
            >
              Back to Login
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 animate-pulse">
            <span>Redirecting you to the workspace</span>
            <ArrowRight className="w-4 h-4" />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default VerifyEmail;

                  
