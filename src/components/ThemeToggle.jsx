// src/components/ThemeToggle.jsx
import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = () => {
  const { theme, changeTheme, isDark } = useTheme();

  const themes = [
    { value: 'light', label: 'Light', icon: '☀️' },
    { value: 'dark', label: 'Dark', icon: '🌙' },
    { value: 'system', label: 'System', icon: '💻' }
  ];

  return (
    <div className={`flex gap-2 p-1 rounded-lg ${
      isDark ? 'bg-gray-800' : 'bg-gray-100'
    }`}>
      {themes.map(({ value, label, icon }) => (
        <button
          key={value}
          onClick={() => changeTheme(value)}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
            theme === value
              ? isDark
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-blue-600 shadow-md'
              : isDark
                ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
          }`}
        >
          <span className="mr-2">{icon}</span>
          {label}
        </button>
      ))}
    </div>
  );
};

export default ThemeToggle;
