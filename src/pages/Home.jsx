import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  motion, 
  useScroll, 
  useTransform, 
  AnimatePresence,
  useInView,
  useSpring,
  useMotionValue,
  useMotionTemplate
} from 'framer-motion';
import authService from '../services/authService';
import { 
  ArrowRight, 
  Menu, 
  X, 
  Check, 
  Terminal, 
  Cpu, 
  Globe, 
  Database, 
  Shield, 
  Zap,
  LayoutGrid,
  Box,
  Server,
  Code,
  GitBranch,
  Activity,
  Lock,
  Cloud,
  ChevronDown,
  Github,
  Mail,
  Play,
  Pause,
  RefreshCw,
  Search,
  Settings,
  Sliders,
  Laptop,
  Smartphone,
  Tablet,
  Wifi,
  HardDrive,
  FileCode,
  Layers,
  Maximize,
  Minimize,
  Download,
  Upload,
  Share2,
  Copy,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Music,
  Video,
  Archive,
  Folder,
  Eye,
  MoreVertical,
  Clock,
  Trash2,
  Command,
  Hash
} from 'lucide-react';

/* ===================================================================
   AIRSTREAM CLOUD STORAGE - ENTERPRISE EDITION
   Design System: "Deep Space" (Render/Vercel inspired)
   Focus: File Storage, Encryption, Sync
   =================================================================== */

// --- CONFIGURATION ---
const GITHUB_URL = "https://github.com/imanki-t/";
const CONTACT_EMAIL = "noreply.airstream@gmail.com";
const LOGO_URL = "/air.png";

// --- MOCK DATA: GLOBAL DATA CENTERS ---
const DATA_CENTERS = [
  { code: 'US-EAST', name: 'N. Virginia', status: 'operational', lat: 30, lng: -70 },
  { code: 'US-WEST', name: 'Oregon', status: 'operational', lat: 35, lng: -110 },
  { code: 'EU-WEST', name: 'Ireland', status: 'operational', lat: 45, lng: -10 },
  { code: 'EU-CENTRAL', name: 'Frankfurt', status: 'operational', lat: 48, lng: 10 },
  { code: 'AP-SOUTH', name: 'Mumbai', status: 'operational', lat: 15, lng: 75 },
  { code: 'AP-SE', name: 'Singapore', status: 'operational', lat: 0, lng: 100 },
  { code: 'AP-NE', name: 'Tokyo', status: 'operational', lat: 35, lng: 135 },
  { code: 'SA-EAST', name: 'São Paulo', status: 'operational', lat: -20, lng: -50 },
];

// --- SUB-COMPONENT: ANIMATED GRID BACKGROUND ---
const GridBackground = ({ className = "" }) => (
  <div className={`absolute inset-0 z-0 pointer-events-none ${className}`}>
    <div 
      className="absolute inset-0 opacity-[0.03]" 
      style={{ 
        backgroundImage: 'linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)',
        backgroundSize: '40px 40px' 
      }} 
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
  </div>
);

// --- SUB-COMPONENT: DATA TRANSFER VISUALIZER ---
// Simulates uploading a file to the cloud securely
const DataTransferVisualizer = () => {
  const chunks = Array.from({ length: 8 });
  const [activeChunk, setActiveChunk] = useState(0);
  const [status, setStatus] = useState('encrypting'); // encrypting, uploading, synced

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveChunk(prev => (prev + 1) % (chunks.length + 4));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeChunk < 4) setStatus('encrypting');
    else if (activeChunk < 8) setStatus('uploading');
    else setStatus('synced');
  }, [activeChunk]);

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800/50 backdrop-blur-sm relative overflow-hidden">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:20px_20px]" />
      
      {/* Visualizer Container */}
      <div className="relative z-10 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Source: Local Device */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 relative">
            <Laptop className="w-8 h-8 text-zinc-400" />
            <div className="absolute -bottom-2 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] text-zinc-500 font-mono">
              LOCAL
            </div>
          </div>
        </div>

        {/* The Pipeline */}
        <div className="flex-1 h-12 sm:h-16 bg-black/50 rounded-lg border border-zinc-800 relative overflow-hidden flex items-center px-2 sm:px-4 gap-1 sm:gap-2">
          {chunks.map((_, i) => {
            const isActive = i === (activeChunk % 8);
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0.1, scale: 0.8 }}
                animate={{ 
                  opacity: isActive ? 1 : 0.2,
                  scale: isActive ? 1.1 : 0.9,
                  backgroundColor: activeChunk > i 
                    ? (status === 'synced' ? '#22c55e' : '#3b82f6') 
                    : '#27272a'
                }}
                className="h-2 sm:h-3 flex-1 rounded-full transition-colors duration-300"
              />
            );
          })}
          
          {/* Status Label Overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="px-3 py-1 bg-black/80 rounded-full border border-zinc-800 backdrop-blur-md">
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2
                ${status === 'encrypting' ? 'text-purple-400' : ''}
                ${status === 'uploading' ? 'text-blue-400' : ''}
                ${status === 'synced' ? 'text-green-400' : ''}
              `}>
                {status === 'encrypting' && <Lock className="w-3 h-3" />}
                {status === 'uploading' && <Upload className="w-3 h-3" />}
                {status === 'synced' && <Check className="w-3 h-3" />}
                {status}
              </span>
            </div>
          </div>
        </div>

        {/* Destination: Cloud */}
        <div className="flex flex-col items-center gap-4">
          <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl flex items-center justify-center border relative transition-colors duration-500
            ${status === 'synced' ? 'bg-green-500/10 border-green-500/50' : 'bg-zinc-800 border-zinc-700'}
          `}>
            <Cloud className={`w-8 h-8 transition-colors duration-500 ${status === 'synced' ? 'text-green-400' : 'text-zinc-400'}`} />
            <div className="absolute -bottom-2 px-2 py-0.5 bg-zinc-800 border border-zinc-700 rounded-full text-[10px] text-zinc-500 font-mono">
              CLOUD
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENT: FILE EXPLORER DEMO ---
// Mimics a clean file manager interface
const FileExplorer = () => {
  const [selectedFile, setSelectedFile] = useState('project-notes.md');
  
  const files = [
    { name: 'project-notes.md', type: 'doc', size: '2.4 KB', date: 'Just now' },
    { name: 'design-system.fig', type: 'design', size: '145 MB', date: '2m ago' },
    { name: 'presentation.pdf', type: 'pdf', size: '12 MB', date: '1h ago' },
    { name: 'assets', type: 'folder', size: '--', date: 'Yesterday' },
    { name: 'backup-2025.zip', type: 'zip', size: '4.2 GB', date: '2d ago' },
  ];

  const getIcon = (type) => {
    switch(type) {
      case 'doc': return <FileText className="w-4 h-4 text-blue-400" />;
      case 'design': return <Layers className="w-4 h-4 text-purple-400" />;
      case 'pdf': return <FileText className="w-4 h-4 text-red-400" />;
      case 'folder': return <Folder className="w-4 h-4 text-yellow-400" />;
      case 'zip': return <Archive className="w-4 h-4 text-zinc-400" />;
      default: return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-[#0a0a0a] rounded-xl border border-zinc-800 shadow-2xl overflow-hidden font-sans text-xs sm:text-sm flex flex-col h-[360px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/50 border-b border-zinc-800 shrink-0">
        <div className="flex items-center gap-2 text-zinc-400">
           <Cloud className="w-4 h-4" />
           <span className="text-zinc-600">/</span>
           <span className="text-white font-medium">My Workspace</span>
           <span className="text-zinc-600">/</span>
           <span>Documents</span>
        </div>
        <div className="flex gap-2">
          <div className="p-1.5 hover:bg-zinc-800 rounded cursor-pointer text-zinc-500 hover:text-white">
            <Search className="w-4 h-4" />
          </div>
          <div className="p-1.5 hover:bg-zinc-800 rounded cursor-pointer text-zinc-500 hover:text-white">
            <MoreVertical className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* File List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
         {files.map((file, i) => (
           <motion.div
             key={file.name}
             initial={{ opacity: 0, y: 5 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: i * 0.1 }}
             onClick={() => setSelectedFile(file.name)}
             className={`flex items-center justify-between p-3 rounded-lg cursor-pointer group transition-all ${
               selectedFile === file.name 
                 ? 'bg-blue-500/10 border border-blue-500/20' 
                 : 'hover:bg-zinc-900 border border-transparent'
             }`}
           >
             <div className="flex items-center gap-3">
               {getIcon(file.type)}
               <span className={`font-medium ${selectedFile === file.name ? 'text-blue-400' : 'text-zinc-300 group-hover:text-white'}`}>
                 {file.name}
               </span>
             </div>
             <div className="flex items-center gap-4 text-xs text-zinc-500">
               <span>{file.size}</span>
               <span className="hidden sm:block w-16 text-right">{file.date}</span>
             </div>
           </motion.div>
         ))}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-zinc-950 border-t border-zinc-900 text-[10px] text-zinc-500 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Sync Complete</span>
        </div>
        <div>
          5.2 GB of 1 TB Used
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: TERMINAL CLI DEMO ---
const CliDemo = () => {
  const [lines, setLines] = useState([
    { text: "$ airstream login", color: "text-zinc-100" },
    { text: "> Authenticated as user@github.com", color: "text-green-400" },
  ]);

  useEffect(() => {
    const sequence = [
      { text: "$ airstream upload ./project", color: "text-zinc-100", delay: 1000 },
      { text: "> Compressing 142 files...", color: "text-zinc-500", delay: 1800 },
      { text: "> Encrypting (AES-256)...", color: "text-blue-400", delay: 2800 },
      { text: "> Uploading to US-EAST...", color: "text-zinc-500", delay: 3500 },
      { text: "> Transfer complete (450MB/s)", color: "text-green-400", delay: 4500 },
      { text: "$ airstream share project.zip", color: "text-zinc-100", delay: 5500 },
      { text: "> Public link generated: https://air.st/x8j9k2", color: "text-purple-400", delay: 6500 },
    ];

    let timeouts = [];
    sequence.forEach(({ text, color, delay }) => {
      const timeout = setTimeout(() => {
        setLines(prev => [...prev, { text, color }]);
      }, delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="w-full h-full min-h-[300px] bg-black border border-zinc-800 rounded-xl p-4 font-mono text-xs sm:text-sm overflow-hidden flex flex-col shadow-2xl">
      <div className="flex gap-2 mb-4 opacity-50">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
        {lines.map((line, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <span className={line.color}>{line.text}</span>
          </motion.div>
        ))}
        <motion.div 
          animate={{ opacity: [0, 1] }}
          transition={{ repeat: Infinity, duration: 0.8 }}
          className="w-2 h-4 bg-zinc-500 inline-block align-middle ml-1"
        />
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: MOBILE MENU ---
const MobileMenu = ({ isOpen, onClose, isAuthenticated, navigate }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: '100%' }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: '100%' }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed inset-0 z-[60] bg-black md:hidden flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-zinc-900">
            <div className="flex items-center gap-2">
              <img src={LOGO_URL} alt="Logo" className="w-8 h-8 object-contain" />
              <span className="text-xl font-bold">Airstream</span>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <div className="space-y-6">
              {['Features', 'Security', 'Global', 'CLI'].map((item, i) => (
                <motion.a 
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  onClick={onClose}
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="block text-2xl font-bold text-zinc-400 hover:text-white"
                >
                  {item}
                </motion.a>
              ))}
            </div>
            
            <div className="pt-8 border-t border-zinc-900">
              {isAuthenticated ? (
                 <button 
                   onClick={() => { navigate('/workspace'); onClose(); }}
                   className="w-full py-4 bg-white text-black font-bold text-lg rounded-lg flex items-center justify-center gap-2"
                 >
                   My Files <ArrowRight className="w-5 h-5" />
                 </button>
              ) : (
                <div className="grid gap-4">
                  <Link to="/auth/signup" onClick={onClose} className="block w-full">
                    <button className="w-full py-4 bg-white text-black font-bold text-lg rounded-lg">
                      Create Account
                    </button>
                  </Link>
                  <Link to="/auth/login" onClick={onClose} className="block w-full">
                    <button className="w-full py-4 bg-zinc-900 text-white border border-zinc-800 font-bold text-lg rounded-lg">
                      Log In
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN PAGE COMPONENT ---
const Home = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Header Scroll Effect
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Prevent scrolling when mobile menu open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden w-full">
      
      {/* --- NAVBAR --- */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b w-full ${
        scrolled ? 'bg-black/90 backdrop-blur-md border-zinc-800 h-16' : 'bg-transparent border-transparent h-20'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 z-50 group shrink-0">
             <div className="relative w-8 h-8">
                <img src={LOGO_URL} alt="Airstream" className="w-full h-full object-contain relative z-10" />
             </div>
             <span className="text-xl font-bold tracking-tight hidden sm:block">Airstream</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            {['Features', 'Security', 'Global', 'CLI'].map((item) => (
              <a key={item} href={`#${item.toLowerCase()}`} className="hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </nav>

          {/* Auth Actions */}
          <div className="hidden md:flex items-center gap-4 shrink-0">
            {isAuthenticated ? (
              <>
                 <button
                  onClick={() => navigate('/workspace')}
                  className="px-4 py-2 bg-zinc-100 text-black text-sm font-bold rounded hover:bg-zinc-300 transition-colors flex items-center gap-2"
                >
                  My Files <ArrowRight className="w-4 h-4" />
                </button>
                 <button
                  onClick={() => {
                    authService.logout();
                    window.location.href = '/';
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Log Out
                </button>
              </>
            ) : (
              <>
                <Link to="/auth/login" className="text-sm font-medium hover:text-white text-zinc-400 transition-colors">
                  Log In
                </Link>
                <Link to="/auth/signup">
                  <button className="px-4 py-2 bg-white text-black text-sm font-bold rounded hover:bg-zinc-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                    Create Account
                  </button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden z-50 p-2 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </header>

      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)} 
        isAuthenticated={isAuthenticated}
        navigate={navigate}
      />

      <main className="pt-20 w-full overflow-hidden">
        
        {/* --- HERO SECTION --- */}
        <section className="relative min-h-[90vh] flex flex-col justify-center px-4 sm:px-6 overflow-hidden">
          {/* Ambient Backgrounds */}
          <GridBackground className="opacity-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none opacity-50" />
          
          <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-12 lg:gap-16 items-center z-10 py-12">
            
            {/* Hero Text */}
            <div className="space-y-8 text-center lg:text-left">
              <motion.div
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ delay: 0.1 }}
                 className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full text-xs font-medium text-zinc-400 backdrop-blur-sm"
              >
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                Secure Cloud Storage for Everyone
              </motion.div>

              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold tracking-tight leading-[1.1] sm:leading-[1.1]"
              >
                Infinite Storage <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-zinc-400 to-zinc-600">
                  Zero Limits.
                </span>
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg sm:text-xl text-zinc-400 max-w-lg mx-auto lg:mx-0 leading-relaxed"
              >
                Store, share, and collaborate on files of any size. 
                Built with military-grade encryption and global CDN distribution.
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start pt-4 w-full sm:w-auto"
              >
                <button 
                  onClick={() => navigate(isAuthenticated ? '/workspace' : '/auth/signup')}
                  className="h-14 px-8 bg-white text-black text-lg font-bold rounded-lg hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2 group w-full sm:w-auto"
                >
                  Start Uploading 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <a 
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-14 px-8 bg-zinc-900 border border-zinc-800 text-white text-lg font-bold rounded-lg hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <Github className="w-5 h-5" /> Star on GitHub
                </a>
              </motion.div>

              {/* Supported Files Strip */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="pt-8 flex flex-wrap justify-center lg:justify-start gap-6 opacity-50 grayscale hover:grayscale-0 transition-all duration-500 text-sm font-mono text-zinc-500"
              >
                <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> DOCS</span>
                <span className="flex items-center gap-1"><ImageIcon className="w-4 h-4"/> IMAGES</span>
                <span className="flex items-center gap-1"><Video className="w-4 h-4"/> VIDEO</span>
                <span className="flex items-center gap-1"><Code className="w-4 h-4"/> CODE</span>
                <span className="flex items-center gap-1"><Archive className="w-4 h-4"/> ARCHIVES</span>
              </motion.div>
            </div>

            {/* Hero Visual: Data Transfer */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="relative w-full"
            >
              <DataTransferVisualizer />
            </motion.div>
          </div>

          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[10px] sm:text-xs text-zinc-600 uppercase tracking-widest hidden sm:block">Explore Features</span>
            <motion.div 
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <ChevronDown className="w-4 h-4 text-zinc-600" />
            </motion.div>
          </motion.div>
        </section>

        {/* --- FEATURES GRID (BENTO BOX) --- */}
        <section id="features" className="py-24 bg-[#050505] border-t border-zinc-900 relative">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(#ffffff05_1px,transparent_1px)] bg-[size:20px_20px]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="mb-16 max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">Designed for<br/>Data Integrity.</h2>
              <p className="text-zinc-400 text-lg">
                Whether you're backing up personal photos or sharing enterprise assets, Airstream ensures your data is safe, redundant, and accessible.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[320px]">
              
              {/* Feature 1: File Explorer (Large) */}
              <div className="md:col-span-2 row-span-1 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative z-10 mb-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 text-white group-hover:scale-110 transition-transform">
                    <Folder className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Smart Organization</h3>
                  <p className="text-zinc-400 max-w-sm">
                    Drag-and-drop uploads, nested folders, and instant search. Managing terabytes feels like managing bytes.
                  </p>
                </div>
                {/* Visual */}
                <div className="relative w-full h-[200px] overflow-hidden rounded-t-lg border-t border-l border-r border-zinc-800 bg-black/50">
                  <FileExplorer />
                </div>
              </div>

              {/* Feature 2: Encryption */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                 <div className="absolute top-0 right-0 p-8 opacity-20 group-hover:opacity-40 transition-opacity">
                   <Shield className="w-32 h-32 text-green-500 rotate-12" />
                 </div>
                 <div className="relative z-10 flex flex-col h-full justify-between">
                   <div>
                     <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 text-white">
                        <Lock className="w-6 h-6" />
                      </div>
                     <h3 className="text-xl font-bold mb-2">AES-256 Encryption</h3>
                     <p className="text-zinc-400 text-sm mb-4">
                       Your files are encrypted at rest and in transit. Only you hold the keys.
                     </p>
                   </div>
                   <div className="flex items-center gap-2 text-xs font-mono text-green-500">
                     <Check className="w-4 h-4" /> ZERO-KNOWLEDGE
                   </div>
                 </div>
              </div>

              {/* Feature 3: Sync */}
              <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden group hover:border-zinc-700 transition-colors">
                 <div className="relative z-10 h-full flex flex-col justify-between">
                   <div>
                     <div className="w-12 h-12 bg-zinc-800 rounded-lg flex items-center justify-center mb-6 text-white">
                        <RefreshCw className="w-6 h-6" />
                      </div>
                     <h3 className="text-xl font-bold mb-2">Instant Sync</h3>
                     <p className="text-zinc-400 text-sm">
                       Changes propagate across all your devices in milliseconds using WebSockets.
                     </p>
                   </div>
                   <div className="grid grid-cols-3 gap-2 mt-4 opacity-50">
                      <Laptop className="w-6 h-6 text-zinc-500" />
                      <Tablet className="w-6 h-6 text-zinc-500" />
                      <Smartphone className="w-6 h-6 text-zinc-500" />
                   </div>
                 </div>
              </div>

               {/* Feature 4: Global Map (Large) */}
               <div id="global" className="md:col-span-2 bg-zinc-900/30 border border-zinc-800 rounded-2xl p-8 relative overflow-hidden flex items-center group hover:border-zinc-700 transition-colors">
                 <div className="grid md:grid-cols-2 gap-8 items-center w-full relative z-10">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">Global Data Centers</h3>
                      <p className="text-zinc-400 text-sm mb-6">
                        We replicate your data across 8 regions for 99.999999999% durability and low-latency access.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {DATA_CENTERS.slice(0, 4).map(r => (
                          <span key={r.code} className="px-2 py-1 bg-zinc-800 rounded text-[10px] uppercase font-mono text-zinc-400 border border-zinc-700">
                            {r.code}
                          </span>
                        ))}
                        <span className="px-2 py-1 bg-zinc-800 rounded text-[10px] uppercase font-mono text-zinc-400 border border-zinc-700">+4 more</span>
                      </div>
                    </div>
                    <div className="relative h-[200px] w-full bg-black/40 rounded-lg border border-zinc-800 overflow-hidden">
                      {/* Abstract Map Dots */}
                      {DATA_CENTERS.map((r, i) => (
                        <motion.div 
                          key={r.code}
                          initial={{ opacity: 0, scale: 0 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                          className="absolute w-2 h-2"
                          style={{ top: `${50 - r.lat / 2}%`, left: `${50 + r.lng / 3.6}%` }}
                        >
                          <div className="w-full h-full rounded-full bg-blue-500 relative">
                            <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-75" />
                          </div>
                        </motion.div>
                      ))}
                      <div className="absolute inset-0 opacity-20 bg-[url('https://upload.wikimedia.org/wikipedia/commons/8/80/World_map_-_low_resolution.svg')] bg-contain bg-no-repeat bg-center mix-blend-overlay invert" />
                    </div>
                 </div>
              </div>

            </div>
          </div>
        </section>

        {/* --- CLI SECTION (FOR DEVS) --- */}
        <section id="cli" className="py-24 bg-black relative border-y border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-900/20 border border-green-800 rounded-full text-xs font-bold text-green-400">
                 <Terminal className="w-3 h-3" /> Developer CLI
              </div>
              <h2 className="text-4xl md:text-5xl font-bold">
                Control your files <br/>
                from the terminal.
              </h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                For power users who prefer the keyboard. Upload, download, and manage share links without leaving your command prompt.
              </p>
              
              <ul className="space-y-4 pt-4">
                {[
                  "Scriptable uploads via API.",
                  "Automated backup workflows.",
                  "Headless operation support."
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="mt-1 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                      <Hash className="w-3 h-3" />
                    </div>
                    <span className="text-zinc-300">{item}</span>
                  </li>
                ))}
              </ul>

              <div className="pt-8">
                <a href={GITHUB_URL} target="_blank" className="text-white hover:text-green-400 transition-colors flex items-center gap-2 font-bold group">
                  View CLI Documentation <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* Right Content: Terminal Demo */}
            <div className="relative">
               <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 to-blue-500/10 blur-xl opacity-50 rounded-full" />
               <div className="relative">
                 <CliDemo />
               </div>
            </div>

          </div>
        </section>

        {/* --- FILE SUPPORT GRID --- */}
        <section className="py-24 bg-[#0a0a0a] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-[#0a0a0a] to-[#0a0a0a]" />
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 text-center">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true }}
               className="mb-16"
             >
               <h2 className="text-4xl font-bold mb-4">Universal File Support</h2>
               <p className="text-zinc-400 max-w-xl mx-auto">
                 Preview hundreds of file types directly in the browser. No download required.
               </p>
             </motion.div>

             <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4">
               {[
                 { name: 'Images', icon: ImageIcon, color: 'text-purple-400', border: 'border-purple-400/20' },
                 { name: 'Videos', icon: Video, color: 'text-red-400', border: 'border-red-400/20' },
                 { name: 'Audio', icon: Music, color: 'text-yellow-400', border: 'border-yellow-400/20' },
                 { name: 'Code', icon: Code, color: 'text-green-400', border: 'border-green-400/20' },
                 { name: 'PDFs', icon: FileText, color: 'text-blue-400', border: 'border-blue-400/20' },
                 { name: 'Archives', icon: Archive, color: 'text-orange-400', border: 'border-orange-400/20' },
                 { name: 'Design', icon: Layers, color: 'text-pink-400', border: 'border-pink-400/20' },
                 { name: 'Spreadsheets', icon: LayoutGrid, color: 'text-emerald-400', border: 'border-emerald-400/20' },
                 { name: '3D Models', icon: Box, color: 'text-cyan-400', border: 'border-cyan-400/20' },
                 { name: 'Markdown', icon: FileText, color: 'text-zinc-200', border: 'border-zinc-400/20' },
                 { name: 'Raw', icon: HardDrive, color: 'text-indigo-400', border: 'border-indigo-400/20' },
                 { name: 'More+', icon: MoreVertical, color: 'text-white', border: 'border-white/20' },
               ].map((type, i) => (
                 <motion.div
                   key={i}
                   whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.05)' }}
                   className={`p-6 bg-zinc-900/50 border ${type.border} rounded-xl flex flex-col items-center justify-center gap-3 transition-all cursor-default backdrop-blur-sm`}
                 >
                   <type.icon className={`w-8 h-8 ${type.color}`} />
                   <div className="text-sm font-medium text-zinc-300">{type.name}</div>
                 </motion.div>
               ))}
             </div>
          </div>
        </section>

        {/* --- COMMUNITY / OPEN SOURCE SECTION --- */}
        <section id="community" className="py-24 bg-black border-t border-zinc-900">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="bg-gradient-to-br from-zinc-900 to-black border border-zinc-800 rounded-3xl p-8 md:p-16 text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-white/5 blur-[100px] rounded-full pointer-events-none" />
               
               <div className="relative z-10 max-w-3xl mx-auto space-y-8">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full text-sm font-bold text-white border border-white/10">
                   <Github className="w-4 h-4" /> Open Source
                 </div>
                 
                 <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-white">
                   Free for Hobbyists.<br/>Built for Community.
                 </h2>
                 
                 <p className="text-xl text-zinc-400 leading-relaxed">
                   Airstream is a passion project designed to make cloud storage accessible to everyone. No paywalls, no hidden fees, just open code.
                 </p>
                 
                 <div className="grid sm:grid-cols-3 gap-6 pt-8 text-left">
                   {/* Card 1 */}
                   <div className="p-6 bg-black/50 border border-zinc-800 rounded-xl">
                     <div className="text-3xl font-bold text-white mb-1">Free</div>
                     <div className="text-sm text-zinc-500 font-mono mb-4">FOREVER</div>
                     <ul className="space-y-2 text-sm text-zinc-300">
                       <li>• Unlimited Uploads</li>
                       <li>• 10GB Storage</li>
                       <li>• Public Sharing</li>
                     </ul>
                   </div>
                   
                   {/* Card 2 (Highlight) */}
                   <div className="p-6 bg-white/5 border border-white/20 rounded-xl relative">
                     <div className="absolute top-0 right-0 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
                     <div className="text-3xl font-bold text-white mb-1">Contribute</div>
                     <div className="text-sm text-zinc-500 font-mono mb-4">OPEN SOURCE</div>
                     <ul className="space-y-2 text-sm text-zinc-300">
                       <li>• Submit PRs</li>
                       <li>• Report Issues</li>
                       <li>• Improve Docs</li>
                     </ul>
                   </div>

                   {/* Card 3 */}
                   <div className="p-6 bg-black/50 border border-zinc-800 rounded-xl">
                     <div className="text-3xl font-bold text-white mb-1">Feedback</div>
                     <div className="text-sm text-zinc-500 font-mono mb-4">COMMUNITY</div>
                     <ul className="space-y-2 text-sm text-zinc-300">
                       <li>• Request Features</li>
                       <li>• Join Discord</li>
                       <li>• Beta Testing</li>
                     </ul>
                   </div>
                 </div>

                 <div className="pt-8">
                   <a 
                     href={GITHUB_URL}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                   >
                     View Source Code on GitHub <ExternalLink className="w-4 h-4" />
                   </a>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* --- CTA SECTION --- */}
        <section className="py-32 bg-black text-center relative overflow-hidden">
           <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
           <div className="relative z-10 max-w-3xl mx-auto px-4">
             <h2 className="text-5xl md:text-7xl font-bold tracking-tight mb-8">
               Your files, elevated.
             </h2>
             <p className="text-xl text-zinc-400 mb-10">
               Join the developers who trust Airstream for their storage needs.
             </p>
             <div className="flex flex-col sm:flex-row justify-center gap-4">
               <Link to="/auth/signup">
                 <button className="h-14 px-10 bg-white text-black text-lg font-bold rounded-lg hover:bg-zinc-200 transition-colors shadow-xl shadow-white/10 w-full sm:w-auto">
                   Create Free Account
                 </button>
               </Link>
             </div>
           </div>
        </section>

        {/* --- FOOTER --- */}
        <footer className="bg-zinc-950 pt-20 pb-10 border-t border-zinc-900 text-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            
            <div className="col-span-2 md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-6">
                <img src={LOGO_URL} alt="Airstream" className="w-8 h-8 object-contain" />
                <span className="text-xl font-bold text-white">Airstream</span>
              </Link>
              <p className="text-zinc-500 max-w-xs mb-6 leading-relaxed">
                The modern cloud storage platform for developers and creators. Secure, fast, and open source.
              </p>
              
              {/* Socials & Contact */}
              <div className="flex gap-4">
                <a 
                  href={GITHUB_URL} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  aria-label="GitHub"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                  aria-label="Email"
                >
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
            
            {/* Link Columns */}
            <div>
              <h4 className="font-bold text-white mb-6">Product</h4>
              <ul className="space-y-3 text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">Features</li>
                <li className="hover:text-white cursor-pointer transition-colors">Security</li>
                <li className="hover:text-white cursor-pointer transition-colors">Global Network</li>
                <li className="hover:text-white cursor-pointer transition-colors">CLI</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Resources</h4>
              <ul className="space-y-3 text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">Documentation</li>
                <li className="hover:text-white cursor-pointer transition-colors">API</li>
                <li className="hover:text-white cursor-pointer transition-colors">Help Center</li>
                <li className="hover:text-white cursor-pointer transition-colors">Status</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-6">Legal</h4>
              <ul className="space-y-3 text-zinc-500">
                <li className="hover:text-white cursor-pointer transition-colors">Privacy Policy</li>
                <li className="hover:text-white cursor-pointer transition-colors">Terms of Service</li>
                <li className="hover:text-white cursor-pointer transition-colors">Security</li>
              </ul>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 border-t border-zinc-900 flex flex-col md:flex-row justify-between items-center gap-4 text-zinc-600">
            <div>
              &copy; {new Date().getFullYear()} Airstream. Open Source Project.
            </div>
            <div className="flex items-center gap-6 text-xs sm:text-sm">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                 <span className="text-zinc-500">All Systems Operational</span>
               </div>
            </div>
          </div>
        </footer>

      </main>
    </div>
  );
};

export default Home;
