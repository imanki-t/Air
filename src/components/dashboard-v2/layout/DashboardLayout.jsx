import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../context/ThemeContext';
import { useFileContext } from '../context/FileContext';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

/**
 * Dashboard Layout
 */
export const DashboardLayout = ({ children }) => {
  const { colors, isDark } = useTheme();
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  // Responsive sidebar handling
  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div
      className="flex h-screen overflow-hidden transition-colors duration-300"
      style={{
        backgroundColor: colors.background,
        color: colors.onBackground
      }}
    >
      {/* Sidebar - Desktop */}
      <motion.div
        className="hidden md:flex flex-col h-full border-r transition-all duration-300"
        style={{ borderColor: colors.outlineVariant + '40' }}
        initial={{ width: 280 }}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
      >
        <Sidebar collapsed={!isSidebarOpen} />
      </motion.div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Bar */}
        <div className="h-16 flex-none z-10">
            <TopBar onMenuClick={toggleSidebar} />
        </div>

        {/* Content Scroll Area */}
        <main
            className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6"
            style={{
                backgroundColor: isDark ? colors.background : colors.surfaceContainerLowest
            }}
        >
          <div className="max-w-[1600px] mx-auto h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
