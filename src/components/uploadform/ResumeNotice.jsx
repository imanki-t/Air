import React from 'react';

const ResumeNotice = ({ pendingResume, getTruncatedFileName, handleResumeUpload, handleCancelResume, darkMode }) => {
    return (
        <div className={`mb-6 p-5 rounded-lg ${darkMode ? 'bg-blue-800/40 border border-blue-600' : 'bg-blue-50 border border-blue-400'}`}>
            <div className="mb-4">
                <h4 className={`text-lg font-semibold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                    Resume Previous Upload
                </h4>
                <p className={`text-sm mt-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Your previous upload of "{getTruncatedFileName(pendingResume.fileName)}"
                    was interrupted at {pendingResume.progress}%.
                </p>
            </div>
            <div className="flex justify-center -space-x-1 -mt-1">
                <button
                    type="button"
                    onClick={handleResumeUpload}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors mr-4"
                >
                    Resume
                </button>
                <button
                    type="button"
                    onClick={handleCancelResume}
                    className={`flex-1 px-4 py-2.5 rounded-md font-medium transition-colors ${darkMode
                        ? 'bg-gray-700 hover:bg-gray-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                        }`}
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};

export default ResumeNotice;
