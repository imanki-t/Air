import React from 'react';
import { Link } from 'react-router-dom';

const Hero = ({ isLoggedIn, darkMode }) => {
    return (
        <section className="relative z-10 px-6 pt-16 mx-auto max-w-7xl md:pt-24">
            <div className="text-center">
                <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
                    YOUR PERSONAL <span className={darkMode ? 'text-primaryBlue' : 'text-primaryRed'}>CLOUD FILE</span> SERVICE
                </h1>
                <p className="max-w-2xl mx-auto mt-6 text-xl">
                    Organize, access, and secure your files with an elegant, efficient, and personalized experience.
                </p>
                <div className="mt-10">
                    <Link to={isLoggedIn ? "/dashboard" : "/login"}>
                        <button className={`px-8 py-3 text-lg font-medium rounded-md shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode
                            ? 'bg-primaryBlue text-white hover:bg-blue-600 focus:ring-blue-500'
                            : 'bg-primaryRed text-white hover:bg-red-600 focus:ring-red-500'
                            }`}>
                            Dashboard
                        </button>
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default Hero;
