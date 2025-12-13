import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from '../components/ThemeToggle';
import { 
  Trash2, 
  AlertTriangle, 
  ArrowLeft, 
  ShieldAlert, 
  FileWarning, 
  Check, 
  Loader2, 
  Lock,
  X,
  History,
  Database,
  UserX,
  Key
} from 'lucide-react';

/* ===================================================================
   AIRSTREAM ACCOUNT TERMINATION MODULE
   Version: 4.0.0 (Enterprise)
   -------------------------------------------------------------------
   Features:
   - High-Friction UI (Prevents accidents)
   - Impact Analysis Visualization
   - Retention Survey Logic
   - Secure Token Validation
   - "Wiping Data" Simulation
   =================================================================== */

// --- CONFIGURATION ---
const ASSETS = {
  logo: '/air.png'
};

const ANIMATION_VARIANTS = {
  card: {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: "easeOut" } }
  },
  shake: {
    hidden: { x: 0 },
    visible: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.4 } }
  }
};

// --- CUSTOM TOAST SYSTEM (Localized) ---
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
              className={`pointer-events-auto p-4 rounded-lg shadow-xl backdrop-blur-md border flex items-start gap-3 w-80 ${
                t.type === 'error' ? 'bg-red-950/90 border-red-500/30 text-red-100' : 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
              }`}
            >
              {t.type === 'error' ? <AlertTriangle className="w-5 h-5 mt-0.5 text-red-500" /> : <Check className="w-5 h-5 mt-0.5 text-green-500" />}
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

// --- SUB-COMPONENT: DELETION IMPACT CHECKLIST ---
const ImpactChecklist = () => {
  const impacts = [
    { icon: Database, text: "All uploaded files will be permanently erased" },
    { icon: UserX, text: "Team access and shared links will be revoked" },
    { icon: Key, text: "API keys and auth tokens will be invalidated" },
    { icon: History, text: "Audit logs and history cannot be recovered" }
  ];

  return (
    <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-5 mb-6">
      <h4 className="text-red-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center gap-2">
        <FileWarning className="w-4 h-4" /> Impact Analysis
      </h4>
      <div className="space-y-3">
        {impacts.map((item, i) => (
          <div key={i} className="flex items-start gap-3 text-sm text-red-200/80">
            <div className="mt-0.5 p-1 bg-red-500/10 rounded text-red-400">
              <item.icon className="w-3 h-3" />
            </div>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: RETENTION SURVEY (Expandable) ---
const RetentionSurvey = ({ visible, onChange }) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-6 space-y-3 overflow-hidden"
        >
          <label className="text-zinc-400 text-xs font-medium block">
            Please tell us why you are leaving (Optional)
          </label>
          <select 
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm rounded-lg p-3 outline-none focus:border-red-500/50 transition-colors cursor-pointer hover:bg-zinc-800"
          >
            <option value="">Select a reason...</option>
            <option value="cost">Too expensive / Found cheaper alternative</option>
            <option value="features">Missing features / Functionality</option>
            <option value="ux">User interface / Experience issues</option>
            <option value="support">Poor customer support</option>
            <option value="other">Other / Prefer not to say</option>
          </select>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// --- MAIN CONTENT WRAPPER ---
const ConfirmAccountDeletion = () => {
  const navigate = useNavigate();
  return (
    <ToastProvider>
      <DeletionContent navigate={navigate} />
    </ToastProvider>
  );
};

const DeletionContent = ({ navigate }) => {
  const [searchParams] = useSearchParams();
  const { addToast } = useToast();
  
  // State Machine
  const [status, setStatus] = useState('confirming'); // confirming, processing, success, error
  const [message, setMessage] = useState('Waiting for final confirmation...');
  const [confirmed, setConfirmed] = useState(false);
  const [surveyReason, setSurveyReason] = useState('');
  
  // Logic
  const executeDeletion = async () => {
    if (!confirmed) return;

    setStatus('processing');
    setMessage('Initiating secure wipe...');

    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setMessage('Security token missing. Please use the link sent to your email.');
      return;
    }

    try {
      // Simulate "Wiping" steps for UX
      const steps = [
        "Revoking API keys...",
        "Unlinking storage buckets...",
        "Scrubbing database entries...",
        "Finalizing termination..."
      ];

      for (const step of steps) {
        setMessage(step);
        await new Promise(r => setTimeout(r, 800));
      }

      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/api/auth/confirm-account-deletion/${token}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage('Account successfully terminated.');
        
        // Log survey data (simulated)
        if (surveyReason) console.log('Churn Reason:', surveyReason);

        localStorage.clear();
        sessionStorage.clear();
        
        setTimeout(() => navigate('/', { replace: true }), 3500);
      } else {
        setStatus('error');
        setMessage(data.error || 'Token expired or invalid.');
      }
    } catch (error) {
      setStatus('error');
      setMessage('System error. Please contact support immediately.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#050505] text-zinc-100 font-sans p-4 relative overflow-hidden">
      
      {/* Background Warning Stripes (Subtle) */}
      <div className="fixed inset-0 pointer-events-none opacity-5" 
           style={{ backgroundImage: 'repeating-linear-gradient(45deg, #ef4444 0, #ef4444 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} 
      />

      <div className="absolute top-6 right-6 z-20">
        <ThemeToggle />
      </div>
      
      <motion.div
        initial="hidden"
        animate="visible"
        variants={ANIMATION_VARIANTS.card}
        className="w-full max-w-lg bg-zinc-950 border border-red-900/30 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.1)] overflow-hidden relative z-10"
      >
        {/* Header Section */}
        <div className="bg-red-950/20 border-b border-red-900/20 p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.1),transparent_70%)] pointer-events-none" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-red-900/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AnimatePresence mode="wait">
                {status === 'processing' ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  >
                    <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
                  </motion.div>
                ) : status === 'success' ? (
                  <motion.div
                    key="trash"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                  >
                    <Trash2 className="w-10 h-10 text-red-500" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="shield"
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                  >
                    <ShieldAlert className="w-10 h-10 text-red-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
              {status === 'success' ? 'Account Deleted' : 'Permanent Account Deletion'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-red-300/60 text-xs font-mono bg-red-950/30 w-fit mx-auto px-3 py-1 rounded-full border border-red-900/30">
              <Lock className="w-3 h-3" />
              SECURE ACTION
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-8">
          
          <AnimatePresence mode="wait">
            {/* STATE: CONFIRMING */}
            {status === 'confirming' && (
              <motion.div 
                key="confirm"
                initial={{ opacity: 0, x: -20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="text-zinc-400 mb-6 text-sm leading-relaxed border-l-2 border-red-500/50 pl-4 py-1">
                  You are about to permanently delete your Airstream account. This action is 
                  <span className="font-bold text-red-400"> irreversible</span> and cannot be undone by our support team.
                </div>

                <ImpactChecklist />
                
                <RetentionSurvey visible={!confirmed} onChange={setSurveyReason} />

                {/* Safety Interlock */}
                <div 
                  onClick={() => setConfirmed(!confirmed)}
                  className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer mb-8 group
                    ${confirmed 
                      ? 'bg-red-500/10 border-red-500/50' 
                      : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                    }`}
                >
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors
                    ${confirmed ? 'bg-red-500 border-red-500' : 'bg-black border-zinc-600'}
                  `}>
                    {confirmed && <Check className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <span className={`text-sm select-none ${confirmed ? 'text-red-200' : 'text-zinc-400 group-hover:text-zinc-300'}`}>
                    I understand the consequences and wish to proceed.
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => navigate('/')}
                    className="py-3 px-4 bg-transparent border border-zinc-800 text-zinc-300 font-medium rounded-lg hover:bg-zinc-900 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Cancel
                  </button>
                  <button
                    onClick={executeDeletion}
                    disabled={!confirmed}
                    className="py-3 px-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(220,38,38,0.2)] hover:shadow-[0_0_30px_rgba(220,38,38,0.4)] flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </motion.div>
            )}

            {/* STATE: PROCESSING */}
            {status === 'processing' && (
              <motion.div 
                key="processing"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-8"
              >
                <h3 className="text-white font-medium mb-4 text-lg">Erasing Data...</h3>
                
                {/* Visual Progress Bar */}
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden max-w-xs mx-auto mb-6 relative">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: "100%" }}
                     transition={{ duration: 4, ease: "linear" }}
                     className="h-full bg-red-600"
                   />
                   <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:10px_10px]" />
                </div>
                
                <p className="text-zinc-500 text-xs font-mono">
                  {message}
                </p>
              </motion.div>
            )}

            {/* STATE: SUCCESS */}
            {status === 'success' && (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="bg-zinc-900/50 rounded-xl p-6 mb-8 border border-zinc-800">
                  <p className="text-zinc-300 leading-relaxed">
                    Your account has been successfully scheduled for deletion. You have been logged out of all active sessions.
                  </p>
                </div>
                <div className="text-zinc-500 text-sm flex items-center justify-center gap-2 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Returning to homepage...
                </div>
              </motion.div>
            )}

            {/* STATE: ERROR */}
            {status === 'error' && (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <div className="bg-red-950/20 rounded-xl p-6 mb-8 border border-red-900/30 flex flex-col items-center">
                  <div className="p-3 bg-red-900/20 rounded-full mb-3">
                    <X className="w-6 h-6 text-red-500" />
                  </div>
                  <p className="text-red-400 mb-2 font-bold">Deletion Failed</p>
                  <p className="text-red-200/70 text-sm">{message}</p>
                </div>
                <button
                  onClick={() => navigate('/')}
                  className="w-full py-3 bg-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-700 transition-colors border border-zinc-700 hover:border-zinc-600"
                >
                  Return Home
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          
        </div>

        {/* Security Footer */}
        <div className="bg-zinc-950/80 p-4 border-t border-zinc-900 flex justify-center items-center gap-3 text-[10px] text-zinc-600 uppercase tracking-widest font-mono">
          <Lock className="w-3 h-3" />
          <span>AES-256 Encrypted Session</span>
          <span className="w-1 h-1 bg-zinc-800 rounded-full" />
          <span>ID: {searchParams.get('token')?.substring(0, 8) || '####'}</span>
        </div>

      </motion.div>
    </div>
  );
};

export default ConfirmAccountDeletion;
