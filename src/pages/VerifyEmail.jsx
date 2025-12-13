import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import authService from '../services/authService';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  ShieldCheck, 
  HelpCircle, 
  RefreshCw,
  Clock,
  Inbox,
  AlertTriangle,
  ChevronRight,
  Send
} from 'lucide-react';

/* ===================================================================
   AIRSTREAM ONBOARDING - EMAIL VERIFICATION MODULE
   Version: 4.0.0 (Enterprise)
   -------------------------------------------------------------------
   Features:
   - Token Validation Engine
   - Intelligent Redirection Logic
   - Resend Cooldown Timer
   - Interactive Support Widget
   - Adaptive Responsive Layout
   =================================================================== */

// --- CONFIGURATION ---
const ASSETS = {
  logo: '/air.png'
};

const ANIMATION_VARIANTS = {
  card: {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease: "easeOut" } }
  },
  icon: {
    hidden: { scale: 0, rotate: -180 },
    visible: { scale: 1, rotate: 0, transition: { type: "spring", stiffness: 200, damping: 15 } }
  }
};

// --- CUSTOM TOAST SYSTEM (Localized for independence) ---
const ToastContext = React.createContext(null);

const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((type, title, message) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(t => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className={`pointer-events-auto p-4 rounded-lg shadow-xl backdrop-blur-md border border-zinc-800 flex items-start gap-3 w-80 ${
                t.type === 'success' ? 'bg-green-900/80 text-green-100' : 
                t.type === 'error' ? 'bg-red-900/80 text-red-100' : 'bg-zinc-900/80 text-zinc-100'
              }`}
            >
              {t.type === 'success' ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertTriangle className="w-5 h-5 mt-0.5" />}
              <div>
                <h4 className="font-bold text-sm">{t.title}</h4>
                <p className="text-xs opacity-90 mt-1">{t.message}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// --- SUB-COMPONENT: ONBOARDING STEPPER ---
const Stepper = ({ currentStep }) => {
  const steps = [
    { id: 1, label: "Account Created" },
    { id: 2, label: "Verify Email" },
    { id: 3, label: "Setup Workspace" }
  ];

  return (
    <div className="w-full max-w-md mx-auto mb-12">
      <div className="flex justify-between items-center relative">
        {/* Connector Line */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10" />
        
        {steps.map((step, index) => {
          const isComplete = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 bg-black px-2">
              <motion.div 
                initial={false}
                animate={{
                  backgroundColor: isComplete ? '#22c55e' : isActive ? '#000000' : '#000000',
                  borderColor: isComplete ? '#22c55e' : isActive ? '#3b82f6' : '#27272a',
                  scale: isActive ? 1.1 : 1
                }}
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors duration-300 z-10`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-5 h-5 text-black" />
                ) : (
                  <span className={`text-xs font-bold ${isActive ? 'text-blue-500' : 'text-zinc-600'}`}>{step.id}</span>
                )}
              </motion.div>
              <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-blue-500' : 'text-zinc-600'}`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: SUPPORT WIDGET (Expandable) ---
const SupportWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            className="mb-4 w-72 bg-zinc-900 border border-zinc-800 rounded-lg p-4 shadow-2xl"
          >
            <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-blue-500" /> Troubleshooting
            </h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span> Check your spam/junk folder
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span> Wait 5-10 minutes for delivery
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span> Ensure email address is correct
              </li>
            </ul>
            <button className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded transition-colors">
              Contact Support
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400 hover:text-white hover:border-zinc-600 transition-all text-sm font-medium shadow-lg"
      >
        {isOpen ? 'Close Help' : 'Having trouble?'}
      </button>
    </div>
  );
};

// --- MAIN CONTENT WRAPPER ---
const VerifyEmail = () => {
  const navigate = useNavigate();
  return (
    <ToastProvider>
      <VerifyContent navigate={navigate} />
    </ToastProvider>
  );
};

const VerifyContent = ({ navigate }) => {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  
  // State Machine
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('Validating security token...');
  const [countdown, setCountdown] = useState(0); // Resend cooldown
  const [redirectTimer, setRedirectTimer] = useState(null);

  // Verification Logic
  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get('token');
      
      if (!token) {
        setStatus('error');
        setMessage('Security token missing or malformed.');
        return;
      }

      try {
        // Simulate API call delay for UX smoothness
        await new Promise(r => setTimeout(r, 1500));

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/api/auth/verify-email/${token}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          }
        );

        const data = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage('Identity confirmed. Secure session initializing...');
          
          // Auto-redirect logic
          let seconds = 3;
          setRedirectTimer(seconds);
          const timer = setInterval(() => {
            seconds -= 1;
            setRedirectTimer(seconds);
            if (seconds <= 0) {
              clearInterval(timer);
              finalizeRedirect(data.user);
            }
          }, 1000);

        } else {
          setStatus('error');
          setMessage(data.error || 'Token expired or invalid.');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Secure connection failed. Please retry.');
      }
    };

    verifyToken();
  }, [searchParams]);

  const finalizeRedirect = (user) => {
    if (authService.isAuthenticated()) {
      authService.setUser(user);
      navigate('/workspace', { replace: true });
    } else {
      navigate('/auth/login', { 
        replace: true,
        state: { 
          message: 'Verification successful. Please log in.',
          verified: true 
        }
      });
    }
  };

  const handleResend = () => {
    if (countdown > 0) return;
    
    // Simulate API call
    addToast('info', 'Resending...', 'Sending new verification link.');
    setCountdown(60); // 60s cooldown
    
    // Countdown logic
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Actual implementation would call backend here
    // authService.resendVerification(email)...
  };

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-zinc-100 font-sans selection:bg-zinc-800 selection:text-white overflow-hidden relative">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-900/5 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src={ASSETS.logo} alt="Logo" className="w-8 h-8 object-contain" />
          <span className="font-bold text-lg tracking-tight">Airstream</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
        
        <Stepper currentStep={status === 'success' ? 3 : 2} />

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={ANIMATION_VARIANTS.card}
          className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-8 md:p-12 shadow-2xl relative overflow-hidden"
        >
          {/* Top Status Bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-900">
            {status === 'verifying' && (
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 2, ease: "easeInOut" }}
                className="h-full bg-blue-500"
              />
            )}
            {status === 'success' && <div className="h-full bg-green-500 w-full" />}
            {status === 'error' && <div className="h-full bg-red-500 w-full" />}
          </div>

          <div className="flex flex-col items-center text-center space-y-6">
            
            {/* Animated Icon Container */}
            <div className="relative">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center border-4 transition-all duration-500 
                ${status === 'verifying' ? 'border-blue-500/20 bg-blue-500/5' : ''}
                ${status === 'success' ? 'border-green-500/20 bg-green-500/5' : ''}
                ${status === 'error' ? 'border-red-500/20 bg-red-500/5' : ''}
              `}>
                <AnimatePresence mode="wait">
                  {status === 'verifying' && (
                    <motion.div
                      key="verifying"
                      variants={ANIMATION_VARIANTS.icon}
                      initial="hidden" animate="visible" exit="hidden"
                    >
                      <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                    </motion.div>
                  )}
                  {status === 'success' && (
                    <motion.div
                      key="success"
                      variants={ANIMATION_VARIANTS.icon}
                      initial="hidden" animate="visible" exit="hidden"
                    >
                      <ShieldCheck className="w-12 h-12 text-green-500" />
                    </motion.div>
                  )}
                  {status === 'error' && (
                    <motion.div
                      key="error"
                      variants={ANIMATION_VARIANTS.icon}
                      initial="hidden" animate="visible" exit="hidden"
                    >
                      <XCircle className="w-12 h-12 text-red-500" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Pulse Effect for Verifying */}
              {status === 'verifying' && (
                <div className="absolute inset-0 rounded-full border-4 border-blue-500/30 animate-ping" />
              )}
            </div>

            {/* Status Text */}
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">
                {status === 'verifying' && 'Verifying Email'}
                {status === 'success' && 'Verification Complete'}
                {status === 'error' && 'Verification Failed'}
              </h2>
              <p className="text-zinc-400 text-lg max-w-sm mx-auto leading-relaxed">
                {message}
              </p>
            </div>

            {/* Action Area */}
            <div className="w-full pt-6 space-y-4">
              
              {status === 'success' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex items-center justify-center gap-3"
                >
                  <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                  <span className="text-sm text-zinc-400">
                    Redirecting to workspace in <span className="text-white font-mono font-bold">{redirectTimer}s</span>
                  </span>
                </motion.div>
              )}

              {status === 'error' && (
                <div className="space-y-3">
                  <button
                    onClick={handleResend}
                    disabled={countdown > 0}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-bold py-3.5 px-6 rounded-lg hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                  >
                    {countdown > 0 ? (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Resend available in {countdown}s</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                        <span>Resend Verification Email</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => navigate('/auth/login')}
                    className="w-full flex items-center justify-center gap-2 bg-transparent border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-600 py-3.5 px-6 rounded-lg transition-all"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>Back to Login</span>
                  </button>
                </div>
              )}

              {status === 'verifying' && (
                <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 font-mono uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span>Securing connection</span>
                </div>
              )}

            </div>
          </div>
        </motion.div>

        {/* Feature Highlights */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl w-full text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Mail className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Secure Delivery</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <ShieldCheck className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Encrypted Link</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
              <Clock className="w-5 h-5 text-zinc-400" />
            </div>
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Expires in 24h</span>
          </div>
        </div>

      </main>

      {/* Support Drawer */}
      <SupportWidget />

    </div>
  );
};

export default VerifyEmail;
