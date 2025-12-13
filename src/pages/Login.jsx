// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import authService from '../services/authService';
import { Button, Input } from '../components/ui/Core';
import { Eye, EyeOff } from '../components/ui/Icons';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from '../components/ui/Icons';

const Login = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(
        formData.emailOrUsername,
        formData.password
      );

      if (!response.user.isEmailVerified) {
        navigate('/auth/verify-email', { 
          state: { email: response.user.email } 
        });
      } else {
        navigate('/workspace');
      }
    } catch (err) {
      if (err.response?.data?.code === 'ACCOUNT_LOCKED') {
        setError('Account temporarily locked. Try again later.');
      } else if (err.response?.data?.code === 'INVALID_CREDENTIALS') {
        setError('Invalid email/username or password');
      } else {
        setError(err.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background font-sans">
      {/* Left Column - Branding (Hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-900 text-white relative overflow-hidden">
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl group">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-zinc-900 shadow-lg group-hover:scale-105 transition-transform">
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl tracking-tight">Airstream</span>
          </Link>
          <div className="mt-24 max-w-lg">
             <motion.div
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ delay: 0.2 }}
             >
                <h1 className="text-5xl font-extrabold tracking-tight mb-8 leading-tight">
                   Manage your files with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">professional ease.</span>
                </h1>
                <p className="text-zinc-400 text-xl leading-relaxed">
                  Secure, fast, and organized. The workspace designed for professionals who demand clarity and control.
                </p>
            </motion.div>
          </div>
        </div>

        <div className="relative z-10">
           <div className="flex gap-4 mb-8">
              {[1, 2, 3].map(i => (
                 <div key={i} className="w-12 h-12 rounded-full border border-white/10 bg-white/5 backdrop-blur flex items-center justify-center">
                    <div className="w-6 h-6 bg-zinc-600 rounded-full animate-pulse" />
                 </div>
              ))}
           </div>
           <div className="text-sm text-zinc-500 flex justify-between items-center">
             <span>&copy; {new Date().getFullYear()} Airstream Inc.</span>
             <div className="flex gap-4">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
             </div>
           </div>
        </div>

        {/* Abstract Background Decoration */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-800 via-zinc-900 to-black opacity-60"></div>
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl filter" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl filter" />
      </div>

      {/* Right Column - Form */}
      <div className="flex flex-col justify-center px-6 sm:px-10 lg:px-20 xl:px-28 relative bg-background">
        <div className="absolute top-6 right-6">
           <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
            >
              {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[400px] mx-auto"
        >
           {/* Mobile Logo */}
           <div className="lg:hidden flex justify-center mb-10">
             <Link to="/" className="flex items-center gap-2 font-bold text-xl text-foreground">
               <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-primary-foreground shadow-md">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
               </div>
               <span>Airstream</span>
             </Link>
           </div>

          <div className="mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Welcome back</h2>
            <p className="text-muted-foreground mt-2 text-base">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-destructive/10 border border-destructive/20 text-destructive text-sm px-4 py-3 rounded-lg flex items-center gap-2"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {error}
              </motion.div>
            )}

            <Input
                label="Email or Username"
                name="emailOrUsername"
                value={formData.emailOrUsername}
                onChange={handleChange}
                required
                placeholder="name@example.com"
                className="h-11"
            />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium leading-none">Password</label>
                <Link
                  to="/auth/forgot-password"
                  className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="h-11 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              isLoading={loading}
              className="w-full h-11 text-base shadow-lg hover:shadow-primary/25 transition-all"
            >
              Sign In
            </Button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link
                to="/auth/signup"
                className="font-medium text-primary hover:underline underline-offset-4 transition-all"
              >
                Create an account
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
