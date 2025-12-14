// src/context/ThemeContext.jsx - Theme Context
import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from './AuthContext';
import axios from 'axios';

const ThemeContext = createContext(null);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [theme, setTheme] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');

  const API_URL = import.meta.env.VITE_BACKEND_URL;

  // Initialize theme from user preference or localStorage
  useEffect(() => {
    if (user?.theme) {
      setTheme(user.theme);
    } else {
      const savedTheme = localStorage.getItem('theme') || 'system';
      setTheme(savedTheme);
    }
  }, [user]);

  // Resolve theme based on system preference
  useEffect(() => {
    const resolveTheme = () => {
      if (theme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
      }
      return theme;
    };

    setResolvedTheme(resolveTheme());

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => setResolvedTheme(e.matches ? 'dark' : 'light');
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const changeTheme = async (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);

    if (user) {
      try {
        await axios.put(`${API_URL}/api/auth/change-theme`, { theme: newTheme });
        updateUser({ theme: newTheme });
      } catch (error) {
        console.error('Failed to update theme:', error);
      }
    }
  };

  const value = {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === 'dark',
    changeTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
