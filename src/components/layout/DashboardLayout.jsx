import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle';
import Sidebar from '../dashboard/Sidebar';

const DashboardLayout = ({
  children,
  user,
  onLogout,
  currentView,
  setCurrentView,
  headerActions
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span>Airstream</span>
          </Link>
        </div>

        {/* Sidebar Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
        </div>

        {/* User Profile Summary (Desktop) */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium">
              {user?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user?.username}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-3/4 max-w-xs bg-card border-r border-border z-50 lg:hidden flex flex-col shadow-xl"
            >
              <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                <span className="font-bold text-lg">Menu</span>
                <button onClick={() => setIsSidebarOpen(false)}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <Sidebar
                  currentView={currentView}
                  setCurrentView={(view) => {
                    setCurrentView(view);
                    setIsSidebarOpen(false);
                  }}
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Search Bar - Hidden on very small screens if needed, or adaptable */}
            <div className="hidden sm:flex items-center w-full max-w-md">
              <div className="relative w-full group">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {/* Search input is managed by parent or internal state?
                    For now, it's a slot for the parent to inject, or we can render the search prop here if provided */}
                 {/* Assuming headerActions might contain the search input, or we put a placeholder */}
              </div>
            </div>
            {/* Header Actions Injection */}
             <div className="flex-1 flex justify-start pl-4 lg:pl-0">
                {headerActions}
             </div>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-medium ring-offset-background hover:ring-2 hover:ring-ring transition-all"
              >
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 5 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 5 }}
                      className="absolute right-0 mt-2 w-56 rounded-md border border-border bg-popover p-1 shadow-lg z-40"
                    >
                      <div className="px-2 py-1.5 text-sm font-semibold">
                        My Account
                      </div>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          // Navigate to profile
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          // Settings
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
                      >
                        Settings
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        onClick={() => {
                          onLogout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-destructive hover:text-destructive-foreground text-destructive transition-colors"
                      >
                        Log out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* Content Scroll Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
