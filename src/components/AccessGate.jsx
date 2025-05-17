import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';

const AccessGate = ({ onAccessGranted }) => {
  const [passkey, setPasskey] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseVisible, setPhaseVisible] = useState(false);
  const [phaseOpacity, setPhaseOpacity] = useState(0);
  const loginBoxRef = useRef(null);

  const phases = ["Encrypting", "Securing", "Connecting", "Verifying"];
  const quotes = [
    "Built a dirt house for the nostalgia. Would die for it.",
    "The future got drip, like me?",
    "Home is where the creeper didn't explode.",
    "Diamond hoe? In a locked chest. Respect it.",
    "Walk through that nether portal like it's a runway.",
    "Trust issues? I cover my redstone with obsidian.",
    "Built this world in 2012. Still better than real life.",
    "Every dog I tamed has a name and a backstory.",
    "It all started with one tree punch. Now I run the realm.",
    "if you die in Minecraft you die in real life",
    "this is the start of a very beautiful save file",
    "punching trees is always the answer",
    "if you touch my diamonds we fight",
    "survival of the blockiest",
    "one small step for Steve, one giant leap for blockkind",
    "eat, sleep, mine, repeat",
    "don't mine straight down... unless you're brave",
    "my pickaxe is my therapist",
    "built a dirt house, now I'm emotionally attached",
    "respawned again... I should start a blog",
  ];
  const [currentQuote, setCurrentQuote] = useState('');
  const [typedQuote, setTypedQuote] = useState('');
  const [showPhases, setShowPhases] = useState(false);

  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setCurrentQuote(quote);
    let index = 0;
    const typeInterval = setInterval(() => {
      setTypedQuote((prev) => prev + quote.charAt(index));
      index++;
      if (index === quote.length) clearInterval(typeInterval);
    }, 50);

    const initialDelay = 3000;
    const phaseDuration = 1000;
    setTimeout(() => {
      setShowPhases(true);
    }, initialDelay);
    setTimeout(() => {
      setLoading(false);
    }, initialDelay + (phases.length * phaseDuration));
    return () => {
      clearInterval(typeInterval);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  useEffect(() => {
    if (loading && showPhases) {
      setPhaseVisible(true);
      setPhaseOpacity(0);
      const fadeInSteps = 10;
      const fadeInInterval = 300 / fadeInSteps;

      let step = 0;
      const fadeInTimer = setInterval(() => {
        step++;
        setPhaseOpacity(step / fadeInSteps);
        if (step >= fadeInSteps) clearInterval(fadeInTimer);
      }, fadeInInterval);

      const fadeOutTimer = setTimeout(() => {
        const fadeOutSteps = 8;
        const fadeOutInterval = 300 / fadeOutSteps;

        let outStep = 0;
        const intervalId = setInterval(() => {
          outStep++;
          setPhaseOpacity(1 - (outStep / fadeOutSteps));

          if (outStep >= fadeOutSteps) {
            clearInterval(intervalId);
            setPhaseVisible(false);
          }
        }, fadeOutInterval);
      }, 600);

      const nextTimer = setTimeout(() => {
        if (currentPhase < phases.length - 1) {
          setCurrentPhase(prev => prev + 1);
        }
      }, 1000);

      return () => {
        clearInterval(fadeInTimer);
        clearTimeout(fadeOutTimer);
        clearTimeout(nextTimer);
      };
    }
  }, [currentPhase, loading, showPhases, phases.length]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correctPasskey = import.meta.env.VITE_SITE_PASSKEY || 'thechosenone';
    const correctUsername = import.meta.env.VITE_SITE_USERNAME || 'admin';

    if (username === correctUsername && passkey === correctPasskey) {
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {});
      setFadeOut(true);
      if (onAccessGranted) {
        setTimeout(() => onAccessGranted(), 800);
      }
    } else {
      setError('Access Denied: Invalid Passkey or Username');
      setPasskey('');
      setUsername('');
      const form = document.getElementById('access-form');
      if (form) {
        form.classList.add('animate-shake');
        setTimeout(() => form.classList.remove('animate-shake'), 500);
      }
    }
  };

  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: darkMode ? '#121826' : '#f8fafc' }}
    >
      {/* Abstract Background Shapes */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: darkMode
              ? `linear-gradient(to right, rgba(71, 85, 105, 0.1) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(71, 85, 105, 0.1) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(226, 232, 240, 1) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(226, 232, 240, 1) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
        
        {/* Abstract Shapes */}
        <svg className="absolute top-0 left-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="smallGrid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path
                d="M 8 0 L 0 0 0 8"
                fill="none"
                stroke={darkMode ? "#475569" : "#e2e8f0"}
                strokeWidth="0.5"
              />
            </pattern>
            <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
              <rect width="80" height="80" fill="url(#smallGrid)" />
              <path
                d="M 80 0 L 0 0 0 80"
                fill="none"
                stroke={darkMode ? "#475569" : "#e2e8f0"}
                strokeWidth="1"
              />
            </pattern>
          </defs>
        </svg>

        {/* Large Circle Top Right */}
        <div
          className="absolute -top-64 -right-64 opacity-10"
          style={{
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(56, 189, 248, 0.2) 0%, rgba(56, 189, 248, 0) 70%)"
              : "radial-gradient(circle, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0) 70%)",
          }}
        />

        {/* Large Circle Bottom Left */}
        <div
          className="absolute -bottom-96 -left-96 opacity-10"
          style={{
            width: "800px",
            height: "800px", 
            borderRadius: "50%",
            background: darkMode
              ? "radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, rgba(99, 102, 241, 0) 70%)"
              : "radial-gradient(circle, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0) 70%)",
          }}
        />

        {/* Abstract Blob 1 */}
        <div className="absolute top-1/4 right-1/4 hidden lg:block">
          <svg width="400" height="400" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-5">
            <path
              fill={darkMode ? "#3b82f6" : "#ef4444"}
              d="M45.3,-51.2C59.4,-34.7,72,-19.6,75.5,-1.9C79,15.8,73.3,36.1,59.9,48.8C46.5,61.5,25.3,66.6,3.8,63.3C-17.7,60.1,-39.4,48.6,-54.8,30.7C-70.1,12.9,-79,-11.3,-73.6,-33.3C-68.2,-55.3,-48.4,-76,-28.1,-82.1C-7.8,-88.3,13,-88,31.2,-73.7C49.4,-59.4,65.1,-33.2,45.3,-51.2Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Abstract Blob 2 */}
        <div className="absolute bottom-1/4 left-1/4 hidden lg:block">
          <svg width="500" height="500" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" className="opacity-5">
            <path
              fill={darkMode ? "#818cf8" : "#fb7185"}
              d="M47.9,-58.9C61.7,-46.6,72.5,-31.2,76.4,-13.8C80.4,3.6,77.4,23,67.7,37.6C58,52.2,41.5,61.9,24.5,66.7C7.5,71.5,-9.9,71.5,-25.2,65.4C-40.6,59.4,-53.9,47.3,-64.2,32C-74.5,16.7,-81.9,-1.7,-78.7,-18.6C-75.6,-35.4,-61.9,-50.8,-46.3,-62.6C-30.8,-74.5,-15.4,-82.9,0.9,-83.9C17.1,-85,34.2,-71.3,47.9,-58.9Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        {/* Abstract Lines */}
        <div className="absolute inset-0 hidden lg:block">
          <svg width="100%" height="100%" className="opacity-5">
            <line x1="0" y1="0" x2="100%" y2="100%" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="0.5" />
            <line x1="100%" y1="0" x2="0" y2="100%" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="0.5" />
            <line x1="50%" y1="0" x2="50%" y2="100%" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="0.5" />
            <line x1="0" y1="50%" x2="100%" y2="50%" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="0.5" />
          </svg>
        </div>
      </div>

      {/* Header Logo */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-6">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 ${darkMode ? 'bg-blue-600' : 'bg-red-600'} rounded-md shadow-lg`}>
            <img
              src="airstream.png"
              className="h-8 w-8 sm:h-9 sm:w-9"
              alt="Airstream"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            <span className={darkMode ? 'text-white' : 'text-gray-900'}>
              AIRSTREAM
            </span>
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md md:max-w-lg mx-auto px-4 md:px-0">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-56 h-56 md:w-80 md:h-80 mb-6">
              <div className="absolute inset-0">
                <div className={`absolute inset-0 rounded-full border-4 ${darkMode ? 'border-t-blue-500' : 'border-t-red-500'} border-r-transparent border-b-transparent border-l-transparent animate-spin`}></div>
                <div className={`absolute inset-6 rounded-full border-4 border-t-transparent ${darkMode ? 'border-r-blue-500' : 'border-r-red-500'} border-b-transparent border-l-transparent animate-spin`} style={{ animationDuration: '1.5s' }}></div>
                <div className={`absolute inset-12 rounded-full border-4 border-t-transparent border-r-transparent ${darkMode ? 'border-b-blue-500' : 'border-b-red-500'} border-l-transparent animate-spin`} style={{ animationDuration: '2s' }}></div>
              </div>
              {showPhases && phaseVisible && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-xl md:text-2xl font-bold uppercase ${darkMode ? 'text-gray-300' : 'text-gray-800'}`}
                    style={{
                      opacity: phaseOpacity,
                      transition: 'opacity 100ms ease-in-out',
                    }}
                  >
                    {phases[currentPhase]}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Login Box */}
            <div className="w-full max-w-md md:max-w-lg">
              <div className={`relative rounded-xl overflow-hidden shadow-2xl ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                <div className={`w-full h-1.5 ${darkMode ? 'bg-blue-600' : 'bg-red-600'}`}></div>
                
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
                      SECURE ACCESS
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Enter your username and passkey to access your secure files
                    </p>
                  </div>
                  
                  <form id="access-form" onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {/* Username Input */}
                      <div>
                        <label htmlFor="username" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Username
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            className={`w-full pl-10 pr-4 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                              darkMode 
                                ? 'bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                                : 'bg-gray-50 text-gray-900 border border-gray-300 focus:ring-red-500 focus:border-red-500'
                            }`}
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      
                      {/* Password Input */}
                      <div>
                        <label htmlFor="passkey" className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Passkey
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <input
                            id="passkey"
                            type={passwordVisible ? "text" : "password"}
                            value={passkey}
                            onChange={(e) => setPasskey(e.target.value)}
                            placeholder="Enter your passkey"
                            className={`w-full pl-10 pr-10 py-3 rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                              darkMode 
                                ? 'bg-gray-700 text-white border border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                                : 'bg-gray-50 text-gray-900 border border-gray-300 focus:ring-red-500 focus:border-red-500'
                            }`}
                            autoComplete="off"
                          />
                          <button
                            type="button"
                            onClick={togglePasswordVisibility}
                            className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-red-400'}`}
                          >
                            {passwordVisible ? (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Error Display */}
                    {error && (
                      <div className={`p-4 rounded-lg flex items-center space-x-3 ${darkMode ? 'bg-red-900/20 border border-red-800/40 text-red-400' : 'bg-red-50 border border-red-200 text-red-800'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                    
                    {/* Login Button */}
                    <button
                      type="submit"
                      className={`w-full py-3 px-4 flex items-center justify-center space-x-2 rounded-lg text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                        darkMode 
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                          : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                      }`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      <span>Unlock Access</span>
                    </button>
                  </form>
                </div>
                
                {/* Quote Section */}
                <div className={`p-6 border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'} text-center text-sm italic`}>
                  {currentQuote}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="fixed bottom-6 left-6 hidden md:flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${darkMode ? 'text-blue-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>256-bit Encryption</span>
        </div>
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${darkMode ? 'text-blue-500' : 'text-red-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Secure Authentication</span>
        </div>
      </div>

      <div className="fixed bottom-6 right-6 text-sm text-right">
        <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>© {new Date().getFullYear()} Airstream • All Rights Reserved</span>
      </div>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
      `}</style>
    </div>
  );
};

AccessGate.propTypes = {
  onAccessGranted: PropTypes.func,
};

export default AccessGate;
