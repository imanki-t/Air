// src/pages/Login.jsx - Login Page
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { isDark } = useTheme();

  const [formData, setFormData] = useState({
    emailOrUsername: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    setError('');
    setRemainingAttempts(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(formData);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Login error:', err);
      const errorData = err.response?.data;
      
      if (errorData?.code === 'ACCOUNT_LOCKED') {
        setError(errorData.error || 'Account temporarily locked');
      } else if (errorData?.code === 'INVALID_CREDENTIALS') {
        setError('Invalid email/username or password');
        if (errorData.remainingAttempts !== undefined) {
          setRemainingAttempts(errorData.remainingAttempts);
        }
      } else {
        setError(errorData?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 ${
      isDark ? 'bg-gray-950' : 'bg-gray-50'
    }`}>
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full ${
          isDark ? 'bg-blue-500/10' : 'bg-red-500/10'
        } blur-3xl`}></div>
        <div className={`absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full ${
          isDark ? 'bg-blue-500/10' : 'bg-red-500/10'
        } blur-3xl`}></div>
      </div>

      <div className="max-w-md w-full space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center">
          <Link to="/" className="inline-flex items-center space-x-2 mb-6">
            <img src="/airstream.png" alt="Airstream" className="h-12 w-12" />
            <span className={`text-2xl font-bold ${
              isDark ? 'text-white' : 'text-gray-900'
            }`}>AIRSTREAM</span>
          </Link>
          <h2 className={`text-3xl font-extrabold ${
            isDark ? 'text-white' : 'text-gray-900'
          }`}>
            Welcome back
          </h2>
          <p className={`mt-2 text-sm ${
            isDark ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Sign in to your account to continue
          </p>
        </div>

        {/* Form */}
        <div className={`rounded-2xl shadow-xl p-8 ${
          isDark ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
        }`}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className={`rounded-lg p-4 ${
                isDark ? 'bg-red-900/30 border border-red-800' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-start">
                  <svg className={`h-5 w-5 ${
                    isDark ? 'text-red-400' : 'text-red-600'
                  } mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="ml-3 flex-1">
                    <p className={`text-sm font-medium ${
                      isDark ? 'text-red-400' : 'text-red-800'
                    }`}>{error}</p>
                    {remainingAttempts !== null && remainingAttempts > 0 && (
                      <p className={`text-xs mt-1 ${
                        isDark ? 'text-red-400/80' : 'text-red-700/80'
                      }`}>
                        {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining before account lock
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="emailOrUsername" className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Email or Username
              </label>
              <input
                id="emailOrUsername"
                name="emailOrUsername"
                type="text"
                autoComplete="username"
                required
                value={formData.emailOrUsername}
                onChange={handleChange}
                className={`appearance-none rounded-lg relative block w-full px-4 py-3 border ${
                  isDark 
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                placeholder="Enter your email or username"
              />
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-2 ${
                isDark ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none rounded-lg relative block w-full px-4 py-3 pr-12 border ${
                    isDark 
                      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:border-blue-500' 
                      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-600'
                  } focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-colors`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                    isDark ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0a8.961 8.961 0 011.41-1.59" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="rememberMe"
                  name="rememberMe"
                  type="checkbox"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  className={`h-4 w-4 rounded border-gray-300 ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-white'
                  } text-blue-600 focus:ring-blue-500`}
                />
                <label htmlFor="rememberMe" className={`ml-2 block text-sm ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Remember me for 30 days
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className={`font-medium ${
                    isDark ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'
                  } transition-colors`}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white ${
                isDark 
                  ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' 
                  : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
              } focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${
                isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${
                  isDark ? 'border-gray-700' : 'border-gray-200'
                }`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-2 ${
                  isDark ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'
                }`}>
                  Don't have an account?
                </span>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/signup"
                className={`w-full flex justify-center py-3 px-4 border rounded-lg shadow-sm text-sm font-medium ${
                  isDark 
                    ? 'border-gray-700 text-gray-300 bg-gray-800 hover:bg-gray-700' 
                    : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
                } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors ${
                  isDark ? 'focus:ring-offset-gray-900' : 'focus:ring-offset-white'
                }`}
              >
                Create new account
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className={`text-center text-sm ${
          isDark ? 'text-gray-400' : 'text-gray-600'
        }`}>
          <Link to="/" className="hover:underline">
            Back to homepage
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
