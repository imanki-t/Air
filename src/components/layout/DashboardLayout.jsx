// src/components/layout/DashboardLayout.jsx - MOBILE OPTIMIZED
import React, { useState, useEffect } from 'react';
import M3Navigation from '../m3/M3Navigation';
import M3TopAppBar from '../m3/M3TopAppBar';
import M3Fab from '../m3/M3Fab';
import { Plus } from 'lucide-react';

const DashboardLayout = ({
  children,
  user,
  currentView,
  setCurrentView,
  onProfileClick,
  onSettingsClick,
  onUploadClick,
  searchQuery,
  setSearchQuery
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 1024);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex h-screen bg-surface overflow-hidden">
      {/* Navigation Rail (Desktop Only) */}
      {!isMobile && (
        <M3Navigation
          currentView={currentView}
          onViewChange={setCurrentView}
          isMobile={false}
        />
      )}

      <div className="flex-1 flex flex-col h-full relative">
        {/* Top App Bar */}
        <M3TopAppBar
          user={user}
          onProfileClick={onProfileClick}
          onSettingsClick={onSettingsClick}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-4 md:p-6 pb-24 md:pb-6 relative scroll-smooth">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* FAB for Upload - Mobile: Bottom Right, Desktop: Lower Right */}
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 md:bottom-8 md:right-8 z-20">
          <M3Fab
            icon={<Plus size={24} />}
            onClick={onUploadClick}
            size="large"
            variant="primary"
          />
        </div>

        {/* Bottom Navigation (Mobile Only) */}
        {isMobile && (
          <M3Navigation
            currentView={currentView}
            onViewChange={setCurrentView}
            isMobile={true}
          />
        )}
      </div>
    </div>
  );
};

export default DashboardLayout;
