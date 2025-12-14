import React from 'react';

const ActionButtons = ({ handleUpload, handleRemove, message, pendingResume }) => {
    return (
        <div className="flex gap-3 mt-2">
            <button
                type="submit"
                onClick={handleUpload}
                className={`flex-1 px-4 py-2.5 text-white rounded-md font-medium transition-colors ${message.includes('Different file')
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                disabled={message.includes('Different file')}
            >
                {pendingResume ? 'Resume Upload' : 'Upload'}
            </button>
            <button
                type="button"
                onClick={handleRemove}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium transition-colors"
            >
                Remove
            </button>
        </div>
    );
};

export default ActionButtons;
