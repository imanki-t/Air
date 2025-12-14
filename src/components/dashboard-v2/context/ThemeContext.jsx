import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { lightTheme, darkTheme, getColor } from '../theme/colors';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children, initialTheme = 'light' }) => {
  // Try to get theme from localStorage, fallback to system preference or initialTheme
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem('app-theme');
    if (savedTheme) return savedTheme;

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return initialTheme;
  };

  const [mode, setMode] = useState(getInitialTheme);

  useEffect(() => {
    localStorage.setItem('app-theme', mode);
    // Apply background color to body for smooth transitions
    document.body.style.backgroundColor = mode === 'dark' ? darkTheme.background : lightTheme.background;
    document.body.style.color = mode === 'dark' ? darkTheme.onBackground : lightTheme.onBackground;
  }, [mode]);

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode) => {
    if (newMode === 'light' || newMode === 'dark') {
      setMode(newMode);
    }
  };

  const themeValues = useMemo(() => {
    const isDark = mode === 'dark';
    const activeTheme = isDark ? darkTheme : lightTheme;

    return {
      mode,
      isDark,
      colors: activeTheme,
      toggleTheme,
      setTheme,
      getColor: (role) => getColor(role, isDark),
    };
  }, [mode]);

  return (
    <ThemeContext.Provider value={themeValues}>
      {children}
    </ThemeContext.Provider>
  );
};
