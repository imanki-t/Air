import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─── Custom themed video player ───────────────────────────────────────────────
const CustomVideoPlayer = ({ src }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const speedMenuRef = useRef(null);
  const skipMenuRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [skipAmount, setSkipAmount] = useState(10);
  const [showSkipMenu, setShowSkipMenu] = useState(false);
  const [skipFlash, setSkipFlash] = useState(null); // 'fwd' | 'bwd' | null
  const hideTimer = useRef(null);

  const SPEEDS = [0.25, 0.5, 1, 1.5, 2];
  const SKIPS = [3, 5, 10, 20, 30];

  const resetHideTimer = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (playing) setShowControls(false); }, 2500);
  };

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target)) setShowSpeedMenu(false);
      if (skipMenuRef.current && !skipMenuRef.current.contains(e.target)) setShowSkipMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) { videoRef.current.play(); } else { videoRef.current.pause(); }
  };
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length > 0)
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
  };
  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (videoRef.current) videoRef.current.currentTime = val;
  };
  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val); setMuted(val === 0);
    if (videoRef.current) { videoRef.current.volume = val; videoRef.current.muted = val === 0; }
  };
  const toggleMute = () => {
    if (!videoRef.current) return;
    const next = !muted; setMuted(next);
    videoRef.current.muted = next;
  };
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen?.();
    else document.exitFullscreen?.();
  };
  const setPlaybackSpeed = (s) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };
  const doSkip = (dir) => {
    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + dir * skipAmount));
    setSkipFlash(dir > 0 ? 'fwd' : 'bwd');
    setTimeout(() => setSkipFlash(null), 600);
  };
  const fmtTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60).toString().padStart(2, '0');
    return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s}` : `${m}:${s}`;
  };
  const prog = duration > 0 ? currentTime : 0;
  const buf = duration > 0 ? (buffered / duration) * 100 : 0;

  return (
    <div ref={containerRef}
      className="relative rounded-xl overflow-hidden shadow-2xl border border-blue-900/40 w-full max-w-3xl"
      style={{ background: '#0a0f1e' }}
      onMouseMove={resetHideTimer} onMouseLeave={() => playing && setShowControls(false)}>
      {/* Video */}
      <video ref={videoRef} src={src} crossOrigin="use-credentials"
        className="w-full block" style={{ maxHeight: 'calc(100vh - 200px)', background: '#000', display: 'block' }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={() => { if (videoRef.current) setDuration(videoRef.current.duration); }}
        onPlay={() => { setPlaying(true); resetHideTimer(); }}
        onPause={() => { setPlaying(false); setShowControls(true); clearTimeout(hideTimer.current); }}
        onEnded={() => { setPlaying(false); setShowControls(true); }}
        onClick={togglePlay} />

      {/* Skip flash overlay */}
      {skipFlash && (
        <div className="absolute inset-0 pointer-events-none flex items-center" style={{ paddingBottom: '64px' }}>
          <div className={`absolute flex flex-col items-center gap-1 transition-opacity ${skipFlash ? 'opacity-100' : 'opacity-0'}`}
            style={{ [skipFlash === 'fwd' ? 'right' : 'left']: '15%', transform: 'translateX(0)' }}>
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(59,130,246,0.25)', backdropFilter: 'blur(4px)' }}>
              {skipFlash === 'fwd'
                ? <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/><text x="7.5" y="14.5" fontSize="5" fill="white" fontWeight="bold">{skipAmount}</text></svg>
                : <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 13c0 3.31 2.69 6 6 6s6-2.69 6-6-2.69-6-6-6v4l-5-5 5-5v4c4.42 0 8 3.58 8 8s-3.58 8-8 8-8-3.58-8-8h2z"/><text x="7.5" y="14.5" fontSize="5" fill="white" fontWeight="bold">{skipAmount}</text></svg>}
            </div>
            <span className="text-white text-xs font-medium" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.8)' }}>
              {skipFlash === 'fwd' ? `+${skipAmount}s` : `-${skipAmount}s`}
            </span>
          </div>
        </div>
      )}

      {/* Centre play overlay */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ paddingBottom: '64px' }}>
          <div className="w-16 h-16 rounded-full bg-blue-600/80 backdrop-blur-sm border border-blue-400/40 flex items-center justify-center shadow-xl shadow-blue-900/60">
            <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'linear-gradient(to top, rgba(10,15,30,0.98) 0%, rgba(10,15,30,0.6) 70%, transparent 100%)', paddingTop: '48px' }}>
        <div className="relative px-3 pb-3">

          {/* ── Seek bar ── */}
          <div className="relative flex items-center mb-2.5" style={{ height: '16px' }}>
            {/* Track background */}
            <div className="absolute inset-x-0 rounded-full pointer-events-none" style={{ height: '4px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(30,58,138,0.6)' }} />
            {/* Buffered fill */}
            <div className="absolute rounded-full pointer-events-none" style={{ height: '4px', top: '50%', transform: 'translateY(-50%)', left: 0, width: `${buf}%`, background: 'rgba(59,130,246,0.3)' }} />
            {/* Played fill */}
            <div className="absolute rounded-full pointer-events-none" style={{ height: '4px', top: '50%', transform: 'translateY(-50%)', left: 0, width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%', background: '#3b82f6' }} />
            {/* Thumb dot */}
            <div className="absolute w-3.5 h-3.5 rounded-full pointer-events-none" style={{
              top: '50%', transform: 'translate(-50%, -50%)',
              left: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%',
              background: '#fff', border: '2px solid #60a5fa',
              boxShadow: '0 0 6px rgba(96,165,250,0.6)'
            }} />
            {/* Invisible range input (handles all interaction) */}
            <input
              type="range" min="0" max={duration || 0} step="0.01"
              value={currentTime}
              onChange={handleSeek}
              onMouseDown={resetHideTimer}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
              style={{ height: '100%' }}
            />
          </div>

          {/* ── Buttons row ── */}
          <div className="flex items-center gap-2">

            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-white/90 hover:text-white transition-colors flex-shrink-0">
              {playing
                ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
            </button>

            {/* Skip backward */}
            <button onClick={() => doSkip(-1)} className="text-white/70 hover:text-white transition-colors flex-shrink-0" title={`-${skipAmount}s`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
            </button>

            {/* Skip forward */}
            <button onClick={() => doSkip(1)} className="text-white/70 hover:text-white transition-colors flex-shrink-0" title={`+${skipAmount}s`}>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
              </svg>
            </button>

            {/* Skip amount selector */}
            <div className="relative flex-shrink-0" ref={skipMenuRef}>
              <button
                onClick={() => { setShowSkipMenu(p => !p); setShowSpeedMenu(false); }}
                className="text-white/50 hover:text-white/80 transition-colors text-xs font-mono tabular-nums px-1.5 py-0.5 rounded border border-white/10 hover:border-white/25"
                title="Skip duration"
              >
                {skipAmount}s
              </button>
              {showSkipMenu && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 rounded-lg overflow-hidden shadow-2xl border border-blue-800/50 flex flex-col"
                  style={{ background: '#0d1529', minWidth: '52px' }}>
                  {SKIPS.map(s => (
                    <button key={s} onClick={() => { setSkipAmount(s); setShowSkipMenu(false); }}
                      className={`px-3 py-1.5 text-xs font-mono text-left transition-colors ${skipAmount === s ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-blue-900/50 hover:text-white'}`}>
                      {s}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button onClick={toggleMute} className="text-white/70 hover:text-white transition-colors">
                {muted || volume === 0
                  ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
                  : volume < 0.5
                  ? <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.5 12A4.5 4.5 0 0016 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z"/></svg>
                  : <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
                onChange={handleVolume} className="w-14 cursor-pointer" style={{ accentColor: '#3b82f6', height: '3px' }} />
            </div>

            {/* Time */}
            <span className="text-white/55 text-xs font-mono tabular-nums flex-shrink-0">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>

            <div className="flex-grow" />

            {/* Speed selector */}
            <div className="relative flex-shrink-0" ref={speedMenuRef}>
              <button
                onClick={() => { setShowSpeedMenu(p => !p); setShowSkipMenu(false); }}
                className={`text-xs font-bold tabular-nums px-2 py-0.5 rounded border transition-all ${showSpeedMenu ? 'bg-blue-600 border-blue-500 text-white' : 'text-white/70 hover:text-white border-white/15 hover:border-white/30 hover:bg-white/5'}`}
                title="Playback speed"
              >
                {speed === 1 ? '1×' : `${speed}×`}
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 rounded-lg overflow-hidden shadow-2xl border border-blue-800/50 flex flex-col"
                  style={{ background: '#0d1529', minWidth: '60px' }}>
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => setPlaybackSpeed(s)}
                      className={`px-3 py-1.5 text-xs font-bold text-left transition-colors ${speed === s ? 'bg-blue-600 text-white' : 'text-white/70 hover:bg-blue-900/50 hover:text-white'}`}>
                      {s === 1 ? '1×' : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-white/70 hover:text-white transition-colors flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Custom themed audio player ───────────────────────────────────────────────
const CustomAudioPlayer = ({ src, filename, fileSize }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) audioRef.current.play(); else audioRef.current.pause();
  };
  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioRef.current.currentTime = pct * duration;
  };
  const handleVolume = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val); setMuted(val === 0);
    if (audioRef.current) { audioRef.current.volume = val; audioRef.current.muted = val === 0; }
  };
  const toggleMute = () => {
    if (!audioRef.current) return;
    const next = !muted; setMuted(next); audioRef.current.muted = next;
  };
  const fmtSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024, sizes = ['B','KB','MB','GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };
  const fmtTime = (t) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };
  const prog = duration ? (currentTime / duration) * 100 : 0;
  // Decorative waveform bars — heights driven by sine so they look alive
  const bars = Array.from({ length: 36 }, (_, i) => i);

  return (
    <div className="w-full max-w-sm rounded-2xl overflow-hidden border border-blue-900/40 shadow-2xl shadow-blue-950/60" style={{
      background: '#080e1c',
      backgroundImage: 'linear-gradient(rgba(59,130,246,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.07) 1px, transparent 1px)',
      backgroundSize: '22px 22px',
    }}>
      {/* Album art area */}
      <div className="px-6 pt-7 pb-4 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center border border-blue-500/25 shadow-xl shadow-blue-950/60 mb-4"
          style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%)' }}>
          <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
          </svg>
        </div>
        <p className="text-white text-sm font-semibold text-center truncate w-full mb-0.5" title={filename}>{filename}</p>
        {fileSize > 0 && <p className="text-blue-400/60 text-xs">{fmtSize(fileSize)}</p>}
      </div>

      {/* Waveform visualizer (decorative) */}
      <div className="px-6 mb-3 flex items-end justify-center gap-0.5 h-10">
        {bars.map((i) => {
          const rawH = Math.sin(i * 0.72 + currentTime * 6) * 0.5 + 0.5;
          const h = playing ? Math.max(0.15, rawH) : 0.18 + (Math.sin(i * 0.5) * 0.05);
          const played = (i / bars.length) * 100 < prog;
          return (
            <div key={i} className="w-1 rounded-sm transition-all duration-75" style={{
              height: `${Math.round(h * 100)}%`,
              backgroundColor: played ? '#3b82f6' : '#1e3a5f',
              opacity: played ? 1 : 0.55,
            }} />
          );
        })}
      </div>

      {/* Seek bar */}
      <div className="px-6 mb-1">
        <div className="relative h-1 rounded-full cursor-pointer" style={{ background: '#0f1e3a' }} onClick={handleSeek}>
          <div className="absolute inset-y-0 left-0 bg-blue-500 rounded-full" style={{ width: `${prog}%` }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 border-blue-400 shadow"
            style={{ left: `calc(${prog}% - 6px)` }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-blue-400/60 text-xs font-mono">{fmtTime(currentTime)}</span>
          <span className="text-blue-400/60 text-xs font-mono">{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="px-6 pb-6 flex items-center">
        {/* Volume group */}
        <div className="flex items-center gap-1.5 flex-1">
          <button onClick={toggleMute} className="text-blue-400/70 hover:text-blue-300 transition-colors">
            {muted || volume === 0
              ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15zM17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"/></svg>
              : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6v12m-3-9H4a1 1 0 00-1 1v2a1 1 0 001 1h5l4.707 4.707C14.077 18.337 15 17.891 15 17V7c0-.891-.923-1.337-1.293-.707L9 11z"/></svg>}
          </button>
          <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume}
            onChange={handleVolume} className="w-16 h-1 cursor-pointer" style={{ accentColor: '#3b82f6' }} />
        </div>

        {/* Play/Pause — centre */}
        <button onClick={togglePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90 border border-blue-400/30 shadow-lg shadow-blue-950/60"
          style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}>
          {playing
            ? <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
        </button>

        {/* Right spacer to balance volume group */}
        <div className="flex-1" />
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={src} crossOrigin="use-credentials"
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} />
    </div>
  );
};

const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
const backendUrl = import.meta.env.VITE_BACKEND_URL;

// --- State ---
const [showShare, setShowShare] = useState(false);
const [shareLink, setShareLink] = useState('');
const [copied, setCopied] = useState(false);
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
const [isActionLoading, setIsActionLoading] = useState(false); // Loading state for item-specific actions (download, share, delete)
const [showMenu, setShowMenu] = useState(false);
const [downloadProgress, setDownloadProgress] = useState(0);
const [showViewer, setShowViewer] = useState(false);

// --- Refs ---
const menuRef = useRef(null);
const shareModalRef = useRef(null);
const deleteModalRef = useRef(null);
const shareLinkInputRef = useRef(null); // Ref for the share link input
const viewerModalRef = useRef(null);

// --- Effects ---
// Close menu/modals on outside click
useEffect(() => {
const handleOutsideClick = (event) => {
  // Close menu only if click is outside the menu itself
  if (menuRef.current && !menuRef.current.contains(event.target)) {
    // Check if the click target is the menu button to prevent immediate reopening
    const menuButton = menuRef.current.previousElementSibling; // Assumes button is sibling before menu div
    if (!menuButton || !menuButton.contains(event.target)) {
         setShowMenu(false);
    }
  }
  // Close modals
  if (shareModalRef.current && !shareModalRef.current.contains(event.target)) {
     setShowShare(false);
  }
  if (deleteModalRef.current && !deleteModalRef.current.contains(event.target)) {
     setShowDeleteConfirm(false);
  }
};

if (showMenu || showShare || showDeleteConfirm || showViewer) {
   document.addEventListener('mousedown', handleOutsideClick);
}

return () => {
  document.removeEventListener('mousedown', handleOutsideClick);
};
}, [showMenu, showShare, showDeleteConfirm, showViewer]);

// Close modals on Escape key
const handleKeyDown = useCallback((e) => {
  if (e.key === 'Escape') {
    if (showViewer) { setShowViewer(false); return; }
    if (showShare) setShowShare(false);
    if (showDeleteConfirm) setShowDeleteConfirm(false);
    if (showMenu) setShowMenu(false);
  }
}, [showShare, showDeleteConfirm, showMenu, showViewer]);

useEffect(() => {
if (showShare || showDeleteConfirm || showMenu || showViewer) {
  window.addEventListener('keydown', handleKeyDown);
} else {
  window.removeEventListener('keydown', handleKeyDown);
}
return () => window.removeEventListener('keydown', handleKeyDown);
}, [showShare, showDeleteConfirm, showMenu, showViewer, handleKeyDown]);

// --- Actions ---
const download = async () => {
setShowMenu(false); //
setIsActionLoading(true); //
setDownloadProgress(0); //
try { //
const response = await axios({ //
  url: `${backendUrl}/api/files/download/${file._id}`, //
  method: 'GET', //
  responseType: 'blob', //
  onDownloadProgress: (progressEvent) => {
    // --- MODIFICATION START ---
    // Only update progress if progressEvent.total is a positive number
    if (progressEvent.total && progressEvent.total > 0) {
       const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total); //
       setDownloadProgress(percentCompleted); //
    }
    // If progressEvent.total is not available (or is 0), downloadProgress will retain
    // its current value (which was set to 0 at the start of this download function).
    // The previous 'else { setDownloadProgress(50); }' block has been removed.
    // --- MODIFICATION END ---
  },
});
const url = window.URL.createObjectURL(new Blob([response.data])); //
const link = document.createElement('a'); //
link.href = url; //
link.setAttribute('download', file.filename); //
document.body.appendChild(link); //
link.click(); //
link.remove(); //
window.URL.revokeObjectURL(url); //
} catch (err) { //
console.error('Download failed:', err); //
// alert(`Failed to download ${file.filename}.`); // Replaced with a more graceful message later if needed
} finally { //
setIsActionLoading(false); //
// Reset progress slightly later to show completion
setTimeout(() => setDownloadProgress(0), 1200); //
}
};


const deleteFile = async () => {
setIsActionLoading(true);
try {
  // API endpoint: /api/files/:id
  await axios.delete(`${backendUrl}/api/files/${file._id}`);
  setShowDeleteConfirm(false); // Close modal first
  refresh(); // Refresh the list (this item will disappear)
} catch (err) {
  console.error('Delete failed:', err);
  // alert(`Failed to delete ${file.filename}.`); // Replaced with a more graceful message later if needed
  setIsActionLoading(false); // Reset loading state on error only
  setShowDeleteConfirm(false);
}
// No finally block resetting loading state, as the component might unmount
};

const share = async () => {
setShowMenu(false);
setIsActionLoading(true); // Use isActionLoading for the modal spinner
setShareLink('');
setCopied(false);
setShowShare(true);
try {
  const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
  setShareLink(res.data.url);
} catch (err) {
  console.error('Share failed:', err);
  // alert(`Failed to generate share link for ${file.filename}.`); // Replaced with a more graceful message later if needed
  setShowShare(false);
} finally {
  setIsActionLoading(false); // Stop loading in modal regardless of outcome
}
};

const copyToClipboard = async (link) => {
  try {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
};

const openViewer = () => {
  setShowMenu(false);
  setShowViewer(true);
};
  

// --- Helpers ---
const formatSize = (bytes) => {
if (bytes === null || bytes === undefined || bytes < 0) return 'N/A';
if (bytes === 0) return '0 Bytes';
const k = 1024;
const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
const i = Math.floor(Math.log(bytes) / Math.log(k));
return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + ' ' + sizes[i];
};

const formatDate = (dateString) => {
if (!dateString) return 'Unknown date';
try {
   const date = new Date(dateString);
   return date.toLocaleString(undefined, {
     year: 'numeric', month: 'short', day: 'numeric',
     hour: 'numeric', minute: '2-digit', hour12: true
   });
 } catch (e) {
    console.error("Error formatting date:", dateString, e);
    return 'Invalid date';
 }
};

// Define Icon component for clarity
const FileTypeIcon = ({ type, darkMode, size = "h-10 w-10" }) => {
  const iconColor = darkMode ? "text-gray-400" : "text-gray-500";

  const icons = {
      image: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      video: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      audio: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
      document: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      other: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
  };
  return <div className={iconColor}>{icons[type] || icons['other']}</div>;
};


// Preview logic based on metadata type and viewType
const renderPreview = (isListView) => {
// Use the /preview/ endpoint: sets correct Content-Type, has 24hr browser cache,
// and does NOT force Content-Disposition: attachment like /download/ does.
const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
const type = file.metadata?.type || 'other';

// Classes for image/video previews
const imageVideoPreviewClasses = 'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';

// Base classes for the preview container
let containerBaseClasses = `relative overflow-hidden group ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`;

if (isListView) {
  containerBaseClasses += ' w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0'; // Small fixed size for list view
} else {
  containerBaseClasses += ' h-32 mb-2 rounded-t-xl'; // Match card's rounded-xl to prevent bleed
}

if (type === 'image') {
  return (
    <div className={containerBaseClasses}>
      {/* crossOrigin="use-credentials" sends the httpOnly auth cookie cross-origin;
          works because the server has cors({ credentials: true }) + crossOriginResourcePolicy: cross-origin */}
      <img
        src={previewUrl}
        crossOrigin="use-credentials"
        alt={`Preview of ${file.filename}`}
        className={imageVideoPreviewClasses}
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );
}

if (type === 'video') {
  return (
    <div className={containerBaseClasses}>
      {/* crossOrigin="use-credentials" sends auth cookie so the video thumbnail loads */}
      <video
        src={`${previewUrl}#t=0.5`}
        crossOrigin="use-credentials"
        preload="metadata"
        className={`${imageVideoPreviewClasses} bg-black`}
      />
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-300">
         <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clipRule="evenodd" />
          </svg>
      </div>
    </div>
  );
}

// Default: Show file type icon centered
const fileExtension = file.filename.split('.').pop().toUpperCase();
return (
  <div className={`${containerBaseClasses} flex flex-col items-center justify-center`}>
     <FileTypeIcon type={type} darkMode={darkMode} size={isListView ? "h-8 w-8 sm:h-10 w-10" : "h-10 w-10"} />
     {type !== 'audio' && ( // Don't show extension for audio as icon is clear
        <span className={`mt-1 text-xs font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {fileExtension}
        </span>
     )}
  </div>
);
};

// Handle item click for selection
const handleItemClick = (e) => {
// Allow clicking menu button even in selection mode
const menuButton = e.currentTarget.querySelector('[aria-label="File options"]');
if (menuButton && menuButton.contains(e.target)) {
    return; // Let menu button handle its own click
 }

if (selectionMode) {
  e.preventDefault();
  onSelect(file._id);
}
// Potentially add navigation or file preview action here if not in selection mode
};

// --- Render ---
return (
<>
  {/* Main Item Card */}
  <div
    className={cn(
      `relative text-sm rounded-xl shadow-md border transition-all duration-200 ease-in-out`,
      isSelected
        ? `ring-2 ring-offset-1 ${darkMode ? 'ring-blue-500 bg-gray-750 border-blue-700' : 'ring-blue-600 bg-blue-50 border-blue-400'}`
        : `${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`,
      darkMode ? 'text-white' : 'text-gray-900',
      selectionMode ? 'cursor-pointer' : '',
      'transform hover:-translate-y-0.5 hover:shadow-lg',
      viewType === 'list'
        ? 'flex items-center p-3 gap-3 min-h-[90px] sm:min-h-[110px]' // Flex row for list view
        : 'flex flex-col justify-between h-full min-h-[200px]', // Original flex col for grid view
      showMenu ? 'z-30' : 'z-10' // Add z-index to the FileItem itself when menu is open
    )}
    onClick={handleItemClick}
    role="listitem" aria-selected={isSelected}
  >
    {/* Content Area */}
    {viewType === 'list' && (
      <>
        {/* Preview Area for List View */}
        {renderPreview(true)}

        {/* Info Area for List View */}
        <div className="flex flex-col flex-grow min-w-0"> {/* min-w-0 to allow truncation */}
          {/* Filename */}
          <h3
            title={file.filename}
            className={cn(
              `font-medium text-sm truncate mb-1`,
              darkMode ? 'text-gray-100' : 'text-gray-800'
            )}
          >
            {file.filename}
          </h3>

          {/* Basic Metadata (Size) - always visible */}
          <div className={cn(`text-xs mt-0.5`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
             <p className="truncate">{formatSize(file.length)}</p>
          </div>

          {/* Extended Metadata (conditionally rendered) */}
          {showDetails && (
            <div className={cn(
              `mt-2 text-xs space-y-1 pt-2 border-t`,
              darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
             )}>
              {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
              <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
              {file.metadata?.dimensions && (
                <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>
              )}
            </div>
          )}
        </div>

        {/* Selection Indicator / Kebab Menu Area for List View */}
        <div className="flex-shrink-0 ml-auto self-start pt-1"> {/* ml-auto pushes it to the right, self-start aligns to top */}
            {selectionMode ? (
               // Selection Checkbox-like Indicator
               <div className={cn(
                 "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150",
                 isSelected
                    ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500')
                    : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80')
               )}>
                 {isSelected && (
                   <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                 )}
               </div>
           ) : (
               // Kebab Menu Button
               <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      setShowMenu(prev => !prev);
                    }}
                    className={cn(
                      `p-1.5 rounded-full transition-colors duration-150`,
                      showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700')
                             : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'),
                      'backdrop-blur-sm bg-opacity-50' // Add subtle background for visibility over preview
                    )}
                    aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showMenu && (
                    <div
                      ref={menuRef}
                      className={cn(
                        `absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border`,
                        `backdrop-blur-md`, // More blur
                        darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200'
                      )}
                      role="menu"
                    >
                      {/* View Button — only for image / video / audio */}
                      {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                        <>
                          <button onClick={openViewer} className={cn(
                            'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                            darkMode ? 'text-white' : 'text-gray-700'
                          )} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            View
                          </button>
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>
                        </>
                      )}

                      {/* Download Button (No Hover) */}
                      <button onClick={download} className={cn(
                        'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                        darkMode ? 'text-white' : 'text-gray-700'
                      )} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        Get
                      </button>

                      {/* Divider between Download and Share */}
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                      {/* Share Button (No Hover) */}
                      <button onClick={share} className={cn(
                        'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                        darkMode ? 'text-white' : 'text-gray-700'
                      )} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                      </button>

                      {/* Divider before Delete */}
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                      {/* Delete Button (No Hover, retains color) */}
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn(
                        'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                        darkMode ? 'text-red-400' : 'text-red-600'
                      )} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                      </button>
                    </div>
                  )}
               </div>
           )}
        </div>
      </>
    )}

    {viewType === 'grid' && (
      <div className="flex flex-col h-full">
          {/* Preview Area for Grid View */}
          {renderPreview(false)}

          {/* Info Area for Grid View */}
          <div className="p-3 pt-2 flex flex-col flex-grow">
            {/* Filename */}
            <h3
              title={file.filename}
              className={cn(
                `font-medium text-sm truncate mb-1`,
                darkMode ? 'text-gray-100' : 'text-gray-800'
              )}
            >
              {file.filename}
            </h3>

            {/* Basic Metadata (Size) - always visible */}
            <div className={cn(`text-xs mt-0.5`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
               <p className="truncate">{formatSize(file.length)}</p>
            </div>

             {/* Spacer to push metadata down if showDetails is true */}
            {showDetails && <div className="flex-grow min-h-[1rem]"></div>}

            {/* Extended Metadata (conditionally rendered) */}
            {showDetails && (
              <div className={cn(
                `mt-2 text-xs space-y-1 pt-2 border-t`,
                darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200'
               )}>
                {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                {file.metadata?.dimensions && (
                  <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>
                )}
                {/* Add more details if available */}
              </div>
            )}
          </div>

          {/* Selection Indicator / Kebab Menu Area for Grid View */}
          <div className="absolute top-1.5 right-1.5 z-10">
              {selectionMode ? (
                 // Selection Checkbox-like Indicator
                 <div className={cn(
                   "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150",
                   isSelected
                      ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500')
                      : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80')
                 )}>
                   {isSelected && (
                     <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                   )}
                 </div>
             ) : (
                 // Kebab Menu Button
                 <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        setShowMenu(prev => !prev);
                      }}
                      className={cn(
                        `p-1.5 rounded-full transition-colors duration-150`,
                        showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700')
                               : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'),
                        'backdrop-blur-sm bg-opacity-50' // Add subtle background for visibility over preview
                      )}
                      aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                    </button>

                    {/* Dropdown Menu */}
                    {showMenu && (
                      <div
                        ref={menuRef}
                        className={cn(
                          `absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border`,
                          `backdrop-blur-md`, // More blur
                          darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200'
                        )}
                        role="menu"
                      >
                        {/* View Button — only for image / video / audio */}
                        {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                          <>
                            <button onClick={openViewer} className={cn(
                              'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                              darkMode ? 'text-white' : 'text-gray-700'
                            )} role="menuitem">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View
                            </button>
                            <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>
                          </>
                        )}

                        {/* Download Button (No Hover) */}
                        <button onClick={download} className={cn(
            'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
            darkMode ? 'text-white' : 'text-gray-700'
          )} role="menuitem">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Get
          </button>

                        {/* Divider between Download and Share */}
                         <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                        {/* Share Button (No Hover) */}
                        <button onClick={share} className={cn(
                          'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                          darkMode ? 'text-white' : 'text-gray-700' // Default text color
                        )} role="menuitem">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                        </button>

                        {/* Divider before Delete */}
                        <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`}></div>

                        {/* Delete Button (No Hover, retains color) */}
                        <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn(
                          'w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5',
                          darkMode ? 'text-red-400' : 'text-red-600' // Keep delete color indication
                        )} role="menuitem">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                        </button>
                      </div>
                    )}
                 </div>
             )}
          </div>
      </div>
    )}

    {/* Download Progress Overlay */}
    {isActionLoading && downloadProgress > 0 && (
      <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg backdrop-blur-sm">
         <div className="w-4/5 max-w-xs text-center">
           <div className="mb-1.5 text-xs font-medium text-white">Downloading... {downloadProgress}%</div>
           <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
             <div className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${downloadProgress}%` }}></div>
           </div>
         </div>
      </div>
    )}
  </div>

  {/* --- Modals for FileItem --- */}

  {/* Share Modal */}
  {showShare && (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
      <div
        ref={shareModalRef}
        className={cn(
          `p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`,
           darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
         )}
        role="dialog" aria-modal="true" aria-labelledby="share-file-title"
      >
        {/* Close Button */}
        <button
          onClick={() => setShowShare(false)}
          className={cn(
              `absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50`,
               isActionLoading ? "cursor-not-allowed" : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100')
           )}
          disabled={isActionLoading} title="Close" aria-label="Close share dialog"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        {/* Title */}
        <h2 id="share-file-title" className={cn(`font-semibold mb-5 text-lg text-center truncate px-8`, darkMode ? 'text-white' : 'text-gray-800')}>
            Share
        </h2>

        {/* QR Code */}
        <div className="flex justify-center mb-5">
            <div className={cn("p-2 border rounded-lg", darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50')}>
               {isActionLoading && !shareLink ? ( // Show spinner while loading link
                  <div className="w-40 h-40 flex items-center justify-center">
                     <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
                  </div>
               ) : shareLink ? (
                 <QRCodeSVG
                   value={shareLink} size={160} bgColor="transparent"
                   fgColor={darkMode ? "#FFFFFF" : "#000000"} level="M" includeMargin={false} className="block"
                 />
               ) : ( // Show error if loading finished but no link
                  <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-500 p-2">Failed to load QR Code.</div>
               )}
            </div>
         </div>

        {/* Link Input and Copy Button */}
         <div className="flex flex-col gap-2.5 mb-4">
            <input
               ref={shareLinkInputRef} // Attach the ref here
               value={isActionLoading ? 'Generating...' : shareLink || 'Error generating link'}
               readOnly
               className={cn(
                   `w-full px-3 py-2 rounded font-mono text-xs border`, // Smaller text
                   `overflow-x-auto whitespace-nowrap`, // Allow scroll
                   darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-800',
                   'disabled:opacity-70'
               )}
               disabled={isActionLoading} aria-label="Shareable link" onClick={(e) => e.target.select()}
             />
             <button
               onClick={() => copyToClipboard(shareLink)}
               disabled={!shareLink || copied || isActionLoading}
               className={cn(
                   `w-full px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2`,
                    copied ? 'bg-green-600 text-white cursor-default'
                         : !shareLink || isActionLoading
                             ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed')
                             : (darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white')
               )}
             >
               
               {copied ? (
                  <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</>
               ) : (
                   'Copy Link'
               )}
             </button>
         </div>

        {/* Footer Text */}
        <p className={cn(`text-xs text-center`, darkMode ? 'text-gray-400' : 'text-gray-500')}>
          Anyone with this link can view or download this file.
        </p>
      </div>
    </div>
  )}

  {/* Delete Confirmation Modal */}
  {showDeleteConfirm && (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 px-4 backdrop-blur-sm animate-fadeIn">
      <div
        ref={deleteModalRef}
        className={cn(
          `p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn`,
             darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800'
        )}
        role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" aria-describedby="delete-file-desc"
      >
         <h2 id="delete-file-title" className={cn(`font-semibold mb-2 text-lg`, darkMode ? 'text-white' : 'text-gray-800')}>Confirm Delete</h2>
         <p id="delete-file-desc" className={cn(`text-sm mb-3`, darkMode ? 'text-gray-300' : 'text-gray-600')}>
           Are you sure you want to permanently delete this file?
         </p>
         {/* Display filename */}
         <div className={cn(
             `font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-3 p-2 rounded text-sm`,
              darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200'
         )}>
           {file.filename}
         </div>
         <p className={cn(`text-sm mb-5`, darkMode ? 'text-gray-400' : 'text-gray-600')}>
           This action cannot be undone.
         </p>
         {/* Buttons */}
         <div className="flex w-full justify-between gap-3 mt-4">
           <button
             onClick={() => setShowDeleteConfirm(false)}
             disabled={isActionLoading}
             className={cn(
                 `flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm`,
                  isActionLoading
                     ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed')
                     : (darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300')
             )}
           >
             Cancel
           </button>
           <button
             onClick={deleteFile}
             disabled={isActionLoading}
             className={cn(
                 `flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm text-white flex items-center justify-center gap-2`,
                 isActionLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700'
             )}
           >
              {isActionLoading && (
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg>
              )}
             Delete
           </button>
         </div>
      </div>
    </div>
  )}

  {/* Media Viewer Modal — image / video / audio only */}
  {showViewer && (file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (() => {
    const type = file.metadata.type;
    const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
    return (
      <div
        className="fixed inset-0 z-[60] animate-fadeIn"
        style={{
          background: 'rgba(8,14,28,0.95)',
          backgroundImage: 'linear-gradient(rgba(59,130,246,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.05) 1px, transparent 1px)',
          backgroundSize: '30px 30px',
          backdropFilter: 'blur(8px)',
        }}
        onClick={() => setShowViewer(false)}
        role="dialog" aria-modal="true" aria-label={`Viewing ${file.filename}`}
      >
        {/* Content wrapper — stopPropagation prevents backdrop click firing when clicking content */}
        <div className="flex flex-col h-full" onClick={e => e.stopPropagation()}>

          {/* Header Bar */}
          <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-blue-900/30"
            style={{ background: 'rgba(8,14,28,0.8)', backdropFilter: 'blur(4px)' }}>
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn(
                'flex-shrink-0 text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border',
                type === 'image'  ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' :
                type === 'video'  ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' :
                                    'bg-blue-700/20 border-blue-600/40 text-blue-300'
              )}>
                {type}
              </span>
              <h2 className="text-white/90 text-sm font-medium truncate" title={file.filename}>
                {file.filename}
              </h2>
            </div>
            <button
              onClick={() => setShowViewer(false)}
              className="flex-shrink-0 ml-3 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-blue-900/40 border border-transparent hover:border-blue-800/50 transition-all"
              aria-label="Close viewer" title="Close (Esc)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Media content area — clicking empty space closes viewer */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden p-4 animate-viewerIn"
            onClick={() => setShowViewer(false)}
          >
            {/* Inner wrapper — stop propagation so clicking on actual media doesn't close */}
            <div onClick={e => e.stopPropagation()}>
              {type === 'image' && (
                <img
                  src={previewUrl}
                  crossOrigin="use-credentials"
                  alt={file.filename}
                  className="max-w-full object-contain rounded-xl shadow-2xl shadow-blue-950/60 select-none border border-blue-900/30"
                  style={{ maxHeight: 'calc(100vh - 130px)' }}
                  draggable={false}
                />
              )}
              {type === 'video' && <CustomVideoPlayer src={previewUrl} />}
              {type === 'audio' && <CustomAudioPlayer src={previewUrl} filename={file.filename} fileSize={file.length} />}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 pb-3 text-center pointer-events-none">
            <p className="text-blue-400/30 text-xs tracking-wide">Click outside or press Esc to close</p>
          </div>
        </div>
      </div>
    );
  })()}

   {/* CSS Animations (shared with FileList, could be moved to a global CSS file) */}
    <style jsx>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modalIn { animation: modalIn 0.25s ease-out; }
        @keyframes viewerIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .animate-viewerIn { animation: viewerIn 0.2s ease-out; }
    `}</style>
</>
);
};

export default FileItem;
