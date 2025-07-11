import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const ArrowLeftIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
);

const ArrowRightIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
);

const Pagination = ({
    isPaginationEnabled,
    visibleFiles,
    currentPage,
    totalPages,
    handlePageNavigation,
    isEditingPage,
    editPageValue,
    setEditPageValue,
    handlePageInput,
    handlePageInputBlur,
    handlePageEdit,
    pageInputRef,
    darkMode,
    isLoading
}) => {
    if (!isPaginationEnabled || visibleFiles.length === 0) {
        return (
            isPaginationEnabled && !isLoading && (
                <div className={cn("text-center mt-6 text-sm", darkMode ? "text-gray-500" : "text-gray-400")}>
                    No files match your criteria.
                </div>
            )
        );
    }

    return (
        <div className={cn(
            'flex items-center justify-center gap-2 sm:gap-3 mt-8',
            darkMode ? 'text-gray-300' : 'text-gray-700'
        )}>
            <button
                onClick={() => handlePageNavigation(currentPage - 1)}
                disabled={currentPage === 1}
                className={cn(
                    'p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
                    'focus:outline-none focus:ring-2',
                    currentPage === 1
                        ? (darkMode ? 'bg-gray-750 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300 hover:border-gray-400')
                )}
                aria-label="Previous Page"
                title="Previous Page"
            >
                <ArrowLeftIcon className="w-5 h-5" />
            </button>

            <span className="text-sm text-center mx-1">
                <span className="hidden md:inline">Page </span>
                {isEditingPage ? (
                    <input
                        ref={pageInputRef}
                        type="number"
                        min="1"
                        max={totalPages}
                        value={editPageValue}
                        onChange={(e) => setEditPageValue(e.target.value)}
                        onKeyDown={handlePageInput}
                        onBlur={handlePageInputBlur}
                        className={cn(
                            'w-16 text-center p-1.5 rounded-md text-sm border',
                            darkMode ? 'bg-gray-700 border-gray-600 text-gray-200 focus:ring-blue-500 focus:border-blue-500'
                                : 'bg-white border-gray-300 text-gray-800 focus:ring-blue-600 focus:border-blue-600'
                        )}
                        aria-label="Current page number input"
                    />
                ) : (
                    <span
                        className={cn(
                            "font-medium px-2 py-1 rounded-md cursor-pointer hover:underline",
                            darkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-black'
                        )}
                        onClick={handlePageEdit}
                    >
                        {currentPage}
                    </span>
                )}
                of {totalPages}
            </span>

            <button
                onClick={() => handlePageNavigation(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={cn(
                    'p-2.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center',
                    'focus:outline-none focus:ring-2',
                    currentPage === totalPages
                        ? (darkMode ? 'bg-gray-750 text-gray-500 cursor-not-allowed ring-gray-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed ring-gray-300')
                        : (darkMode ? 'bg-gray-700 hover:bg-gray-600 text-gray-200 focus:ring-gray-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 focus:ring-blue-500 border border-gray-300 hover:border-gray-400')
                )}
                aria-label="Next Page"
                title="Next Page"
            >
                <ArrowRightIcon className="w-5 h-5" />
            </button>
        </div>
    );
};

export default Pagination;
