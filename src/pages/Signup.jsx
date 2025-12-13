import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
  Globe, 
  Server, 
  Database, 
  Code, 
  User, 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Info
} from 'lucide-react';

/* ===================================================================
   AIRSTREAM ONBOARDING SYSTEM - SIGNUP MODULE
   Version: 4.0.0 (Enterprise)
   -------------------------------------------------------------------
   Features:
   - Real-time Password Strength Analysis
   - Animated Infrastructure Visualizer
   - Custom Toast Notifications
   - Terms of Service Logic
   - Adaptive Responsive Grid
   =================================================================== */

// --- ANIMATION VARIANTS ---
const FADE_IN_UP = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const STAGGER_CONTAINER = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

// --- CUSTOM TOAST SYSTEM (Replicated for Independence) ---
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
  const styles = {
    success: 'bg-zinc-900 border-green-500/50 text-green-500',
    error: 'bg-zinc-900 border-red-500/50 text-red-500',
    info: 'bg-zinc-900 border-blue-500/50 text-blue-500',
    warning: 'bg-zinc-900 border-yellow-500/50 text-yellow-500'
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      className={`pointer-events-auto w-full max-w-sm rounded-lg border shadow-xl p-4 flex items-start gap-4 backdrop-blur-md ${styles[type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[type]}</div>
      <div className="flex-1">
        <h4 className="text-sm font-bold text-zinc-100">{title}</h4>
        <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{message}</p>
      </div>
      <button onClick={onDismiss} className="shrink-0 text-zinc-500 hover:text-zinc-300">
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
};

// --- SUB-COMPONENT: ANIMATED ARCHITECTURE VISUALIZER ---
const ArchitectureVisualizer = () => {
  return (
    <div className="w-full max-w-md mx-auto aspect-square relative opacity-90">
      {/* Central Core */}
      <motion.div 
        animate={{ 
          boxShadow: ['0 0 20px rgba(59,130,246,0.2)', '0 0 60px rgba(59,130,246,0.4)', '0 0 20px rgba(59,130,246,0.2)'] 
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-zinc-900 border border-blue-500/30 rounded-full flex items-center justify-center z-20"
      >
        <div className="text-blue-400 font-bold tracking-tight text-xs">CORE</div>
      </motion.div>

      {/* Orbital Rings */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0 animate-[spin_60s_linear_infinite]">
        <circle cx="50%" cy="50%" r="30%" stroke="rgba(255,255,255,0.05)" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
      </svg>

      {/* Orbiting Nodes */}
      {[0, 1, 2, 3].map((i) => (
        <motion.div
          key={i}
          animate={{ rotate: 360 }}
          transition={{ duration: 15 + i * 5, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 z-10"
        >
           <motion.div 
             whileHover={{ scale: 1.2 }}
             className="absolute top-0 left-1/2 -translate-x-1/2 w-12 h-12 bg-black border border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 shadow-lg"
             style={{ marginTop: i % 2 === 0 ? '15%' : '5%' }}
           >
             {i === 0 && <Globe className="w-5 h-5 text-blue-400" />}
             {i === 1 && <Database className="w-5 h-5 text-green-400" />}
             {i === 2 && <Server className="w-5 h-5 text-purple-400" />}
             {i === 3 && <Code className="w-5 h-5 text-yellow-400" />}
           </motion.div>
        </motion.div>
      ))}
    </div>
  );
};

// --- SUB-COMPONENT: PASSWORD STRENGTH METER ---
const PasswordStrengthMeter = ({ password }) => {
  const [strength, setStrength] = useState(0);
  const [feedback, setFeedback] = useState([]);

  useEffect(() => {
    let score = 0;
    let messages = [];
    
    if (password.length >= 8) score++;
    else messages.push("At least 8 characters");
    
    if (/[A-Z]/.test(password)) score++;
    else messages.push("Uppercase letter");
    
    if (/[0-9]/.test(password)) score++;
    else messages.push("Number");
    
    if (/[^A-Za-z0-9]/.test(password)) score++;
    
    setStrength(score);
    setFeedback(messages);
  }, [password]);

  const getColor = (index) => {
    if (index < strength) {
      if (strength <= 2) return 'bg-red-500';
      if (strength === 3) return 'bg-yellow-500';
      return 'bg-green-500';
    }
    return 'bg-zinc-800';
  };

  return (
    <div className="space-y-2 mt-3">
      <div className="flex gap-1 h-1 w-full">
        {[0, 1, 2, 3].map((i) => (
          <div 
            key={i} 
            className={`flex-1 rounded-full transition-all duration-300 ${getColor(i)}`} 
          />
        ))}
      </div>
      <div className="flex justify-between items-start">
        <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">
          {strength === 0 && 'Enter Password'}
          {strength === 1 && 'Weak'}
          {strength === 2 && 'Fair'}
          {strength === 3 && 'Good'}
          {strength === 4 && 'Strong'}
        </span>
        {feedback.length > 0 && (
          <span className="text-[10px] text-zinc-600 text-right max-w-[150px]">
            Missing: {feedback[0]}
          </span>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENT: FORM INPUT ---
const SignupInput = ({ label, name, type = 'text', placeholder, value, onChange, icon: Icon, error }) => {
  const [focused, setFocused] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const inputType = type === 'password' ? (showPass ? 'text' : 'password') : type;

  return (
    <div className="space-y-1.5">
      <label className={`text-xs font-semibold uppercase tracking-wider transition-colors ${focused ? 'text-white' : 'text-zinc-500'}`}>
        {label} <span className="text-red-500">*</span>
      </label>
      <div className={`relative group transition-all duration-200 ${focused ? 'scale-[1.01]' : ''}`}>
        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none transition-colors ${focused ? 'text-blue-500' : 'text-zinc-600'}`}>
          <Icon className="w-4 h-4" />
        </div>
        <input
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
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
      </div>
      {error && <p className="text-xs text-red-500 animate-pulse">{error}</p>}
    </div>
  );
};

// --- MAIN SIGNUP COMPONENT ---
const Signup = () => {
  const navigate = useNavigate();
  return (
    <ToastProvider>
      <SignupContent navigate={navigate} />
    </ToastProvider>
  );
};

const SignupContent = ({ navigate }) => {
  const { addToast } = useToast();
  
  // Form State
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    terms: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!formData.username.trim()) newErrors.username = "Username required";
    else if (!usernameRegex.test(formData.username)) newErrors.username = "Alphanumeric, 3-20 chars";

    if (!formData.email.trim()) newErrors.email = "Email required";
    else if (!emailRegex.test(formData.email)) newErrors.email = "Invalid email format";

    if (!formData.password) newErrors.password = "Password required";
    else if (formData.password.length < 8) newErrors.password = "Min 8 characters";

    if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    if (!formData.terms) newErrors.terms = "You must agree to the terms";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      addToast('warning', 'Form Invalid', 'Please correct the errors above.');
      return;
    }

    setLoading(true);
    
    try {
      await authService.signup(formData.username, formData.email, formData.password);
      
      addToast('success', 'Account Created', 'Redirecting to verification...');
      
      // Simulate slight delay for UX
      setTimeout(() => {
        navigate('/auth/verify-email', { state: { email: formData.email } });
      }, 1500);

    } catch (err) {
      addToast('error', 'Signup Failed', err.response?.data?.error || 'Server unavailable. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-black text-zinc-100 font-sans overflow-hidden relative">
      
      {/* Background FX */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-900/10 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      </div>

      {/* --- LEFT COLUMN: VISUALS (Desktop) --- */}
      <div className="hidden lg:flex w-[55%] xl:w-[60%] relative flex-col justify-between p-12 xl:p-16 border-r border-zinc-900 bg-zinc-950 z-10">
        
        {/* Branding */}
        <Link to="/" className="flex items-center gap-3 w-fit group">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-900/20 group-hover:scale-105 transition-transform">
            <Globe className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-zinc-100">Airstream</span>
        </Link>

        {/* Center Visual */}
        <div className="w-full max-w-lg mx-auto text-center space-y-12">
          <motion.div initial="hidden" animate="visible" variants={STAGGER_CONTAINER}>
            <motion.h1 variants={FADE_IN_UP} className="text-4xl xl:text-5xl font-bold leading-tight mb-4">
              Deploy globally <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                in seconds.
              </span>
            </motion.h1>
            <motion.p variants={FADE_IN_UP} className="text-zinc-400 text-lg">
              Join thousands of developers building the future on our serverless infrastructure.
            </motion.p>
          </motion.div>

          <ArchitectureVisualizer />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Uptime SLA</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-white mb-1">35+</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Regions</div>
            </div>
            <div className="p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
              <div className="text-2xl font-bold text-white mb-1">0ms</div>
              <div className="text-[10px] text-zinc-500 uppercase tracking-wider">Cold Starts</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          <ShieldCheck className="w-4 h-4" />
          <span>SOC2 Type II Certified • GDPR Compliant • ISO 27001</span>
        </div>
      </div>

      {/* --- RIGHT COLUMN: FORM --- */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col relative z-20 bg-black">
        
        {/* Mobile Nav */}
        <div className="lg:hidden p-6 flex items-center justify-between border-b border-zinc-900">
          <Link to="/" className="flex items-center gap-2 font-bold">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            Airstream
          </Link>
          <ThemeToggle />
        </div>

        {/* Desktop Controls */}
        <div className="hidden lg:flex absolute top-8 right-8">
          <ThemeToggle />
        </div>

        {/* Form Container */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24 py-12">
          <div className="w-full max-w-sm mx-auto space-y-8">
            
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-white">Create Account</h2>
              <p className="text-zinc-500 text-sm">
                Start your free workspace. No credit card required.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              
              <SignupInput 
                label="Username"
                name="username"
                placeholder="dev_wizard"
                value={formData.username}
                onChange={handleChange}
                icon={User}
                error={errors.username}
              />

              <SignupInput 
                label="Work Email"
                name="email"
                type="email"
                placeholder="you@company.com"
                value={formData.email}
                onChange={handleChange}
                icon={Mail}
                error={errors.email}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignupInput 
                  label="Password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  icon={Lock}
                  error={errors.password}
                />
                <SignupInput 
                  label="Confirm"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  icon={Lock}
                  error={errors.confirmPassword}
                />
              </div>

              {/* Password Strength Indicator */}
              <PasswordStrengthMeter password={formData.password} />

              {/* Terms Checkbox */}
              <div className="pt-2">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <div className="relative mt-0.5">
                    <input 
                      type="checkbox" 
                      name="terms"
                      checked={formData.terms}
                      onChange={handleChange}
                      className="peer appearance-none w-4 h-4 border border-zinc-700 rounded bg-zinc-900 checked:bg-blue-600 checked:border-blue-600 transition-colors" 
                    />
                    <CheckCircle2 className="w-3 h-3 text-white absolute top-0.5 left-0.5 opacity-0 peer-checked:opacity-100 pointer-events-none" />
                  </div>
                  <div className="text-xs text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">
                    I agree to the <a href="#" className="underline hover:text-white">Terms of Service</a> and <a href="#" className="underline hover:text-white">Privacy Policy</a>. I consent to receiving product updates via email.
                  </div>
                </label>
                {errors.terms && <p className="text-xs text-red-500 mt-1 ml-7 animate-pulse">{errors.terms}</p>}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-lg bg-blue-600 text-white font-bold py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all hover:bg-blue-500 hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] disabled:opacity-70 disabled:cursor-not-allowed mt-4"
              >
                <div className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
            </form>

            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-black px-2 text-zinc-600">Or sign up with</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={() => addToast('info', 'SSO', 'GitHub OAuth unavailable in demo mode.')}
              className="w-full flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white py-3 rounded-lg text-sm font-medium transition-all group"
            >
              <Github className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
              <span>Continue with GitHub</span>
            </button>

            <p className="text-center text-xs text-zinc-500 pt-4">
              Already have an account?{' '}
              <Link to="/auth/login" className="text-white font-bold hover:underline underline-offset-4 decoration-zinc-700">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
