// AccessGate.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types'; // Import PropTypes for type checking

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
  const loginBoxRef = useRef(null); // Ref for the login box element

  const phases = ["Encrypting", "Securing", "Connecting", "Verifying"];
  const quotes = [
    "Built a dirt house for the nostalgia. Would die for it.",
    "The future got drip, like me?",
    "Home is where the creeper didn’t explode.",
    "Diamond hoe? In a locked chest. Respect it.",
    "Walk through that nether portal like it’s a runway.",
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
    "I tried to hug a creeper, it exploded with love",
    "Minecraft: where logic goes to nap",
    "I once mined for 3 days... found gravel",
    "History will remember me as the dirt block king",
    "This world ain't big enough for the both of our builds",
    "Reality can be disappointing, Minecraft never is",
    "I've built empires out of cobblestone and hope",
    "Creepers are just misunderstood fireworks",
    "Don’t question the floating blocks, just accept them",
    "The real enemy was lag all along",
    "I craft, therefore I am",
    "In the beginning, there was wood",
    "I didn't choose the block life, it chose me",
    "Even Herobrine fears my redstone skills",
    "One does not simply walk into the Nether",
    "The grass is always greener on my Minecraft server",
    "When in doubt, dig it out",
    "My bed is too far away, emotionally and physically",
    "The only war crime in Minecraft is griefing",
    "Knowledge is power, but diamonds are forever",
    "Built a castle for fun. Now I defend it like my GPA",
    "All roads lead to lava",
    "They see me rollin’... in a minecart",
    "Every great builder starts with a box",
    "I’ve seen things… like a chicken riding a spider",
    "Life’s a glitch and then you respawn",
    "Redstone is just digital wizardry",
    "Don't ask why I have 500 blocks of dirt",
    "Home is where the respawn point is",
    "Roblox tycoons taught me business better than school",
    "I survived Natural Disaster Survival and all I got was this badge",
    "Obby or not to obby, that is the question",
    "I went to Brookhaven and all my friends turned into spies",
    "Roblox: where you can be a pizza, a cop, and a ninja in one day",
    "It’s all fun and games until someone glitches into the void",
    "The floor is lava, and so is half of my obby",
    "Roblox avatars have more drip than I do",
    "I got scammed and it built character",
    "Adopt Me? More like Rob Me",
    "Trade requests build personality",
    "I once built an entire life in Bloxburg… then forgot to save",
    "Simulator games prepared me for adulting",
    "I died in Arsenal and now I fear everything",
    "Roblox: where chaos is part of the charm",
    "Some people run from the storm. I join it on Roblox",
    "Obbies are just rage therapy",
    "Lava parkour builds resilience",
    "Fake it till you make it… in Royale High",
    "I've been in more Roblox jobs than real life ones",
    "My Roblox avatar is cooler than I’ll ever be",
    "Never trust someone who says 'trust trade'",
    "Being broke in Roblox is still being fabulous",
    "My pet in Adopt Me has better housing than me",
    "Started from a noob, now we here",
    "History books won’t mention us, but this Minecraft build will",
    "I invented blockitecture",
    "Before roads, there were paths made by Minecraft players",
    "Every great civilization begins with punching a tree",
    "They conquered Rome. I conquered the End",
    "We don’t age in Minecraft, we just enchant better gear",
    "Minecraft physics: because real ones are overrated",
    "Myth: Steve can’t feel pain. Truth: He just doesn’t show it",
    "Legend says the first block ever placed still exists",
    "My empire rose from a single crafting table",
    "Herobrine was my roommate once",
    "Lava: nature’s way of saying 'nope'",
    "Farming wheat since the medieval Minecraft ages",
    "Built a monument to my lost dog. Still cry at night",
    "No gods, only Notch",
    "I fought the Ender Dragon and all I got was trauma",
    "They built pyramids, I built pixel art",
    "Minecraft time is faster, but the memories last longer",
    "Steve is the original renaissance man",
    "Grass blocks: the true unsung heroes",
    "If knowledge is power, then bookshelves are armories",
    "Spiders don’t scare me, unless they glitch through walls",
    "The cake is a lie… but I still bake it",
    "XP orbs are just soul fragments, prove me wrong",
    "All my homies hate phantoms",
    "My realm, my rules",
    "Every server has that one chaotic neutral player",
    "If I had a block for every failed jump, I'd reach the sky limit",
    "Don't cry because it's night, mine because it happened",
    "I put the 'craft' in 'outcrafted'",
    "This world is powered by redstone and dreams",
    "Placing blocks is therapy",
    "I fear no man, but baby zombies terrify me",
    "I built a secret base under my friend’s base. He still doesn’t know.",
  ];
  const [currentQuote, setCurrentQuote] = useState('');
  const [typedQuote, setTypedQuote] = useState('');
  const [showPhases, setShowPhases] = useState(false);


  useEffect(() => {
    // Detect system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(prefersDark);

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setDarkMode(e.matches);
    mediaQuery.addEventListener('change', handleChange);

    // Typing effect for quote
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    setCurrentQuote(quote);

    let index = 0;
    const typeInterval = setInterval(() => {
      setTypedQuote((prev) => prev + quote.charAt(index));
      index++;
      if (index === quote.length) clearInterval(typeInterval);
    }, 50);

    // Start loading phases and set total loading time
    const initialDelay = 3000;
    const phaseDuration = 1000;
    setTimeout(() => {
      setShowPhases(true);
    }, initialDelay);
    setTimeout(() => {
      setLoading(false);
    }, initialDelay + (phases.length * phaseDuration));
    // Cleanup
    return () => {
      clearInterval(typeInterval);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);
  useEffect(() => {
    // Phase transition effects
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
    // Error message timeout
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);
  const handleSubmit = (e) => {
    e.preventDefault();
    const correctPasskey = import.meta.env.VITE_SITE_PASSKEY || 'thechosenone';
    const correctUsername = import.meta.env.VITE_SITE_USERNAME || 'admin'; // Added username environment variable

    if (username === correctUsername && passkey === correctPasskey) {
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {});
      setFadeOut(true);
      if (onAccessGranted) {
           setTimeout(() => onAccessGranted(), 800);
      }
    } else {
      setError('Access Denied: Invalid Passkey or Username'); // Modified error message
      setPasskey('');
      setUsername(''); // Clear username on error
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
  // Calculate margin-bottom for mobile to prevent footer overlap
  const mobileMarginBottom = loading ? 'mb-0' : 'mb-20';
  // Adjust 20 as needed based on footer height


  const renderDecorations = () => {
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

    // Add particle effects
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
    return decorations;
  };


  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-700 ease-in-out overflow-hidden ${fadeOut ? 'opacity-0' : 'opacity-100'}`}
      style={{ background: darkMode ? '#0f172a' : '#ffffff' }}
    >
      {/* Background Grid and Animations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         {/* Grid background */}
        <div
          className={`absolute inset-0 opacity-10`}
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
        {/* Abstract decorative elements from Homepage */}
        {renderDecorations()}
      </div>

      {/* App Header */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center space-x-3">
           {/* Logo background */}
          <div className={`flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 ${darkMode ? 'bg-gradient-to-br from-blue-500 to-blue-600' : 'bg-gradient-to-br from-red-500 to-red-600'} rounded-lg shadow-lg`}>
            <img
              src="/android-chrome-512x512.png"
              className="h-8 w-8 sm:h-10 sm:w-10"
              alt="App Logo"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {/* KUWUTEN text gradient */}
            <span className={`text-transparent bg-clip-text ${darkMode ? 'bg-gradient-to-r from-blue-400 to-blue-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}>
              KUWUTEN
            </span>
          </h1>
        </div>
      </header>


      {/* Main Content Area (Loading or Login) */}
      <div className={`relative z-10 w-full max-w-md mx-auto px-4 mt-24 sm:mt-28 ${mobileMarginBottom}`} ref={loginBoxRef}>
        {loading ? (
          // Loading Screen
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
                    className={`text-xl md:text-2xl ${darkMode ? 'text-gray-300' : 'text-black'}`} // Text color based on dark mode
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
          // Login Form
          <div className="flex flex-col items-center">
            <div className="w-full relative max-w-xs sm:max-w-sm">
              {/* Background gradient behind form */}
              <div className={`absolute -inset-1 ${darkMode ? 'bg-gradient-to-r from-blue-600 via-blue-600 to-blue-600' : 'bg-gradient-to-r from-red-600 via-red-600 to-red-600'} rounded-2xl opacity-70 blur-sm animate-pulse`}></div>
              {/* Form container - Changed to white theme */}
              <div className={`relative rounded-xl overflow-hidden border ${darkMode ? 'bg-gray-900/90 backdrop-blur-md border-gray-800' : 'bg-white/90 backdrop-blur-md border-gray-200'}`}> {/* Background based on dark mode */}
                 {/* Top border gradient */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${darkMode ? 'bg-gradient-to-r from-blue-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-red-500'}`}></div>
                 {/* Inner grid pattern - Adjusted opacity for white theme */}
                <div className={`absolute inset-0 opacity-5`} style={{
                   backgroundImage: darkMode
                     ? `radial-gradient(circle, #3b82f6 1px, transparent 1px)`
                     : `radial-gradient(circle, #000000 1px, transparent 1px)`, // Adjusted for darker grid in light mode
                   backgroundSize: '20px 20px',
                }}></div>
                <div className="p-6 pt-10">
                   <div className="text-center mb-6">
                     {/* SECURE ACCESS text gradient */}
                    <h2 className={`text-xl font-bold text-transparent bg-clip-text ${darkMode ? 'bg-gradient-to-r from-blue-400 to-blue-400' : 'bg-gradient-to-r from-red-400 to-red-400'} mb-1`}>
                      SECURE ACCESS
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}> {/* Text color based on dark mode */}
                      Enter your username and passkey to access your secure files!
                    </p>
                  </div>
                  <form id="access-form" onSubmit={handleSubmit} className="space-y-4">
                     {/* Username Input Box - Changed background for white theme */}
                    <div className="relative">
                      {/* Background gradient behind input */}
                      <div className={`absolute -inset-0.5 ${darkMode ? 'bg-gradient-to-r from-blue-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-red-500'} rounded-lg blur opacity-30`}></div>
                      <div className="relative">
                         {/* Username Input */}
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Username"
                          className={`w-full px-4 py-3 rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-800 text-white border border-gray-700 focus:ring-blue-500 focus:border-transparent' : 'bg-white text-gray-800 border border-gray-300 focus:ring-red-500 focus:border-transparent'}`} // Styles based on dark mode
                          autoComplete="off"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      {/* Background gradient behind input */}
                      <div className={`absolute -inset-0.5 ${darkMode ? 'bg-gradient-to-r from-blue-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-red-500'} rounded-lg blur opacity-30`}></div>
                      <div className="relative">
                           {/* Passkey Input - Changed background for white theme */}
                        <input
                          type={passwordVisible ? "text" : "password"}
                          value={passkey}
                          onChange={(e) => setPasskey(e.target.value)}
                          placeholder="Passkey"
                          className={`w-full px-4 py-3 pr-10 rounded-lg focus:outline-none focus:ring-2 ${darkMode ? 'bg-gray-800 text-white border border-gray-700 focus:ring-blue-500 focus:border-transparent' : 'bg-white text-gray-800 border border-gray-300 focus:ring-red-500 focus:border-transparent'}`} // Styles based on dark mode
                          autoComplete="off"
                        />
                         {/* Password Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={togglePasswordVisibility}
                          className={`absolute right-3 top-1/2 transform -translate-y-1/2 transition-colors ${darkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-600 hover:text-red-400'}`} // Styles based on dark mode
                        >
                          {passwordVisible ? (
                             // Eye-slash icon
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59" />
                            </svg>
                          ) : (
                     // Eye icon
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    {error && (
                      <div className="py-2 px-3 bg-red-900/50 border border-red-700 rounded-lg text-red-400 text-sm flex items-center space-x-2 animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span>{error}</span>
                      </div>
                    )}
                    {/* Unlock Access button */}
                    <button
                      type="submit"
                      className={`w-full py-3 px-4 ${darkMode ? 'bg-gradient-to-r from-blue-600 to-blue-600 hover:from-blue-500 hover:to-blue-500' : 'bg-gradient-to-r from-red-600 to-red-600 hover:from-red-500 hover:to-red-500'} text-white font-medium rounded-lg transition-all duration-200 relative overflow-hidden group`}
                    >
                      {/* Hover effect gradient */}
                      <span className={`absolute inset-0 w-full h-full ${darkMode ? 'bg-gradient-to-r from-blue-400 to-blue-400' : 'bg-gradient-to-r from-red-400 to-red-400'} opacity-0 group-hover:opacity-20 transition-opacity duration-200`}></span>
                      <span className="flex items-center justify-center">
                         {/* Lock icon */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                        </svg>
                        Unlock Access
                      </span>
                    </button>
                  </form>
                </div>
                {/* Quote section */}
                 <div className={`p-4 border-t ${darkMode ? 'border-gray-800 text-gray-400' : 'border-gray-200 text-gray-600'} text-center text-sm italic`}> {/* Styles based on dark mode */}
                  {currentQuote}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* Bottom-left Security Badges - Fixed position */}
      <div className="fixed bottom-4 left-6 text-sm hidden md:flex flex-col items-start">
        <div className="flex items-center space-x-1 mb-1">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>256-bit Encryption</span> {/* Text color based on dark mode */}
        </div>
        <div className="flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-red-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 0 002-2v-6a2 0 00-2-2H6a2 0 00-2 2v6a2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>Secure Authentication</span> {/* Text color based on dark mode */}
        </div>
      </div>

      {/* Copyright Text - Properly positioned in bottom right */}
      <div className="hidden md:block fixed bottom-4 right-6 text-sm max-w-xs text-right">
        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>© {new Date().getFullYear()} Kuwuten • All Rights Reserved</span><br/> {/* Text color based on dark mode */}
        <span className={darkMode ? 'text-gray-500' : 'text-gray-600'}>End-to-End Encrypted</span> {/* Text color based on dark mode */}
      </div>

      {/* Mobile version - smaller font and multi-line */}
      <div className="block md:hidden fixed bottom-4 right-4 max-w-[180px] text-right">
        <p className={`text-[10px] leading-tight ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}> {/* Text color based on dark mode */}
          © {new Date().getFullYear()} Kuwuten
        </p>
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

         @keyframes blob {
            0% { transform: scale(1) translate(0, 0); }
            33% { transform: scale(1.1) translate(30px, -20px); }
            66% { transform: scale(0.9) translate(-20px, 30px); }
            100% { transform: scale(1) translate(0, 0); }
          }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }

        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }

         .animate-blob {
            animation: blob 7s infinite ease-in-out;
          }
      `}</style>
    </div>
  );
};

AccessGate.propTypes = {
  onAccessGranted: PropTypes.func,
};
export default AccessGate;
