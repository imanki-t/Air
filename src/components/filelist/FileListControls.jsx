import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileListControls = ({
    searchInput,
    setSearchInput,
    isPaginationEnabled,
    setIsPaginationEnabled,
    selectionMode,
    toggleSelectionMode,
    showMetadata,
    setShowMetadata,
    sortOption,
    filter,
    showSortOptions,
    setShowSortOptions,
    setSortOption,
    setFilter,
    view,
    setView,
    darkMode,
    sortButtonRef,
    sortOptionsRef
}) => {
    return (
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 items-center justify-between flex-wrap">
            <div className="relative flex-grow w-full md:w-auto md:flex-grow-[2]">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', darkMode ? 'text-gray-400' : 'text-gray-500')} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                </div>
                <input
                    type="text"
                    placeholder="Search files..."
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    className={cn(
                        'w-full pl-10 pr-4 py-2 rounded-lg transition-colors duration-200 border text-sm',
                        darkMode
                            ? 'bg-gray-800 text-white border-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500'
                            : 'bg-gray-50 text-gray-900 border-gray-300 focus:ring-1 focus:ring-blue-600 focus:border-blue-600 placeholder-gray-400'
                    )}
                    aria-label="Search files"
                />
            </div>

            <div className="flex gap-2 items-center flex-wrap justify-center md:justify-end flex-grow md:flex-grow-0">
                <button
                    onClick={() => setIsPaginationEnabled(prev => !prev)}
                    className={cn(
                        'p-2 rounded-md transition-colors duration-200',
                        isPaginationEnabled
                            ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    )}
                    aria-label={isPaginationEnabled ? "Disable pagination" : "Enable pagination"}
                    aria-pressed={isPaginationEnabled}
                    title={isPaginationEnabled ? "Disable Pagination" : "Enable Pagination"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {isPaginationEnabled ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                        )}
                    </svg>
                </button>

                <button
                    onClick={toggleSelectionMode}
                    className={cn(
                        'p-2 rounded-md transition-colors duration-200',
                        selectionMode
                            ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    )}
                    aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"}
                    aria-pressed={selectionMode}
                    title={selectionMode ? "Exit selection mode" : "Select multiple files"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className={cn('h-5 w-5', selectionMode ? '' : (darkMode ? 'text-gray-300' : 'text-gray-600'))} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        {selectionMode
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h18v18H3V3z" />
                        }
                    </svg>
                </button>

                <button
                    onClick={() => setShowMetadata(!showMetadata)}
                    className={cn(
                        'p-2 rounded-md transition-colors duration-200',
                        showMetadata
                            ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                            : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    )}
                    aria-label={showMetadata ? "Hide file details" : "Show file details"}
                    aria-pressed={showMetadata}
                    title={showMetadata ? "Hide details" : "Show details"}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </button>

                <div className="relative">
                    <button
                        ref={sortButtonRef}
                        onClick={() => setShowSortOptions(prev => !prev)}
                        className={cn(
                            'p-2 rounded-md transition-colors duration-200',
                            sortOption !== 'default' || filter !== 'all'
                                ? (darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-500 text-white hover:bg-blue-600')
                                : darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label="Sort and filter options"
                        aria-haspopup="true"
                        aria-expanded={showSortOptions}
                        title="Sort & Filter"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l4-4m0 0l4 4M7 4v12" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 16l-4 4m0 0l-4-4m4 4V8" />
                        </svg>
                    </button>
                    {showSortOptions && (
                        <div
                            ref={sortOptionsRef}
                            className={cn(
                                'absolute -right-2 mt-2 w-56 rounded-lg shadow-xl z-20 border overflow-hidden',
                                'max-h-[40vh] sm:max-h-[75vh] overflow-y-auto',
                                darkMode ? 'bg-gray-800 border-gray-700 divide-gray-700' : 'bg-white border-gray-200 divide-gray-200',
                                'divide-y'
                            )}
                            role="menu"
                        >
                            <div>
                                <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Sort by</div>
                                {[
                                    { label: 'Default', id: 'default' },
                                    { label: 'Oldest', id: 'date' },
                                    { label: 'Name (A-Z)', id: 'name-asc' },
                                    { label: 'Name (Z-A)', id: 'name-desc' },
                                    { label: 'Larger Files', id: 'size-desc' },
                                    { label: 'Smaller Files', id: 'size-asc' },
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => { setSortOption(opt.id); setShowSortOptions(false); }}
                                        className={cn(
                                            'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                                            sortOption === opt.id
                                                ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                                                : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                                        )}
                                        role="menuitemradio" aria-checked={sortOption === opt.id}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>

                            <div>
                                <div className={cn('px-4 py-2 text-xs font-semibold uppercase tracking-wider', darkMode ? 'text-gray-400' : 'text-gray-500')}>Filter by Type</div>
                                {['all', 'image', 'video', 'audio', 'document', 'other'].map(type => (
                                    <button
                                        key={type}
                                        onClick={() => { setFilter(type); setShowSortOptions(false); }}
                                        className={cn(
                                            'flex items-center w-full px-4 py-2 text-sm transition-colors duration-150 text-left',
                                            filter === type
                                                ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-700 font-medium')
                                                : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                                        )}
                                        role="menuitemradio" aria-checked={filter === type}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={cn('flex items-center rounded-md overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-200')}>
                    <button
                        onClick={() => setView('list')}
                        className={cn('p-2 transition-colors duration-200',
                            view === 'list' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label="List view" aria-pressed={view === 'list'} title="List View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                        </svg>
                    </button>
                    <button
                        onClick={() => setView('grid')}
                        className={cn('p-2 transition-colors duration-200',
                            view === 'grid' ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') : darkMode ? 'text-gray-300 hover:bg-gray-600' : 'text-gray-600 hover:bg-gray-300'
                        )}
                        aria-label="Grid view" aria-pressed={view === 'grid'} title="Grid View"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileListControls;

