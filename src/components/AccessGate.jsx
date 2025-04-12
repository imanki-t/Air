import React, { useState, useEffect } from 'react';

const jjkQuotes = [
  "Don't worry, I'm the strongest.",
  "Throughout heaven and earth, I alone am the honored one.",
  "What matters isn't how strong your powers are, but how you use them.",
  "You want me to show you what it means to be strong?",
  "The strong help the weak.",
  "I'll kill you... in a flash.",
  "My brain works differently when I'm having fun.",
  "I like tall women with big...personalities.",
  "The only thing I'm good at is destroying things.",
  "That which cannot be defeated is not worth fighting.",
  "When you hit bottom, the only way to go is up.",
  "If you get reincarnated, let's meet up again."
];

const AccessGate = ({ children }) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setQuote(jjkQuotes[Math.floor(Math.random() * jjkQuotes.length)]);
    const unlockedBefore = sessionStorage.getItem('access_granted');
    if (unlockedBefore === 'true') {
      setUnlocked(true);
    } else {
      setTimeout(() => setLoading(false), 2000);
    }
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Parallax effect for background
  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 15;
      const y = (e.clientY / window.innerHeight) * 15;
      setBgPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = import.meta.env.VITE_SITE_PASSKEY || 'thechosenone';
    if (passkey === correct) {
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {});
      setFadeOut(true);
      setTimeout(() => {
        setUnlocked(true);
        sessionStorage.setItem('access_granted', 'true');
      }, 500);
    } else {
      setError('Incorrect Domain Expansion!');
      setPasskey('');
    }
  };

  if (unlocked) return children;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black bg-opacity-95 transition-all duration-500 overflow-hidden ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        backgroundImage: 'url(/jjk-bg-pattern.svg), url(/curse-marks.svg)',
        backgroundPosition: `${bgPosition.x}px ${bgPosition.y}px, center center`,
        backgroundSize: '200px, cover',
      }}
    >
      {/* Cursed Energy Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-purple-600 opacity-40 animate-float"
            style={{
              width: `${Math.random() * 20 + 5}px`,
              height: `${Math.random() * 20 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 5}s`,
              boxShadow: '0 0 15px 5px rgba(139, 92, 246, 0.6)',
              filter: 'blur(2px)',
            }}
          />
        ))}
      </div>

      {/* JJK Logo */}
      <div className="mb-8 relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-lg blur opacity-75 animate-pulse"></div>
        <h1 className="relative px-8 py-4 bg-black bg-opacity-70 border-2 border-purple-600 rounded-lg font-bold text-4xl sm:text-5xl text-white">
          <span className="text-purple-500">TIME</span>
          <span className="text-yellow-400">LESS</span>
          <span className="text-purple-500">!!</span>
        </h1>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="w-24 h-24 mb-4 mx-auto relative">
            <div className="absolute inset-0 border-4 border-t-purple-600 border-r-purple-300 border-b-blue-400 border-l-blue-600 rounded-full animate-spin"></div>
            <div className="absolute inset-2 border-4 border-t-yellow-400 border-r-yellow-200 border-b-yellow-400 border-l-yellow-200 rounded-full animate-spin-slow"></div>
          </div>
          <div className="text-white font-medium mb-2 text-xl tracking-wide">
            <span className="text-purple-400">Loading</span> 
            <span className="text-yellow-400"> Domain</span>
          </div>
          <div className="text-lg italic text-gray-300">"{quote}"</div>
        </div>
      ) : (
        <div className="relative max-w-md w-full">
          <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl blur opacity-75"></div>
          <form
            onSubmit={handleSubmit}
            className="relative bg-gray-900 border-2 border-purple-600 p-8 rounded-xl w-full text-center shadow-2xl"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600"></div>
            
            <h2 className="font-bold text-2xl mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
              Domain Expansion
            </h2>
            
            <div className="mb-6 relative">
              <input
                type="password"
                value={passkey}
                onChange={(e) => setPasskey(e.target.value)}
                placeholder="Enter passkey"
                className="w-full px-4 py-3 text-center font-medium bg-gray-800 text-white border-2 border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg blur opacity-30 -z-10"></div>
            </div>
            
            {error && (
              <div className="mb-4 p-2 text-red-400 bg-red-900 bg-opacity-30 border border-red-700 rounded-lg animate-pulse">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              className="w-full px-6 py-3 bg-gradient-to-r from-purple-700 to-blue-700 hover:from-purple-600 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg active:scale-95 relative overflow-hidden group"
            >
              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-purple-400 to-blue-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></span>
              <span className="relative">Unleash</span>
            </button>
            
            <div className="mt-6 text-xs text-gray-400">
              Only the strongest sorcerers may enter
            </div>
          </form>
        </div>
      )}
      
      {/* Ornamental elements */}
      <div className="fixed top-4 left-4 w-16 h-16 opacity-30">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#9333ea" strokeWidth="2" />
          <path d="M50,5 L50,95 M5,50 L95,50" stroke="#9333ea" strokeWidth="2" />
          <circle cx="50" cy="50" r="10" fill="#9333ea" />
        </svg>
      </div>
      <div className="fixed bottom-4 right-4 w-16 h-16 opacity-30">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#9333ea" strokeWidth="2" />
          <path d="M50,5 L50,95 M5,50 L95,50" stroke="#9333ea" strokeWidth="2" />
          <circle cx="50" cy="50" r="10" fill="#9333ea" />
        </svg>
      </div>
    </div>
  );
};

export default AccessGate;
