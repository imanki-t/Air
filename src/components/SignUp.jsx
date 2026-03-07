// src/components/SignUp.jsx
// Auth flow changed from GIS One Tap (id_token) to OAuth2 code flow.
// This lets us request Google Drive scopes (drive.file) at the same moment
// as identity verification, so no separate "Connect Drive" step is needed.
//
// google.accounts.oauth2.initCodeClient sends an authorization code to the
// backend, which exchanges it for access_token + refresh_token + id_token.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';

const BACKEND_URL       = import.meta.env.VITE_BACKEND_URL;
const GOOGLE_CLIENT_ID  = import.meta.env.VITE_GOOGLE_CLIENT_ID;
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
    if (!window.grecaptcha || !RECAPTCHA_SITE_KEY) { resolve(''); return; }
    window.grecaptcha.ready(() => {
      window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(() => resolve(''));
    });
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// SignUp (AccessGate) component
// ─────────────────────────────────────────────────────────────────────────────
const SignUp = ({ onAccessGranted, darkMode: parentDarkMode }) => {
  const [error, setError]       = useState('');
  const [fadeOut, setFadeOut]   = useState(false);
  const [loading, setLoading]   = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [darkMode, setDarkMode] = useState(parentDarkMode ?? false);
  const [rememberMe, setRememberMe] = useState(false);

  // ref so GIS callback (which closes over state) always reads the live value
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
    const handleChange = (e) => { if (parentDarkMode === undefined) setDarkMode(e.matches); };
    mq.addEventListener('change', handleChange);

    const loadingEndTimer = setTimeout(() => setLoading(false), 2000);
    return () => { clearTimeout(loadingEndTimer); mq.removeEventListener('change', handleChange); };
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
    // codeResponse.code is the authorization code
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
          code:         codeResponse.code,
          rememberMe:   rememberMeRef.current,
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
      client_id:  GOOGLE_CLIENT_ID,
      scope:      DRIVE_SCOPES,
      ux_mode:    'popup',
      callback:   handleCodeResponse,
      // error_callback fires if the popup is dismissed or an OAuth error occurs
      error_callback: (err) => {
        console.error('OAuth2 error:', err);
        if (err?.type !== 'popup_closed') {
          setError('Sign-in failed. Please try again.');
        }
        setSigningIn(false);
      },
    });
  }, [handleCodeResponse]);

  // Load GIS script
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

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
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

      {/* Header */}
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
                  ? 'bg-gradient-to-r from-blue-400 to-blue-200'
                  : 'bg-gradient-to-r from-red-700 to-red-400'
              }`}
            >
              Airstream
            </span>
          </h1>
        </div>

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode((d) => !d)}
          className={`p-2 rounded-lg transition-colors ${
            darkMode
              ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.36-.71.71M6.34 17.66l-.71.71M17.66 17.66l.71.71M6.34 6.34l.71.71M12 5a7 7 0 100 14A7 7 0 0012 5z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {loading ? (
          /* Loading spinner */
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-12 h-12 rounded-full border-4 border-t-transparent animate-spin ${
                darkMode ? 'border-blue-500' : 'border-red-500'
              }`}
            />
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading…</p>
          </div>
        ) : (
          <div className="w-full max-w-sm">
            {/* Login card */}
            <div
              className={`rounded-xl overflow-hidden shadow-2xl ${
                darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
              }`}
            >
              {/* Accent bar */}
              <div className={`h-1 w-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`} />

              <div className="p-6 pt-8">
                <div className="text-center mb-6">
                  <h2 className={`text-xl font-semibold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    SECURE ACCESS
                  </h2>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sign in with Google to access your files stored in your own Google Drive
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                )}

                {/* Google Sign-In button */}
                <div className="space-y-3">
                  <button
                    onClick={handleSignInClick}
                    disabled={signingIn}
                    className={`w-full flex items-center justify-center gap-3 py-3 px-4 rounded-md border font-medium text-sm transition-all duration-200 ${
                      signingIn
                        ? darkMode
                          ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                        : darkMode
                        ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600 hover:border-gray-500 active:scale-[0.99]'
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
                      /* Google G logo */
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
                          ? darkMode ? 'bg-blue-600 border-blue-600' : 'bg-red-500 border-red-500'
                          : darkMode ? 'border-gray-500' : 'border-gray-300'
                      }`}
                    >
                      {rememberMe && (
                        <svg className="w-2.5 h-2.5 text-white absolute inset-0 m-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="text-xs">Remember me for 30 days</span>
                  </label>
                </div>

                {/* Drive permission notice */}
                <div className={`mt-4 p-3 rounded-lg text-xs ${darkMode ? 'bg-gray-700/50 text-gray-400' : 'bg-gray-50 text-gray-500'}`}>
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>
                      Airstream will request permission to create and manage files in your Google Drive. Only files created by Airstream will be accessible.
                    </span>
                  </div>
                </div>

                {/* Feature highlights */}
                <div className={`mt-5 pt-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: '☁️', label: 'Your Drive storage' },
                      { icon: '🔗', label: 'Shareable links' },
                      { icon: '📁', label: 'Folder organiser' },
                      { icon: '📦', label: 'Export & import' },
                    ].map(({ icon, label }) => (
                      <div
                        key={label}
                        className={`flex items-center gap-1.5 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
                      >
                        <span>{icon}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy note */}
            <p className={`text-center text-xs mt-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`}>
              By continuing you agree to our terms of service and privacy policy.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

SignUp.propTypes = {
  onAccessGranted: PropTypes.func,
  darkMode:        PropTypes.bool,
};

export default SignUp;
