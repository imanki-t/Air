import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useUploader } from '../hooks/useUploader';
import { Card } from '../ui/surfaces/Card';
import { IconButton } from '../ui/buttons/IconButton';
import { ProgressBar } from '../ui/feedback/ProgressBar';
import { getTypography } from '../theme/typography';

/**
 * Upload Manager Component
 */
export const UploadManager = ({ uploads, onClose, onCancel }) => {
  const { colors } = useTheme();
  const [minimized, setMinimized] = useState(false);

  const uploadList = Object.values(uploads);
  if (uploadList.length === 0) return null;

  const completedCount = uploadList.filter(u => u.status === 'completed').length;
  const inProgressCount = uploadList.length - completedCount;

  return (
    <Card
      variant="elevated"
      className="fixed bottom-6 right-6 w-80 z-50 overflow-hidden flex flex-col shadow-xl"
      style={{
        backgroundColor: colors.surfaceContainer,
        height: minimized ? '48px' : 'auto',
        maxHeight: '400px',
        transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer bg-black/5 dark:bg-white/5"
        onClick={() => setMinimized(!minimized)}
      >
        <span style={{ color: colors.onSurface, ...getTypography('titleSmall') }}>
          {inProgressCount > 0 ? `Uploading ${inProgressCount} items` : 'Uploads complete'}
        </span>
        <div className="flex items-center">
            <IconButton
                icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points={minimized ? "18 15 12 9 6 15" : "6 9 12 15 18 9"}></polyline>
                    </svg>
                }
                size="small"
                onClick={(e) => { e.stopPropagation(); setMinimized(!minimized); }}
            />
            <IconButton
                icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                }
                size="small"
                onClick={(e) => { e.stopPropagation(); onClose(); }}
            />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto custom-scrollbar flex-1 p-2 space-y-2">
        {uploadList.map((upload) => (
          <div key={upload.id} className="flex flex-col gap-1 p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                        <polyline points="13 2 13 9 20 9"></polyline>
                    </svg>
                    <span className="truncate text-sm" style={{ color: colors.onSurface }}>
                        {upload.filename}
                    </span>
                </div>
                {upload.status === 'uploading' && (
                    <button onClick={() => onCancel(upload.id)} className="text-xs text-error">
                         Cancel
                    </button>
                )}
                {upload.status === 'completed' && (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
                        <polyline points="20 6 9 17 4 12"></polyline>
                     </svg>
                )}
                {upload.status === 'error' && (
                     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={colors.error} strokeWidth="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                     </svg>
                )}
            </div>
            {upload.status === 'uploading' && (
                <ProgressBar progress={upload.progress} height="2px" />
            )}
            {upload.status === 'error' && (
                <span className="text-xs text-error">{upload.error}</span>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
};
