import React, { useState, useEffect } from 'react';

const AccessGate = ({ children }) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animationPhase, setAnimationPhase] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [mouseMovePosition, setMouseMovePosition] = useState({ x: 0, y: 0 });

  // Inspirational quotes for the loading and login screens
  const quotes = [
    "Secure your memories for eternity.",
    "The future is private. The future is secure.",
    "Your digital sanctuary awaits.",
    "Some treasures deserve the strongest protection.",
    "Beyond this gate lies your digital legacy.",
    "Security is not just a feature, it's a promise.",
    "Memories beyond time, files beyond space.",
    "Every file tells a story worth protecting.",
    "The key to your digital universe.",
    "Privacy is the foundation of digital freedom.",
  ];
  
  const [currentQuote, setCurrentQuote] = useState('');

  useEffect(() => {
    // Set a random quote on component mount
    setCurrentQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    
    // Check if already authenticated
    const unlockedBefore = sessionStorage.getItem('access_granted');
    if (unlockedBefore === 'true') {
      setUnlocked(true);
    } else {
      // Loading animation sequence
      setTimeout(() => setAnimationPhase(1), 800);
      setTimeout(() => setAnimationPhase(2), 1600);
      setTimeout(() => setAnimationPhase(3), 2400);
      setTimeout(() => {
        setLoading(false);
        setAnimationPhase(4);
      }, 3000);
    }

    // Mouse move effect for parallax
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 10;
      const y = (e.clientY / window.innerHeight) * 10;
      setMouseMovePosition({ x, y });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    // Clear error message after 5 seconds
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

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
      setError('Access Denied: Invalid Passkey');
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

  // If already authenticated, render children
  if (unlocked) return children;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      }}
    >
      {/* Background Grid and Patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Main Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(to right, rgba(59, 130, 246, 0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
            transform: `translate(${mouseMovePosition.x}px, ${mouseMovePosition.y}px)`,
            transition: 'transform 0.5s ease-out'
          }}
        />
        
        {/* Orbital Ring Animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none">
          {[1, 2, 3, 4].map((ring) => (
            <div
              key={ring}
              className="absolute rounded-full border border-blue-500/20"
              style={{
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${ring * 20}%`,
                height: `${ring * 20}%`,
                animationName: 'orbital-rotation',
                animationDuration: `${ring * 20 + 40}s`,
                animationTimingFunction: 'linear',
                animationIterationCount: 'infinite',
              }}
            />
          ))}
        </div>
        
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
              style={{
                width: `${Math.random() * 6 + 2}px`,
                height: `${Math.random() * 6 + 2}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
                filter: 'blur(1px)',
                animation: `float ${Math.random() * 10 + 10}s linear infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>
        
        {/* Glow Effect Spots */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-blue-500/10 blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl"></div>
      </div>

      {/* App Header */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              TIMELESS
            </span>
          </h1>
        </div>
        
        <div className="hidden md:flex items-center space-x-2 text-gray-400 text-sm">
          <span className="px-3 py-1 rounded-full text-xs bg-gray-800/70 border border-gray-700 backdrop-blur-sm">
            End-to-End Encrypted
          </span>
          <span className="px-3 py-1 rounded-full text-xs bg-gray-800/70 border border-gray-700 backdrop-blur-sm">
            Secure Gateway
          </span>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4">
        {loading ? (
          /* Loading State */
          <div className="flex flex-col items-center justify-center p-8">
            {/* Loading Animation */}
            <div className={`w-24 h-24 mb-6 relative transition-opacity duration-500 ${animationPhase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <div className="absolute inset-3 rounded-full border-4 border-t-transparent border-r-purple-500 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1.5s' }}></div>
              <div className="absolute inset-6 rounded-full border-4 border-t-transparent border-r-transparent border-b-blue-500 border-l-transparent animate-spin" style={{ animationDuration: '2s' }}></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className={`text-white font-mono transition-opacity duration-300 ${animationPhase >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                  {animationPhase >= 3 ? '100%' : ''}
                </div>
              </div>
            </div>
            
            {/* Loading Text */}
            <h2 className={`text-xl font-semibold text-white mb-4 transition-opacity duration-500 ${animationPhase >= 1 ? 'opacity-100' : 'opacity-0'}`}>
              <span className="text-blue-400">Initializing</span>
              <span className="text-white"> Secure </span>
              <span className="text-purple-400">Gateway</span>
            </h2>
            
            {/* Quote */}
            <p className={`text-gray-300 italic text-center mb-6 transition-opacity duration-500 ${animationPhase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              "{currentQuote}"
            </p>
            
            {/* Status Indicators */}
            <div className={`flex flex-wrap justify-center gap-2 transition-opacity duration-500 ${animationPhase >= 2 ? 'opacity-100' : 'opacity-0'}`}>
              {['Verifying', 'Encrypting', 'Connecting', 'Securing'].map((status, i) => (
                <span 
                  key={i} 
                  className={`px-3 py-1 rounded-full text-xs bg-gray-800 border backdrop-blur-sm transition-all duration-300 ${
                    animationPhase >= 3 ? 'border-blue-500 text-blue-400' : 'border-gray-700 text-gray-400'
                  }`}
                >
                  {status}
                </span>
              ))}
            </div>
          </div>
        ) : (
          /* Login Form State */
          <div className="flex flex-col items-center">
            {/* Authentication Card */}
            <div className="w-full relative">
              {/* Glowing border effect */}
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-2xl opacity-70 blur-sm animate-pulse"></div>
              
              <div className="relative bg-gray-900/90 backdrop-blur-md rounded-xl overflow-hidden border border-gray-800">
                {/* Security Elements Design */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
                
                {/* Lock Icon */}
                <div className="flex justify-center -mt-8">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 p-1 shadow-lg">
                    <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 pt-10">
                  {/* Form Header */}
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-1">
                      Authentication Required
                    </h2>
                    <p className="text-gray-400 text-sm">
                      Enter your passkey to access your secure files
                    </p>
                  </div>
                  
                  {/* Login Form */}
                  <form id="access-form" onSubmit={handleSubmit} className="space-y-4">
                    {/* Password Input with Security Borders */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg blur opacity-30"></div>
                      <div className="relative">
                        <input
                          type={passwordVisible ? "text" : "password"}
                          value={passkey}
                          onChange={(e) => setPasskey(e.target.value)}
                          placeholder="Enter your passkey"
                          className="w-full px-4 py-3 pr-10 bg-gray-800 text-white border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors"
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
                    
                    {/* Error Message */}
                    {error && (
                      <div className="py-2 px-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm flex items-center space-x-2 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-medium rounded-lg transition-all duration-200 relative overflow-hidden group"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-200"></span>
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        Unlock Access
                      </span>
                    </button>
                    
                    {/* Information Tags */}
                    <div className="pt-4 flex flex-wrap justify-center gap-2">
                      {['Secure', 'Encrypted', 'Protected', 'Private'].map((tag, i) => (
                        <span key={i} className="px-2 py-1 rounded-full text-xs bg-gray-800 text-gray-400 border border-gray-700">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </form>
                </div>
                
                {/* Bottom Quote */}
                <div className="p-4 border-t border-gray-800 text-center">
                  <p className="text-gray-400 text-sm italic">"{currentQuote}"</p>
                </div>
              </div>
            </div>
            
            {/* Security Badges */}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <div className="flex items-center space-x-1 text-xs text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>256-bit encryption</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span>Secure Gateway</span>
              </div>
              <div className="flex items-center space-x-1 text-xs text-blue-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>Timeless Protection</span>
              </div>
            </div>
            
            {/* Footer with Copyright */}
            <div className="mt-8 pt-4 border-t border-gray-800/50 w-full text-center">
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-gray-500">
                <span>© {new Date().getFullYear()} Timeless</span>
                <span>•</span>
                <span>All Rights Reserved</span>
                <span>•</span>
                <span>End-to-End Encrypted</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Decorative Elements */}
      <div className="fixed bottom-6 right-6 text-gray-600/20 text-xs hidden md:block">
        <div className="flex flex-col items-end space-y-1">
          <div>TIMELESS v2.0</div>
          <div>SECURITY GATE</div>
        </div>
      </div>
      
      {/* Additional decorative tech shapes */}
      <div className="fixed top-10 left-10 w-16 h-16 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="2" />
          <path d="M50,10 L50,90 M10,50 L90,50" stroke="#3b82f6" strokeWidth="1" />
        </svg>
      </div>
      <div className="fixed bottom-10 right-10 w-16 h-16 opacity-10 hidden lg:block">
        <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#8b5cf6" strokeWidth="2" />
          <path d="M50,10 L50,90 M10,50 L90,50" stroke="#8b5cf6" strokeWidth="1" />
        </svg>
      </div>
      
      {/* Add custom animation definitions */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: radial-gradient(circle, #3b82f6 1px, transparent 1px);
          background-size: 20px 20px;
        }
        
        @keyframes orbital-rotation {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
        
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        
        .animate-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default AccessGate;
