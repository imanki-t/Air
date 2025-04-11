import React, { useState, useEffect } from 'react';

const AccessGate = ({ children }) => {
  const [passkey, setPasskey] = useState('');
  const [error, setError] = useState('');
  const [fadeOut, setFadeOut] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const unlockedBefore = sessionStorage.getItem('access_granted');
    if (unlockedBefore === 'true') setUnlocked(true);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const correct = import.meta.env.VITE_SITE_PASSKEY;
    if (passkey === correct) {
      const audio = new Audio('/access-granted.mp3');
      audio.play().catch(() => {}); // ignore autoplay errors

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
    <div className={`fixed inset-0 bg-black flex items-center justify-center z-50 p-4 transition-all ${fadeOut ? 'animate-fade-out' : ''}`}>
      <form
        onSubmit={handleSubmit}
        className="bg-yellow-100 border-4 border-purple-600 p-6 rounded-xl w-full max-w-md text-center shadow-vintage animate-retro"
      >
        <h2 className="font-crt text-2xl mb-4 text-green-500 drop-shadow-[0_0_3px_#0f0]">
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
    </div>
  );
};

export default AccessGate;
