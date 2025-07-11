import React, { useState, useEffect } from 'react';
import Decorations from './homepage/Decorations';
import Navbar from './homepage/Navbar';
import Hero from './homepage/Hero';
import Features from './homepage/Features';
import CTA from './homepage/CTA';
import Footer from './homepage/Footer';
import WaveDivider from './homepage/WaveDivider';

const Homepage = ({ isLoggedIn }) => {
    const [darkMode, setDarkMode] = useState(false);

    useEffect(() => {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setDarkMode(prefersDark);

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e) => setDarkMode(e.matches);
        mediaQuery.addEventListener('change', handleChange);

        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    return (
        <div className={`min-h-screen relative overflow-hidden font-inter transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
            <Decorations darkMode={darkMode} />

            <Navbar darkMode={darkMode} />

            <Hero isLoggedIn={isLoggedIn} darkMode={darkMode} />

            <WaveDivider darkMode={darkMode} />

            <Features darkMode={darkMode} />

            <CTA isLoggedIn={isLoggedIn} darkMode={darkMode} />

            <Footer darkMode={darkMode} />
        </div>
    );
};

export default Homepage;
