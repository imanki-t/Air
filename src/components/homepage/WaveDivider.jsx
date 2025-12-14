import React from 'react';

const WaveDivider = ({ darkMode }) => {
    return (
        <div className={`relative z-10 w-full h-24 mt-20 overflow-hidden`}>
            <svg className="absolute w-full min-w-[1000px] h-24 transform rotate-180" viewBox="0 0 1200 120" preserveAspectRatio="none">
                <path
                    d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
                    className={`${darkMode ? 'fill-gray-900' : 'fill-gray-50'}`}
                ></path>
            </svg>
        </div>
    );
};

export default WaveDivider;
