import React from 'react';
import { Link } from 'react-router-dom';

const CTA = ({ isLoggedIn, darkMode }) => {
    return (
        <section className="relative z-10 px-6 py-16 mx-auto max-w-7xl">
            <div className={`p-10 text-center rounded-2xl overflow-hidden relative ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                <div className="absolute inset-0 opacity-30 overflow-hidden">
                    {Array.from({ length: 10 }).map((_, i) => (
                        <div
                            key={`cta-deco-${i}`}
                            className={`absolute rounded-full ${darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'} animate-float`}
                            style={{
                                width: `${Math.random() * 100 + 50}px`,
                                height: `${Math.random() * 100 + 50}px`,
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 5}s`,
                                animationDuration: `${Math.random() * 10 + 15}s`,
                            }}
                        />
                    ))}
                </div>
                <div className="relative z-10">
                    <h2 className="text-3xl font-bold">Ready to Get Started?</h2>
                    <p className="max-w-2xl mx-auto mt-4 text-lg opacity-80">
                        Access your dashboard now and experience seamless file management designed just for you.
                    </p>
                    <div className="mt-8">
                        <Link to={isLoggedIn ? "/dashboard" : "/login"}>
                            <button className={`px-8 py-3 text-lg font-medium rounded-md shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${darkMode
                                ? 'bg-primaryBlue text-white hover:bg-blue-600 focus:ring-blue-500'
                                : 'bg-primaryRed text-white hover:bg-red-600 focus:ring-red-500'
                                }`}>
                                Go to Dashboard
                            </button>
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CTA;
