import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileActions = ({ menuRef, showMenu, setShowMenu, download, share, setShowDeleteConfirm, darkMode }) => {
    return (
        <div className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(prev => !prev);
                }}
                className={cn(
                    `p-1.5 rounded-full transition-colors duration-150`,
                    showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700')
                        : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'),
                    'backdrop-blur-sm bg-opacity-50'
                )}
                aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
            </button>

            {showMenu && (
                <div
                    ref={menuRef}
                    className={cn(
                        `absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border`,
                        `backdrop-blur-md`,
                        darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200'
                    )}
                    role="menu"
                >
                    <button onClick={download} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                        Get
                    </button>
                    <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>
                    <button onClick={share} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        Share
                    </button>
                    <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>
                    <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400' : 'text-red-600')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                    </button>
                </div>
            )}
        </div>
    );
};

export default FileActions;
