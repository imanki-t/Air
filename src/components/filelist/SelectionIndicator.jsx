import React from 'react';

const cn = (...classes) => classes.filter(Boolean).join(' ');

const SelectionIndicator = ({ isSelected, darkMode }) => {
    return (
        <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150",
            isSelected
                ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500')
                : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80')
        )}>
            {isSelected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            )}
        </div>
    );
};

export default SelectionIndicator;
