import React from 'react';
import { Search, User, Settings } from 'lucide-react';

const M3TopAppBar = ({
  user,
  onProfileClick,
  onSettingsClick,
  searchQuery,
  setSearchQuery
}) => {
  return (
    <div className="h-16 px-4 flex items-center justify-between bg-surface text-on-surface sticky top-0 z-30">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl mx-auto">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <Search size={20} className="text-on-surface-variant group-focus-within:text-primary" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Drive"
            className="
               block w-full rounded-full bg-surface-container-high border-none
               py-2.5 pl-10 pr-4 text-on-surface placeholder-on-surface-variant
               focus:ring-2 focus:ring-primary/20 focus:bg-surface
               transition-all shadow-sm
            "
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 ml-4">
         <button onClick={onSettingsClick} className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors">
            <Settings size={24} />
         </button>
         <button onClick={onProfileClick} className="ml-1">
            {user?.avatar ? (
               <img src={user.avatar} alt="Profile" className="w-9 h-9 rounded-full border border-outline-variant" />
            ) : (
               <div className="w-9 h-9 rounded-full bg-tertiary-container text-on-tertiary-container flex items-center justify-center font-bold text-sm">
                  {user?.username?.[0]?.toUpperCase() || 'U'}
               </div>
            )}
         </button>
      </div>
    </div>
  );
};

export default M3TopAppBar;
