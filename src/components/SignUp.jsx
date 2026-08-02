// src/components/SignUp.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

// Scopes: identity + Drive file access (only files created by this app)
const DRIVE_SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/drive.file',
].join(' ');

// ─────────────────────────────────────────────────────────────────────────────
// Execute reCAPTCHA v3 action and return a token
// ─────────────────────────────────────────────────────────────────────────────
const executeRecaptcha = async (action = 'login') => {
  return new Promise((resolve) => {
    if (!window.grecaptcha || !RECAPTCHA_SITE_KEY) {
      resolve('');
      return;
    }
    window.grecaptcha.ready(() => {
      window.grecaptcha
        .execute(RECAPTCHA_SITE_KEY, { action })
        .then(resolve)
        .catch(() => resolve(''));
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// AccessGate component
// ─────────────────────────────────────────────────────────────────────────────
const SignUp = ({ onAccessGranted, darkMode: parentDarkMode }) => {
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [darkMode, setDarkMode] = useState(parentDarkMode ?? false);
  const [rememberMe, setRememberMe] = useState(false);
  const rememberMeRef  = useRef(false);
  const codeClientRef  = useRef(null); // stores the initCodeClient instance
  const gisLoadedRef   = useRef(false);

  // Keep ref in sync
  useEffect(() => { rememberMeRef.current = rememberMe; }, [rememberMe]);

  // ── Sync dark mode from parent ──────────────────────────────────────────
  useEffect(() => {
    if (parentDarkMode !== undefined) setDarkMode(parentDarkMode);
  }, [parentDarkMode]);

  // ── System dark mode fallback + loading timer ────────────────────────────
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (parentDarkMode === undefined) setDarkMode(prefersDark);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (parentDarkMode === undefined) setDarkMode(e.matches);
    };
    mq.addEventListener('change', handleChange);

    // End loading after 2 seconds
    const loadingEndTimer = setTimeout(() => setLoading(false), 2000);

    return () => {
      clearTimeout(loadingEndTimer);
      mq.removeEventListener('change', handleChange);
    };
  }, []); // eslint-disable-line

  // ── Auto-clear error ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handle the authorization code returned by Google OAuth2 popup
  // ─────────────────────────────────────────────────────────────────────────
  const handleCodeResponse = useCallback(async (codeResponse) => {
    if (!codeResponse?.code) {
      setError('Sign-in was cancelled or failed. Please try again.');
      setSigningIn(false);
      return;
    }

    try {
      const recaptchaToken = await executeRecaptcha('login');

      const res = await axios.post(
        `${BACKEND_URL}/api/auth/google`,
        {
          code:          codeResponse.code,
          rememberMe:    rememberMeRef.current,
          recaptchaToken,
        },
        { withCredentials: true },
      );

      if (res.data.success) {
        setFadeOut(true);
        setTimeout(() => { if (onAccessGranted) onAccessGranted(res.data.user); }, 700);
      } else {
        setError('Authentication failed. Please try again.');
        setSigningIn(false);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      const msg = err.response?.data?.error || 'Sign-in failed. Please try again.';
      setError(msg);
      setSigningIn(false);
    }
  }, [onAccessGranted]); // eslint-disable-line

  // ─────────────────────────────────────────────────────────────────────────
  // Initialise google.accounts.oauth2.initCodeClient after GIS script loads
  // ─────────────────────────────────────────────────────────────────────────
  const initCodeClient = useCallback(() => {
    if (gisLoadedRef.current || !window.google?.accounts?.oauth2) return;
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set.');
      return;
    }

    gisLoadedRef.current = true;

    codeClientRef.current = window.google.accounts.oauth2.initCodeClient({
      client_id:      GOOGLE_CLIENT_ID,
      scope:          DRIVE_SCOPES,
      ux_mode:        'popup',
      callback:       handleCodeResponse,
      error_callback: (err) => {
        console.error('OAuth2 error:', err);
        if (err?.type !== 'popup_closed') {
          setError('Sign-in failed. Please try again.');
        }
        setSigningIn(false);
      },
    });
  }, [handleCodeResponse]);

  useEffect(() => {
    const scriptId = 'gis-script';
    if (window.google?.accounts?.oauth2) {
      if (!loading) initCodeClient();
    } else if (!document.getElementById(scriptId)) {
      const script     = document.createElement('script');
      script.id        = scriptId;
      script.src       = 'https://accounts.google.com/gsi/client';
      script.async     = true;
      script.defer     = true;
      script.onload    = () => { if (!loading) initCodeClient(); };
      document.head.appendChild(script);
    }
  }, []); // eslint-disable-line

  // Once loading spinner is done, init if GIS is already present
  useEffect(() => {
    if (loading) return;
    if (window.google?.accounts?.oauth2) {
      initCodeClient();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.oauth2) {
          clearInterval(interval);
          initCodeClient();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [loading, initCodeClient]);

  // ─────────────────────────────────────────────────────────────────────────
  // Button click — trigger OAuth2 popup
  // ─────────────────────────────────────────────────────────────────────────
  const handleSignInClick = () => {
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID is not configured.');
      return;
    }
    if (!codeClientRef.current) {
      setError('Sign-in is not ready yet. Please wait a moment and try again.');
      return;
    }
    setSigningIn(true);
    setError('');
    try {
      codeClientRef.current.requestCode();
    } catch (err) {
      console.error('requestCode error:', err);
      setError('Could not open sign-in popup. Please try again.');
      setSigningIn(false);
    }
  };


  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-all duration-700 ease-in-out overflow-hidden ${
        fadeOut ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ background: darkMode ? '#0f172a' : '#ffffff' }}
    >
      {/* Animated background grid */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: darkMode
              ? `linear-gradient(to right, rgba(66,135,245,0.2) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(66,135,245,0.2) 1px, transparent 1px)`
              : `linear-gradient(to right, rgba(139,0,0,0.3) 1px, transparent 1px),
                 linear-gradient(to bottom, rgba(139,0,0,0.3) 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
            backgroundColor: darkMode ? '#0f172a' : '#ffffff',
          }}
        />
      </div>

      {/* Header inside gate */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 flex items-center justify-center rounded-xl shadow-lg ${
              darkMode
                ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}
          >
            <img src="/airstream.png" className="h-10 w-10" alt="Airstream" onError={(e) => { e.target.style.display = 'none'; }} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            <span
              className={`text-transparent bg-clip-text ${
                darkMode
                  ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                  : 'bg-gradient-to-r from-red-400 to-red-500'
              }`}
            >
              AIRSTREAM
            </span>
          </h1>
        </div>
      </header>

      {/* Main content */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 py-4">
      <div
        className="w-full max-w-md mx-auto"
      >
        {loading ? (
          /* ── Loading / splash animation ── */
          <div className="flex flex-col items-center justify-center p-8">
            <div className="relative w-56 h-56 md:w-80 md:h-80 mb-6">
              <div className="absolute inset-0">
                <div
                  className={`absolute inset-0 rounded-full border-4 ${
                    darkMode ? 'border-t-blue-500' : 'border-t-red-500'
                  } border-r-transparent border-b-transparent border-l-transparent animate-spin`}
                />
                <div
                  className={`absolute inset-6 rounded-full border-4 border-t-transparent ${
                    darkMode ? 'border-r-blue-500' : 'border-r-red-500'
                  } border-b-transparent border-l-transparent animate-spin`}
                  style={{ animationDuration: '1.5s' }}
                />
                <div
                  className={`absolute inset-12 rounded-full border-4 border-t-transparent border-r-transparent ${
                    darkMode ? 'border-b-blue-500' : 'border-b-red-500'
                  } border-l-transparent animate-spin`}
                  style={{ animationDuration: '2s' }}
                />
              </div>
            </div>
          </div>
        ) : (
          /* ── Login form ── */
          <div className="flex flex-col items-center">
            <div className="w-full relative max-w-xs sm:max-w-sm">
              <div
                className={`relative rounded-xl overflow-hidden shadow-lg ${
                  darkMode
                    ? 'bg-gray-800 border border-gray-700'
                    : 'bg-white border border-gray-200'
                }`}
              >
                {/* Accent bar */}
                <div className={`h-1 w-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`} />

                <div className="p-6 pt-8">
                  <div className="text-center mb-6">
                    <h2
                      className={`text-xl font-semibold mb-1 ${
                        darkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      SECURE ACCESS
                    </h2>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Sign in with your Google account to access your files
                    </p>
                  </div>

                  {/* Error message */}
                  {error && (
                    <div
                      className={`mb-4 py-2 px-3 rounded-md flex items-center space-x-2 ${
                        darkMode
                          ? 'bg-red-900/30 border border-red-800/50 text-red-400'
                          : 'bg-red-50 border border-red-200 text-red-500'
                      }`}
                    >
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-sm">{error}</span>
                    </div>
                  )}

                  {/* Google Sign-In button container */}
                  <div className="space-y-3">

                    {/* Visible custom Google button */}
                    <button
                      onClick={handleSignInClick}
                      disabled={signingIn}
                      className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md border font-medium text-sm transition-all duration-200 ${
                        signingIn
                          ? darkMode
                            ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                            : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : darkMode
                          ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-650 hover:border-gray-500 active:scale-[0.99]'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:scale-[0.99] shadow-sm'
                      }`}
                    >
                      {signingIn ? (
                        <div
                          className={`w-5 h-5 rounded-full border-2 border-t-transparent animate-spin ${
                            darkMode ? 'border-blue-400' : 'border-red-400'
                          }`}
                        />
                      ) : (
                        /* Google G SVG — official brand logo */
                        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                      )}
                      {signingIn ? 'Signing in…' : 'Continue with Google'}
                    </button>

                    {/* Remember me */}
                    <label
                      className={`flex items-center justify-center gap-2.5 cursor-pointer select-none group w-full ${
                        darkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                      />
                      <div
                        className={`relative w-4 h-4 rounded flex-shrink-0 border-2 transition-all duration-150 ${
                          rememberMe
                            ? darkMode
                              ? 'bg-blue-600 border-blue-600'
                              : 'bg-red-500 border-red-500'
                            : darkMode
                            ? 'border-gray-600 group-hover:border-gray-500'
                            : 'border-gray-300 group-hover:border-gray-400'
                        }`}
                      >
                        {rememberMe && (
                          <svg className="absolute inset-0 w-3 h-3 m-auto text-white" fill="none" viewBox="0 0 12 12" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M2 6l3 3 5-5" />
                          </svg>
                        )}
                      </div>
                      <span className="text-sm">Remember me for 30 days</span>
                    </label>
                  </div>
                </div>

                {/* reCAPTCHA notice — inside card footer */}
                <div
                  className={`px-6 py-3 border-t ${
                    darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-100 bg-gray-50/80'
                  }`}
                >
                  <p className={`text-xs text-center leading-relaxed ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    This site is protected by reCAPTCHA and the Google{' '}
                    <a
                      href="https://policies.google.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline underline-offset-2 transition-colors ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
                    >
                      Privacy Policy
                    </a>
                    {' '}and{' '}
                    <a
                      href="https://policies.google.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`underline underline-offset-2 transition-colors ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}
                    >
                      Terms of Service
                    </a>
                    {' '}apply.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>{/* end max-w-md */}
      </div>{/* end flex-1 centered */}

        {/* ── Page Footer ── */}
          <footer className={`relative z-10 flex-shrink-0 px-4 py-4 border-t ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:px-6">
                {/* Brand */}
                <div className="flex items-center gap-2.5">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-5 w-5 flex-shrink-0" aria-label="Airstream logo">
                    <circle cx="250" cy="250" r="210" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" />
                    <circle cx="250" cy="172" r="30" fill={darkMode ? '#6b7280' : '#9ca3af'} />
                    <polyline points="155,218 250,330 345,218" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={`text-sm font-bold tracking-widest uppercase ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    Airstream
                  </span>
                </div>

                {/* Links */}
                <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                  <a
                    href="https://quickwitty.onrender.com/contacts"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`transition-colors ${darkMode ? 'hover:text-gray-400' : 'hover:text-gray-600'}`}
                  >
                    Contact
                  </a>
                  <span className="opacity-40">·</span>
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`transition-colors ${darkMode ? 'hover:text-gray-400' : 'hover:text-gray-600'}`}
                  >
                    Privacy
                  </a>
                  <span className="opacity-40">·</span>
                  <span>© {new Date().getFullYear()}</span>
                </div>
              </div>
          </footer>
    </div>
  );
};

SignUp.propTypes = {
  onAccessGranted: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

export default SignUp;
