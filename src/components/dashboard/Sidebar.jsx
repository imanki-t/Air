import React from 'react';
import { motion } from 'framer-motion';

const Sidebar = ({ currentView, setCurrentView, className = "" }) => {
  const menuItems = [
    {
      id: 'my-files',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
      label: 'My Files'
    },
    {
      id: 'recent',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      label: 'Recent'
    },
    {
      id: 'starred',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      label: 'Starred'
    },
    {
      id: 'trash',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      label: 'Trash'
    }
  ];

  return (
    <nav className={`space-y-1 ${className}`}>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => setCurrentView(item.id)}
          className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
            currentView === item.id
              ? 'bg-secondary text-secondary-foreground'
              : 'text-muted-foreground hover:bg-secondary/50 hover:text-foreground'
          }`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}

      <div className="pt-4 mt-4 border-t border-border">
        <div className="px-3 mb-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Storage
          </h3>
        </div>
        <div className="px-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Used</span>
            <span>45%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              className="h-full bg-primary rounded-full"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
