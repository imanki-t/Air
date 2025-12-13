// src/components/Toast.jsx - Custom Toast Notification Component
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

let toastCallback = null;

export const showToast = (message, type = 'info', duration = 3000) => {
  if (toastCallback) {
    toastCallback(message, type, duration);
  }
};

export const showConfirm = (message, onConfirm, onCancel) => {
  return new Promise((resolve) => {
    if (toastCallback) {
      toastCallback(message, 'confirm', 0, (confirmed) => {
        if (confirmed && onConfirm) onConfirm();
        if (!confirmed && onCancel) onCancel();
        resolve(confirmed);
      });
    }
  });
};

const Toast = () => {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    toastCallback = (message, type, duration, callback) => {
      const id = Date.now();
      setToasts(prev => [...prev, { id, message, type, callback }]);
      
      if (duration > 0 && type !== 'confirm') {
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
      }
    };

    return () => {
      toastCallback = null;
    };
  }, []);

  const handleConfirm = (id, callback, confirmed) => {
    if (callback) callback(confirmed);
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleClose = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200';
      case 'error':
        return 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200';
      case 'confirm':
        return 'bg-background border-border text-foreground';
      default:
        return 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200';
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      case 'confirm':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <>
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-md w-full px-4">
        <AnimatePresence>
          {toasts.map(toast => (
            toast.type === 'confirm' ? null : (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 100, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.95 }}
                className={`flex items-start gap-3 p-4 rounded-lg border shadow-lg ${getToastStyles(toast.type)}`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(toast.type)}
                </div>
                <p className="flex-1 text-sm font-medium">{toast.message}</p>
                <button
                  onClick={() => handleClose(toast.id)}
                  className="flex-shrink-0 hover:opacity-70 transition-opacity"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            )
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Dialog */}
      <AnimatePresence>
        {toasts.filter(t => t.type === 'confirm').map(toast => (
          <div
            key={toast.id}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-lg shadow-lg max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center flex-shrink-0 text-primary">
                  {getIcon('confirm')}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground mb-2">Confirm Action</h3>
                  <p className="text-sm text-muted-foreground">{toast.message}</p>
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => handleConfirm(toast.id, toast.callback, false)}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleConfirm(toast.id, toast.callback, true)}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors shadow-sm"
                >
                  Confirm
                </button>
              </div>
            </motion.div>
          </div>
        ))}
      </AnimatePresence>
    </>
  );
};

export default Toast;
