import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileListHeader = ({ visibleFiles, filter, darkMode }) => {
    return (
        <div className="text-center mb-6">
            <h2 className={cn('text-2xl font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                Your Files
            </h2>
            <span className={cn('text-sm px-3 py-1 rounded-full inline-block transition-all duration-200',
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
            )}>
                {visibleFiles.length} item{visibleFiles.length !== 1 ? 's' : ''}{filter !== 'all' ? ` (${filter})` : ''}
            </span>
        </div>
    );
};

export default FileListHeader;
