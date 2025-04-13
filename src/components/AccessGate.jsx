import React, { useState, useEffect } from 'react';

const jjkQuotes = [
  "Don't worry, I'm the strongest.",
  "Throughout heaven and earth, I alone am the honored one.",
  "What matters isn't how strong your powers are, but how you use them.",
  "You want me to show you what it means to be strong?",
  "The strong help the weak.",
  "I'll kill you... in a flash.",
  "My brain works differently when I'm having fun.",
  "Created by ANKIT!",
  "The only thing I'm good at is destroying things.",
  "That which cannot be defeated is not worth fighting.",
  "When you hit bottom, the only way to go is up.",
  "If you get reincarnated, let's meet up again."
];

// Additional quotes for more content
const additionalQuotes = [
  "The future has infinite potential.",
  "Memories are timeless treasures.",
  "Every moment matters in the stream of time.",
  "Some files are worth protecting forever.",
  "Security is not just a feature, it's a promise.",
  "Only the worthy may enter this domain.",
  "The greatest power lies in knowledge preserved.",
  "What will your digital legacy be?",
  "Beyond this gate lies your sanctuary of memories."
];

// Combined quotes
const allQuotes = [...jjkQuotes, ...additionalQuotes];

const AccessGate = ({ children }) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');
  const [mainQuote, setMainQuote] = useState('');
  const [bgPosition, setBgPosition] = useState({ x: 0, y: 0 });
  const [particleCount, setParticleCount] = useState(30);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    // Responsive particle count
    const handleResize = () => {
      setParticleCount(window.innerWidth < 768 ? 20 : 30);
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    // Setup quotes
    setQuote(allQuotes[Math.floor(Math.random() * allQuotes.length)]);
    setMainQuote("Memories Beyond Time, Files Beyond Space");
    
    const unlockedBefore = sessionStorage.getItem('access_granted');
    if (unlockedBefore === 'true') {
      setUnlocked(true);
    } else {
      // Loading animation sequence
      setTimeout(() => setAnimationPhase(1), 1000);
      setTimeout(() => setAnimationPhase(2), 2000);
      setTimeout(() => setAnimationPhase(3), 3000);
      setTimeout(() => {
        setLoading(false);
        setAnimationPhase(4);
      }, 4000);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
      // Success animation and sound
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {});
      setFadeOut(true);
      setTimeout(() => {
        setUnlocked(true);
        sessionStorage.setItem('access_granted', 'true');
      }, 800);
    } else {
      // Error animation effect
      setError('Incorrect Domain Expansion!');
      setPasskey('');
      
      // Shake animation effect
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

  if (unlocked) return children;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 overflow-hidden transition-all duration-700 ease-in-out ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        backgroundSize: 'cover',
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 z-10 overflow-hidden">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(#9333ea 1px, transparent 1px), linear-gradient(to right, #9333ea 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: `translate(${bgPosition.x}px, ${bgPosition.y}px)`,
            transition: 'transform 0.3s ease-out'
          }}
        />

        {/* Animated Particles */}
        {Array.from({ length: particleCount }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-purple-600 to-blue-500 animate-float"
            style={{
              width: `${Math.random() * 20 + 5}px`,
              height: `${Math.random() * 20 + 5}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${Math.random() * 10 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.5 + 0.1,
              boxShadow: '0 0 15px 5px rgba(139, 92, 246, 0.6)',
              filter: 'blur(1px)',
            }}
          />
        ))}

        {/* Animated rings */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200vh] h-[200vh] pointer-events-none">
          {[1, 2, 3].map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border opacity-10"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${ring * 30}%`,
                height: `${ring * 30}%`,
                borderWidth: '1px',
                borderColor: '#9333ea',
                animation: `ping ${ring * 3 + 3}s cubic-bezier(0, 0, 0.2, 1) infinite`
              }}
            />
          ))}
        </div>
      </div>

      {/* Header with Logo */}
      <div className="absolute top-0 w-full flex items-center justify-between px-6 py-4 z-20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-full overflow-hidden shadow-lg bg-gradient-to-br from-purple-500 to-blue-600 p-0.5">
            <div className="w-full h-full rounded-full overflow-hidden bg-gray-900">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-500">
            TIMELESS
          </h1>
        </div>
        
        <div className="text-gray-400 text-sm hidden md:block">
          Digital Memory Vault • {new Date().getFullYear()}
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-20 max-w-lg w-full mx-auto">
        {loading ? (
          <div className={`text-center transition-all duration-700 transform ${
            animationPhase > 0 ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'
          }`}>
            <div className="w-24 h-24 mb-8 mx-auto relative">
              <div className="absolute inset-0 border-4 border-t-purple-600 border-r-purple-300 border-b-blue-400 border-l-blue-600 rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-4 border-t-yellow-400 border-r-yellow-200 border-b-yellow-400 border-l-yellow-200 rounded-full animate-spin-slow"></div>
              <div className="absolute inset-4 border-4 border-t-green-400 border-r-green-200 border-b-green-400 border-l-green-200 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '3s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-xl font-bold text-white opacity-0 transition-opacity duration-300 ${animationPhase >= 2 ? 'opacity-100' : ''}`}>
                  {animationPhase >= 3 ? '100%' : animationPhase === 2 ? '75%' : ''}
                </span>
              </div>
            </div>
            
            <div className={`text-white font-medium mb-4 text-xl tracking-wide transition-all duration-500 ${animationPhase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-purple-400">Initializing</span>
              <span className="text-yellow-400"> Secure</span>
              <span className="text-blue-400"> Gateway</span>
            </div>
            
            <div className={`text-lg italic text-gray-300 mb-8 transition-all duration-500 max-w-md mx-auto ${animationPhase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              "{quote}"
            </div>
            
            <div className={`flex flex-wrap justify-center gap-3 transition-all duration-500 ${animationPhase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
              {['Scanning', 'Encrypting', 'Verifying', 'Connecting'].map((action, i) => (
                <span key={i} className="px-3 py-1 rounded-full text-xs font-medium bg-purple-900 bg-opacity-50 text-purple-300 border border-purple-800">
                  {action}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            {/* Quote Display */}
            <div className="text-center mb-8 transform transition-all duration-500">
              <h2 className="text-2xl md:text-3xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-blue-400 to-purple-400">
                {mainQuote}
              </h2>
              <p className="text-gray-300 italic">"{quote}"</p>
            </div>
            
            {/* Access Form with enhanced styling */}
            <div className="relative max-w-md w-full">
              <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 via-blue-500 to-purple-600 rounded-xl blur opacity-75 animate-pulse"></div>
              <form
                id="access-form"
                onSubmit={handleSubmit}
                className="relative bg-gray-900 border border-purple-600 p-8 rounded-xl w-full text-center shadow-2xl backdrop-blur-sm bg-opacity-80"
              >
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 p-1 shadow-lg">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <h2 className="font-bold text-2xl mt-6 mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                  Domain Expansion
                </h2>

                <div className="mb-6 relative">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-blue-500 rounded-lg blur opacity-30 -z-10"></div>
                  <div className="relative">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      value={passkey}
                      onChange={(e) => setPasskey(e.target.value)}
                      placeholder="Enter passkey"
                      className="w-full px-4 py-3 pr-10 text-center font-medium bg-gray-800 text-white border-2 border-purple-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors"
                    >
                      {passwordVisible ? (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
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

                <div className="mt-6 text-sm text-gray-400">
                  Only the strongest sorcerers may enter
                </div>
                
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {['Secure', 'Encrypted', 'Protected', 'Private'].map((tag, i) => (
                    <span key={i} className="px-2 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </form>
            </div>
            
            {/* Additional decorative elements */}
            <div className="mt-8 flex flex-wrap justify-center gap-4 text-xs text-gray-500 max-w-md">
              <span>© {new Date().getFullYear()} Timeless</span>
              <span>•</span>
              <span>All Rights Reserved</span>
              <span>•</span>
              <span>End-to-End Encrypted</span>
            </div>
          </div>
        )}
      </div>

      {/* Decorative elements */}
      <div className="fixed top-6 left-6 w-24 h-24 opacity-20 hidden md:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#9333ea" strokeWidth="2" />
          <path d="M50,5 L50,95 M5,50 L95,50" stroke="#9333ea" strokeWidth="2" />
          <circle cx="50" cy="50" r="10" fill="#9333ea" />
        </svg>
      </div>
      <div className="fixed bottom-6 right-6 w-24 h-24 opacity-20 hidden md:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#9333ea" strokeWidth="2" />
          <path d="M50,5 L50,95 M5,50 L95,50" stroke="#9333ea" strokeWidth="2" />
          <circle cx="50" cy="50" r="10" fill="#9333ea" />
        </svg>
      </div>
      
      {/* Add tailwind animation classes */}
      <style jsx>{`
        @keyframes ping {
          75%, 100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
          }
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

export default AccessGate;
