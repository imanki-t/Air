import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

let snackbarRef = null;

export const showSnackbar = (message, actionLabel = null, onAction = null) => {
  if (snackbarRef) {
    snackbarRef.show(message, actionLabel, onAction);
  }
};

const M3Snackbar = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [actionLabel, setActionLabel] = useState(null);
  const [onAction, setOnAction] = useState(null);

  useEffect(() => {
    snackbarRef = {
      show: (msg, label, action) => {
        setMessage(msg);
        setActionLabel(label);
        setOnAction(action);
        setOpen(true);
        setTimeout(() => setOpen(false), 4000);
      }
    };
  }, []);

  if (!open) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 z-50 animate-slide-up">
      <div className="bg-inverse-surface text-inverse-on-surface rounded-lg shadow-lg min-h-[48px] px-4 py-3 flex items-center justify-between max-w-xl mx-auto md:mx-0">
        <span className="text-sm font-medium mr-4">{message}</span>
        <div className="flex items-center gap-2">
           {actionLabel && (
             <button
               onClick={() => {
                 if (onAction) onAction();
                 setOpen(false);
               }}
               className="text-inverse-primary text-sm font-bold hover:bg-white/10 px-2 py-1 rounded transition-colors"
             >
               {actionLabel}
             </button>
           )}
           <button onClick={() => setOpen(false)} className="text-inverse-on-surface hover:bg-white/10 rounded-full p-1">
             <X size={18} />
           </button>
        </div>
      </div>
    </div>
  );
};

export default M3Snackbar;
