import React from 'react';

const UploadProgress = ({ progress, uploadSpeed, estimatedTime, formatBytes, darkMode, handleCancel }) => {
    return (
        <div className="mb-4">
            <div className={`w-full rounded-full h-6 mb-3 overflow-hidden ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div
                    className="bg-blue-600 h-full transition-all duration-200 ease-in-out"
                    style={{ width: `${progress}%` }}
                >
                    <div className="w-full h-full opacity-30 bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
                </div>
            </div>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-2">
                    <div className={`text-base font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                        Progress: {progress}%
                    </div>
                </div>
                <div className={`text-sm mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Upload speed: {uploadSpeed > 0 ? formatBytes(uploadSpeed) + '/s' : 'Calculating...'}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    Estimated time: {estimatedTime}
                </div>
            </div>

            <div className="mt-4">
                <button
                    type="button"
                    onClick={handleCancel}
                    className="w-full px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
                >
                    Cancel Upload
                </button>
            </div>
        </div>
    );
};

export default UploadProgress;
