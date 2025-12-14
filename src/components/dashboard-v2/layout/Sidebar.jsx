import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useFileContext } from '../context/FileContext';
import { IconButton } from '../ui/buttons/IconButton';
import { FAB } from '../ui/buttons/FAB';
import { ProgressBar } from '../ui/feedback/ProgressBar';
import { getTypography } from '../theme/typography';

/**
 * Sidebar Navigation Component
 */
export const Sidebar = ({ collapsed }) => {
  const { colors } = useTheme();
  const { storageStats, view, setView, currentFolder, navigateFolder } = useFileContext();

  const navItems = [
    { id: 'my-files', label: 'My Files', icon: <FolderIcon />, view: 'grid' },
    { id: 'recent', label: 'Recent', icon: <ClockIcon />, view: 'recent' },
    { id: 'starred', label: 'Starred', icon: <StarIcon />, view: 'starred' },
    { id: 'trash', label: 'Trash', icon: <TrashIcon />, view: 'trash' },
  ];

  // Storage calculation
  const used = storageStats?.used || 0;
  const total = storageStats?.total || 1073741824; // 1GB default
  const percentage = Math.min(100, (used / total) * 100);

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo Area */}
      <div className={`flex items-center px-4 mb-8 ${collapsed ? 'justify-center' : ''} h-10`}>
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl">
          A
        </div>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="ml-3 font-bold text-xl tracking-tight"
            style={{ color: colors.onSurface }}
          >
            Airstream
          </motion.span>
        )}
      </div>

      {/* New Button */}
      <div className={`px-4 mb-6 ${collapsed ? 'flex justify-center' : ''}`}>
        <FAB
          variant="primaryContainer"
          label={collapsed ? null : "New"}
          icon={<PlusIcon />}
          className={!collapsed ? "w-full !justify-start pl-4" : ""}
          onClick={() => document.dispatchEvent(new CustomEvent('OPEN_CREATE_MODAL'))}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {navItems.map(item => {
            const isActive = false;

            return (
              <NavButton
                key={item.id}
                icon={item.icon}
                label={item.label}
                collapsed={collapsed}
                active={false}
                onClick={() => {
                    // Logic to switch views
                }}
              />
            );
        })}
      </nav>

      {/* Storage Status */}
      {!collapsed && (
        <div className="px-6 py-4 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span style={{ color: colors.onSurfaceVariant, ...getTypography('labelMedium') }}>Storage</span>
          </div>
          <ProgressBar progress={percentage} className="mb-2" />
          <div style={{ color: colors.onSurfaceVariant, ...getTypography('bodySmall') }}>
            {formatBytes(used)} of {formatBytes(total)} used
          </div>
        </div>
      )}
    </div>
  );
};

const NavButton = ({ icon, label, collapsed, active, onClick }) => {
  const { colors } = useTheme();

  return (
    <motion.button
      onClick={onClick}
      className={`flex items-center w-full p-3 rounded-full transition-colors relative overflow-hidden group ${collapsed ? 'justify-center' : ''}`}
      style={{
        backgroundColor: active ? colors.secondaryContainer : 'transparent',
        color: active ? colors.onSecondaryContainer : colors.onSurfaceVariant,
      }}
      whileHover={{ backgroundColor: active ? colors.secondaryContainer : colors.onSurfaceVariant + '14' }}
      whileTap={{ scale: 0.98 }}
    >
      <span className="relative z-10 flex items-center justify-center">
        {React.cloneElement(icon, {
            width: 24,
            height: 24,
            fill: active ? "currentColor" : "none",
            stroke: active ? "none" : "currentColor",
            strokeWidth: 2
        })}
      </span>
      {!collapsed && (
        <span className="ml-4 font-medium relative z-10 text-sm">
          {label}
        </span>
      )}
    </motion.button>
  );
};

// Icons
const FolderIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
);
const ClockIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
);
const StarIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
);
const TrashIcon = (props) => (
  <svg viewBox="0 0 24 24" {...props}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const PlusIcon = (props) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
);
