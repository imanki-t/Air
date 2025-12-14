import React from 'react';

const DownloadProgressOverlay = ({ progress }) => {
    return (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg backdrop-blur-sm">
            <div className="w-4/5 max-w-xs text-center">
                <div className="mb-1.5 text-xs font-medium text-white">Downloading... {progress}%</div>
                <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${progress}%` }}></div>
                </div>
            </div>
        </div>
    );
};

export default DownloadProgressOverlay;
