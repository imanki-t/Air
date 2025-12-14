// src/components/Layout.jsx - Main Layout with Navigation
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Layout = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    )},
    { name: 'Profile', path: '/profile', icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    )}
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Navigation Bar */}
      <nav className={`sticky top-0 z-40 ${
        isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'
      } shadow-sm`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/dashboard" className="flex items-center space-x-2">
              <img src="/airstream.png" alt="Airstream" className="h-8 w-8" />
              <span className={`text-xl font-bold ${
                isDark ? 'text-white' : 'text-gray-900'
              }`}>
                AIRSTREAM
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : isDark
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="hidden md:flex items-center space-x-3">
              <div className={`px-3 py-2 rounded-lg ${
                isDark ? 'bg-gray-800' : 'bg-gray-100'
              }`}>
                <p className={`text-sm font-medium ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>
                  {user?.username}
                </p>
                {user?.isEmailVerified && (
                  <p className="text-xs text-green-500">Verified</p>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`md:hidden p-2 rounded-lg ${
                isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden border-t ${
            isDark ? 'border-gray-800' : 'border-gray-200'
          }`}>
            <div className="px-4 py-3 space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? isDark
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : isDark
                          ? 'text-gray-300 hover:bg-gray-800'
                          : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </Link>
                );
              })}
              <div className={`mt-3 pt-3 border-t ${
                isDark ? 'border-gray-800' : 'border-gray-200'
              }`}>
                <div className={`px-4 py-2 rounded-lg ${
                  isDark ? 'bg-gray-800' : 'bg-gray-100'
                }`}>
                  <p className={`text-sm font-medium ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>
                    {user?.username}
                  </p>
                  <p className={`text-xs ${
                    isDark ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {user?.email}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
