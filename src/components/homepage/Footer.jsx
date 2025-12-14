import React from 'react';

const Footer = ({ darkMode }) => {
    return (
        <footer className={`relative z-10 px-6 py-10 border-t ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
            <div className="mx-auto max-w-7xl">
                <div className="flex flex-col items-center justify-between md:flex-row">
                    <div className="flex items-center space-x-2">
                        <img src="air.png" alt="Airstream" className="w-10 h-10 rounded-lg" />
                        <span className="text-2xl font-bold tracking-tight">Airstream</span>
                    </div>
                    <p className="mt-4 text-sm opacity-60 md:mt-0">
                        © {new Date().getFullYear()} Airstream CLOUD
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
