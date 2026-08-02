import React, { useState, useEffect } from 'react';

/* ── Sample data (illustrative — mirrors real Air features) ───────────────── */
const FILE_TYPES = [
  'PDF', 'JPG', 'MP4', 'ZIP', 'DOCX', 'PNG', 'CSV', 'SVG', 'MP3', 'GIF',
];

const FOLDER_SAMPLES = [
  { name: 'Photos', color: '#3b82f6', count: 128 },
  { name: 'Work Docs', color: '#f97316', count: 42 },
  { name: 'Invoices', color: '#22c55e', count: 16 },
  { name: 'Family', color: '#ec4899', count: 84 },
];

/* ── Icons ──────────────────────────────────────────────────────────────── */
const FolderGlyph = ({ color = '#6366f1', className = 'w-8 h-8' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M3 7C3 5.89543 3.89543 5 5 5H10.5858C10.851 5 11.1054 5.10536 11.2929 5.29289L12.7071 6.70711C12.8946 6.89464 13.149 7 13.4142 7H19C20.1046 7 21 7.89543 21 9V17C21 18.1046 20.1046 19 19 19H5C3.89543 19 3 18.1046 3 17V7Z"
      fill={color} fillOpacity="0.25" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
    />
    <path d="M3 10H21" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const UploadGlyph = ({ className = 'h-6 w-6' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

const CheckGlyph = ({ className = 'h-4 w-4' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

const DeviceGlyph = ({ type, className }) => {
  if (type === 'laptop') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="3" y="4" width="18" height="12" rx="1.5" strokeWidth="1.5" />
      <path d="M2 18h20" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (type === 'phone') return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="7" y="2" width="10" height="20" rx="2" strokeWidth="1.5" />
      <path d="M11 18h2" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <rect x="4" y="3" width="16" height="18" rx="1.5" strokeWidth="1.5" />
    </svg>
  );
};

const FileTypeIcon = ({ className = 'h-5 w-5' }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

/* ── Small building blocks ─────────────────────────────────────────────── */
const Eyebrow = ({ children, darkMode }) => (
  <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest ${
    darkMode ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-red-500/25 bg-red-50 text-red-600'
  }`}>
    <span className={`h-1.5 w-1.5 rounded-full air-pulse-dot ${darkMode ? 'bg-blue-400' : 'bg-red-500'}`} />
    {children}
  </div>
);

const CheckItem = ({ children, darkMode }) => (
  <li className={`flex items-center gap-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
    <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
      <CheckGlyph className="h-3 w-3" />
    </span>
    {children}
  </li>
);

/* ── Live-coded feature previews (non-interactive demos) ───────────────── */
const UploadPreview = ({ darkMode }) => (
  <div aria-hidden="true" className={`rounded-2xl border-2 border-dashed p-5 sm:p-6 ${
    darkMode ? 'border-blue-500/40 bg-blue-500/5' : 'border-red-400/50 bg-red-50/60'
  }`}>
    <div className="flex flex-col items-center gap-2 pb-5 text-center">
      <div className={`flex h-12 w-12 items-center justify-center rounded-full ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
        <UploadGlyph className="h-6 w-6" />
      </div>
      <p className={`text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Drag and drop files or click to browse</p>
      <p className={`text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>Up to 10 files at once</p>
    </div>
    <div className={`rounded-xl border p-3.5 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-center justify-between gap-3">
        <p className={`truncate text-sm font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>vacation-photos.zip</p>
        <span className={`flex-shrink-0 font-mono text-xs font-semibold ${darkMode ? 'text-blue-400' : 'text-red-600'}`}>72%</span>
      </div>
      <p className={`mt-0.5 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>128&nbsp;MB · 12 seconds left</p>
      <div className={`mt-2.5 h-2 w-full overflow-hidden rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className={`relative h-full w-[72%] overflow-hidden rounded-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`}>
          <div className="air-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
        </div>
      </div>
    </div>
  </div>
);

const FoldersPreview = ({ darkMode }) => (
  <div aria-hidden="true" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {FOLDER_SAMPLES.map((f) => (
      <div key={f.name} className={`flex flex-col items-center gap-2 rounded-xl border p-4 text-center transition-transform hover:-translate-y-0.5 ${
        darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'
      }`}>
        <FolderGlyph color={f.color} className="h-9 w-9" />
        <span className={`w-full truncate text-xs font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>{f.name}</span>
        <span className={`font-mono text-[11px] ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>{f.count} files</span>
      </div>
    ))}
  </div>
);

const SyncPreview = ({ darkMode }) => (
  <div aria-hidden="true" className={`rounded-2xl border p-5 sm:p-6 ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}>
    <div className="flex items-center justify-between gap-1">
      {['laptop', 'phone', 'tablet'].map((d, i) => (
        <React.Fragment key={d}>
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
            <DeviceGlyph type={d} className="h-5 w-5" />
          </div>
          {i < 2 && (
            <div className="relative mx-1 h-px flex-1">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`} />
              <div className={`air-pulse-dot absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ${darkMode ? 'bg-blue-400' : 'bg-red-500'}`} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
    <div className="mt-5 flex items-center gap-2">
      <span className={`air-pulse-dot h-2 w-2 rounded-full ${darkMode ? 'bg-green-400' : 'bg-green-500'}`} />
      <p className={`font-mono text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>All devices synced · just now</p>
    </div>
  </div>
);

const Marquee = ({ darkMode }) => (
  <div className={`relative overflow-hidden border-y py-4 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`} aria-hidden="true">
    <div className="air-marquee flex w-max gap-3">
      {[...FILE_TYPES, ...FILE_TYPES].map((ext, i) => (
        <span
          key={i}
          className={`flex-shrink-0 rounded-full border px-4 py-1.5 font-mono text-xs font-semibold tracking-wide ${
            darkMode ? 'border-gray-800 bg-gray-900 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-500'
          }`}
        >
          .{ext}
        </span>
      ))}
    </div>
  </div>
);

/* ── Hero "live window" mockup — the signature element ─────────────────── */
const HeroWindow = ({ darkMode }) => (
  <div className="relative mx-auto max-w-md lg:mx-0 lg:max-w-none" aria-hidden="true">
    {/* Scattered file-type stickers */}
    <span className={`air-float-a absolute -top-5 -left-4 z-20 -rotate-6 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold shadow-lg sm:-left-8 ${
      darkMode ? 'border-gray-700 bg-gray-900 text-blue-300' : 'border-gray-200 bg-white text-red-500'
    }`}>.PDF</span>
    <span className={`air-float-b absolute -right-2 top-10 z-20 rotate-6 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold shadow-lg sm:-right-6 ${
      darkMode ? 'border-gray-700 bg-gray-900 text-blue-300' : 'border-gray-200 bg-white text-red-500'
    }`}>.MP4</span>
    <span className={`air-float-c absolute -bottom-4 left-6 z-20 rotate-3 rounded-lg border px-3 py-1.5 font-mono text-xs font-bold shadow-lg ${
      darkMode ? 'border-gray-700 bg-gray-900 text-blue-300' : 'border-gray-200 bg-white text-red-500'
    }`}>.ZIP</span>

    {/* Tilted window */}
    <div
      className={`air-tilt relative z-10 overflow-hidden rounded-2xl border ${darkMode ? 'border-gray-700 bg-gray-900' : 'border-gray-200 bg-white'}`}
      style={{ boxShadow: darkMode ? '0 24px 70px -20px rgba(37,99,235,0.35), 0 10px 26px -10px rgba(0,0,0,0.5)' : '0 24px 70px -20px rgba(220,38,38,0.25), 0 10px 26px -10px rgba(0,0,0,0.18)' }}
    >
      {/* Chrome bar */}
      <div className={`flex items-center gap-1.5 border-b px-4 py-3 ${darkMode ? 'border-gray-800' : 'border-gray-100'}`}>
        <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <span className={`ml-3 truncate rounded-md px-2.5 py-1 font-mono text-[11px] ${darkMode ? 'bg-gray-800 text-gray-400' : 'bg-gray-50 text-gray-400'}`}>
          air.app/dashboard
        </span>
      </div>

      <div className="space-y-3.5 p-4 sm:p-5">
        {/* Folder chip row */}
        <div className="flex gap-2 overflow-hidden">
          {FOLDER_SAMPLES.slice(0, 3).map((f) => (
            <span key={f.name} className={`flex flex-shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
              darkMode ? 'border-gray-700 bg-gray-800 text-gray-300' : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              <FolderGlyph color={f.color} className="h-3.5 w-3.5" />
              {f.name}
            </span>
          ))}
        </div>

        {/* Mini upload row */}
        <div className={`rounded-lg border p-3 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-100 bg-gray-50'}`}>
          <div className="flex items-center justify-between text-xs">
            <span className={`truncate font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>brand-assets.zip</span>
            <span className={`font-mono ${darkMode ? 'text-blue-400' : 'text-red-600'}`}>86%</span>
          </div>
          <div className={`mt-2 h-1.5 rounded-full ${darkMode ? 'bg-gray-800' : 'bg-gray-200'}`}>
            <div className={`h-full w-[86%] rounded-full ${darkMode ? 'bg-blue-500' : 'bg-red-500'}`} />
          </div>
        </div>

        {/* File rows */}
        {[{ name: 'moodboard.png', size: '4.2 MB' }, { name: 'q3-report.pdf', size: '1.1 MB' }].map((file) => (
          <div key={file.name} className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileTypeIcon className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <span className={`truncate text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>{file.name}</span>
            </div>
            <span className={`flex-shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold ${darkMode ? 'bg-green-500/15 text-green-400' : 'bg-green-100 text-green-700'}`}>
              synced
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ── Ambient background decoration (kept from the original brand system) ── */
const useDecorations = (darkMode) => {
  const [decorations, setDecorations] = useState([]);
  useEffect(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      items.push({
        key: `dot-${i}`, type: 'dot',
        size: Math.floor(Math.random() * 6) + 2,
        top: Math.floor(Math.random() * 100), left: Math.floor(Math.random() * 100),
        delay: Math.random() * 5,
      });
    }
    for (let i = 0; i < 5; i++) {
      items.push({
        key: `blob-${i}`, type: 'blob',
        size: Math.floor(Math.random() * 150) + 60,
        top: Math.floor(Math.random() * 100), left: Math.floor(Math.random() * 100),
        delay: Math.random() * 10,
      });
    }
    setDecorations(items);
  }, []);

  return decorations.map((d) => {
    if (d.type === 'blob') {
      return (
        <div key={d.key} className={`air-blob absolute rounded-full opacity-20 blur-xl ${darkMode ? 'bg-blue-500/40' : 'bg-red-500/30'}`}
          style={{ width: `${d.size}px`, height: `${d.size}px`, top: `${d.top}%`, left: `${d.left}%`, animationDelay: `${d.delay}s` }} />
      );
    }
    return (
      <div key={d.key} className={`air-float-tiny absolute rounded-full ${darkMode ? 'bg-blue-400/25' : 'bg-red-400/25'}`}
        style={{ width: `${d.size}px`, height: `${d.size}px`, top: `${d.top}%`, left: `${d.left}%`, animationDelay: `${d.delay}s` }} />
    );
  });
};

/* ── Main component ────────────────────────────────────────────────────── */
const Homepage = ({ isLoggedIn = false }) => {
  const [darkMode, setDarkMode] = useState(false);
  const decorations = useDecorations(darkMode);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(mq.matches);
    const handleChange = (e) => setDarkMode(e.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const handleDashboardClick = () => {
    window.location.href = isLoggedIn ? '/dashboard' : '/signup';
  };

  return (
    <div className={`relative min-h-screen overflow-x-hidden transition-colors duration-500 ${darkMode ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}
      style={{ fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif" }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        @keyframes air-blob-move { 0% { transform: scale(1) translate(0,0);} 33% { transform: scale(1.1) translate(30px,-16px);} 66% { transform: scale(0.9) translate(-16px,30px);} 100% { transform: scale(1) translate(0,0);} }
        .air-blob { animation: air-blob-move 22s ease-in-out infinite; }

        @keyframes air-float-move { 0%, 100% { transform: translateY(0);} 50% { transform: translateY(-16px);} }
        .air-float-tiny { animation: air-float-move 8s ease-in-out infinite; }

        @keyframes air-tilt-move { 0%, 100% { transform: perspective(1200px) rotateY(-6deg) rotateX(2deg) translateY(0);} 50% { transform: perspective(1200px) rotateY(-6deg) rotateX(2deg) translateY(-10px);} }
        .air-tilt { animation: air-tilt-move 7s ease-in-out infinite; }

        @keyframes air-float-a-move { 0%, 100% { transform: rotate(-6deg) translateY(0);} 50% { transform: rotate(-6deg) translateY(-8px);} }
        .air-float-a { animation: air-float-a-move 5s ease-in-out infinite; }
        @keyframes air-float-b-move { 0%, 100% { transform: rotate(6deg) translateY(0);} 50% { transform: rotate(6deg) translateY(-10px);} }
        .air-float-b { animation: air-float-b-move 6s ease-in-out infinite 0.5s; }
        @keyframes air-float-c-move { 0%, 100% { transform: rotate(3deg) translateY(0);} 50% { transform: rotate(3deg) translateY(-7px);} }
        .air-float-c { animation: air-float-c-move 5.5s ease-in-out infinite 1s; }

        @keyframes air-shimmer-move { 0% { transform: translateX(-100%);} 100% { transform: translateX(100%);} }
        .air-shimmer { animation: air-shimmer-move 1.8s ease-in-out infinite; }

        @keyframes air-pulse-dot-move { 0%, 100% { opacity: 0.5; transform: scale(0.85);} 50% { opacity: 1; transform: scale(1.15);} }
        .air-pulse-dot { animation: air-pulse-dot-move 2s ease-in-out infinite; }

        @keyframes air-marquee-move { 0% { transform: translateX(0);} 100% { transform: translateX(-50%);} }
        .air-marquee { animation: air-marquee-move 26s linear infinite; }

        @media (prefers-reduced-motion: reduce) {
          .air-blob, .air-float-tiny, .air-tilt, .air-float-a, .air-float-b, .air-float-c, .air-shimmer, .air-pulse-dot, .air-marquee {
            animation: none !important;
          }
        }
      `}</style>

      {/* Skip link */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {decorations}
        <div className="absolute inset-0" style={{
          backgroundImage: darkMode
            ? 'linear-gradient(to right, rgba(66,135,245,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(66,135,245,0.15) 1px, transparent 1px)'
            : 'linear-gradient(to right, rgba(139,0,0,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(139,0,0,0.12) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
        }} />
        <div className={`absolute -top-10 left-0 h-64 w-64 -translate-x-1/2 rounded-full blur-3xl ${darkMode ? 'bg-blue-600/10' : 'bg-red-600/10'}`} />
        <div className={`absolute bottom-0 right-0 h-80 w-80 translate-x-1/3 translate-y-1/3 rounded-full blur-3xl ${darkMode ? 'bg-blue-600/10' : 'bg-red-600/10'}`} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2.5">
          <img src="air.png" alt="Airstream" className="h-12 w-12 rounded-lg sm:h-14 sm:w-14" />
          <span className="text-2xl font-black tracking-tight sm:text-3xl">AIRSTREAM</span>
        </div>
        <button
          onClick={handleDashboardClick}
          className={`hidden rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:inline-flex ${
            darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500' : 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500'
          }`}
        >
          {isLoggedIn ? 'Open Dashboard' : 'Sign Up Free'}
        </button>
      </nav>

      <main id="main-content">
        {/* Hero */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-10 sm:pt-14 lg:pb-28">
          <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
            <div className="text-center lg:text-left">
              <Eyebrow darkMode={darkMode}>Personal cloud storage</Eyebrow>
              <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Upload.{' '}
                <span className={darkMode ? 'text-blue-400' : 'text-red-600'}>Organize.</span>
                <br />
                Access anywhere.
              </h1>
              <p className={`mx-auto mt-6 max-w-lg text-lg leading-relaxed lg:mx-0 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Air keeps every file exactly where you left it — drag files in, sort them into
                color-coded folders, and pick up on any device without missing a beat.
              </p>

              <ul className="mx-auto mt-7 grid max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2 lg:mx-0">
                <CheckItem darkMode={darkMode}>Drag &amp; drop uploads</CheckItem>
                <CheckItem darkMode={darkMode}>Color-coded folders</CheckItem>
                <CheckItem darkMode={darkMode}>Resumes interrupted uploads</CheckItem>
                <CheckItem darkMode={darkMode}>Synced in real time</CheckItem>
              </ul>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <button
                  onClick={handleDashboardClick}
                  className={`w-full rounded-md px-8 py-3.5 text-lg font-semibold shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 sm:w-auto ${
                    darkMode ? 'bg-blue-600 text-white hover:bg-blue-500 focus-visible:ring-blue-500' : 'bg-red-600 text-white hover:bg-red-500 focus-visible:ring-red-500'
                  }`}
                >
                  {isLoggedIn ? 'Open Dashboard' : 'Get Started Free'}
                </button>
                <span className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>No credit card required</span>
              </div>
            </div>

            <HeroWindow darkMode={darkMode} />
          </div>
        </section>

        {/* Marquee */}
        <Marquee darkMode={darkMode} />

        {/* Features */}
        <section className={`relative z-10 px-6 py-20 sm:py-24 ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto max-w-2xl text-center">
              <Eyebrow darkMode={darkMode}>Key features</Eyebrow>
              <h2 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Built around how you actually use files
              </h2>
            </div>

            <div className="mt-14 grid grid-cols-1 gap-6">
              {/* Upload — full width */}
              <div className={`grid gap-8 rounded-2xl border p-6 sm:p-8 lg:grid-cols-2 lg:items-center lg:gap-12 ${
                darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'
              }`}>
                <div>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
                    <UploadGlyph />
                  </div>
                  <h3 className="text-2xl font-bold">Upload Files</h3>
                  <p className={`mt-3 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Drag files anywhere on the page or click to browse. Air uploads up to 10 files
                    at once and picks up right where you left off if your connection drops.
                  </p>
                </div>
                <UploadPreview darkMode={darkMode} />
              </div>

              {/* Folders + Sync — two columns */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className={`rounded-2xl border p-6 sm:p-8 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'}`}>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
                    <FolderGlyph color={darkMode ? '#60a5fa' : '#dc2626'} className="h-6 w-6" />
                  </div>
                  <h3 className="text-2xl font-bold">Folders</h3>
                  <p className={`mt-3 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Sort files into color-coded folders the moment you upload them, so your
                    Photos, Invoices, and Work Docs never mix.
                  </p>
                  <div className="mt-6">
                    <FoldersPreview darkMode={darkMode} />
                  </div>
                </div>

                <div className={`rounded-2xl border p-6 sm:p-8 ${darkMode ? 'border-gray-700 bg-gray-800/60' : 'border-gray-200 bg-white'}`}>
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${darkMode ? 'bg-blue-500/15 text-blue-400' : 'bg-red-500/10 text-red-500'}`}>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold">Seamless Sync</h3>
                  <p className={`mt-3 leading-relaxed ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Every upload appears on your other devices in real time, so you're always
                    looking at the same files no matter where you check.
                  </p>
                  <div className="mt-6">
                    <SyncPreview darkMode={darkMode} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="relative z-10 mx-auto max-w-7xl px-6 py-20 sm:py-24">
          <div className={`relative overflow-hidden rounded-3xl p-10 text-center sm:p-16 ${darkMode ? 'bg-blue-600' : 'bg-red-600'}`}>
            <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-25">
              <div className="air-blob absolute -top-10 left-10 h-56 w-56 rounded-full bg-white blur-3xl" />
              <div className="air-blob absolute -bottom-16 right-10 h-64 w-64 rounded-full bg-white blur-3xl" style={{ animationDelay: '4s' }} />
            </div>
            <div className="relative">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">Ready to get your files in order?</h2>
              <p className="mx-auto mt-4 max-w-xl text-lg text-white/90">
                Open your dashboard and start uploading, organizing, and syncing — free.
              </p>
              <button
                onClick={handleDashboardClick}
                className="mt-8 rounded-md bg-white px-8 py-3.5 text-lg font-semibold text-gray-900 shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2"
              >
                {isLoggedIn ? 'Go to Dashboard' : 'Get Started Free'}
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 border-t px-6 py-10 ${darkMode ? 'border-gray-800 bg-gray-950' : 'border-gray-200 bg-white'}`}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img src="air.png" alt="Airstream" className="h-9 w-9 rounded-lg" />
            <span className="text-lg font-bold tracking-tight">Airstream</span>
          </div>
          <div className={`flex items-center gap-4 text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
            <a href="https://quickwitty.onrender.com/contacts" target="_blank" rel="noopener noreferrer" className={`transition-colors ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}>Contact</a>
            <span className="opacity-40">·</span>
            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className={`transition-colors ${darkMode ? 'hover:text-gray-300' : 'hover:text-gray-600'}`}>Privacy</a>
            <span className="opacity-40">·</span>
            <span>© {new Date().getFullYear()} Airstream Cloud</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
