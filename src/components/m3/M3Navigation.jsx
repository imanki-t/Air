import React from 'react';
import { Home, Clock, Star, Trash2 } from 'lucide-react';

const M3Navigation = ({ currentView, onViewChange, isMobile }) => {
  const items = [
    { id: 'my-files', label: 'My Files', icon: <Home size={24} /> },
    { id: 'recent', label: 'Recent', icon: <Clock size={24} /> },
    { id: 'starred', label: 'Starred', icon: <Star size={24} /> },
    { id: 'trash', label: 'Trash', icon: <Trash2 size={24} /> },
  ];

  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-surface-container shadow-[0_-2px_10px_rgba(0,0,0,0.1)] h-20 pb-4 flex justify-around items-center z-40">
        {items.map(item => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className="flex flex-col items-center justify-center w-full h-full"
          >
            <div className={`
              w-16 h-8 rounded-full flex items-center justify-center mb-1 transition-colors
              ${currentView === item.id ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant'}
            `}>
              {item.icon}
            </div>
            <span className={`text-xs font-medium ${currentView === item.id ? 'text-on-surface' : 'text-on-surface-variant'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    );
  }

  // Desktop Navigation Rail
  return (
    <div className="w-20 lg:w-64 h-full bg-surface-container py-4 flex flex-col items-center lg:items-start transition-all duration-300">
      <div className="mb-8 px-4 lg:px-6 w-full flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-on-primary font-bold text-xl">
           A
        </div>
        <span className="hidden lg:block text-on-surface font-bold text-xl">Airstream</span>
      </div>

      <div className="w-full space-y-2 px-2">
        {items.map(item => (
           <button
             key={item.id}
             onClick={() => onViewChange(item.id)}
             className={`
               w-full flex items-center gap-3 p-3 lg:px-6 rounded-full transition-colors
               ${currentView === item.id ? 'bg-secondary-container text-on-secondary-container' : 'text-on-surface-variant hover:bg-surface-container-high'}
             `}
           >
              <div className="flex items-center justify-center">
                 {item.icon}
              </div>
              <span className="hidden lg:block font-medium text-sm">{item.label}</span>
           </button>
        ))}
      </div>
    </div>
  );
};

export default M3Navigation;
