import React from 'react';

const Navbar = ({ darkMode }) => {
    return (
        <nav className={`relative z-10 px-6 py-6 mx-auto max-w-7xl ${darkMode ? 'bg-gray-950' : 'bg-white'}`}>
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <img src="air.png" alt="Airstream" className="w-20 h-20 rounded-lg" />
                    <span className="text-4xl font-extrabold tracking-tight">AIRSTREAM</span>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
