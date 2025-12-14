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
    "Diamond hoe? In a locked chest. Respect it.",
    "Built a dirt house for the nostalgia. Would die for it.",
    "Trust issues? I cover my redstone with obsidian.",
    "History will remember me as the dirt block king",
    "My realm, my rules",
    "I craft, therefore I am",
    "Home is where the respawn point is",
    "Redstone is just digital wizardry",
    "In the beginning, there was wood",
    "The cake is a lie… but I still bake it"
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

  const mobileMarginBottom = loading ? 'mb-0' : 'mb-20';


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: darkMode ? '#0f172a' : '#ffffff' }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className={`absolute inset-0`}
          style={{
            backgroundImage: darkMode
              ? `linear-gradient(to right, rgba(66, 135, 245, 0.2) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(66, 135, 245, 0.2) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(139, 0, 0, 0.3) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(139, 0, 0, 0.3) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          {[1, 2, 3, 4].map(ring => (
            <div key={ring}
              className={`absolute rounded-full border ${darkMode ? 'border-blue-500/20' : 'border-red-500/20'}`}
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${ring * 60}%`,
                height: `${ring * 60}%`,
                animation: `orbital-rotation ${ring * 20 + 40}s linear infinite`
              }}
            />
          ))}
        </div>
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full ${darkMode ? 'bg-blue-500/10' : 'bg-red-500/10'} blur-3xl hidden lg:block`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full ${darkMode ? 'bg-blue-500/10' : 'bg-red-500/10'} blur-3xl hidden lg:block`}></div>
         <div className={`absolute top-1/2 left-10 w-48 h-48 rounded-full ${darkMode ? 'bg-teal-500/10' : 'bg-green-500/10'} blur-3xl hidden lg:block`}></div>
         <div className={`absolute bottom-1/2 right-10 w-48 h-48 rounded-full ${darkMode ? 'bg-purple-500/10' : 'bg-yellow-500/10'} blur-3xl hidden lg:block`}></div>
      </div>

      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 ${darkMode ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-red-500 to-red-600'} rounded-lg shadow-lg`}>
            <img
              src="airstream.png"
              className="h-8 w-8 sm:h-10 sm:w-10"
              alt="Airstream"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            <span className={`text-transparent bg-clip-text ${darkMode ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}>
              AIRSTREAM
            </span>
          </h1>
        </div>
      </header>

      <div className={`relative z-10 w-full max-w-md mx-auto px-4 mt-24 sm:mt-28 ${mobileMarginBottom}`} ref={loginBoxRef}>
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
                    className={`text-xl md:text-2xl font-bold uppercase ${darkMode ? 'text-gray-300' : 'text-black'}`}
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
            <div className="w-full relative max-w-xs sm:max-w-sm">
              {/* Modern login box with no glowing effects */}
              <div className={`relative rounded-xl overflow-hidden shadow-lg ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
                {/* Subtle accent line at the top */}
                <div className={`h-1 w-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`}></div>
                
                <div className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <h2 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'} mb-1`}>
                      SECURE ACCESS
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} font-normal`}>
                      Enter your username and passkey to access your secure files
                    </p>
                  </div>
                  
                  <form id="access-form" onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Username"
                        className={`w-full px-4 py-3 rounded-md focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 text-white border border-gray-600 focus:border-blue-500' : 'bg-gray-50 text-gray-800 border border-gray-300 focus:border-red-500'}`}
                        autoComplete="off"
                      />
                    </div>
                    
                    <div className="relative">
                      <input
                        type={passwordVisible ? "text" : "password"}
                        value={passkey}
                        onChange={(e) => setPasskey(e.target.value)}
                        placeholder="Passkey"
                        className={`w-full px-4 py-3 pr-10 rounded-md focus:outline-none transition-colors ${darkMode ? 'bg-gray-700 text-white border border-gray-600 focus:border-blue-500' : 'bg-gray-50 text-gray-800 border border-gray-300 focus:border-red-500'}`}
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={togglePasswordVisibility}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-red-400'}`}
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
                    
                    {error && (
                      <div className={`py-2 px-3 rounded-md flex items-center space-x-2 ${darkMode ? 'bg-red-900/30 border border-red-800/50 text-red-400' : 'bg-red-50 border border-red-200 text-red-500'}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="text-sm">{error}</span>
                      </div>
                    )}
                    
                    <button
                      type="submit"
                      className={`w-full py-3 px-4 ${darkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-red-600 hover:bg-red-500'} text-white font-medium rounded-md transition-colors duration-200 flex items-center justify-center`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                      </svg>
                      Unlock Access
                    </button>
                  </form>
                </div>
                
                <div className={`p-4 border-t ${darkMode ? 'border-gray-700 text-gray-400' : 'border-gray-200 text-gray-600'} text-center text-sm`}>
                  {currentQuote}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-4 left-6 text-sm hidden md:flex flex-col items-start">
        <div className="flex items-center space-x-1 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>256-bit Encryption</span>
        </div>
        <div className="flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Secure Authentication</span>
        </div>
      </div>

      <div className="hidden md:block fixed bottom-4 right-6 text-sm max-w-xs text-right">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>© {new Date().getFullYear()} Airstream • All Rights Reserved</span><br/>
        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>End-to-End Encrypted</span>
      </div>

      <div className="block md:hidden fixed bottom-4 right-4 max-w-[180px] text-right">
        <p className={`text-[15px] leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
          © {new Date().getFullYear()} AIRSTREAM
        </p>
      </div>

      <div className="fixed top-10 left-10 w-16 h-16 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="2" />
          <path d="M50,10 L50,90 M10,50 L90,50" stroke={darkMode ? "#3b82f6" : "#ef4444"} strokeWidth="1" />
        </svg>
      </div>
      <div className="fixed bottom-10 left-10 w-16 h-16 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke={darkMode ? "#8b5cf6" : "#f87171"} strokeWidth="2" />
          <path d="M50,10 L50,90 M10,50 L90,50" stroke={darkMode ? "#8b5cf6" : "#f87171"} strokeWidth="1" />
        </svg>
      </div>
       <div className="fixed top-20 right-20 w-20 h-20 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
           <path d="M20 40 Q50 10 80 40 T20 40" fill="none" stroke={darkMode ? "#06b6d4" : "#facc15"} strokeWidth="2"/>
           <circle cx="50" cy="50" r="10" fill={darkMode ? "#06b6d4" : "#facc15"}/>
        </svg>
      </div>
       <div className="fixed bottom-20 left-20 w-24 h-24 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <rect x="10" y="10" width="80" height="80" rx="15" ry="15" fill="none" stroke={darkMode ? "#a78bfa" : "#f472b6"} strokeWidth="3"/>
           <line x1="20" y1="80" x2="80" y2="20" stroke={darkMode ? "#a78bfa" : "#f472b6"} strokeWidth="2"/>
           <line x1="20" y1="20" x2="80" y2="80" stroke={darkMode ? "#a78bfa" : "#f472b6"} strokeWidth="2"/>
        </svg>
      </div>

      <style jsx>{`
        @keyframes orbital-rotation {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

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
