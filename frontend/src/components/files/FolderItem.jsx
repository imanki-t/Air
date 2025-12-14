import React from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { FaFolder, FaFolderOpen } from 'react-icons/fa';

const FolderItem = ({ folder }) => {
  const { navigateToFolder, selection, toggleSelection, viewMode } = useFileSystem();
  const isSelected = selection.includes(folder._id);

  const handleClick = (e) => {
      // If ctrl/cmd key is pressed, toggle selection
      if (e.ctrlKey || e.metaKey) {
          e.stopPropagation();
          toggleSelection(folder._id, true);
      } else {
          // If in simple click mode, maybe just select?
          // Double click handles navigation.
          // For mobile, tap to nav? or Long press to select?
          // Let's stick to Desktop standard: Click = Select, Double Click = Nav
          // But wait, if single click selects, how to nav on mobile?
          // Mobile: Tap = Nav, Long Press = Select context.
          // Let's implement Click = Nav for simplicity in this web app unless selecting.
          e.stopPropagation();
          navigateToFolder(folder);
      }
  };

  const handleSelect = (e) => {
      e.stopPropagation();
      toggleSelection(folder._id, true);
  };

  if (viewMode === 'list') {
      return (
        <div
            onClick={handleClick}
            className={`flex items-center p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
        >
            <div className="mr-4 text-yellow-500 text-xl">
                {isSelected ? <FaFolderOpen /> : <FaFolder />}
            </div>
            <span className="flex-1 font-medium text-gray-700 dark:text-gray-200 truncate">{folder.name}</span>
            <span className="text-xs text-gray-400">Folder</span>
        </div>
      );
  }

  return (
    <div
        onClick={handleClick}
        className={`group relative flex flex-col items-center p-4 rounded-xl transition-all duration-200 cursor-pointer border ${isSelected ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
    >
      <div className="text-5xl text-yellow-400 mb-2 drop-shadow-sm transition-transform group-hover:scale-110">
         {isSelected ? <FaFolderOpen /> : <FaFolder />}
      </div>
      <span className="text-sm font-medium text-center text-gray-700 dark:text-gray-200 truncate w-full px-2">
         {folder.name}
      </span>

      {/* Selection Checkbox (Visible on hover or selected) */}
      <div
        onClick={handleSelect}
        className={`absolute top-2 right-2 p-1 rounded-full ${isSelected ? 'text-blue-600 bg-white' : 'text-gray-400 opacity-0 group-hover:opacity-100'} transition-opacity`}
      >
        <div className={`w-4 h-4 border-2 rounded-sm ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-400'}`}></div>
      </div>
    </div>
  );
};

export default FolderItem;
