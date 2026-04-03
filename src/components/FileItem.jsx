import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ─── Shared range-input styles injected once ──────────────────────────────────
const PlayerStyles = () => (
  <style>{`
    .vp-seek::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #3b82f6;box-shadow:0 0 8px rgba(59,130,246,.6),0 2px 4px rgba(0,0,0,.4);cursor:pointer;transition:transform .15s,box-shadow .15s}
    .vp-seek::-webkit-slider-thumb:hover{transform:scale(1.2);box-shadow:0 0 12px rgba(59,130,246,.8),0 2px 6px rgba(0,0,0,.5)}
    .vp-seek::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:2px solid #3b82f6;box-shadow:0 0 8px rgba(59,130,246,.6);cursor:pointer}
    .vp-seek::-webkit-slider-runnable-track{background:transparent}
    .vp-seek:focus{outline:none}
    .vp-vol::-webkit-slider-thumb{-webkit-appearance:none;width:12px;height:12px;border-radius:50%;background:#60a5fa;cursor:pointer;box-shadow:0 0 4px rgba(96,165,250,.5)}
    .vp-vol::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#60a5fa;cursor:pointer;border:none}
    .vp-vol::-webkit-slider-runnable-track{background:transparent}
    .vp-icon-btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:8px;cursor:pointer;color:rgba(203,213,225,.85);display:flex;align-items:center;justify-content:center;transition:background .15s,border-color .15s,color .15s,transform .1s;flex-shrink:0}
    .vp-icon-btn:hover{background:rgba(59,130,246,.2);border-color:rgba(96,165,250,.4);color:#e2e8f0;transform:scale(1.05)}
    .vp-icon-btn:active{transform:scale(.95)}
    .vp-pill-btn{background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:6px;cursor:pointer;color:rgba(148,163,184,.9);font-size:11px;font-weight:700;font-family:monospace;letter-spacing:.4px;transition:background .15s,border-color .15s,color .15s}
    .vp-pill-btn:hover{background:rgba(59,130,246,.2);border-color:rgba(96,165,250,.4);color:#93c5fd}
    .vp-pill-btn.active{background:rgba(59,130,246,.3);border-color:rgba(96,165,250,.55);color:#93c5fd}
    .vp-play-btn{border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:transform .12s,box-shadow .15s,background .15s;flex-shrink:0;border:1.5px solid rgba(96,165,250,.3)}
    .vp-play-btn:hover{transform:scale(1.08);box-shadow:0 6px 24px rgba(37,99,235,.55)}
    .vp-play-btn:active{transform:scale(.94)}
    .vp-pop{animation:vpPop .12s ease-out}
    @keyframes vpPop{from{opacity:0;transform:scale(.92) translateY(4px)}to{opacity:1;transform:scale(1) translateY(0)}}
    .vp-flash{animation:vpFlash .6s ease-out forwards}
    @keyframes vpFlash{0%{opacity:1}70%{opacity:.6}100%{opacity:0}}
    @keyframes vpSpin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    .vp-menu-item{display:block;width:100%;text-align:center;border:none;cursor:pointer;font-size:12px;font-weight:700;font-family:monospace;transition:background .12s,color .12s}
    .vp-menu-item:hover{background:rgba(59,130,246,.25)!important;color:#93c5fd!important}
  `}</style>
);

// ─── Custom themed video player ───────────────────────────────────────────────
const CustomVideoPlayer = ({ src, useCredentials = true }) => {
  const videoRef   = useRef(null);
  const wrapRef    = useRef(null);   // outer shell (for fullscreen)
  const speedRef   = useRef(null);
  const skipDRef   = useRef(null);
  const [playing,      setPlaying]      = useState(false);
  const [currentTime,  setCurrentTime]  = useState(0);
  const [duration,     setDuration]     = useState(0);
  const [volume,       setVolume]       = useState(1);
  const [muted,        setMuted]        = useState(false);
  const [buffered,     setBuffered]     = useState(0);
  const [showCtrl,     setShowCtrl]     = useState(true);
  const [speed,        setSpeed]        = useState(1);
  const [showSpeed,    setShowSpeed]    = useState(false);
  const [skipSec,      setSkipSec]      = useState(10);
  const [showSkipD,    setShowSkipD]    = useState(false);
  const [skipFlash,    setSkipFlash]    = useState(null);   // 'f'|'b'|null
  const [isFS,         setIsFS]         = useState(false);
  const [vidW,         setVidW]         = useState(0);
  const [vidH,         setVidH]         = useState(0);
  const [isBuffering,  setIsBuffering]  = useState(true);  // true until first canplay
  const hideTimer = useRef(null);
  const isFSRef   = useRef(false);  // sync ref so callbacks always see latest value

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
  const SKIPS  = [3, 5, 10, 20, 30];

  /* ── hide-controls timer — only auto-hide in fullscreen ── */
  const nudgeControls = useCallback(() => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    if (isFSRef.current) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
    }
  }, []);
  useEffect(() => () => clearTimeout(hideTimer.current), []);

  /* ── close popups on outside click ── */
  useEffect(() => {
    const h = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) setShowSpeed(false);
      if (skipDRef.current && !skipDRef.current.contains(e.target))  setShowSkipD(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  /* ── fullscreen change ── */
  useEffect(() => {
    const h = () => {
      const entering = !!document.fullscreenElement;
      isFSRef.current = entering;
      setIsFS(entering);
      if (!entering) {
        clearTimeout(hideTimer.current);
        setShowCtrl(true);
        try { screen.orientation?.unlock?.(); } catch(_) {}
      } else {
        // Just entered fullscreen — show controls then start hide timer if playing
        setShowCtrl(true);
        clearTimeout(hideTimer.current);
        if (videoRef.current && !videoRef.current.paused) {
          hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
        }
      }
    };
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
  };
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length)
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
  };
  const handleSeek  = (e) => {
    const v = parseFloat(e.target.value);
    setCurrentTime(v);
    if (videoRef.current) videoRef.current.currentTime = v;
  };
  const handleVol   = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v); setMuted(v === 0);
    if (videoRef.current) { videoRef.current.volume = v; videoRef.current.muted = v === 0; }
  };
  const toggleMute  = () => {
    if (!videoRef.current) return;
    const n = !muted; setMuted(n); videoRef.current.muted = n;
  };
  const toggleFS    = () => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen?.();
      // Lock landscape for landscape (16:9) videos, portrait for vertical
      setTimeout(() => {
        try {
          if (vidW > 0 && vidH > 0 && vidW >= vidH) {
            screen.orientation?.lock?.('landscape').catch(() => {});
          }
        } catch(_) {}
      }, 200);
    } else {
      document.exitFullscreen?.();
    }
  };
  const applySpeed  = (s) => {
    setSpeed(s); setShowSpeed(false);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };
  const doSkip      = (dir) => {
    if (!videoRef.current || !duration) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + dir * skipSec));
    setSkipFlash(dir > 0 ? 'f' : 'b');
    setTimeout(() => setSkipFlash(null), 700);
  };

  // Safely reads a finite, non-zero duration from the video element
  const trySetDuration = useCallback(() => {
    if (!videoRef.current) return;
    const d = videoRef.current.duration;
    if (isFinite(d) && !isNaN(d) && d > 0) setDuration(d);
  }, []);

  // Poll every 500 ms until we get the real duration (handles mobile Chrome
  // streaming where durationchange fires with a partial chunk value and stops)
  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (!videoRef.current) { clearInterval(id); return; }
      const d = videoRef.current.duration;
      if (isFinite(d) && !isNaN(d) && d > 0) { setDuration(d); clearInterval(id); }
      if (++tries > 30) clearInterval(id); // stop after ~15 s
    }, 500);
    return () => clearInterval(id);
  }, []);

  const fmtTime     = (t) => {
    if (!t || isNaN(t) || !isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = String(Math.floor(t % 60)).padStart(2,'0');
    return h ? `${h}:${String(m).padStart(2,'0')}:${s}` : `${m}:${s}`;
  };

  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const buf = duration > 0 ? Math.min(100, (buffered  / duration) * 100) : 0;

  /* ── Icon helpers ── */
  const IconPlay    = () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M8 5v14l11-7z"/></svg>;
  const IconPause   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>;
  const IconVolOff  = () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>;
  const IconVolOn   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>;
  const IconFSIn    = () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>;
  const IconFSOut   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>;
  const IconSkipB   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>;
  const IconSkipF   = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;

  return (
    <>
      <PlayerStyles />
      {/* ── Outer shell ── */}
      <div
        ref={wrapRef}
        style={{
          width: '100%',
          maxWidth: isFS ? '100vw' : '860px',
          background: '#000',
          borderRadius: isFS ? 0 : '12px',
          overflow: 'hidden',
          border: isFS ? 'none' : '1px solid rgba(59,130,246,.2)',
          boxShadow: isFS ? 'none' : '0 24px 64px rgba(0,0,0,.7)',
          position: 'relative',
          userSelect: 'none',
          // In fullscreen: fill the whole screen, controls overlay at bottom
          ...(isFS ? { height: '100vh', display: 'flex', flexDirection: 'column' } : {}),
        }}
        onMouseMove={nudgeControls}
        onMouseLeave={() => isFS && playing && setShowCtrl(false)}
        onTouchStart={nudgeControls}
      >
        {/* ── Video area ── */}
        <div
          style={isFS
            ? { position: 'relative', flex: 1, background: '#000', cursor: 'pointer', overflow: 'hidden' }
            : { position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', cursor: 'pointer' }
          }
          onClick={togglePlay}
        >
          <video
            ref={videoRef}
            src={src}
            {...(useCredentials ? { crossOrigin: 'use-credentials' } : {})}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                const d = videoRef.current.duration;
                if (isFinite(d) && !isNaN(d) && d > 0) setDuration(d);
                setVidW(videoRef.current.videoWidth);
                setVidH(videoRef.current.videoHeight);
              }
            }}
            onDurationChange={() => {
              if (videoRef.current && !isNaN(videoRef.current.duration))
                setDuration(videoRef.current.duration);
            }}
            onCanPlay={trySetDuration}
            onCanPlayThrough={trySetDuration}
            onPlay={() => { setPlaying(true); nudgeControls(); }}
            onPause={() => { setPlaying(false); setShowCtrl(true); clearTimeout(hideTimer.current); }}
            onEnded={() => { setPlaying(false); setShowCtrl(true); }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => { trySetDuration(); setIsBuffering(false); }}
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'contain', display: 'block', background: '#000',
            }}
          />

          {/* ── Buffering spinner ── */}
          {isBuffering && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none', zIndex:5 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="32" height="32" viewBox="0 0 32 32" style={{ animation: 'vpSpin 0.8s linear infinite' }}>
                  <circle cx="16" cy="16" r="12" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
                  <path d="M16 4 A12 12 0 0 1 28 16" fill="none" stroke="#60a5fa" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>
          )}

          {/* ── Centre big play/pause pulse ── */}
          {!playing && !isBuffering && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', pointerEvents:'none' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(37,99,235,.85)', backdropFilter: 'blur(4px)',
                border: '1.5px solid rgba(147,197,253,.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(37,99,235,.5)',
              }}>
                <svg viewBox="0 0 24 24" fill="white" width="28" height="28" style={{ marginLeft:3 }}><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
          )}

          {/* ── Skip flash ── */}
          {skipFlash && (
            <div className="vp-flash" style={{
              position:'absolute', inset:0, pointerEvents:'none',
              display:'flex', alignItems:'center',
              justifyContent: skipFlash === 'f' ? 'flex-end' : 'flex-start',
              padding: '0 12%',
            }}>
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                background:'rgba(0,0,0,.45)', backdropFilter:'blur(6px)',
                borderRadius:12, padding:'10px 14px',
              }}>
                {skipFlash === 'f'
                  ? <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
                  : <svg viewBox="0 0 24 24" fill="white" width="28" height="28"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>}
                <span style={{ color:'#fff', fontSize:12, fontWeight:600, letterSpacing:.5 }}>
                  {skipFlash === 'f' ? `+${skipSec}s` : `-${skipSec}s`}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Controls bar ── */}
        <div style={isFS ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          // Solid dark background for the entire controls area
          background: 'linear-gradient(to top, rgba(0,0,0,.92) 0%, rgba(0,0,0,.88) 70%, rgba(0,0,0,.0) 100%)',
          paddingTop: 40,   // fade zone above the solid part
          transition: 'opacity .3s ease',
          opacity: showCtrl ? 1 : 0,
          pointerEvents: showCtrl ? 'auto' : 'none',
        } : {
          // Normal mode: always visible, static below video
          background: 'linear-gradient(180deg,#050d1e 0%,#060f24 100%)',
          borderTop: '1px solid rgba(59,130,246,.12)',
        }}>
          {/* Inner wrapper — carries the actual padding so bg covers all content */}
          <div style={{ padding: isFS ? '0 14px 16px' : '8px 12px 10px' }}>

          {/* ── Seek bar ── */}
          <div style={{ position:'relative', height:20, display:'flex', alignItems:'center', marginBottom:6 }}>
            {/* Track */}
            <div style={{ position:'absolute', left:0, right:0, height:4, borderRadius:4, background:'rgba(255,255,255,.1)' }} />
            {/* Buffered */}
            <div style={{ position:'absolute', left:0, height:4, borderRadius:4, background:'rgba(96,165,250,.25)', width:`${buf}%`, transition:'width .3s linear' }} />
            {/* Played */}
            <div style={{ position:'absolute', left:0, height:4, borderRadius:4, background:'#3b82f6', width:`${pct}%` }} />
            {/* Thumb dot */}
            <div style={{
              position:'absolute', width:14, height:14, borderRadius:'50%',
              background:'#fff', border:'2px solid #60a5fa',
              boxShadow:'0 0 8px rgba(96,165,250,.6)',
              left:`clamp(0px, calc(${pct}% - 7px), calc(100% - 14px))`,
              top:'50%', transform:'translateY(-50%)',
              pointerEvents:'none',
            }} />
            {/* Invisible range input */}
            <input
              type="range" className="vp-seek"
              min={0} max={duration || 0} step={0.01} value={currentTime}
              onChange={handleSeek}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0, zIndex:2 }}
            />
          </div>

          {/* ── Time row ── */}
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
            <span style={{ color:'rgba(148,163,184,.7)', fontSize:11, fontFamily:'monospace', letterSpacing:.3 }}>{fmtTime(currentTime)}</span>
            <span style={{ color:'rgba(148,163,184,.5)', fontSize:11, fontFamily:'monospace', letterSpacing:.3 }}>{fmtTime(duration)}</span>
          </div>

          {/* ── Main controls row ── */}
          <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'nowrap' }}>

            {/* Play/Pause */}
            <button onClick={togglePlay} title={playing?'Pause':'Play'}
              className="vp-play-btn"
              style={{ background: playing ? 'rgba(255,255,255,.1)' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', width:40, height:40, boxShadow: playing ? 'none' : '0 4px 16px rgba(37,99,235,.45)', color:'#fff' }}>
              {playing ? <IconPause /> : <IconPlay />}
            </button>

            {/* Skip back */}
            <button onClick={() => doSkip(-1)} title={`-${skipSec}s`} className="vp-icon-btn" style={{ height:32, width:32 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>

            {/* Skip forward */}
            <button onClick={() => doSkip(1)} title={`+${skipSec}s`} className="vp-icon-btn" style={{ height:32, width:32 }}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>

            {/* Skip duration picker */}
            <div ref={skipDRef} style={{ position:'relative', flexShrink:0 }}>
              <button onClick={() => { setShowSkipD(p=>!p); setShowSpeed(false); }}
                className={`vp-pill-btn${showSkipD ? ' active' : ''}`}
                style={{ padding:'4px 8px' }}>
                {skipSec}s
              </button>
              {showSkipD && (
                <div className="vp-pop" style={{
                  position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)',
                  background:'#0a1628', border:'1px solid rgba(59,130,246,.3)',
                  borderRadius:10, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.8)', minWidth:52, zIndex:99,
                }}>
                  {SKIPS.map(s => (
                    <button key={s} onClick={() => { setSkipSec(s); setShowSkipD(false); }}
                      className="vp-menu-item"
                      style={{ padding:'8px 12px', background: skipSec===s ? 'rgba(59,130,246,.4)' : 'transparent', color: skipSec===s ? '#93c5fd' : 'rgba(148,163,184,.8)' }}>
                      {s}s
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Volume */}
            <div style={{ display:'flex', alignItems:'center', gap:5, flexShrink:0 }}>
              <button onClick={toggleMute} className="vp-icon-btn" style={{ width:32, height:32 }}>
                {muted || volume === 0 ? <IconVolOff /> : <IconVolOn />}
              </button>
              <div style={{ position:'relative', width:70, height:16, display:'flex', alignItems:'center' }}>
                <div style={{ position:'absolute', left:0, right:0, height:3, borderRadius:3, background:'rgba(255,255,255,.12)' }} />
                <div style={{ position:'absolute', left:0, height:3, borderRadius:3, background:'#60a5fa', width:`${(muted?0:volume)*100}%` }} />
                <input type="range" className="vp-vol" min={0} max={1} step={0.05} value={muted?0:volume}
                  onChange={handleVol}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }}
                />
              </div>
            </div>

            <div style={{ flex:1 }} />

            {/* Speed */}
            <div ref={speedRef} style={{ position:'relative', flexShrink:0 }}>
              <button onClick={() => { setShowSpeed(p=>!p); setShowSkipD(false); }}
                className={`vp-pill-btn${showSpeed ? ' active' : ''}`}
                style={{ padding:'4px 0', width:38, textAlign:'center', color: speed !== 1 ? '#93c5fd' : undefined }}>
                {speed === 1 ? '1×' : `${speed}×`}
              </button>
              {showSpeed && (
                <div className="vp-pop" style={{
                  position:'absolute', bottom:'calc(100% + 6px)', right:0,
                  background:'#0a1628', border:'1px solid rgba(59,130,246,.3)',
                  borderRadius:10, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.8)', minWidth:64, zIndex:99,
                }}>
                  {SPEEDS.map(s => (
                    <button key={s} onClick={() => applySpeed(s)}
                      className="vp-menu-item"
                      style={{ padding:'8px 14px', background: speed===s ? 'rgba(59,130,246,.4)' : 'transparent', color: speed===s ? '#93c5fd' : 'rgba(148,163,184,.8)' }}>
                      {s === 1 ? '1×' : `${s}×`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFS} title="Fullscreen" className="vp-icon-btn" style={{ width:32, height:32 }}>
              {isFS ? <IconFSOut /> : <IconFSIn />}
            </button>
          </div>
          </div>{/* end inner wrapper */}
        </div>
      </div>
    </>
  );
};

// ─── Custom themed audio player ───────────────────────────────────────────────
const CustomAudioPlayer = ({ src, filename, fileSize, useCredentials = true }) => {
  const audioRef  = useRef(null);
  const speedRef  = useRef(null);
  const skipDRef  = useRef(null);
  const [playing,     setPlaying]     = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration,    setDuration]    = useState(0);
  const [volume,      setVolume]      = useState(1);
  const [muted,       setMuted]       = useState(false);
  const [speed,       setSpeed]       = useState(1);
  const [showSpeed,   setShowSpeed]   = useState(false);
  const [skipSec,     setSkipSec]     = useState(10);
  const [showSkipD,   setShowSkipD]   = useState(false);

  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
  const SKIPS  = [3, 5, 10, 20, 30];

  useEffect(() => {
    const h = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) setShowSpeed(false);
      if (skipDRef.current && !skipDRef.current.contains(e.target))  setShowSkipD(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const togglePlay  = () => { if (!audioRef.current) return; audioRef.current.paused ? audioRef.current.play() : audioRef.current.pause(); };
  const handleSeek  = (e) => { const v = parseFloat(e.target.value); setCurrentTime(v); if (audioRef.current) audioRef.current.currentTime = v; };
  const handleVol   = (e) => { const v = parseFloat(e.target.value); setVolume(v); setMuted(v===0); if (audioRef.current) { audioRef.current.volume=v; audioRef.current.muted=v===0; } };
  const toggleMute  = () => { if (!audioRef.current) return; const n=!muted; setMuted(n); audioRef.current.muted=n; };
  const applySpeed  = (s) => { setSpeed(s); setShowSpeed(false); if (audioRef.current) audioRef.current.playbackRate=s; };
  const doSkip      = (dir) => { if (!audioRef.current||!duration) return; audioRef.current.currentTime=Math.max(0,Math.min(duration,audioRef.current.currentTime+dir*skipSec)); };

  const trySetAudioDuration = useCallback(() => {
    if (!audioRef.current) return;
    const d = audioRef.current.duration;
    if (isFinite(d) && !isNaN(d) && d > 0) setDuration(d);
  }, []);

  useEffect(() => {
    let tries = 0;
    const id = setInterval(() => {
      if (!audioRef.current) { clearInterval(id); return; }
      const d = audioRef.current.duration;
      if (isFinite(d) && !isNaN(d) && d > 0) { setDuration(d); clearInterval(id); }
      if (++tries > 30) clearInterval(id);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const fmtSize = (b) => { if (!b||b===0) return ''; const k=1024,s=['B','KB','MB','GB'],i=Math.floor(Math.log(b)/Math.log(k)); return parseFloat((b/Math.pow(k,i)).toFixed(1))+' '+s[i]; };
  const fmtTime = (t) => { if (!t||isNaN(t)||!isFinite(t)) return '0:00'; const m=Math.floor(t/60),s=String(Math.floor(t%60)).padStart(2,'0'); return `${m}:${s}`; };

  const prog = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bars = Array.from({ length: 40 }, (_, i) => i);

  return (
    <div style={{
      width: '100%', maxWidth: 420,
      background: 'linear-gradient(175deg,#07102a 0%,#050c1f 100%)',
      border: '1px solid rgba(59,130,246,.2)',
      borderRadius: 16, overflow: 'visible',
      boxShadow: '0 20px 60px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.04)',
      userSelect: 'none', position: 'relative',
    }}>
      <PlayerStyles />

      {/* Header */}
      <div style={{ padding: '20px 20px 12px', display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: 12, flexShrink: 0,
          background: 'linear-gradient(135deg,#1e3a8a,#2563eb)',
          border: '1px solid rgba(96,165,250,.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(37,99,235,.35)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="26" height="26">
            <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/>
          </svg>
        </div>
        {/* Title */}
        <div style={{ minWidth:0 }}>
          <p style={{ color:'#e2e8f0', fontSize:13, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:2 }} title={filename}>{filename}</p>
          {fileSize > 0 && <p style={{ color:'rgba(96,165,250,.5)', fontSize:11 }}>{fmtSize(fileSize)}</p>}
        </div>
      </div>

      {/* Waveform */}
      <div style={{ padding: '0 20px', display:'flex', alignItems:'flex-end', justifyContent:'center', gap:2, height:40, marginBottom:10 }}>
        {bars.map(i => {
          const h = playing
            ? Math.max(0.12, Math.abs(Math.sin(i * 0.68 + currentTime * 7)) * 0.85 + 0.1)
            : 0.15 + Math.abs(Math.sin(i * 0.5)) * 0.12;
          const played = (i / bars.length) * 100 < prog;
          return (
            <div key={i} style={{
              width: 3, borderRadius: 2,
              height: `${Math.round(h * 100)}%`,
              background: played ? '#3b82f6' : 'rgba(30,58,138,.7)',
              transition: playing ? 'height .08s ease' : 'none',
            }} />
          );
        })}
      </div>

      {/* Seek bar */}
      <div style={{ padding: '0 20px', marginBottom: 4 }}>
        <div style={{ position:'relative', height:20, display:'flex', alignItems:'center' }}>
          <div style={{ position:'absolute', left:0, right:0, height:3, borderRadius:3, background:'rgba(255,255,255,.08)' }} />
          <div style={{ position:'absolute', left:0, height:3, borderRadius:3, background:'#3b82f6', width:`${prog}%`, transition:'width .2s linear' }} />
          <div style={{
            position:'absolute', width:13, height:13, borderRadius:'50%',
            background:'#fff', border:'2px solid #60a5fa',
            left:`calc(${prog}% - 6.5px)`, top:'50%', transform:'translateY(-50%)',
            pointerEvents:'none', boxShadow:'0 0 6px rgba(96,165,250,.5)',
          }} />
          <input type="range" className="vp-seek" min={0} max={duration||0} step={0.01} value={currentTime} onChange={handleSeek}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }}
          />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
          <span style={{ color:'rgba(148,163,184,.6)', fontSize:10, fontFamily:'monospace' }}>{fmtTime(currentTime)}</span>
          <span style={{ color:'rgba(148,163,184,.4)', fontSize:10, fontFamily:'monospace' }}>{fmtTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '8px 20px 18px', display:'flex', alignItems:'center', gap:8 }}>

        {/* Vol */}
        <button onClick={toggleMute} className="vp-icon-btn" style={{ width:30, height:30, flexShrink:0 }}>
          {muted||volume===0
            ? <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M16.5 12A4.5 4.5 0 0014 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>}
        </button>
        <div style={{ position:'relative', width:56, height:14, display:'flex', alignItems:'center', flexShrink:0 }}>
          <div style={{ position:'absolute', left:0, right:0, height:3, borderRadius:3, background:'rgba(255,255,255,.1)' }} />
          <div style={{ position:'absolute', left:0, height:3, borderRadius:3, background:'#60a5fa', width:`${(muted?0:volume)*100}%` }} />
          <input type="range" className="vp-vol" min={0} max={1} step={0.05} value={muted?0:volume} onChange={handleVol}
            style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', margin:0 }}
          />
        </div>

        <div style={{ flex:1 }} />

        {/* Skip back */}
        <button onClick={() => doSkip(-1)} title={`-${skipSec}s`} className="vp-icon-btn" style={{ height:30, width:30 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
        </button>

        {/* Play/Pause — big centre */}
        <button onClick={togglePlay} className="vp-play-btn"
          style={{ width:50, height:50, background:'linear-gradient(135deg,#2563eb,#1d4ed8)', boxShadow:'0 4px 20px rgba(37,99,235,.45)', color:'#fff' }}>
          {playing
            ? <svg viewBox="0 0 24 24" fill="white" width="20" height="20"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            : <svg viewBox="0 0 24 24" fill="white" width="20" height="20" style={{ marginLeft:2 }}><path d="M8 5v14l11-7z"/></svg>}
        </button>

        {/* Skip forward */}
        <button onClick={() => doSkip(1)} title={`+${skipSec}s`} className="vp-icon-btn" style={{ height:30, width:30 }}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
        </button>

        <div style={{ flex:1 }} />

        {/* Skip duration */}
        <div ref={skipDRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={() => { setShowSkipD(p=>!p); setShowSpeed(false); }}
            className={`vp-pill-btn${showSkipD ? ' active' : ''}`}
            style={{ padding:'4px 8px' }}>{skipSec}s</button>
          {showSkipD && (
            <div className="vp-pop" style={{
              position:'absolute', bottom:'calc(100% + 6px)', right:0,
              background:'#0a1628', border:'1px solid rgba(59,130,246,.3)',
              borderRadius:10, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.8)', minWidth:52, zIndex:99,
            }}>
              {SKIPS.map(s => (
                <button key={s} onClick={() => { setSkipSec(s); setShowSkipD(false); }}
                  className="vp-menu-item"
                  style={{ padding:'8px 12px', background:skipSec===s?'rgba(59,130,246,.4)':'transparent', color:skipSec===s?'#93c5fd':'rgba(148,163,184,.8)' }}>
                  {s}s
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Speed */}
        <div ref={speedRef} style={{ position:'relative', flexShrink:0 }}>
          <button onClick={() => { setShowSpeed(p=>!p); setShowSkipD(false); }}
            className={`vp-pill-btn${showSpeed ? ' active' : ''}`}
            style={{ padding:'4px 0', width:38, textAlign:'center', color: speed!==1 ? '#93c5fd' : undefined }}>
            {speed===1?'1×':`${speed}×`}
          </button>
          {showSpeed && (
            <div className="vp-pop" style={{
              position:'absolute', bottom:'calc(100% + 6px)', right:0,
              background:'#0a1628', border:'1px solid rgba(59,130,246,.3)',
              borderRadius:10, overflow:'hidden', boxShadow:'0 12px 40px rgba(0,0,0,.8)', minWidth:60, zIndex:99,
            }}>
              {SPEEDS.map(s => (
                <button key={s} onClick={() => applySpeed(s)}
                  className="vp-menu-item"
                  style={{ padding:'8px 14px', background:speed===s?'rgba(59,130,246,.4)':'transparent', color:speed===s?'#93c5fd':'rgba(148,163,184,.8)' }}>
                  {s===1?'1×':`${s}×`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <audio ref={audioRef} src={src} {...(useCredentials ? { crossOrigin: 'use-credentials' } : {})}
        onTimeUpdate={() => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); }}
        onLoadedMetadata={trySetAudioDuration}
        onDurationChange={trySetAudioDuration}
        onCanPlay={trySetAudioDuration}
        onCanPlayThrough={trySetAudioDuration}
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
const [streamUrl, setStreamUrl] = useState(null);

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

// Close kebab menu on any scroll so it doesn't drift away from its button
useEffect(() => {
  if (!showMenu) return;
  const close = () => setShowMenu(false);
  // capture: true catches scroll on any scrollable ancestor, not just window
  window.addEventListener('scroll', close, { capture: true, passive: true });
  return () => window.removeEventListener('scroll', close, { capture: true });
}, [showMenu]);

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

const openViewer = async () => {
  setShowMenu(false);
  setStreamUrl(null); // reset any previous URL
  setShowViewer(true);
  // For video/audio: fetch a direct Google Drive URL so the browser
  // streams from Google's CDN instead of proxying through the Render server.
  const type = file.metadata?.type;
  if (type === 'video' || type === 'audio') {
    try {
      const res = await axios.get(`${backendUrl}/api/files/stream-url/${file._id}`);
      if (res.data?.url) setStreamUrl(res.data.url);
    } catch (err) {
      console.warn('Could not get direct stream URL, falling back to proxy:', err.message);
      // streamUrl stays null → falls back to previewUrl below
    }
  }
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
                <div style={{
                  width: 900,
                  height: 620,
                  maxWidth: '92vw',
                  maxHeight: '78vh',
                  background: '#000',
                  borderRadius: 12,
                  border: '1px solid rgba(59,130,246,.2)',
                  boxShadow: '0 24px 64px rgba(0,0,0,.7)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0,
                  flexGrow: 0,
                }}>
                  <img
                    src={previewUrl}
                    crossOrigin="use-credentials"
                    alt={file.filename}
                    style={{
                      maxWidth: '100%', maxHeight: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      borderRadius: 8,
                    }}
                    draggable={false}
                  />
                </div>
              )}
              {type === 'video' && <CustomVideoPlayer src={streamUrl || previewUrl} useCredentials={!streamUrl} />}
              {type === 'audio' && <CustomAudioPlayer src={streamUrl || previewUrl} filename={file.filename} fileSize={file.length} useCredentials={!streamUrl} />}
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
