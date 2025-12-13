import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import authService from '../services/authService';
import { 
  Terminal, 
  Cpu, 
  Wifi, 
  Shield, 
  Zap, 
  Globe, 
  Activity, 
  Code, 
  Database,
  Share2,
  HardDrive,
  Monitor,
  Server,
  Lock,
  FileText,
  Radio,
  Power
} from 'lucide-react';

/* ===================================================================
  AIRSTREAM V.2.1 - RETRO CYBERDECK EDITION (NO COMMERCE)
  ===================================================================
  Author: You (The Hobbyist)
  Theme: Synthwave / 1980s Hacker Terminal
  -------------------------------------------------------------------
*/

// --- MOCK DATA GENERATORS ---

// Generate a massive amount of fake logs to simulate a busy server
const generateLogs = () => {
  const actions = [
    'ENCRYPTING_PACKET', 'REROUTING_PROXY', 'HANDSHAKE_INIT', 'BUFFER_FLUSH', 
    'DEFRAGGING_SECTOR', 'OPTIMIZING_VRAM', 'SCANNING_PORTS', 'MOUNTING_DRIVE'
  ];
  const statuses = ['OK', 'PENDING', 'SUCCESS', 'VERIFIED'];
  
  return Array.from({ length: 60 }, (_, i) => ({
    id: `LOG-${3000 + i}`,
    timestamp: new Date(Date.now() - i * 50000).toISOString(),
    level: Math.random() > 0.9 ? 'WARNING' : 'INFO',
    code: Math.floor(Math.random() * 9999),
    action: actions[Math.floor(Math.random() * actions.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    latency: `${Math.floor(Math.random() * 50)}ms`
  }));
};

const SYSTEM_LOGS = generateLogs();

const FEATURES_DATA = [
  {
    id: 'F1',
    title: 'HYPER-SPEED UPLINK',
    icon: <Zap className="w-8 h-8 text-yellow-400" />,
    desc: 'Transfer data at mach speeds using our proprietary compression algorithms derived from 1980s supercomputers.',
    stats: { label: 'SPEED', value: '900 TB/s' }
  },
  {
    id: 'F2',
    title: 'MIL-SPEC ENCRYPTION',
    icon: <Shield className="w-8 h-8 text-green-400" />,
    desc: '256-bit encryption so strong it would take a quantum computer a billion years to crack. Your secrets are safe.',
    stats: { label: 'SECURITY', value: 'LVL 10' }
  },
  {
    id: 'F3',
    title: 'GLOBAL NODE NET',
    icon: <Globe className="w-8 h-8 text-cyan-400" />,
    desc: 'Access your files from any terminal on the planet. Our distributed network ensures 100% uptime.',
    stats: { label: 'NODES', value: '42,069' }
  },
  {
    id: 'F4',
    title: 'OFFLINE_STORAGE',
    icon: <HardDrive className="w-8 h-8 text-pink-500" />,
    desc: 'Redundant backups stored in cold storage bunkers deep underground. EMP proof.',
    stats: { label: 'BACKUPS', value: 'INFINITE' }
  },
  {
    id: 'F5',
    title: 'NEURAL_LINK',
    icon: <Cpu className="w-8 h-8 text-purple-400" />,
    desc: 'Experimental interface allowing direct brain-to-cloud uploads. (Beta access only).',
    stats: { label: 'LATENCY', value: '0ms' }
  },
  {
    id: 'F6',
    title: 'GHOST_PROTOCOL',
    icon: <Lock className="w-8 h-8 text-red-500" />,
    desc: 'Complete anonymity. We do not track IP addresses, metadata, or user behavior.',
    stats: { label: 'TRACKING', value: 'NULL' }
  }
];

const TESTIMONIALS = [
  {
    user: 'ACID_BURN',
    role: 'ELITE HACKER',
    text: "Airstream is the only cloud storage I trust with my Gibson hacking scripts. The encryption is tighter than a bank vault.",
    rating: 5
  },
  {
    user: 'CRASH_OVERRIDE',
    role: 'SYSTEM OP',
    text: "Radical speeds. I uploaded a 5TB neural net in seconds. Totally tubular interface, feels just like home.",
    rating: 5
  },
  {
    user: 'FLYNN',
    role: 'USER',
    text: "I got stuck in the grid once. Airstream got my data out even when I couldn't escape. End of line.",
    rating: 4
  },
  {
    user: 'CEREAL_KILLER',
    role: 'PHREAKER',
    text: "Hack the planet! But store your loot here first. Best bandwidth in the sector.",
    rating: 5
  }
];

// --- UTILITY COMPONENTS ---

const Scanlines = () => (
  <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden h-full w-full">
    {/* CRT Scanline Effect */}
    <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] pointer-events-none" />
    {/* Screen Flicker */}
    <div className="absolute inset-0 bg-white opacity-[0.02] animate-flicker pointer-events-none mix-blend-overlay" />
    {/* Vignette */}
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
  </div>
);

const TerminalPrompt = ({ text, color="text-pink-500" }) => (
  <div className="font-mono text-green-500 flex items-center gap-2 mb-2">
    <span className={color}>root@airstream:~$</span>
    <span className="typing-effect">{text}</span>
    <span className="w-2 h-4 bg-green-500 animate-pulse inline-block" />
  </div>
);

// --- MEMORY MATRIX MINI GAME COMPONENT ---
// A simple game embedded in the dashboard to add code volume and fun
const MemoryMatrix = () => {
  const [grid, setGrid] = useState(Array(16).fill(false));
  const [pattern, setPattern] = useState([]);
  const [playing, setPlaying] = useState(false);
  const [showingPattern, setShowingPattern] = useState(false);
  const [score, setScore] = useState(0);
  const [message, setMessage] = useState("PRESS START TO HACK");

  const startGame = () => {
    setScore(0);
    nextLevel(1);
  };

  const nextLevel = (level) => {
    setPlaying(true);
    setMessage(`LEVEL ${level} - MEMORIZE PATTERN`);
    const newPattern = [];
    // Generate random pattern based on level difficulty
    const count = Math.min(3 + level, 10);
    while(newPattern.length < count) {
      const idx = Math.floor(Math.random() * 16);
      if(!newPattern.includes(idx)) newPattern.push(idx);
    }
    setPattern(newPattern);
    setShowingPattern(true);
    
    // Show pattern
    const showGrid = Array(16).fill(false);
    newPattern.forEach(i => showGrid[i] = true);
    setGrid(showGrid);

    // Hide pattern after delay
    setTimeout(() => {
      setGrid(Array(16).fill(false));
      setShowingPattern(false);
      setMessage("REPLICATE PATTERN NOW");
    }, 1500);
  };

  const handleCellClick = (index) => {
    if (!playing || showingPattern) return;

    if (pattern.includes(index)) {
      // Correct click
      const newGrid = [...grid];
      newGrid[index] = true;
      setGrid(newGrid);

      // Check if level complete
      const currentCorrect = newGrid.filter(Boolean).length;
      if (currentCorrect === pattern.length) {
        setMessage("ACCESS GRANTED. INITIALIZING NEXT LAYER...");
        setTimeout(() => nextLevel(score + 2), 1000); // Hacky level increment
        setScore(s => s + 1);
      }
    } else {
      // Wrong click
      setMessage(`ACCESS DENIED. GAME OVER. SCORE: ${score}`);
      setPlaying(false);
      setGrid(grid.map((_, i) => pattern.includes(i))); // Reveal solution
    }
  };

  return (
    <div className="border-2 border-green-500/50 bg-black/80 p-6 rounded-sm w-full max-w-md mx-auto relative overflow-hidden group shadow-[0_0_20px_rgba(0,255,0,0.15)]">
      <div className="absolute top-0 left-0 bg-green-500 text-black text-xs px-2 py-1 font-bold font-mono">MINIGAME_EXE</div>
      <div className="absolute top-0 right-0 p-2 flex gap-1">
        <div className="w-2 h-2 rounded-full bg-red-500" />
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <div className="w-2 h-2 rounded-full bg-green-500" />
      </div>
      
      <h3 className="text-green-500 font-mono text-center mb-4 text-xl tracking-widest glitch-text mt-4">MEMORY_MATRIX</h3>
      
      <div className="grid grid-cols-4 gap-3 mb-6 p-4 bg-green-900/10 rounded-lg border border-green-500/20">
        {grid.map((active, i) => (
          <button
            key={i}
            onClick={() => handleCellClick(i)}
            className={`
              h-10 w-10 sm:h-12 sm:w-12 border border-green-500/30 transition-all duration-200 rounded-sm
              ${active ? 'bg-green-500 shadow-[0_0_15px_#22c55e] scale-95' : 'bg-transparent hover:bg-green-500/20 hover:border-green-400'}
              ${!playing && !active ? 'opacity-30' : ''}
            `}
          />
        ))}
      </div>

      <div className="font-mono text-center text-green-400 mb-4 h-6 text-sm">
        {message}
      </div>

      {!playing && (
        <button 
          onClick={startGame}
          className="w-full py-3 bg-green-600 hover:bg-green-500 text-black font-bold font-mono uppercase tracking-[0.2em] transition-all hover:shadow-[0_0_20px_rgba(34,197,94,0.6)]"
        >
          {score > 0 ? 'RETRY HACK' : 'INITIATE HACK'}
        </button>
      )}
    </div>
  );
};

// --- MAIN PAGE COMPONENT ---

const Home = () => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
  
  // Loading State for "Boot Sequence"
  const [bootStep, setBootStep] = useState(0);
  const [isBooted, setIsBooted] = useState(false);
  
  // Refs for scrolling interactions
  const scrollRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: scrollRef });

  // Handle Boot Sequence
  useEffect(() => {
    // Check session storage to only run boot sequence once per session
    if (sessionStorage.getItem('booted')) {
      setIsBooted(true);
      return;
    }

    const steps = [
      () => setBootStep(1), // BIOS
      () => setBootStep(2), // Memory Check
      () => setBootStep(3), // Loading Kernel
      () => setBootStep(4), // Mount Drives
      () => { setIsBooted(true); sessionStorage.setItem('booted', 'true'); }
    ];

    let delay = 0;
    steps.forEach((step, index) => {
      delay += (Math.random() * 800) + 500;
      setTimeout(step, delay);
    });
  }, []);

  // --- RENDER BOOT SCREEN ---
  if (!isBooted) {
    return (
      <div className="min-h-screen bg-black text-green-500 font-mono p-8 flex flex-col justify-end text-lg overflow-hidden">
        <Scanlines />
        <div className="max-w-3xl space-y-2 uppercase">
          {bootStep >= 1 && <p>AIRSTREAM BIOS (C) 1985-2025</p>}
          {bootStep >= 1 && <p>CPU: QUANTUM CORE i99 @ 500THz</p>}
          {bootStep >= 2 && <p>CHECKING MEMORY... <span className="text-white">OK (9999TB)</span></p>}
          {bootStep >= 2 && <p>LOADING DRIVERS... <span className="text-white">OK</span></p>}
          {bootStep >= 3 && (
            <>
              <p>INITIALIZING GRAPHICS SUBSYSTEM...</p>
              <div className="w-64 h-4 border border-green-700 p-0.5 mt-2">
                <motion.div 
                  initial={{ width: 0 }} 
                  animate={{ width: '100%' }} 
                  transition={{ duration: 1.5 }}
                  className="h-full bg-green-500" 
                />
              </div>
            </>
          )}
          {bootStep >= 4 && <p className="animate-pulse">MOUNTING CLOUD VOLUMES...</p>}
          {bootStep >= 4 && <p>WELCOME USER. PRESS ANY KEY TO ABORT (JUST KIDDING)...</p>}
        </div>
      </div>
    );
  }

  // --- RENDER MAIN UI ---
  return (
    <div ref={scrollRef} className="min-h-screen bg-[#050505] text-gray-200 font-mono selection:bg-pink-500 selection:text-white overflow-x-hidden">
      
      {/* GLOBAL STYLES & ANIMATIONS */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=VT323&family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap');
        
        :root {
          --neon-pink: #ff2a6d;
          --neon-blue: #05d9e8;
          --matrix-green: #00ff41;
        }

        body {
          font-family: 'Space Mono', monospace;
        }

        h1, h2, h3, .retro-font {
          font-family: 'VT323', monospace;
        }

        .text-glow {
          text-shadow: 0 0 10px rgba(255, 42, 109, 0.7), 0 0 20px rgba(255, 42, 109, 0.5);
        }
        
        .text-glow-blue {
          text-shadow: 0 0 10px rgba(5, 217, 232, 0.7), 0 0 20px rgba(5, 217, 232, 0.5);
        }

        .border-glow {
          box-shadow: 0 0 10px rgba(5, 217, 232, 0.5), inset 0 0 10px rgba(5, 217, 232, 0.2);
        }

        @keyframes grid-move {
          0% { transform: translateY(0); }
          100% { transform: translateY(50px); }
        }

        .bg-grid-retro {
          background-size: 50px 50px;
          background-image:
            linear-gradient(to right, rgba(5, 217, 232, 0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 42, 109, 0.1) 1px, transparent 1px);
          animation: grid-move 3s linear infinite;
        }

        .typing-effect {
          overflow: hidden;
          white-space: nowrap;
          border-right: 2px solid transparent;
        }
        
        /* Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 10px;
          background: #000;
        }
        ::-webkit-scrollbar-thumb {
          background: #333;
          border: 1px solid #05d9e8;
        }

        .glitch-wrapper {
           position: relative;
        }
      `}</style>

      <Scanlines />

      {/* --- NAVBAR --- */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/90 border-b border-cyan-500/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex items-center justify-center bg-cyan-900/20 border border-cyan-500 rounded-sm group-hover:bg-cyan-500/20 transition-all">
              <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-bold tracking-widest text-white retro-font text-glow-blue">AIRSTREAM</span>
              <span className="text-[10px] text-cyan-500 tracking-[0.2em] uppercase">Cloud Systems Inc.</span>
            </div>
          </Link>

          {/* Navigation Links (Pricing Removed) */}
          <nav className="hidden md:flex items-center gap-8">
            {['FEATURES', 'SYSTEM_LOGS', 'ABOUT'].map((item) => (
              <a 
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-xs font-bold text-gray-400 hover:text-cyan-400 tracking-widest transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-pink-500 group-hover:w-full transition-all duration-300" />
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <div className="hidden sm:flex flex-col items-end mr-2">
                  <span className="text-[10px] text-green-500">STATUS: ONLINE</span>
                  <span className="text-xs text-gray-400">ID: USER_884</span>
                </div>
                <button
                  onClick={() => navigate('/workspace')}
                  className="px-6 py-1 bg-pink-600/20 border border-pink-500 text-pink-500 hover:bg-pink-600 hover:text-white transition-all duration-200 uppercase text-xs font-bold tracking-wider hover:shadow-[0_0_15px_rgba(255,42,109,0.5)]"
                >
                  ENTER_DECK
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                 <Link to="/auth/login">
                  <button className="px-4 py-1 text-cyan-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors">
                    Log_In
                  </button>
                </Link>
                <Link to="/auth/signup">
                  <button className="px-4 py-1 bg-cyan-900/30 border border-cyan-400 text-cyan-400 hover:bg-cyan-400 hover:text-black transition-all duration-200 uppercase text-xs font-bold tracking-wider">
                    Init_User
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="pt-16 relative">
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden border-b border-pink-500/30">
          {/* Animated Background Grid */}
          <div className="absolute inset-0 bg-grid-retro opacity-20 pointer-events-none" style={{ perspective: '1000px', transform: 'rotateX(60deg) scale(2)' }} />
          
          {/* Floating Geometric Shapes */}
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 right-[10%] w-64 h-64 border border-cyan-500/20 rounded-full border-dashed pointer-events-none"
          />
          <motion.div 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-20 left-[10%] w-48 h-48 border-2 border-pink-500/20 pointer-events-none"
          />

          <div className="relative z-10 container mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-sm border border-green-500/50 bg-green-900/20 text-green-400 text-xs font-mono mb-4">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                SYSTEM OPTIMIZED FOR 2025
              </div>

              <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 retro-font mb-2 leading-none">
                STORE YOUR <br />
                <span className="text-cyan-400 text-glow-blue">DIGITAL SOUL</span>
              </h1>
              
              <div className="h-24 md:h-16 flex items-center justify-center">
                 <p className="text-xl md:text-2xl text-pink-500 font-mono max-w-2xl mx-auto">
                  <span className="mr-2">{'>'}</span>
                   High-frequency cloud storage for the modern netrunner.
                   <span className="animate-pulse ml-1">_</span>
                 </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mt-12">
                <button 
                   onClick={() => isAuthenticated ? navigate('/workspace') : navigate('/auth/signup')}
                   className="group relative px-8 py-4 bg-transparent overflow-hidden"
                >
                  <div className="absolute inset-0 w-full h-full bg-cyan-500/20 border border-cyan-400 skew-x-[-12deg] group-hover:bg-cyan-500/40 transition-all" />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400 group-hover:h-full transition-all duration-300 opacity-20" />
                  <span className="relative flex items-center gap-3 text-cyan-400 font-bold tracking-[0.2em] group-hover:text-white transition-colors">
                    <Database className="w-5 h-5" />
                    INITIALIZE_DRIVE
                  </span>
                </button>

                <button className="group px-8 py-4 bg-transparent border border-pink-500/50 hover:border-pink-500 transition-colors skew-x-[-12deg]">
                  <span className="block skew-x-[12deg] text-pink-500 font-bold tracking-widest group-hover:text-pink-400">
                    READ_MANIFESTO
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
          
          {/* Scroll Indicator */}
          <motion.div 
            animate={{ y: [0, 10, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cyan-500/50"
          >
            <span className="text-[10px] tracking-widest uppercase">Scroll_Down</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-cyan-500 to-transparent" />
          </motion.div>
        </section>

        {/* --- STATS RIBBON --- */}
        <div className="border-y border-pink-500/20 bg-black/50 backdrop-blur-sm overflow-hidden">
          <div className="flex whitespace-nowrap animate-[marquee_20s_linear_infinite]">
            {Array(10).fill(null).map((_, i) => (
              <div key={i} className="flex items-center gap-12 px-6 py-3 text-pink-500/70 font-mono text-sm">
                <span>UPTIME: 99.999%</span>
                <span>•</span>
                <span>ENCRYPTION: AES-256</span>
                <span>•</span>
                <span>USERS: 2.4M</span>
                <span>•</span>
                <span>DATA: 45PB</span>
                <span>•</span>
              </div>
            ))}
          </div>
        </div>

        {/* --- FEATURES GRID --- */}
        <section id="features" className="py-24 px-4 relative">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-5xl md:text-6xl text-white retro-font text-glow mb-4">SYSTEM MODULES</h2>
              <div className="w-24 h-1 bg-pink-500 mx-auto" />
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {FEATURES_DATA.map((feature, i) => (
                <motion.div
                  key={feature.id}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                  className="relative p-1 bg-gradient-to-br from-cyan-500/30 to-pink-500/30 hover:from-cyan-500 hover:to-pink-500 transition-all duration-300"
                >
                  <div className="bg-black h-full p-8 relative overflow-hidden group">
                    {/* Grid Background in Card */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[length:20px_20px] opacity-20" />
                    
                    <div className="relative z-10">
                      <div className="mb-6 inline-block p-3 bg-gray-900 border border-gray-700 rounded-sm group-hover:border-white transition-colors">
                        {feature.icon}
                      </div>
                      
                      <h3 className="text-2xl font-bold text-white mb-4 font-mono tracking-tight group-hover:text-cyan-400 transition-colors">
                        {feature.title}
                      </h3>
                      
                      <p className="text-gray-400 leading-relaxed mb-8 text-sm border-l-2 border-gray-800 pl-4">
                        {feature.desc}
                      </p>

                      <div className="flex items-center justify-between border-t border-gray-800 pt-4">
                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">{feature.stats.label}</span>
                        <span className="text-lg font-bold text-pink-500 font-mono">{feature.stats.value}</span>
                      </div>
                    </div>

                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyan-500" />
                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyan-500" />
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-pink-500" />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-pink-500" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* --- SYSTEM LOGS (SCROLLING TEXT) --- */}
        <section id="system_logs" className="py-20 bg-black relative border-y border-green-900/50">
          <div className="max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12">
            
            {/* Left Col: Explainer */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 text-green-500 border border-green-500/30 px-3 py-1 text-xs font-mono">
                <Activity className="w-4 h-4" />
                LIVE_FEED_V.2.4
              </div>
              
              <h2 className="text-4xl md:text-5xl text-white retro-font leading-tight">
                TRANSPARENCY IN <br/>
                <span className="text-green-500">REAL-TIME</span>
              </h2>
              
              <p className="text-gray-400 text-lg">
                Watch the system breathe. Every upload, every encryption cycle, every node connection is tracked in our immutable ledger.
              </p>

              <div className="p-6 border border-green-500/20 bg-green-900/5 rounded-sm">
                 <h4 className="text-green-400 font-bold mb-4 flex items-center gap-2">
                   <Code className="w-5 h-5" />
                   DEVELOPER ACCESS
                 </h4>
                 <div className="space-y-2 font-mono text-xs text-green-300/70">
                   <p>API_ENDPOINT: https://api.airstream.net/v1/stream</p>
                   <p>AUTH_METHOD: Bearer Token (JWT)</p>
                   <p>RATE_LIMIT: 5000 req/s</p>
                   <p className="text-green-500 mt-2">
                     <span className="inline-block animate-pulse">_</span> Waiting for connection...
                   </p>
                 </div>
              </div>
            </div>

            {/* Right Col: The Terminal */}
            <div className="relative">
              {/* Window Header */}
              <div className="bg-gray-800 flex items-center justify-between px-3 py-2 rounded-t-md border-b border-gray-700">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="text-xs text-gray-400 font-mono">/var/log/syslog</div>
              </div>

              {/* Terminal Content */}
              <div className="h-[400px] bg-black/90 border border-gray-700 border-t-0 p-4 font-mono text-xs overflow-hidden relative rounded-b-md shadow-2xl">
                 <div className="absolute inset-0 overflow-y-auto custom-scrollbar p-4 space-y-1">
                    {SYSTEM_LOGS.map((log) => (
                      <div key={log.id} className="grid grid-cols-[140px_80px_100px_1fr] gap-4 hover:bg-white/5 p-0.5 transition-colors border-b border-white/5">
                        <span className="text-gray-500">[{log.timestamp.split('T')[1].split('.')[0]}]</span>
                        <span className={`${log.level === 'WARNING' ? 'text-yellow-500' : 'text-green-500'}`}>{log.level}</span>
                        <span className="text-cyan-600">ID:{log.code}</span>
                        <span className="text-gray-300 truncate">
                          <span className="text-pink-500 mr-2">{'>'}</span>
                          {log.action} ... {log.status} ({log.latency})
                        </span>
                      </div>
                    ))}
                    <div className="animate-pulse text-green-500 mt-4">_</div>
                 </div>
              </div>
              
              {/* Decorative Cable */}
              <div className="hidden lg:block absolute -right-20 top-1/2 w-20 h-32 border-b-2 border-r-2 border-green-500/20 rounded-br-2xl -z-10" />
            </div>

          </div>
        </section>

        {/* --- INTERACTIVE PLAYGROUND (Game + Terminal) --- */}
        <section className="py-24 bg-[#0a0a0a] border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-4">
             <div className="text-center mb-12">
               <h2 className="text-4xl text-white retro-font mb-2">BREAK_TIME.EXE</h2>
               <p className="text-gray-500 font-mono text-sm">Waiting for uploads? Train your brain.</p>
             </div>

             <div className="grid md:grid-cols-2 gap-12 items-center">
                {/* Game */}
                <div>
                   <MemoryMatrix />
                </div>

                {/* Dummy Terminal Interactive */}
                <div className="border border-gray-700 bg-black p-6 rounded-md shadow-lg min-h-[400px] flex flex-col font-mono text-sm">
                   <div className="text-gray-400 mb-4 border-b border-gray-800 pb-2">
                     Welcome to Airstream Shell v2.4.5<br/>
                     Type 'help' for available commands.
                   </div>
                   
                   <div className="space-y-4">
                     <div>
                        <TerminalPrompt text="mount /dev/cloud_storage" />
                        <div className="text-gray-300 mb-2 pl-4 border-l border-gray-800">
                          {'>'} Mounting volume... Done.<br/>
                          {'>'} 450GB Free Space available.<br/>
                          {'>'} Path: /usr/home/data
                        </div>
                     </div>

                     <div>
                        <TerminalPrompt text="encrypt --all" />
                        <div className="text-gray-300 mb-2 pl-4 border-l border-gray-800">
                          {'>'} Encrypting 14,032 files...<br/>
                          {'>'} [====================] 100%<br/>
                          {'>'} <span className="text-green-500">Encryption Complete. Keys stored in hardware enclave.</span>
                        </div>
                     </div>

                     <div>
                        <TerminalPrompt text="ping satellite_uplink_alpha" color="text-cyan-400" />
                         <div className="text-gray-300 mb-2 pl-4 border-l border-gray-800">
                          {'>'} Pinging 192.168.0.99 with 32 bytes of data:<br/>
                          {'>'} Reply from 192.168.0.99: bytes=32 time=2ms TTL=54<br/>
                          {'>'} Reply from 192.168.0.99: bytes=32 time=2ms TTL=54
                        </div>
                     </div>
                   </div>

                   <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-800">
                     <span className="text-pink-500">root@airstream:~$</span>
                     <input 
                       type="text" 
                       className="bg-transparent border-none outline-none text-white w-full focus:ring-0" 
                       placeholder="|"
                       disabled
                     />
                   </div>
                </div>
             </div>
          </div>
        </section>

        {/* --- TESTIMONIALS (BBS STYLE) --- */}
        <section className="py-24 bg-gray-900/30 border-t border-gray-800">
          <div className="max-w-5xl mx-auto px-4">
             <div className="flex items-center justify-between mb-12 border-b-2 border-white/10 pb-4">
               <h2 className="text-3xl text-white retro-font">USER_DATABASE // COMMENTS</h2>
               <div className="text-xs font-mono text-gray-500">PAGE 1 OF 99</div>
             </div>

             <div className="space-y-6">
                {TESTIMONIALS.map((t, i) => (
                  <div key={i} className="bg-black p-6 border-l-4 border-cyan-500 shadow-md">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-gray-800 flex items-center justify-center font-bold text-cyan-400 text-xl font-mono">
                             {t.user.charAt(0)}
                           </div>
                           <div>
                             <div className="font-bold text-cyan-400 font-mono tracking-wider">{t.user}</div>
                             <div className="text-[10px] text-gray-500 uppercase">{t.role}</div>
                           </div>
                        </div>
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, stars) => (
                            <div key={stars} className={`w-2 h-2 rounded-full ${stars < t.rating ? 'bg-pink-500' : 'bg-gray-800'}`} />
                          ))}
                        </div>
                     </div>
                     <p className="font-mono text-gray-300 text-sm leading-relaxed">
                       "{t.text}"
                     </p>
                  </div>
                ))}
             </div>
          </div>
        </section>

        {/* --- FOOTER (EXTENDED) --- */}
        <footer id="about" className="border-t border-gray-800 bg-black pt-16 pb-8 relative">
          <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-4 gap-12 mb-12">
            
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                 <Cpu className="text-cyan-500 w-6 h-6" />
                 <span className="text-xl font-bold text-white retro-font">AIRSTREAM</span>
              </div>
              <p className="text-gray-500 text-xs leading-loose font-mono">
                Est. 1985 (Simulated). We provide the backbone for the global information superhighway. Don't copy that floppy.
              </p>
              <div className="flex gap-2 mt-4">
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-pink-500 hover:text-white transition-colors cursor-pointer">
                    <Radio className="w-4 h-4" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-cyan-500 hover:text-white transition-colors cursor-pointer">
                    <Wifi className="w-4 h-4" />
                 </div>
                 <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-green-500 hover:text-white transition-colors cursor-pointer">
                    <Power className="w-4 h-4" />
                 </div>
              </div>
            </div>
            
            {/* Sitemap */}
            <div>
              <h4 className="text-white font-bold mb-6 font-mono text-sm flex items-center gap-2">
                 <FileText className="w-4 h-4 text-pink-500"/> DIRECTORIES
              </h4>
              <ul className="space-y-3 text-xs text-gray-500 font-mono">
                {['/home', '/features', '/about_us', '/contact', '/login'].map(l => (
                  <li key={l} className="hover:text-cyan-400 cursor-pointer hover:translate-x-1 transition-transform flex items-center gap-2">
                    <span>{'>'}</span> {l}
                  </li>
                ))}
              </ul>
            </div>

            {/* Protocols */}
            <div>
              <h4 className="text-white font-bold mb-6 font-mono text-sm flex items-center gap-2">
                <Server className="w-4 h-4 text-green-500"/> PROTOCOLS
              </h4>
              <ul className="space-y-3 text-xs text-gray-500 font-mono">
                <li className="hover:text-pink-500 cursor-pointer">Privacy_Policy.txt</li>
                <li className="hover:text-pink-500 cursor-pointer">Terms_Of_Service.md</li>
                <li className="hover:text-pink-500 cursor-pointer">Cookie_Config.json</li>
                <li className="hover:text-pink-500 cursor-pointer">Security_Audit.log</li>
              </ul>
            </div>

            {/* Newsletter */}
            <div>
               <h4 className="text-white font-bold mb-6 font-mono text-sm">NEWSLETTER</h4>
               <div className="flex flex-col gap-2">
                 <input 
                   type="email" 
                   placeholder="ENTER_EMAIL_ADDRESS" 
                   className="bg-gray-900 border border-gray-700 text-white px-4 py-2 text-xs font-mono focus:border-cyan-500 outline-none placeholder:text-gray-700"
                 />
                 <button className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-400 py-2 text-xs font-bold uppercase hover:bg-cyan-500 hover:text-black transition-colors">
                   SUBSCRIBE
                 </button>
               </div>
               <p className="text-[10px] text-gray-600 mt-2">No spam. Only encrypted data.</p>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 pt-8 border-t border-gray-900 flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-[10px] text-gray-600 font-mono">
               © 2025 AIRSTREAM INC. ALL RIGHTS RESERVED. SYSTEM ID: XJ-9
             </p>
             <div className="flex gap-4">
                {[Wifi, Monitor, HardDrive, Share2].map((Icon, i) => (
                  <Icon key={i} className="w-4 h-4 text-gray-700 hover:text-white transition-colors cursor-pointer" />
                ))}
             </div>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default Home;
