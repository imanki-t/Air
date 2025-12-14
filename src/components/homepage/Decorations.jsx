import React from 'react';

const Decorations = ({ darkMode }) => {
    const renderDecorations = () => {
        const decorations = [];
        const doodleShapes = [
            "M10,10 Q30,5 50,30 T90,40", "M5,20 C20,5 40,60 60,10 S80,50 95,20",
            "M10,30 Q40,5 70,30 T90,25", "M5,40 C40,10 60,60 95,30",
            "M10,50 Q25,25 40,50 T70,30",
        ];

        for (let i = 0; i < 15; i++) {
            decorations.push(
                <div
                    key={`dot-${i}`}
                    className={`absolute rounded-full ${darkMode ? 'bg-blue-400/20' : 'bg-red-400/20'} animate-float`}
                    style={{
                        width: `${Math.floor(Math.random() * 6) + 2}px`,
                        height: `${Math.floor(Math.random() * 6) + 2}px`,
                        top: `${Math.floor(Math.random() * 100)}%`,
                        left: `${Math.floor(Math.random() * 100)}%`,
                        animationDelay: `${Math.random() * 5}s`,
                    }}
                />
            );
        }

        for (let i = 0; i < 5; i++) {
            decorations.push(
                <div
                    key={`blob-${i}`}
                    className={`absolute rounded-full filter blur-xl opacity-20 animate-blob ${darkMode ? 'bg-primaryBlue/30' : 'bg-primaryRed/30'}`}
                    style={{
                        width: `${Math.floor(Math.random() * 150) + 50}px`,
                        height: `${Math.floor(Math.random() * 150) + 50}px`,
                        top: `${Math.floor(Math.random() * 100)}%`,
                        left: `${Math.floor(Math.random() * 100)}%`,
                        animationDelay: `${Math.random() * 10}s`,
                    }}
                />
            );
        }

        for (let i = 0; i < 10; i++) {
            decorations.push(
                <svg
                    key={`doodle-${i}`}
                    className="absolute opacity-10 pointer-events-none"
                    width="40" height="20"
                    style={{
                        top: `${Math.floor(Math.random() * 90) + 5}%`,
                        left: `${Math.floor(Math.random() * 90) + 5}%`,
                        transform: `scale(${(Math.random() * 0.5) + 0.5}) rotate(${Math.floor(Math.random() * 360)}deg)`,
                    }}
                >
                    <path d={doodleShapes[Math.floor(Math.random() * doodleShapes.length)]} fill="none" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="2" />
                </svg>
            );
        }

        for (let i = 0; i < 15; i++) {
            decorations.push(
                <div
                    key={`particle-${i}`}
                    className={`absolute ${darkMode ? 'bg-blue-300' : 'bg-red-300'} rounded-full`}
                    style={{
                        width: `${Math.floor(Math.random() * 3) + 1}px`,
                        height: `${Math.floor(Math.random() * 3) + 1}px`,
                        top: `${Math.floor(Math.random() * 100)}%`,
                        left: `${Math.floor(Math.random() * 100)}%`,
                        opacity: 0.3,
                        animation: `float ${(Math.random() * 10) + 10}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 5}s`,
                    }}
                />
            );
        }
        return decorations;
    };

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {renderDecorations()}
            <div
                className={`absolute inset-0`}
                style={{
                    backgroundImage: darkMode
                        ? `linear-gradient(to right, rgba(66, 135, 245, 0.2) 1px, transparent 1px), linear-gradient(to bottom, rgba(66, 135, 245, 0.2) 1px, transparent 1px)`
                        : `linear-gradient(to right, rgba(139, 0, 0, 0.3) 1px, transparent 1px), linear-gradient(to bottom, rgba(139, 0, 0, 0.3) 1px, transparent 1px)`,
                    backgroundSize: '30px 30px',
                    backgroundColor: darkMode ? '#0f172a' : '#ffffff',
                }}
            ></div>
            <div className={`absolute top-28 left-0 w-32 h-32 md:w-64 md:h-64 -translate-x-1/2 -translate-y-1/2 rounded-full ${darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'} blur-xl`}></div>
            <div className={`absolute bottom-0 right-0 w-40 h-40 md:w-80 md:h-80 translate-x-1/3 translate-y-1/3 rounded-full ${darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'} blur-xl`}></div>
        </div>
    );
};

export default Decorations;
