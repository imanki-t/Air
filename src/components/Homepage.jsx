import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Homepage = ({ isLoggedIn }) => {
  // State for managing theme
  const [darkMode, setDarkMode] = useState(false);

  // Detect system theme preference on component mount
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Dynamic grid elements that will render differently based on window size
  const renderDecorations = () => {
    // Array of decorative elements
    const decorations = [];

    // Generate floating dots
    for (let i = 0; i < 15; i++) {
      const size = Math.floor(Math.random() * 6) + 2;
      const top = Math.floor(Math.random() * 100);
      const left = Math.floor(Math.random() * 100);
      const delay = Math.random() * 5;

      decorations.push(
        <div
          key={`dot-${i}`}
          className={`absolute rounded-full ${darkMode ? 'bg-blue-400/20' : 'bg-red-400/20'}
                      animate-float`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            top: `${top}%`,
            left: `${left}%`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }

    // Generate blob shapes
    for (let i = 0; i < 5; i++) {
      const top = Math.floor(Math.random() * 100);
      const left = Math.floor(Math.random() * 100);
      const size = Math.floor(Math.random() * 150) + 50;
      const delay = Math.random() * 10;

      decorations.push(
        <div
          key={`blob-${i}`}
          className={`absolute rounded-full filter blur-xl opacity-20 animate-blob
                     ${darkMode ? 'bg-primaryBlue/30' : 'bg-primaryRed/30'}`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            top: `${top}%`,
            left: `${left}%`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }

    // Abstract doodles
    const doodleShapes = [
      "M10,10 Q30,5 50,30 T90,40",
      "M5,20 C20,5 40,60 60,10 S80,50 95,20",
      "M10,30 Q40,5 70,30 T90,25",
      "M5,40 C40,10 60,60 95,30",
      "M10,50 Q25,25 40,50 T70,30",
    ];
    for (let i = 0; i < 10; i++) {
      const top = Math.floor(Math.random() * 90) + 5;
      const left = Math.floor(Math.random() * 90) + 5;
      const scale = (Math.random() * 0.5) + 0.5;
      const rotate = Math.floor(Math.random() * 360);
      const shape = doodleShapes[Math.floor(Math.random() * doodleShapes.length)];
      decorations.push(
        <svg
          key={`doodle-${i}`}
          className="absolute opacity-10 pointer-events-none"
          width="40"
          height="20"
          style={{
            top: `${top}%`,
            left: `${left}%`,
            transform: `scale(${scale}) rotate(${rotate}deg)`,
          }}
        >
          <path
            d={shape}
            fill="none"
            stroke={darkMode ? "#3b82f6" : "#ef4444"}
            strokeWidth="2"
          />
        </svg>
      );
    }

    // Add particle effects - keeping these as they were in the original code
    for (let i = 0; i < 15; i++) {
      const size = Math.floor(Math.random() * 3) + 1;
      const top = Math.floor(Math.random() * 100);
      const left = Math.floor(Math.random() * 100);
      const delay = Math.random() * 5;
      const duration = (Math.random() * 10) + 10;

      decorations.push(
        <div
          key={`particle-${i}`}
          className={`absolute ${darkMode ? 'bg-blue-300' : 'bg-red-300'} rounded-full`}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            top: `${top}%`,
            left: `${left}%`,
            opacity: 0.3,
            animation: `float ${duration}s ease-in-out infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      );
    }


    // The grid lines and abstract corner shapes from the original renderDecorations will be handled separately
    // to ensure the grid background is applied correctly.
    return decorations; // Only return the random dots, blobs, doodles, and particles
  };

  return (
    <div className={`min-h-screen relative overflow-hidden font-inter transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {renderDecorations()}

        {/* Grid background - Applied conditionally based on dark mode */}
        <div
          className={`absolute inset-0`} // Removed grid-bg class to avoid conflicting styles
          style={{
            backgroundImage: darkMode
              ? `linear-gradient(to right, rgba(66, 135, 245, 0.2) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(66, 135, 245, 0.2) 1px, transparent 1px)` // Blue grid for dark mode
              : `linear-gradient(to right, rgba(139, 0, 0, 0.3) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(139, 0, 0, 0.3) 1px, transparent 1px)`, // Red grid for light mode
            backgroundSize: '30px 30px', // Adjust grid spacing here (same for both modes)
            backgroundColor: darkMode ? '#0f172a' : '#ffffff', // Explicitly set background color based on mode (Tailwind gray-950 and white)
          }}
        ></div>

         {/* Abstract corner shapes - Keeping these are decorative layers */}
        <div className={`absolute top-0 left-0 w-32 h-32 md:w-64 md:h-64 -translate-x-1/2 -translate-y-1/2 rounded-full ${darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'} blur-xl`}></div>
        <div className={`absolute bottom-0 right-0 w-40 h-40 md:w-80 md:h-80 translate-x-1/3 translate-y-1/3 rounded-full ${darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'} blur-xl`}></div>


      </div>

      {/* Navigation bar */}
      <nav className="relative z-10 px-6 py-6 mx-auto max-w-7xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {/* Logo - Increased size */}
            <img src="/android-chrome-512x512.png" alt="KUWUTEN Logo" className="w-20 h-20 rounded-lg" />
            {/* Adding back the "KUWUTEN" text */}
            <span className="text-4xl font-extrabold tracking-tight">KUWUTEN</span>
          </div>

          {/* The dashboard button next to KUWUTEN is removed */}

        </div>
      </nav>

      {/* Hero section */}
      <section className="relative z-10 px-6 pt-16 mx-auto max-w-7xl md:pt-24">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Your Personal <span className={darkMode ? 'text-primaryBlue' : 'text-primaryRed'}>File Management</span> System
          </h1>
          <p className="max-w-2xl mx-auto mt-6 text-xl">
            Organize, access, and secure your files with an elegant, efficient, and personalized experience.
          </p>
          <div className="mt-10">
            <Link to={isLoggedIn ? "/dashboard" : "/login"}>
              <button className={`px-8 py-3 text-lg font-medium rounded-md shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                darkMode
                  ? 'bg-primaryBlue text-white hover:bg-blue-600 focus:ring-blue-500'
                  : 'bg-primaryRed text-white hover:bg-red-600 focus:ring-red-500'
              }`}>
                Dashboard {/* Text is "Dashboard" */}
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* Abstract wave divider */}
      <div className={`relative z-10 w-full h-24 mt-20 overflow-hidden`}>
        <svg className="absolute w-full min-w-[1000px] h-24 transform rotate-180" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className={`${darkMode ? 'fill-gray-950' : 'fill-white'}`} /* Changed fill color to match dark mode background */
          ></path>
        </svg>
      </div>

      {/* Features section */}
      <section className={`relative z-10 px-6 py-16 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl font-bold text-center">Key Features</h2>
          <p className="max-w-2xl mx-auto mt-4 text-center text-lg opacity-80">
            Designed specifically for your personal needs
          </p>

          <div className="grid grid-cols-1 gap-8 mt-12 md:grid-cols-3">

            {/* Feature Card 1 */}
            <div className={`p-6 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:shadow-lg hover:shadow-blue-900/20'
                : 'bg-white hover:shadow-xl hover:shadow-red-200/50'
            }`}>
              <div className={`w-12 h-12 rounded-md ${darkMode ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Upload Files</h3>
              <p className="opacity-80">
                Intelligent file upload system.
              </p>
              {/* Image taken from public directory */}
              <img src="/feature1.jpg" alt="Feature 1" className="w-full h-40 mt-4 rounded-md object-cover" />
            </div>

            {/* Feature Card 2 */}
            <div className={`p-6 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:shadow-lg hover:shadow-blue-900/20'
                : 'bg-white hover:shadow-xl hover:shadow-red-200/50'
            }`}>
              <div className={`w-12 h-12 rounded-md ${darkMode ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Advance Resume</h3>
              <p className="opacity-80">
                Resume file upload, incase you refreshed it would help you.
              </p>
               {/* Image taken from public directory */}
              <img src="/feature2.jpg" alt="Feature 2" className="w-full h-40 mt-4 rounded-md object-cover" />
            </div>

            {/* Feature Card 3 */}
            <div className={`p-6 rounded-xl transition-all duration-300 transform hover:scale-105 ${
              darkMode
                ? 'bg-gray-800 hover:shadow-lg hover:shadow-blue-900/20'
                : 'bg-white hover:shadow-xl hover:shadow-red-200/50'
            }`}>
              <div className={`w-12 h-12 rounded-md ${darkMode ? 'bg-blue-500/20' : 'bg-red-500/20'} flex items-center justify-center mb-4`}>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold">Seamless Sync</h3>
              <p className="opacity-80">
                Effortlessly access your files across all your devices with real-time synchronization.
              </p>
              {/* Image taken from public directory */}
              <img src="/feature3.jpg" alt="Feature 3" className="w-full h-40 mt-4 rounded-md object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Second abstract wave divider */}
      <div className={`relative z-10 w-full h-24 mt-20 overflow-hidden`}>
        <svg className="absolute w-full min-w-[1000px] h-24 transform rotate-180" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            className={`${darkMode ? 'fill-gray-950' : 'fill-white'}`} /* Changed fill color to match dark mode background */
          ></path>
        </svg>
      </div>

      {/* CTA section */}
      <section className="relative z-10 px-6 py-16 mx-auto max-w-7xl">
        <div className={`p-10 text-center rounded-2xl overflow-hidden relative ${
          darkMode
            ? 'bg-gray-900'
            : 'bg-gray-50'
        }`}>
          {/* Background decorative elements - keeping these */}
          <div className="absolute inset-0 opacity-30 overflow-hidden">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={`cta-deco-${i}`}
                className={`absolute rounded-full ${
                  darkMode ? 'bg-primaryBlue/10' : 'bg-primaryRed/10'
                } animate-float`}
                style={{
                  width: `${Math.random() * 100 + 50}px`,
                  height: `${Math.random() * 100 + 50}px`,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 5}s`,
                  animationDuration:`${Math.random() * 10 + 15}s`,
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
                <button className={`px-8 py-3 text-lg font-medium rounded-md shadow-md transition-all duration-300 transform hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  darkMode
                    ? 'bg-primaryBlue text-white hover:bg-blue-600 focus:ring-blue-500'
                    : 'bg-primaryRed text-white hover:bg-red-600 focus:ring-red-500'
                }`}>
                  Go to Dashboard {/* Text remains "Go to Dashboard" */}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative z-10 px-6 py-10 border-t ${
        darkMode
          ? 'border-gray-800 bg-gray-950'
          : 'border-gray-200 bg-white'
      }`}>
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between md:flex-row">
            <div className="flex items-center space-x-2">
              {/* Footer Logo - Changed to image and increased size */}
              <img src="/android-chrome-512x512.png" alt="KUWUTEN Logo" className="w-10 h-10 rounded-lg" />
              {/* Footer KUWUTEN text - Increased size */}
              <span className="text-2xl font-bold tracking-tight">KUWUTEN</span>
            </div>

            <p className="mt-4 text-sm opacity-60 md:mt-0">
              © {new Date().getFullYear()} KUWUTEN CLOUD
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
      
