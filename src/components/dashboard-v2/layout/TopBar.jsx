import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { useFileContext } from '../context/FileContext';
import { SearchField } from '../ui/inputs/SearchField';
import { IconButton } from '../ui/buttons/IconButton';
import { Avatar } from '../ui/media/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { Chip } from '../ui/feedback/Chip';
import { getTypography } from '../theme/typography';

/**
 * Top Bar Component
 */
export const TopBar = ({ onMenuClick }) => {
  const { colors, toggleTheme, isDark } = useTheme();
  const { filter, setFilter, selectedIds, setSelection } = useFileContext();

  const handleAction = (action) => {
      // Dispatch global event for DashboardContent to handle
      document.dispatchEvent(new CustomEvent('GLOBAL_ACTION', { detail: { action, selectedIds } }));
  };

  return (
    <div
        className="flex items-center justify-between px-4 py-2 w-full h-full gap-4 transition-colors"
        style={{ backgroundColor: colors.background }}
    >
        {/* Left: Menu & Brand (Mobile) */}
        <div className="flex items-center gap-2">
            <IconButton
                icon={<MenuIcon />}
                onClick={onMenuClick}
                className="md:hidden"
            />
            <div className="hidden md:block w-4" /> {/* Spacer */}
        </div>

        <AnimatePresence mode="wait">
            {selectedIds.length > 0 ? (
                 <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="flex-1 flex items-center gap-4 bg-primaryContainer/30 p-2 rounded-xl"
                 >
                     <div className="flex items-center gap-2 pl-2">
                         <IconButton
                            icon={<CloseIcon />}
                            onClick={() => setSelection([])}
                            size="small"
                         />
                         <span style={{ color: colors.onSurface, ...getTypography('labelLarge') }}>
                             {selectedIds.length} selected
                         </span>
                     </div>
                     <div className="h-6 w-px bg-outlineVariant" />
                     <div className="flex items-center gap-1">
                         <IconButton
                            icon={<ShareIcon />}
                            tooltip="Share"
                            onClick={() => handleAction('share')}
                         />
                         <IconButton
                            icon={<DownloadIcon />}
                            tooltip="Download"
                            onClick={() => handleAction('download')}
                         />
                         <IconButton
                            icon={<TrashIcon />}
                            tooltip="Delete"
                            onClick={() => handleAction('delete')}
                         />
                     </div>
                 </motion.div>
            ) : (
                /* Center: Search */
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 max-w-2xl"
                >
                    <SearchField
                        value={filter}
                        onChange={setFilter}
                        placeholder="Search in Drive..."
                    />
                </motion.div>
            )}
        </AnimatePresence>

        {/* Right: Actions & Profile */}
        <div className="flex items-center gap-2">
            <IconButton
                icon={isDark ? <SunIcon /> : <MoonIcon />}
                onClick={toggleTheme}
                tooltip="Toggle Theme"
            />
            <IconButton
                icon={<SettingsIcon />}
                tooltip="Settings"
                onClick={() => document.dispatchEvent(new CustomEvent('OPEN_SETTINGS'))}
            />
            <div className="ml-2">
                <Avatar initials="JD" size="small" className="cursor-pointer" onClick={() => document.dispatchEvent(new CustomEvent('OPEN_PROFILE'))} />
            </div>
        </div>
    </div>
  );
};

const MenuIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
);
const SettingsIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
);
const SunIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
);
const MoonIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
);
const ShareIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
);
const DownloadIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
);
const TrashIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
);
const CloseIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);
