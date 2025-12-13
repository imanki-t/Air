import React from 'react';
import { motion } from 'framer-motion';
import {
  Folder,
  Refresh,
  Star,
  Trash,
  Cloud
} from '../ui/Icons';

const Sidebar = ({ currentView, setCurrentView, className = "" }) => {
  const menuItems = [
    {
      id: 'my-files',
      icon: <Folder size={20} />,
      label: 'My Files'
    },
    {
      id: 'recent',
      // Using Refresh as a proxy for "Recent/History" since Clock icon might be missing or under a different name
      icon: <Refresh size={20} />,
      label: 'Recent'
    },
    {
      id: 'starred',
      icon: <Star size={20} />,
      label: 'Starred'
    },
    {
      id: 'trash',
      icon: <Trash size={20} />,
      label: 'Trash'
    }
  ];

  return (
    <nav className={`space-y-1 ${className}`}>
      {menuItems.map((item) => {
          return (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 group ${
                currentView === item.id
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <span className={`transition-transform duration-200 ${currentView === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>
                 {item.icon}
              </span>
              {item.label}
              {item.id === 'my-files' && (
                  <span className="ml-auto text-xs bg-background/50 py-0.5 px-2 rounded-full border border-border">128</span>
              )}
            </button>
          )
      })}

      <div className="pt-8 mt-4 border-t border-border/50">
        <div className="px-3 mb-4 flex items-center gap-2">
          <Cloud size={16} className="text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Storage
          </h3>
        </div>
        <div className="px-3 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>450 GB used</span>
            <span>1 TB total</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '45%' }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full"
            />
          </div>
          <button className="text-xs text-primary hover:underline mt-2">Upgrade Plan</button>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
