import React, { useState, useEffect } from 'react';

const fillerQuotes = [
  "Welcome back, operator.",
  "Standby... loading retro interface...",
  "Powering up cathode tubes...",
  "Tuning signal... please wait.",
  "The vault awaits your key...",
  "Warming up floppy disks...",
  "Dialing into the mainframe...",
  "Initiating 8-bit handshake...",
  "Generating terminal session...",
  "Booting from cassette...",
  "Please insert coin, just kidding.",
  "Decrypting nostalgia..."
];

const AccessGate = ({ children }) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [quote, setQuote] = useState('');

  useEffect(() => {
    setQuote(fillerQuotes[Math.floor(Math.random() * fillerQuotes.length)]);
    const unlockedBefore = sessionStorage.getItem('access_granted');
    if (unlockedBefore === 'true') {
      setUnlocked(true);
    } else {
      setTimeout(() => setLoading(false), 2000);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = import.meta.env.VITE_SITE_PASSKEY || 'thechosenone';
    if (passkey === correct) {
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {});
      setFadeOut(true);
      setTimeout(() => {
        setUnlocked(true);
        sessionStorage.setItem('access_granted', 'true');
      }, 500);
    } else {
      setError('Wrong Password!');
      setPasskey('');
    }
  };

  if (unlocked) return children;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-black bg-opacity-90 backdrop-blur-sm font-crt transition-all ${
        fadeOut ? 'animate-fade-out' : 'animate-flicker'
      }`}
    >
      {/* Global Site Header */}
      <h1 className="text-4xl sm:text-5xl font-vintage text-red-700 drop-shadow-lg mb-6 text-center">
        TIMELESS!!
      </h1>

      {loading ? (
        <div className="text-green-400 text-xl sm:text-2xl text-center">
          <div className="font-mono mb-2 tracking-wider animate-pulse">{quote}</div>
          <div className="font-bold">[■■■■□□□□□□]</div>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="bg-yellow-100 border-4 border-red-600 p-6 rounded-xl w-full max-w-md text-center shadow-vintage animate-retro"
        >
          <h2 className="font-crt text-xl mb-4 text-green-600 drop-shadow-[0_0_3px_#0f0]">
            Enter Passkey
          </h2>
          <input
            type="password"
            value={passkey}
            onChange={(e) => setPasskey(e.target.value)}
            className="w-full px-4 py-2 text-center font-mono bg-yellow-200 text-black border border-yellow-400 rounded mb-3 outline-none"
          />
          {error && (
            <p className="text-red-700 font-vintage mb-3 drop-shadow-sm">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="vintage-btn bg-green-600 hover:bg-green-700 w-full"
          >
            Enter
          </button>
        </form>
      )}
    </div>
  );
};

export default AccessGate;
