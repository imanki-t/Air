import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  FaFolder,
  FaClock,
  FaStar,
  FaTrash,
  FaLink,
  FaCloud,
  FaBars,
  FaTimes
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import { useFileSystem } from '../../context/FileSystemContext';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user } = useAuth();
  const { refresh } = useFileSystem();

  // Navigation Items
  const navItems = [
    { name: 'My Files', path: '/dashboard/files', icon: <FaFolder />, end: false },
    { name: 'Recent', path: '/dashboard/recent', icon: <FaClock />, end: true },
    { name: 'Starred', path: '/dashboard/starred', icon: <FaStar />, end: true },
    { name: 'Trash', path: '/dashboard/trash', icon: <FaTrash />, end: true },
    { name: 'Shared Links', path: '/dashboard/shared', icon: <FaLink />, end: true },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={toggleSidebar}
      />

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-30 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} flex flex-col`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100 dark:border-gray-700">
           <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-500">
              <FaCloud className="text-2xl" />
              <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">AIRSTREAM</span>
           </div>
           <button onClick={toggleSidebar} className="ml-auto md:hidden text-gray-500">
             <FaTimes />
           </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
           {navItems.map((item) => (
             <NavLink
               key={item.path}
               to={item.path}
               end={item.end}
               onClick={() => {
                   if (window.innerWidth < 768) toggleSidebar();
                   if (item.name === 'My Files') refresh(); // Refresh when clicking root
               }}
               className={({ isActive }) => `
                  flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors
                  ${isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'}
               `}
             >
               <span className="mr-3 text-lg">{item.icon}</span>
               {item.name}
             </NavLink>
           ))}
        </nav>

        {/* Storage Info (Simplified as requested) */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
           <div className="flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
              <span>Storage</span>
              <span>{formatBytes(user?.storageUsed || 0)} / {formatBytes(user?.storageLimit || 15 * 1024 * 1024 * 1024)}</span>
           </div>
           <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${Math.min(((user?.storageUsed || 0) / (user?.storageLimit || 1)) * 100, 100)}%` }}
              ></div>
           </div>
        </div>
      </aside>
    </>
  );
};

// Helper
function formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export default Sidebar;
