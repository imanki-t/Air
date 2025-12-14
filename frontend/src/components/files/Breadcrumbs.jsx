import React from 'react';
import { useFileSystem } from '../../context/FileSystemContext';
import { FaHome, FaChevronRight, FaFolder } from 'react-icons/fa';

const Breadcrumbs = () => {
  const { folderPath, navigateToFolder } = useFileSystem();

  return (
    <nav className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-4 overflow-x-auto whitespace-nowrap pb-2 scrollbar-hide">
      <button
        onClick={() => navigateToFolder(null)}
        className="flex items-center hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
      >
        <FaHome className="mr-1 text-lg" />
        <span className="font-medium">Home</span>
      </button>

      {folderPath.map((folder, index) => (
        <React.Fragment key={folder._id}>
          <FaChevronRight className="mx-2 text-gray-400 text-xs" />
          <button
            onClick={() => navigateToFolder(folder)}
            className={`flex items-center transition-colors ${
              index === folderPath.length - 1
                ? 'text-gray-900 dark:text-white font-bold pointer-events-none'
                : 'hover:text-blue-600 dark:hover:text-blue-400'
            }`}
          >
            <FaFolder className="mr-1.5" />
            {folder.name}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
