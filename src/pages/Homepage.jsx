// src/pages/Homepage.jsx - Homepage
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Homepage = () => {
  const { user } = useAuth();
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
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>
      {/* Navigation */}
      <nav className={`border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img src="/airstream.png" alt="Airstream" className="h-10 w-10" />
              <span className="text-2xl font-bold">AIRSTREAM</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link
                  to="/dashboard"
                  className={`px-6 py-2 rounded-lg font-medium ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors`}
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className={`px-6 py-2 rounded-lg font-medium ${
                      darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                    } transition-colors`}
                  >
                    Login
                  </Link>
                  <Link
                    to="/signup"
                    className={`px-6 py-2 rounded-lg font-medium ${
                      darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                    } text-white transition-colors`}
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6">
          YOUR PERSONAL <span className={darkMode ? 'text-blue-500' : 'text-blue-600'}>CLOUD FILE</span> SERVICE
        </h1>
        <p className="text-xl md:text-2xl mb-10 max-w-3xl mx-auto opacity-80">
          Organize, access, and secure your files with an elegant, efficient, and personalized experience.
        </p>
        <Link
          to={user ? '/dashboard' : '/signup'}
          className={`inline-block px-8 py-4 text-lg font-medium rounded-lg ${
            darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white shadow-lg transition-all hover:scale-105`}
        >
          Get Started
        </Link>
      </section>

      {/* Features Section */}
      <section className={`py-20 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📁', title: 'File Management', desc: 'Upload, organize, and manage your files effortlessly' },
              { icon: '🔒', title: 'Secure Storage', desc: '256-bit encryption and secure authentication' },
              { icon: '📝', title: 'Built-in Notes', desc: 'Quick notepad for important information' },
              { icon: '📂', title: 'Smart Folders', desc: 'Auto-categorize files into default folders' },
              { icon: '⭐', title: 'Favorites', desc: 'Star important files for quick access' },
              { icon: '🔗', title: 'Easy Sharing', desc: 'Share files with secure, expiring links' }
            ].map((feature, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl ${
                  darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                } hover:scale-105 transition-transform`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="opacity-70">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h2 className="text-4xl font-bold mb-6">Ready to Get Started?</h2>
        <p className="text-xl mb-10 opacity-80">
          Join thousands of users who trust Airstream for their file storage needs
        </p>
        <Link
          to={user ? '/dashboard' : '/signup'}
          className={`inline-block px-8 py-4 text-lg font-medium rounded-lg ${
            darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
          } text-white shadow-lg transition-all hover:scale-105`}
        >
          {user ? 'Go to Dashboard' : 'Create Free Account'}
        </Link>
      </section>

      {/* Footer */}
      <footer className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} py-8`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="opacity-60">© {new Date().getFullYear()} Airstream. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
