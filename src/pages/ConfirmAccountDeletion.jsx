import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { Trash2, AlertTriangle, Loader2, ArrowLeft } from 'lucide-react';

const ConfirmAccountDeletion = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing deletion request...');

  useEffect(() => {
    const confirmDeletion = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Invalid deletion link. Token missing.');
        return;
      }

      try {
        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/confirm-account-deletion/${token}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Your account has been permanently deleted.');
          localStorage.clear();
          sessionStorage.clear();
          setTimeout(() => navigate('/', { replace: true }), 3000);
        } else {
          setStatus('error');
          setMessage(data.error || 'Deletion failed. Link may have expired.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('System error. Please try again.');
      }
    };

    confirmDeletion();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 p-4 relative">
      <div className="absolute top-6 right-6">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl p-8 text-center"
      >
        <div className="flex justify-center mb-6">
           <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors duration-500
             ${status === 'processing' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' : ''}
             ${status === 'success' ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500' : ''}
             ${status === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400' : ''}
           `}>
             {status === 'processing' && <Loader2 className="w-8 h-8 animate-spin" />}
             {status === 'success' && <Trash2 className="w-8 h-8" />}
             {status === 'error' && <AlertTriangle className="w-8 h-8" />}
           </div>
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          {status === 'processing' && 'Deleting Account'}
          {status === 'success' && 'Account Deleted'}
          {status === 'error' && 'Deletion Error'}
        </h1>

        <p className="text-zinc-500 dark:text-zinc-400 mb-8">
          {message}
        </p>

        {status === 'error' && (
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition-all"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Home
          </button>
        )}

        {status === 'success' && (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 dark:text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Redirecting to home...</span>
          </div>
        )}

        {status === 'processing' && (
           <div className="h-1 w-full bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-600 animate-progress origin-left"></div>
           </div>
        )}
      </motion.div>
    </div>
  );
};

export default ConfirmAccountDeletion;

