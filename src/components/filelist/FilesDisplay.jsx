import React from 'react';
import FileItem from '../FileItem';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const FileItemSkeleton = ({ darkMode }) => (
    <div className={cn(
        'w-full h-[180px] flex flex-col p-3 rounded-xl shadow-md border animate-pulse',
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    )}>
        <div className={cn('h-28 mb-2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
        <div className={cn('h-4 w-3/4 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
        <div className="mt-2 space-y-2">
            <div className={cn('h-3 w-1/2 rounded-md', darkMode ? 'bg-gray-700' : 'bg-gray-200')}></div>
        </div>
    </div>
);

const FilesDisplay = ({
    isLoading,
    paginatedFiles,
    view,
    darkMode,
    showMetadata,
    handleSelectFile,
    selectedFiles,
    selectionMode,
    refresh,
    searchInput
}) => {
    return (
        <div className="min-h-[250px]">
            {isLoading ? (
                <div className={cn(
                    'grid gap-4',
                    view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
                )}>
                    {Array(view === 'grid' ? 10 : 5).fill().map((_, i) => (
                        <FileItemSkeleton key={`skel-${i}`} darkMode={darkMode} />
                    ))}
                </div>
            ) : paginatedFiles.length > 0 ? (
                <div className={cn(
                    'grid gap-4',
                    view === 'grid' ? 'grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'grid-cols-1'
                )}>
                    {paginatedFiles.map(file => (
                        <FileItem
                            key={file._id}
                            file={file}
                            darkMode={darkMode}
                            showDetails={showMetadata}
                            viewType={view}
                            onSelect={handleSelectFile}
                            isSelected={selectedFiles.includes(file._id)}
                            selectionMode={selectionMode}
                            refresh={refresh}
                        />
                    ))}
                </div>
            ) : (
                <div className={cn(
                    'text-center py-16 rounded-lg border-2 border-dashed min-h-[200px]',
                    darkMode ? 'text-gray-500 border-gray-700 bg-gray-800/30' : 'text-gray-400 border-gray-300 bg-gray-50/50'
                )}>
                    <svg className="mx-auto h-12 w-12 mb-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <h3 className="text-lg font-medium mb-1 text-gray-500">No files found</h3>
                    <p className="text-sm text-gray-400">
                        {searchInput ? 'Try adjusting your search or filter.' : 'Upload some files!'}
                    </p>
                </div>
            )}
        </div>
    );
};

export default FilesDisplay;
