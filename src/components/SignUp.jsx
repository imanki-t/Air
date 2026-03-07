// src/components/SignUp.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

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
  const rememberMeRef = useRef(false); // ref so GIS callback always reads live value

  // Keep ref in sync whenever rememberMe changes
  useEffect(() => {
    rememberMeRef.current = rememberMe;
  }, [rememberMe]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [phaseVisible, setPhaseVisible] = useState(false);
  const [phaseOpacity, setPhaseOpacity] = useState(0);
  const [showPhases, setShowPhases] = useState(false);
  const [typedQuote, setTypedQuote] = useState(''); // kept for cleanup safety
  const loginBoxRef = useRef(null);
  const googleBtnRef = useRef(null);
  const googleInitialized = useRef(false);

  const phases = ['Encrypting', 'Securing', 'Connecting', 'Verifying'];
  const quotes = [
    'Diamond hoe? In a locked chest. Respect it.',
    'Built a dirt house for the nostalgia. Would die for it.',
    'Trust issues? I cover my redstone with obsidian.',
    'History will remember me as the dirt block king.',
    'My realm, my rules.',
    'I craft, therefore I am.',
    'Home is where the respawn point is.',
    'Redstone is just digital wizardry.',
    'In the beginning, there was wood.',
    'The cake is a lie… but I still bake it.',
  ];

  // ── Sync dark mode from parent ──────────────────────────────────────────
  useEffect(() => {
    if (parentDarkMode !== undefined) setDarkMode(parentDarkMode);
  }, [parentDarkMode]);

  // ── System dark mode fallback ────────────────────────────────────────────
  useEffect(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (parentDarkMode === undefined) setDarkMode(prefersDark);

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (parentDarkMode === undefined) setDarkMode(e.matches);
    };
    mq.addEventListener('change', handleChange);

    // Typewriter effect for quote
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    let index = 0;
    setTypedQuote('');
    const typeInterval = setInterval(() => {
      index++;
      setTypedQuote(quote.slice(0, index));
      if (index >= quote.length) clearInterval(typeInterval);
    }, 50);

    // Loading phase animation
    const initialDelay = 3000;
    const phaseShowTimer = setTimeout(() => setShowPhases(true), initialDelay);
    const phaseDuration = 1000;
    const loadingEndTimer = setTimeout(
      () => setLoading(false),
      initialDelay + phases.length * phaseDuration
    );

    return () => {
      clearInterval(typeInterval);
      clearTimeout(phaseShowTimer);
      clearTimeout(loadingEndTimer);
      mq.removeEventListener('change', handleChange);
    };
  }, []); // eslint-disable-line

  // ── Phase animation ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading || !showPhases) return;

    setPhaseVisible(true);
    setPhaseOpacity(0);

    let step = 0;
    const fadeIn = setInterval(() => {
      step++;
      setPhaseOpacity(step / 10);
      if (step >= 10) clearInterval(fadeIn);
    }, 30);

    const fadeOutTimer = setTimeout(() => {
      let outStep = 0;
      const fadeOut = setInterval(() => {
        outStep++;
        setPhaseOpacity(1 - outStep / 8);
        if (outStep >= 8) {
          clearInterval(fadeOut);
          setPhaseVisible(false);
        }
      }, 37);
    }, 600);

    const nextTimer = setTimeout(() => {
      if (currentPhase < phases.length - 1) setCurrentPhase((p) => p + 1);
    }, 1000);

    return () => {
      clearInterval(fadeIn);
      clearTimeout(fadeOutTimer);
      clearTimeout(nextTimer);
    };
  }, [currentPhase, loading, showPhases]); // eslint-disable-line

  // ── Auto-clear error ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(t);
  }, [error]);

  // ── Initialize Google Identity Services ──────────────────────────────────
  const initGoogleSignIn = useCallback(() => {
    if (!window.google?.accounts?.id || googleInitialized.current) return;
    if (!GOOGLE_CLIENT_ID) {
      console.warn('VITE_GOOGLE_CLIENT_ID is not set.');
      return;
    }

    googleInitialized.current = true;

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,       // Never auto-select or hint at last account
      cancel_on_tap_outside: true,
      ux_mode: 'popup',
      context: 'signin',
    });

    if (googleBtnRef.current) {
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: darkMode ? 'filled_black' : 'outline',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
        width: googleBtnRef.current.offsetWidth || 300,
      });
    }
  }, [darkMode]); // eslint-disable-line

  useEffect(() => {
    if (loading) return;

    // GIS script might load after component mounts
    if (window.google?.accounts?.id) {
      initGoogleSignIn();
    } else {
      const scriptId = 'gis-script';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = initGoogleSignIn;
        document.head.appendChild(script);
      } else {
        // Script already in DOM, wait for it
        const interval = setInterval(() => {
          if (window.google?.accounts?.id) {
            clearInterval(interval);
            initGoogleSignIn();
          }
        }, 200);
        return () => clearInterval(interval);
      }
    }
  }, [loading, initGoogleSignIn]);

  // Re-render Google button when dark mode changes
  useEffect(() => {
    if (!loading && window.google?.accounts?.id && googleBtnRef.current) {
      googleInitialized.current = false;
      initGoogleSignIn();
    }
  }, [darkMode]); // eslint-disable-line

  // ── Handle Google credential callback ───────────────────────────────────
  const handleGoogleCredential = async (googleResponse) => {
    try {
      setSigningIn(true);
      setError('');

      // Get reCAPTCHA v3 token in background
      const recaptchaToken = await executeRecaptcha('login');

      const res = await axios.post(
        `${BACKEND_URL}/api/auth/google`,
        {
          credential: googleResponse.credential,
          rememberMe: rememberMeRef.current, // use ref — state would be stale inside GIS callback
          recaptchaToken,
        },
        { withCredentials: true }
      );

      if (res.data.success) {
        setFadeOut(true);
        setTimeout(() => {
          if (onAccessGranted) onAccessGranted(res.data.user);
        }, 700);
      } else {
        setError('Authentication failed. Please try again.');
        setSigningIn(false);
      }
    } catch (err) {
      console.error('Google sign-in error:', err);
      const msg =
        err.response?.data?.error || 'Sign-in failed. Please try again.';
      setError(msg);
      setSigningIn(false);
    }
  };

  // ── Trigger Google sign-in (click handler for custom button) ─────────────
  const handleSignInClick = () => {
    if (!window.google?.accounts?.id) {
      setError('Google Sign-In is not available. Please refresh the page.');
      return;
    }
    if (!GOOGLE_CLIENT_ID) {
      setError('Google Client ID is not configured.');
      return;
    }
    // Disable one-tap and show full account chooser via prompt
    window.google.accounts.id.cancel(); // clear any pending one-tap
    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback: click the rendered button
        const gsiBtn = googleBtnRef.current?.querySelector('div[role="button"]');
        if (gsiBtn) gsiBtn.click();
      }
    });
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
        ref={loginBoxRef}
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
              {showPhases && phaseVisible && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span
                    className={`text-xl md:text-2xl font-bold uppercase ${
                      darkMode ? 'text-gray-300' : 'text-black'
                    }`}
                    style={{ opacity: phaseOpacity, transition: 'opacity 100ms ease-in-out' }}
                  >
                    {phases[currentPhase]}
                  </span>
                </div>
              )}
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
                    {/* Hidden GIS rendered button (used for callbacks) */}
                    <div ref={googleBtnRef} className="hidden" aria-hidden="true" />

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
        {!loading && (
          <footer className="relative z-10 flex-shrink-0 px-4 py-3">
            <div className={`border-t pt-3 ${darkMode ? 'border-gray-800' : 'border-gray-200/60'}`}>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-sm mx-auto sm:max-w-none sm:px-6">
                {/* Brand */}
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" className="h-4 w-4 flex-shrink-0" aria-label="Airstream logo">
                    <circle cx="250" cy="250" r="210" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" />
                    <circle cx="250" cy="172" r="30" fill={darkMode ? '#6b7280' : '#9ca3af'} />
                    <polyline points="155,218 250,330 345,218" fill="none" stroke={darkMode ? '#6b7280' : '#9ca3af'} strokeWidth="36" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className={`text-xs font-semibold tracking-widest uppercase ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
                    Airstream
                  </span>
                </div>

                {/* Desktop trust badges — hidden on mobile */}
                <div className="hidden sm:flex items-center gap-4">
                  <span className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-700' : 'text-gray-350'}`}
                    style={{ color: darkMode ? '#374151' : '#c4c9d0' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    End-to-end secure
                  </span>
                  <span style={{ color: darkMode ? '#374151' : '#c4c9d0' }} className="text-xs opacity-60">·</span>
                  <span className={`flex items-center gap-1.5 text-xs`}
                    style={{ color: darkMode ? '#374151' : '#c4c9d0' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Fast transfers
                  </span>
                  <span style={{ color: darkMode ? '#374151' : '#c4c9d0' }} className="text-xs opacity-60">·</span>
                  <span className={`flex items-center gap-1.5 text-xs`}
                    style={{ color: darkMode ? '#374151' : '#c4c9d0' }}>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    Privacy first
                  </span>
                </div>

                {/* Links */}
                <div className={`flex items-center gap-3 text-xs ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
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
            </div>
          </footer>
        )}
    </div>
  );
};

SignUp.propTypes = {
  onAccessGranted: PropTypes.func.isRequired,
  darkMode: PropTypes.bool,
};

export default SignUp;
