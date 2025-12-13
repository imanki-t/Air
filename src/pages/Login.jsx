import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import authService from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';
import { 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2, 
  Mail, 
  Lock, 
  Github, 
  Command, 
  Shield, 
  Globe, 
  Cpu, 
  Terminal, 
  Activity, 
  Wifi, 
  ChevronRight, 
  HelpCircle,
  Eye,
  EyeOff,
  Server,
  Database,
  Lock as LockIcon
} from 'lucide-react';

/* ===================================================================
   AIRSTREAM AUTHENTICATION SYSTEM - LOGIN MODULE
   Version: 4.0.0 (Enterprise)
   -------------------------------------------------------------------
   Features:
   - Split-screen professional layout
   - Custom Toast Notification Engine
   - Interactive Terminal Simulation
   - System Status Monitor
   - Adaptive Mobile/Tablet/Desktop Responsive Grid
   =================================================================== */

// --- CONFIGURATION ---
const ASSETS = {
  logo: '/air.png', // Ensure this exists in public/
  bgPattern: 'radial-gradient(circle at 50% 50%, #111 0%, #000 100%)'
};

const ANIMATION_VARIANTS = {
  container: {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  },
  item: {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  },
  toast: {
    initial: { x: 100, opacity: 0, scale: 0.9 },
    animate: { x: 0, opacity: 1, scale: 1 },
    exit: { x: 100, opacity: 0, scale: 0.9, transition: { duration: 0.2 } }
  }
};

// --- CUSTOM TOAST SYSTEM ---
// A self-contained notification system replacing standard alerts
const ToastContext = React.createContext(null);

const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message, duration = 5000) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => removeToast(id), duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <ToastItem key={toast.id} {...toast} onDismiss={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem = ({ type, title, message, onDismiss }) => {
  const colors = {
    success: 'bg-zinc-900 border-green-500/50 text-green-500',
    error: 'bg-zinc-900 border-red-500/50 text-red-500',
    info: 'bg-zinc-900 border-blue-500/50 text-blue-500',
    warning: 'bg-zinc-900 border-yellow-500/50 text-yellow-500'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Activity className="w-5 h-5" />,
    warning: <Shield className="w-5 h-5" />
  };

  return (
    <motion.div
      variants={ANIMATION_VARIANTS.toast}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`pointer-events-auto w-full max-w-sm rounded-lg border shadow-xl p-4 flex items-start gap-4 backdrop-blur-md ${colors[type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-zinc-100">{title}</h4>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{message}</p>
      </div>
      <button 
        onClick={onDismiss} 
        className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// --- SUB-COMPONENT: TERMINAL VISUALIZER ---
// Renders a fake CLI activity log on the marketing side
const TerminalVisualizer = () => {
  const [lines, setLines] = useState([
    { text: "Initializing secure handshake...", color: "text-zinc-500" }
  ]);
  const containerRef = useRef(null);

  useEffect(() => {
    const events = [
      { text: "Connecting to airstream-edge-sfo1...", color: "text-blue-400", delay: 800 },
      { text: "TLS 1.3 connection established", color: "text-green-400", delay: 1600 },
      { text: "Verifying integrity of local assets...", color: "text-zinc-400", delay: 2400 },
      { text: "Asset checksum matched (SHA-256)", color: "text-purple-400", delay: 3200 },
      { text: "Loading user interface modules...", color: "text-zinc-500", delay: 4000 },
      { text: "Ready for authentication", color: "text-white", delay: 4800 }
    ];

    let timeouts = [];
    events.forEach((event) => {
      const t = setTimeout(() => {
        setLines(prev => [...prev, event].slice(-8)); // Keep last 8 lines
      }, event.delay);
      timeouts.push(t);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="font-mono text-xs w-full bg-black/50 border border-zinc-800 rounded-lg p-4 h-48 overflow-hidden relative shadow-2xl">
      <div className="absolute top-2 right-2 flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/50" />
      </div>
      <div className="space-y-1.5 mt-4">
        {lines.map((line, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -10 }} 
            animate={{ opacity: 1, x: 0 }}
            className={`flex gap-2 ${line.color}`}
          >
            <span className="text-zinc-700 select-none">$</span>
            {line.text}
          </motion.div>
        ))}
        <motion.div 
          animate={{ opacity: [0, 1] }} 
          transition={{ duration: 0.8, repeat: Infinity }}
          className="w-2 h-4 bg-zinc-600 inline-block"
        />
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: SYSTEM STATUS TICKER ---
const SystemStatusTicker = () => {
  const metrics = [
    { label: "US-EAST", status: "Operational", lat: "24ms" },
    { label: "EU-WEST", status: "Operational", lat: "88ms" },
    { label: "AP-SOUTH", status: "Maintenance", lat: "--" },
    { label: "STORAGE", status: "Healthy", lat: "99.9%" }
  ];

  return (
    <div className="flex gap-6 overflow-hidden py-2 text-[10px] font-mono text-zinc-500 uppercase tracking-wider select-none">
      {metrics.map((m, i) => (
        <div key={i} className="flex items-center gap-2 min-w-max">
          <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'Operational' || m.status === 'Healthy' ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          <span>{m.label}</span>
          <span className="text-zinc-700">::</span>
          <span className={m.status !== 'Operational' && m.status !== 'Healthy' ? 'text-yellow-600' : 'text-zinc-400'}>
            {m.lat}
          </span>
        </div>
      ))}
    </div>
  );
};

// --- SUB-COMPONENT: FORM INPUT FIELD ---
const InputField = ({ 
  label, 
  name, 
  type = "text", 
  value, 
  onChange, 
  placeholder, 
  icon: Icon,
  error,
  required = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between">
        <label className={`text-xs font-semibold uppercase tracking-wider transition-colors duration-200 ${isFocused ? 'text-white' : 'text-zinc-500'}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        {error && <span className="text-xs text-red-500 font-medium animate-pulse">{error}</span>}
      </div>
      
      <div className={`relative group transition-all duration-300 ${isFocused ? 'scale-[1.01]' : 'scale-100'}`}>
        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors duration-200 ${isFocused ? 'text-blue-500' : 'text-zinc-600'}`}>
          <Icon className="w-4 h-4" />
        </div>
        
        <input
          name={name}
          type={inputType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={`
            w-full bg-zinc-900/50 border rounded-lg py-3 pl-10 pr-10 text-sm text-zinc-100 placeholder-zinc-700
            transition-all duration-200 outline-none
            ${error 
              ? 'border-red-900 focus:border-red-500 focus:ring-1 focus:ring-red-500/50' 
              : 'border-zinc-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 hover:border-zinc-700'
            }
          `}
        />

        {type === 'password' && (
          <button
            type="button"
            onClick={() => setShowPass(!showPass)}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        
        {/* Verification Checkmark (Simulated logic for demo) */}
        {type !== 'password' && value.length > 3 && !error && (
           <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
             <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
               <CheckCircle2 className="w-4 h-4 text-green-500/50" />
             </motion.div>
           </div>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: HELP DRAWER ---
// A pop-over for login issues
const HelpDrawer = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 0.5 }} 
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[60]"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-[70] w-full max-w-sm bg-zinc-950 border-l border-zinc-800 shadow-2xl p-6 flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-500" /> Login Help
              </h3>
              <button onClick={onClose} className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white">Forgotten Credentials?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  If you cannot remember your password, use the "Forgot Password" link on the login form. We will send a secure reset link to your verified email address.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white">Account Locked?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  For security reasons, accounts are temporarily locked after 5 failed attempts. Please wait 15 minutes before trying again or contact support.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white">2FA Issues?</h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  If you lost access to your authenticator app, please use your backup recovery codes provided during account setup.
                </p>
              </div>
              
              <div className="p-4 bg-blue-900/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-bold text-blue-400 mb-1">Enterprise SSO</h4>
                <p className="text-xs text-blue-200/70">
                  Employees should use their corporate credentials via the SSO portal.
                </p>
              </div>
            </div>

            <div className="pt-6 border-t border-zinc-800">
               <button className="w-full py-3 bg-zinc-100 text-black font-bold rounded-lg hover:bg-zinc-200 transition-colors">
                 Contact Support
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- MAIN LOGIN COMPONENT ---
const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  
  // -- Local State for Form --
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);

  // We wrap the logic in a component that consumes the toast provider
  return (
    <ToastProvider>
      <LoginContent 
        navigate={navigate}
        location={location}
        helpOpen={helpOpen}
        setHelpOpen={setHelpOpen}
        formData={formData}
        setFormData={setFormData}
        errors={errors}
        setErrors={setErrors}
        loading={loading}
        setLoading={setLoading}
        loginAttempts={loginAttempts}
        setLoginAttempts={setLoginAttempts}
      />
    </ToastProvider>
  );
};

// --- INNER CONTENT COMPONENT (To use hooks properly) ---
const LoginContent = ({ 
  navigate, location, helpOpen, setHelpOpen, 
  formData, setFormData, errors, setErrors, loading, setLoading,
  loginAttempts, setLoginAttempts
}) => {
  const { addToast } = useToast();

  // Check for redirects with messages
  useEffect(() => {
    if (location.state?.message) {
      addToast('success', 'System Notification', location.state.message);
      // Clean up state to prevent re-toast on refresh (simulated)
      window.history.replaceState({}, document.title);
    }
  }, [location, addToast]);

  // Handle Input Change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear specific error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validation Logic
  const validate = () => {
    const newErrors = {};
    if (!formData.emailOrUsername.trim()) {
      newErrors.emailOrUsername = "Identity required";
    } else if (formData.emailOrUsername.length < 3) {
      newErrors.emailOrUsername = "Identity too short";
    }

    if (!formData.password) {
      newErrors.password = "Credentials required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Logic
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (loginAttempts >= 5) {
      addToast('error', 'Security Lockout', 'Too many failed attempts. Try again later.');
      return;
    }

    if (!validate()) {
      addToast('warning', 'Validation Error', 'Please correct the highlighted fields.');
      return;
    }

    setLoading(true);

    try {
      // API Call
      const response = await authService.login(
        formData.emailOrUsername,
        formData.password
      );

      // Handle Verification Requirement
      if (!response.user.isEmailVerified) {
        addToast('info', 'Verification Required', 'Redirecting to email verification...');
        setTimeout(() => {
          navigate('/auth/verify-email', { 
            state: { email: response.user.email } 
          });
        }, 1500);
      } else {
        // Success
        addToast('success', 'Authentication Successful', 'Redirecting to workspace...');
        setTimeout(() => {
          navigate('/workspace');
        }, 1000);
      }
    } catch (err) {
      setLoginAttempts(prev => prev + 1);
      
      let errorMsg = 'An unexpected system error occurred.';
      let errorType = 'error';

      if (err.response?.data?.code === 'ACCOUNT_LOCKED') {
        errorMsg = 'Account locked due to security policy.';
      } else if (err.response?.data?.code === 'INVALID_CREDENTIALS') {
        errorMsg = 'Invalid identity or credentials provided.';
        errorType = 'warning';
        // Set field level errors
        setErrors({
           emailOrUsername: 'Check identity',
           password: 'Check credentials'
        });
      }

      addToast(errorType, 'Authentication Failed', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 rounded-full blur-[150px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      <HelpDrawer isOpen={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* --- LEFT COLUMN: MARKETING / VISUALS (Desktop Only) --- */}
      <div className="hidden lg:flex lg:w-[55%] xl:w-[60%] relative flex-col justify-between p-12 xl:p-16 border-r border-zinc-900 z-10">
        
        {/* Header Logo */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
             <div className="relative w-8 h-8">
                <img src="/air.png" alt="Airstream" className="w-full h-full object-contain relative z-10" />
             </div>
            <span className="text-xl font-bold tracking-tight group-hover:text-zinc-300 transition-colors">Airstream</span>
          </Link>
        </div>

        {/* Center Content */}
        <div className="max-w-2xl">
           <motion.div 
             initial="hidden" 
             animate="visible" 
             variants={ANIMATION_VARIANTS.container}
             className="space-y-8"
           >
             <motion.div variants={ANIMATION_VARIANTS.item}>
               <h1 className="text-5xl font-bold leading-tight tracking-tight mb-4">
                 Access your <br/>
                 <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-500">
                   Digital Infrastructure
                 </span>
               </h1>
               <p className="text-zinc-400 text-lg leading-relaxed max-w-lg">
                 Securely manage your files, deployments, and global assets from a single unified command center.
               </p>
             </motion.div>

             {/* Terminal Visual */}
             <motion.div variants={ANIMATION_VARIANTS.item} className="w-full">
                <TerminalVisualizer />
             </motion.div>

             {/* Feature Grid */}
             <motion.div variants={ANIMATION_VARIANTS.item} className="grid grid-cols-2 gap-6 pt-8">
               <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                 <div className="p-2 bg-blue-500/10 rounded-md">
                   <Shield className="w-5 h-5 text-blue-400" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-white">SOC2 Compliant</h4>
                   <p className="text-xs text-zinc-500 mt-1">Enterprise-grade security standards.</p>
                 </div>
               </div>
               <div className="flex items-start gap-4 p-4 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                 <div className="p-2 bg-purple-500/10 rounded-md">
                   <Globe className="w-5 h-5 text-purple-400" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-white">Global Edge</h4>
                   <p className="text-xs text-zinc-500 mt-1">Access from 35+ regions worldwide.</p>
                 </div>
               </div>
             </motion.div>
           </motion.div>
        </div>

        {/* Footer Ticker */}
        <div className="pt-8 border-t border-zinc-900/50">
           <SystemStatusTicker />
        </div>
      </div>

      {/* --- RIGHT COLUMN: AUTH FORM --- */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col relative z-20 bg-black/80 backdrop-blur-sm lg:bg-black">
        
        {/* Mobile Header (Only visible on small screens) */}
        <div className="lg:hidden p-6 flex items-center justify-between border-b border-zinc-900 bg-black">
          <Link to="/" className="flex items-center gap-2">
            <img src="/air.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-bold">Airstream</span>
          </Link>
          <ThemeToggle />
        </div>

        {/* Desktop Controls */}
        <div className="hidden lg:flex absolute top-8 right-8 gap-4">
           <ThemeToggle />
           <button 
             onClick={() => setHelpOpen(true)}
             className="p-2 text-zinc-500 hover:text-white transition-colors rounded-full hover:bg-zinc-900"
           >
             <HelpCircle className="w-5 h-5" />
           </button>
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24">
          <div className="w-full max-w-sm mx-auto space-y-8">
            
            <div className="text-center lg:text-left space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">Welcome back</h2>
              <p className="text-zinc-500 text-sm">
                Please enter your credentials to authenticate.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="space-y-4">
                <InputField
                  label="Identity"
                  name="emailOrUsername"
                  placeholder="Username or email address"
                  type="text"
                  icon={Mail}
                  value={formData.emailOrUsername}
                  onChange={handleChange}
                  error={errors.emailOrUsername}
                  required
                />

                <InputField
                  label="Credentials"
                  name="password"
                  placeholder="Enter your password"
                  type="password"
                  icon={LockIcon}
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input type="checkbox" className="peer appearance-none w-4 h-4 border border-zinc-700 rounded bg-zinc-900 checked:bg-blue-600 checked:border-blue-600 transition-colors" />
                    <CheckCircle2 className="w-3 h-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <span className="text-zinc-500 group-hover:text-zinc-300 transition-colors">Remember device</span>
                </label>
                <Link 
                  to="/auth/forgot-password"
                  className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-lg bg-white text-black font-bold py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all hover:bg-zinc-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-zinc-600">Or verify with</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => addToast('info', 'SSO Login', 'Redirecting to GitHub OAuth...')}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-all group"
            >
              <Github className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <span>Continue with GitHub</span>
            </button>

            <p className="text-center text-xs text-zinc-500 pt-4">
              Don't have an account?{' '}
              <Link to="/auth/signup" className="text-white font-bold hover:underline underline-offset-4 decoration-zinc-700">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer (Mobile/Desktop) */}
        <div className="p-6 border-t border-zinc-900 text-[10px] text-zinc-600 text-center lg:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; 2025 Airstream Inc.</span>
          <div className="flex gap-4">
            <a href="#" className="hover:text-zinc-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-zinc-400 transition-colors">Security</a>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Login;
