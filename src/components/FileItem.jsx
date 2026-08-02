import React, { useState, useEffect, useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

// Utility for conditional class names
const cn = (...classes) => classes.filter(Boolean).join(' ');

// Error Boundary for Media Player to prevent uncaught white screen crashes
class MediaViewerErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("MediaViewerErrorBoundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center select-none" style={{ background: 'rgba(8,14,28,0.98)' }}>
          <div className="max-w-md w-full bg-slate-900 border border-white/15 p-6 rounded-3xl shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 flex items-center justify-center font-bold text-xl">✕</div>
            <h3 className="text-base font-bold text-white">Playback Error</h3>
            <p className="text-xs text-white/60">An unexpected rendering issue occurred while initializing the media viewer.</p>
            {this.state.error && (
              <div className="w-full bg-black/60 border border-red-500/30 p-3 rounded-xl text-left overflow-x-auto">
                <p className="text-[11px] font-mono text-red-300 break-all">{this.state.error.toString()}</p>
              </div>
            )}
            <button
              onClick={() => this.props.onClose && this.props.onClose()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg"
            >
              Close Viewer
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Robust file type detector (handles metadata, direct type, mimetype, and file extension)
const getFileType = (f) => {
  if (!f) return 'unknown';
  if (f.metadata?.type) return f.metadata.type;
  if (f.type) return f.type;
  const mime = (f.contentType || f.mimetype || '').toLowerCase();
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('image/')) return 'image';
  const ext = (f.filename || '').split('.').pop().toLowerCase();
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v', '3gp', 'flv'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return 'image';
  return 'unknown';
};

// ─── Custom Premium Icons ───────────────────────────────────────────────────
const Icons = {
  Play: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M8 5v14l11-7z"/></svg>,
  Pause: () => <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>,
  VolumeHigh: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 0 1 0 12.728M16.463 8.288a5.25 5.25 0 0 1 0 7.424M6.75 8.25l4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/></svg>,
  VolumeMute: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75 19.5 12m0 0 2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6 4.72-4.72a.75.75 0 0 1 1.28.53v15.88a.75.75 0 0 1-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.009 9.009 0 0 1 2.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75Z"/></svg>,
  FullscreenExit: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9V4.5M15 9h4.5M15 9l5.25-5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25"/></svg>,
  FullscreenEnter: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75v4.5m0-4.5h-4.5m4.5 0L15 9M20.25 20.25v-4.5m0 4.5h-4.5m4.5 0l-6-6"/></svg>,
  Forward10: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 3a9 9 0 1 1 -8.44 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12.5 3v4.5M12.5 3h-4.5" />
      <text x="12" y="15.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">10</text>
    </svg>
  ),
  Replay10: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3a9 9 0 1 0 8.44 6" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 3v4.5M11.5 3h4.5" />
      <text x="12" y="15.5" textAnchor="middle" fill="currentColor" stroke="none" fontSize="7.5" fontWeight="bold" fontFamily="sans-serif">10</text>
    </svg>
  ),
  Settings: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.43l-1.003.828c-.293.241-.438.613-.43.992a6.723 6.723 0 0 1 0 .255c-.008.378.137.75.43.99l1.005.831a1.125 1.125 0 0 1 .26 1.43l-1.297 2.247a1.125 1.125 0 0 1-1.37.491l-1.216-.456c-.356-.133-.751-.072-1.076.124a6.57 6.57 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.43l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 0 1 0-.255c.007-.378-.138-.75-.43-.99l-1.004-.831a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.645-.869l.214-1.28Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"/></svg>,
  PiP: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11v6a2 2 0 01-2 2H7a2 2 0 01-2-2V7a2 2 0 012-2h6m6 0v4m0-4h-4m4 0L13 11"/></svg>,
  Theater: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 18h16M4 12h16"/></svg>,
  Help: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M12 18h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>,
  Repeat: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  Music: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"/></svg>,
};
// Compact Modern Zoomable Image Viewer Container
const ImageViewerContainer = ({ src, filename }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleWheel = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY > 0 ? -0.15 : 0.15;
    setScale((s) => {
      const next = Math.min(Math.max(s + delta, 1), 3.5);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2);
    }
  };

  const handleMouseDown = (e) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="relative w-full max-w-4xl h-[62vh] sm:h-[70vh] bg-slate-950/95 border border-white/10 rounded-2xl overflow-hidden flex items-center justify-center select-none shadow-2xl backdrop-blur-2xl cursor-default"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <img
        src={src}
        alt={filename}
        className="max-w-full max-h-full object-contain transition-transform duration-200 ease-out pointer-events-none"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
        }}
        draggable={false}
      />
    </div>
  );
};

// ─── Custom Modern YouTube-Style Liquid Glass Video Player ────────────────────
const CustomVideoPlayer = ({ src, fallbackSrc, filename }) => {
  const videoRef = useRef(null);
  const wrapRef = useRef(null);
  const settingsRef = useRef(null);
  const hoverScrubRef = useRef(null);

  const [videoUrl, setVideoUrl] = useState(src);
  const [usingFallback, setUsingFallback] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [showCtrl, setShowCtrl] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [forcedOrientation, setForcedOrientation] = useState(null);
  const [isFS, setIsFS] = useState(false);
  const [isTheater, setIsTheater] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [showHelp, setShowHelp] = useState(false);

  // Quick skip ripple animations
  const [leftRipple, setLeftRipple] = useState(false);
  const [rightRipple, setRightRipple] = useState(false);
  const lastClickRef = useRef({ time: 0, x: 0 });

  const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  const hideTimer = useRef(null);

  const applyOrientation = useCallback((overrideMode) => {
    if (typeof window !== 'undefined' && window.screen && window.screen.orientation && window.screen.orientation.lock) {
      const isLandscape = videoRef.current ? videoRef.current.videoWidth >= videoRef.current.videoHeight : true;
      const targetMode = overrideMode || (isLandscape ? 'landscape' : 'portrait');
      window.screen.orientation.lock(targetMode).catch(() => {});
    }
  }, []);

  // ── Smart Dynamic Fallback Mechanism for Direct Drive URLs ──
  const handleVideoError = useCallback(() => {
    if (!usingFallback && fallbackSrc && videoUrl !== fallbackSrc) {
      console.warn("Direct Google Drive stream URL failed/blocked by CORS. Falling back to byte-range proxy URL...");
      setUsingFallback(true);
      setVideoUrl(fallbackSrc);
      setIsBuffering(true);
    } else {
      console.error("Video player encountered an unrecoverable rendering or network error.");
      setIsBuffering(false);
    }
  }, [usingFallback, fallbackSrc, videoUrl]);

  useEffect(() => {
    setVideoUrl(src);
    setUsingFallback(false);
  }, [src]);

  // 60fps silky smooth video time & progress update loop
  useEffect(() => {
    let animId;
    const update60fpsVideoProgress = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setCurrentTime(videoRef.current.currentTime);
        if (videoRef.current.buffered && videoRef.current.buffered.length > 0) {
          setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
        }
        animId = requestAnimationFrame(update60fpsVideoProgress);
      }
    };

    if (playing) {
      animId = requestAnimationFrame(update60fpsVideoProgress);
    }
    return () => cancelAnimationFrame(animId);
  }, [playing]);

  const nudgeControls = useCallback(() => {
    setShowCtrl(true);
    clearTimeout(hideTimer.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimer.current = setTimeout(() => setShowCtrl(false), 3000);
    }
  }, []);

  const toggleLoop = () => {
    const nextLoop = !isLooping;
    setIsLooping(nextLoop);
    if (videoRef.current) {
      videoRef.current.loop = nextLoop;
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFS = !!document.fullscreenElement;
      setIsFS(inFS);
      if (inFS) {
        applyOrientation(forcedOrientation);
      } else {
        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          try { window.screen.orientation.unlock(); } catch (_) {}
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [applyOrientation, forcedOrientation]);

  const autoPlayPendingRef = useRef(false);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      autoPlayPendingRef.current = true;
      setPlaying(true);
      videoRef.current.play().then(() => {
        autoPlayPendingRef.current = false;
      }).catch((err) => {
        console.warn("Video play deferred until media buffer arrives:", err.message);
      });
    } else {
      autoPlayPendingRef.current = false;
      videoRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const seekRelative = useCallback((seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
  }, []);

  const adjustVolume = useCallback((amount) => {
    if (!videoRef.current) return;
    setVolume(prev => {
      const newVol = Math.max(0, Math.min(1, prev + amount));
      videoRef.current.volume = newVol;
      setMuted(newVol === 0);
      return newVol;
    });
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    setMuted(prev => {
      const nextMute = !prev;
      videoRef.current.muted = nextMute;
      return nextMute;
    });
  }, []);

  const toggleFS = useCallback(() => {
    if (!document.fullscreenElement) {
      wrapRef.current?.requestFullscreen?.().then(() => {
        applyOrientation(forcedOrientation);
      }).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => {
        if (typeof window !== 'undefined' && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
          try { window.screen.orientation.unlock(); } catch (_) {}
        }
      }).catch(() => {});
    }
  }, [applyOrientation, forcedOrientation]);

  const togglePiP = useCallback(async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (videoRef.current && document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn("Picture-in-picture failed:", e);
    }
  }, []);

  // ── Keyboard Shortcuts inside Player Context ──
  const handleKeyDown = useCallback((e) => {
    if (!videoRef.current) return;
    const key = e.key.toLowerCase();
    
    // Skip if user is typing in any text fields
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (key === ' ' || key === 'k') {
      e.preventDefault(); e.stopPropagation();
      togglePlay();
    } else if (key === 'f') {
      e.preventDefault(); e.stopPropagation();
      toggleFS();
    } else if (key === 'p') {
      e.preventDefault(); e.stopPropagation();
      togglePiP();
    } else if (key === 't') {
      e.preventDefault(); e.stopPropagation();
      setIsTheater(prev => !prev);
    } else if (key === 'm') {
      e.preventDefault(); e.stopPropagation();
      toggleMute();
    } else if (key === 'j') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(-10);
    } else if (key === 'l') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(10);
    } else if (key === '?') {
      e.preventDefault(); e.stopPropagation();
      setShowHelp(prev => !prev);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(-5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      adjustVolume(0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      adjustVolume(-0.1);
    } else if (e.key !== 'Escape') {
      e.stopPropagation();
    }
  }, [togglePlay, toggleFS, togglePiP, toggleMute, seekRelative, adjustVolume]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
    if (videoRef.current.buffered.length) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }
  };

  const handleSeek = (e) => {
    const v = parseFloat(e.target.value);
    setCurrentTime(v);
    if (videoRef.current) videoRef.current.currentTime = v;
  };

  const handleScrubberMouseMove = (e) => {
    if (!hoverScrubRef.current || !duration) return;
    const rect = hoverScrubRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleVolChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = (v === 0);
    }
  };

  const handleSpeedSelect = (s) => {
    setSpeed(s);
    setShowSettingsMenu(false);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  // ── YouTube-style Double-Click / Double-Tap Skip Handler ──
  const handleVideoClick = (e) => {
    const now = Date.now();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const isLeft = clickX < rect.width * 0.4;
    const isRight = clickX > rect.width * 0.6;

    if (now - lastClickRef.current.time < 300) {
      // Double click detected!
      if (isLeft) {
        seekRelative(-10);
        setLeftRipple(true);
        setTimeout(() => setLeftRipple(false), 600);
      } else if (isRight) {
        seekRelative(10);
        setRightRipple(true);
        setTimeout(() => setRightRipple(false), 600);
      } else {
        togglePlay();
      }
    } else {
      togglePlay();
    }
    lastClickRef.current = { time: now, x: clickX };
  };

  const fmtTime = (t) => {
    if (!t || isNaN(t) || !isFinite(t)) return '0:00';
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
  };

  const durationVal = duration || (videoRef.current ? videoRef.current.duration : 0);
  const progressPercent = durationVal > 0 ? Math.min(100, Math.max(0, (currentTime / durationVal) * 100)) : 0;
  const bufferPercent = durationVal > 0 ? Math.min(100, Math.max(0, (buffered / durationVal) * 100)) : 0;

  // Decide if we should omit crossOrigin for direct Drive URLs to avoid CORS block
  const isDirectDrive = videoUrl && videoUrl.includes('googleapis.com');
  const hasStreamToken = videoUrl && videoUrl.includes('?st=');
  const needsCredentials = !isDirectDrive && !hasStreamToken;

  return (
    <div onClick={(e) => e.stopPropagation()} className="relative w-full flex flex-col items-center justify-center">
      {/* ── Ambient Cinema Glow ── */}
      <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/30 via-indigo-500/20 to-cyan-500/30 rounded-3xl blur-3xl opacity-60 scale-105 pointer-events-none transition-all duration-700 animate-pulse" />

      <div
        ref={wrapRef}
        className={cn(
          "relative w-full bg-slate-950 text-white overflow-hidden group border border-white/10 transition-all duration-300 shadow-2xl select-none flex flex-col items-center justify-center backdrop-blur-2xl rounded-2xl",
          isFS ? "fixed inset-0 h-screen w-screen rounded-none max-w-none z-[9999] bg-black text-white" : isTheater ? "max-w-[1100px] max-h-[82vh]" : "max-w-[760px] sm:max-w-[820px] max-h-[70vh] sm:max-h-[74vh]",
          !showCtrl && playing ? "cursor-none" : ""
        )}
        onMouseMove={nudgeControls}
        onMouseLeave={() => playing && setShowCtrl(false)}
        onTouchStart={nudgeControls}
      >
        {/* ── Video Canvas Container ── */}
        <div
          className={cn(
            "relative w-full flex items-center justify-center bg-black overflow-hidden",
            isFS ? "h-full w-full max-h-none aspect-auto" : "aspect-video max-h-[56vh] sm:max-h-[62vh]",
            !showCtrl && playing ? "cursor-none" : "cursor-pointer"
          )}
          onClick={handleVideoClick}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            {...(needsCredentials ? { crossOrigin: 'use-credentials' } : {})}
            preload="auto"
            className={cn("w-full h-full object-contain", !showCtrl && playing ? "cursor-none" : "")}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={() => videoRef.current && setDuration(videoRef.current.duration)}
            onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
            onPlay={() => { setPlaying(true); nudgeControls(); }}
            onPause={() => { setPlaying(false); setShowCtrl(true); }}
            onEnded={() => setPlaying(false)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => {
              setIsBuffering(false);
              if (autoPlayPendingRef.current && videoRef.current && videoRef.current.paused) {
                videoRef.current.play().then(() => {
                  autoPlayPendingRef.current = false;
                  setPlaying(true);
                }).catch((err) => console.warn('Video auto-play onCanPlay deferred:', err.message));
              }
            }}
            onError={handleVideoError}
          />

          {/* ── YouTube-Style Skip Ripple Overlays ── */}
          {leftRipple && (
            <div className="absolute left-0 inset-y-0 w-1/3 bg-white/15 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold text-sm rounded-r-full animate-ping pointer-events-none z-20">
              <Icons.Replay10 />
              <span className="mt-1 font-mono">-10s</span>
            </div>
          )}
          {rightRipple && (
            <div className="absolute right-0 inset-y-0 w-1/3 bg-white/15 backdrop-blur-sm flex flex-col items-center justify-center text-white font-bold text-sm rounded-l-full animate-ping pointer-events-none z-20">
              <Icons.Forward10 />
              <span className="mt-1 font-mono">+10s</span>
            </div>
          )}

          {/* ── Buffer / Loader Indicator ── */}
          {isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/60 backdrop-blur-md pointer-events-none z-20">
              <div className="flex flex-col items-center gap-3 bg-black/40 px-6 py-4 rounded-2xl border border-white/10 shadow-2xl">
                <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="text-xs font-semibold text-blue-400 tracking-wider">
                  {isDirectDrive ? 'FAST DIRECT DRIVE STREAMING...' : 'BUFFERING...'}
                </span>
              </div>
            </div>
          )}

          {/* ── Big Center Play/Pause Toggle Indicator ── */}
          {!playing && !isBuffering && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/25 transition-all pointer-events-none z-10">
              <div className="w-16 h-16 rounded-full bg-black/30 text-white flex items-center justify-center shadow-2xl border border-white/20 transform scale-100 hover:scale-110 active:scale-95 transition-all backdrop-blur-md">
                <Icons.Play />
              </div>
            </div>
          )}
        </div>

        {/* ── Liquid Glass Controller Bar ── */}
        <div
          className={cn(
            "w-full bg-slate-950/90 border-t border-white/15 sm:border sm:border-white/15 backdrop-blur-xl p-2.5 sm:p-4 sm:rounded-2xl flex flex-col gap-2 transition-all duration-300 z-30 shadow-2xl",
            isFS ? "absolute bottom-2 sm:bottom-3 inset-x-2 sm:inset-x-3 rounded-xl sm:rounded-2xl" : "relative sm:absolute sm:bottom-2 sm:inset-x-2 sm:bottom-3 sm:inset-x-3 rounded-b-2xl sm:rounded-2xl",
            !showCtrl && playing && isFS ? "opacity-0 translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"
          )}
        >
          {/* ── YouTube Scrubber with Hover Time Tooltip ── */}
          <div
            ref={hoverScrubRef}
            className="relative flex items-center w-full h-3 group/scrub cursor-pointer"
            onMouseMove={handleScrubberMouseMove}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Live Hover Time Tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute bottom-full mb-2 -translate-x-1/2 px-2 py-1 bg-slate-900/90 border border-white/15 text-white text-[11px] font-mono rounded-md shadow-xl backdrop-blur-md pointer-events-none z-40"
                style={{ left: `${hoverPos}%` }}
              >
                {fmtTime(hoverTime)}
              </div>
            )}

            {/* Track Background */}
            <div className="absolute inset-y-0 left-0 right-0 bg-white/15 rounded-full h-1.5 group-hover/scrub:h-2 transition-all" />
            {/* Buffer bar */}
            <div className="absolute inset-y-0 left-0 bg-blue-400/30 rounded-full h-1.5 group-hover/scrub:h-2 transition-all" style={{ width: `${bufferPercent}%` }} />
            {/* Progress bar (60fps liquid tracking) */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-sky-400 rounded-full h-1.5 group-hover/scrub:h-2.5 transition-[width,height] duration-75 ease-linear shadow-md"
              style={{ width: `${progressPercent}%` }}
            />
            {/* Interactive Input Range */}
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.001}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            {/* Scrubber Knob (Liquid 60fps movement) */}
            <div
              className="absolute w-4 h-4 bg-white rounded-full shadow-xl scale-0 group-hover/scrub:scale-100 transition-[transform,left] duration-75 ease-linear pointer-events-none ring-2 ring-blue-500 z-20"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>

          {/* ── Controls Row ── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 sm:gap-3">
              {/* Play/Pause Button */}
              <button onClick={togglePlay} className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center justify-center">
                {isBuffering && playing ? (
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : playing ? (
                  <Icons.Pause />
                ) : (
                  <Icons.Play />
                )}
              </button>

              {/* Skip 10s Replay / Forward */}
              <button onClick={() => seekRelative(-10)} className="p-1.5 sm:p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all" title="-10 seconds (J)">
                <Icons.Replay10 />
              </button>
              <button onClick={() => seekRelative(10)} className="p-1.5 sm:p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all" title="+10 seconds (L)">
                <Icons.Forward10 />
              </button>

              {/* Time Display */}
              <div className="text-[10px] sm:text-xs text-white/80 font-mono tracking-wider ml-0.5 sm:ml-1 whitespace-nowrap">
                <span>{fmtTime(currentTime)}</span>
                <span className="mx-0.5 sm:mx-1 text-white/30">/</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              {/* Volume Control: Tap to Mute/Unmute on Mobile, Hover Slider on Desktop */}
              <div className="flex items-center gap-1.5 group/volume">
                <button onClick={toggleMute} className="p-1.5 sm:p-2 rounded-xl text-white/90 hover:text-white hover:bg-white/10 transition-all" title={muted ? "Unmute" : "Mute"}>
                  {muted || volume === 0 ? <Icons.VolumeMute /> : <Icons.VolumeHigh />}
                </button>
                <div className="hidden sm:flex relative w-0 group-hover/volume:w-16 sm:group-hover/volume:w-20 transition-all duration-300 h-1.5 overflow-hidden items-center">
                  <div className="absolute inset-x-0 h-1.5 bg-white/20 rounded-full" />
                  <div className="absolute left-0 h-1.5 bg-blue-500 rounded-full" style={{ width: `${muted ? 0 : volume * 100}%` }} />
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={muted ? 0 : volume}
                    onChange={handleVolChange}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Playback Speed Menu (Desktop only) */}
              <div className="hidden sm:block relative" ref={speedRef}>
                <button
                  onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                  className="px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-xl border border-white/10 text-[11px] sm:text-xs font-semibold text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center gap-0.5 sm:gap-1"
                >
                  <span>{speed === 1 ? '1.0x' : `${speed}x`}</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-28 sm:w-32 rounded-xl bg-slate-950/95 border border-white/15 backdrop-blur-2xl overflow-hidden z-40 shadow-2xl animate-slideUpFluid origin-bottom-right">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedSelect(s)}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-xs transition-colors font-medium flex items-center justify-between",
                          s === speed ? "bg-blue-600 text-white font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        <span>{s === 1 ? 'Normal' : `${s}x`}</span>
                        {s === speed && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Mobile Settings Gear Button (Mobile only) */}
              <button
                onClick={() => setShowMobileSettings(true)}
                className="sm:hidden p-1.5 rounded-xl border border-white/10 text-white/80 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center"
                title="Player Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Picture-in-Picture (Desktop only) */}
              <button onClick={togglePiP} className="hidden sm:inline-flex p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all" title="Picture-in-Picture (P)">
                <Icons.PiP />
              </button>

              {/* Theater Mode (Desktop only) */}
              <button onClick={() => setIsTheater(!isTheater)} className={cn("hidden sm:inline-flex p-2 rounded-xl transition-all", isTheater ? "text-blue-400 bg-blue-500/20 border border-blue-500/30" : "text-white/80 hover:text-white hover:bg-white/10")} title="Theater Mode (T)">
                <Icons.Theater />
              </button>

              {/* Fullscreen */}
              <button onClick={toggleFS} className="p-1.5 sm:p-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-all" title="Fullscreen (F)">
                {isFS ? <Icons.FullscreenExit /> : <Icons.FullscreenEnter />}
              </button>

              {/* Shortcuts Help (Desktop only) */}
              <button onClick={() => setShowHelp(true)} className="hidden sm:inline-flex p-2 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all" title="Shortcuts (?)">
                <Icons.Help />
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile Player Settings Modal Overlay ── */}
        {showMobileSettings && (
          <div className="fixed inset-0 z-[100] bg-slate-950/85 backdrop-blur-md flex items-end sm:items-center justify-center p-4 animate-fadeIn" onClick={() => setShowMobileSettings(false)}>
            <div className="w-full max-w-sm bg-slate-900 border border-white/15 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-white animate-slideUpFluid" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  <span>⚙️ Player Settings</span>
                </h3>
                <button onClick={() => setShowMobileSettings(false)} className="text-white/60 hover:text-white p-1">
                  ✕
                </button>
              </div>

              {/* Playback Speed */}
              <div>
                <label className="text-xs font-semibold text-white/70 mb-2 block">Playback Speed</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
                    <button
                      key={s}
                      onClick={() => { handleSpeedSelect(s); setShowMobileSettings(false); }}
                      className={cn(
                        "py-2 text-xs font-bold rounded-xl border transition-all",
                        speed === s ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                      )}
                    >
                      {s === 1 ? '1.0x Normal' : `${s}x`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Screen Rotation / Orientation Toggle */}
              <div>
                <label className="text-xs font-semibold text-white/70 mb-2 block">Screen Rotation</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      setForcedOrientation('landscape');
                      applyOrientation('landscape');
                    }}
                    className={cn(
                      "py-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all",
                      forcedOrientation === 'landscape' ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                  >
                    <span>🔄 Landscape</span>
                  </button>
                  <button
                    onClick={() => {
                      setForcedOrientation('portrait');
                      applyOrientation('portrait');
                    }}
                    className={cn(
                      "py-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all",
                      forcedOrientation === 'portrait' ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                  >
                    <span>📱 Portrait</span>
                  </button>
                  <button
                    onClick={() => {
                      setForcedOrientation(null);
                      if (typeof window !== 'undefined' && window.screen && window.screen.orientation && window.screen.orientation.unlock) {
                        try { window.screen.orientation.unlock(); } catch (_) {}
                      }
                    }}
                    className={cn(
                      "py-2 text-xs font-bold rounded-xl border flex flex-col items-center gap-1 transition-all",
                      forcedOrientation === null ? "bg-blue-600 border-blue-400 text-white shadow-lg" : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    )}
                  >
                    <span>✨ Auto</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Shortcuts Help Modal Overlay ── */}
        {showHelp && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 z-50 animate-fadeIn">
            <div className="bg-slate-900/90 border border-white/15 p-6 rounded-2xl max-w-sm w-full shadow-2xl relative">
              <button onClick={() => setShowHelp(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
                ✕
              </button>
              <h3 className="text-white text-base font-bold mb-4 flex items-center gap-2">
                <Icons.Help /> Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs text-white/80 font-mono">
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">Space</span> / <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">K</span></div>
                <div>Play / Pause</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">F</span></div>
                <div>Fullscreen</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">J</span> / <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">L</span></div>
                <div>-10s / +10s</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">P</span></div>
                <div>Picture-in-Picture</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">T</span></div>
                <div>Theater Mode</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">M</span></div>
                <div>Mute</div>
                <div><span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">↑</span> / <span className="bg-white/10 px-1.5 py-0.5 rounded text-white font-bold">↓</span></div>
                <div>Volume +/-</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Custom Liquid Glass Audio Dashboard Player with Real Visualizer ────────────
const CustomAudioPlayer = ({ src, fallbackSrc, filename, fileSize, thumbnail }) => {
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const speedRef = useRef(null);
  const animationRef = useRef(null);

  const [audioUrl, setAudioUrl] = useState(src);
  const [usingFallback, setUsingFallback] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(true);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

  // 60fps smooth audio time update loop
  useEffect(() => {
    let animId;
    const updateSmoothAudioTime = () => {
      if (audioRef.current && playing) {
        setCurrentTime(audioRef.current.currentTime);
        animId = requestAnimationFrame(updateSmoothAudioTime);
      }
    };
    if (playing) {
      animId = requestAnimationFrame(updateSmoothAudioTime);
    }
    return () => cancelAnimationFrame(animId);
  }, [playing]);

  useEffect(() => {
    const handleOutside = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const autoPlayPendingRef = useRef(false);

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      autoPlayPendingRef.current = true;
      setPlaying(true);
      audioRef.current.play().then(() => {
        autoPlayPendingRef.current = false;
      }).catch((err) => {
        console.warn("Audio play deferred until media buffer is ready:", err.message);
      });
    } else {
      autoPlayPendingRef.current = false;
      audioRef.current.pause();
      setPlaying(false);
    }
  }, []);

  const seekRelative = useCallback((seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, Math.min(audioRef.current.duration || 0, audioRef.current.currentTime + seconds));
  }, []);

  const adjustVolume = useCallback((amount) => {
    if (!audioRef.current) return;
    setVolume(prev => {
      const newVol = Math.max(0, Math.min(1, prev + amount));
      audioRef.current.volume = newVol;
      setMuted(newVol === 0);
      return newVol;
    });
  }, []);

  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;
    setMuted(prev => {
      const nextMute = !prev;
      audioRef.current.muted = nextMute;
      return nextMute;
    });
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!audioRef.current) return;
    const key = e.key.toLowerCase();
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;

    if (key === ' ' || key === 'k') {
      e.preventDefault(); e.stopPropagation();
      togglePlay();
    } else if (key === 'm') {
      e.preventDefault(); e.stopPropagation();
      toggleMute();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(5);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault(); e.stopPropagation();
      seekRelative(-5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); e.stopPropagation();
      adjustVolume(0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault(); e.stopPropagation();
      adjustVolume(-0.1);
    } else if (e.key !== 'Escape') {
      e.stopPropagation();
    }
  }, [togglePlay, toggleMute, seekRelative, adjustVolume]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [handleKeyDown]);

  useEffect(() => {
    setAudioUrl(src);
    setUsingFallback(false);
    setIsAudioLoading(true);
    setPlaying(false);
    autoPlayPendingRef.current = false;
  }, [src]);

  const handleAudioError = useCallback(() => {
    if (!usingFallback && fallbackSrc && audioUrl !== fallbackSrc) {
      console.warn('Audio direct stream failed. Falling back to proxy URL...');
      setUsingFallback(true);
      setAudioUrl(fallbackSrc);
    } else {
      console.error('Audio player encountered an unrecoverable error.');
    }
  }, [usingFallback, fallbackSrc, audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = canvas.width;
    let height = canvas.height;

    const render = () => {
      animationRef.current = requestAnimationFrame(render);
      ctx.clearRect(0, 0, width, height);

      const barWidth = 4;
      const gap = 3;
      const barCount = Math.floor(width / (barWidth + gap));
      const dataArray = new Uint8Array(barCount);

      if (playing) {
        const time = Date.now() * 0.007 * speed;
        for (let i = 0; i < barCount; i++) {
          const wave1 = Math.sin(i * 0.22 + time * 1.5);
          const wave2 = Math.cos(i * 0.35 - time * 2.1);
          const wave3 = Math.sin(i * 0.12 + time * 0.9);
          const norm = (wave1 + wave2 + wave3 + 3) / 6;
          const volMult = muted ? 0 : volume;
          dataArray[i] = Math.min(255, (25 + norm * 200 + Math.random() * 15) * volMult);
        }
      } else {
        for (let i = 0; i < barCount; i++) {
          dataArray[i] = 12 + Math.abs(Math.sin(i * 0.2)) * 12;
        }
      }

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i];
        const barHeight = Math.max(4, (val / 255) * height * 1.25);
        const x = i * (barWidth + gap);
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, y, 0, height);
        grad.addColorStop(0, '#38bdf8');
        grad.addColorStop(0.5, '#3b82f6');
        grad.addColorStop(1, '#1d4ed8');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [playing, volume, muted, speed]);

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleSeek = (e) => {
    const v = parseFloat(e.target.value);
    setCurrentTime(v);
    if (audioRef.current) audioRef.current.currentTime = v;
  };

  const handleVolChange = (e) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = (v === 0);
    }
  };

  const handleSpeedSelect = (s) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    if (audioRef.current) audioRef.current.playbackRate = s;
  };

  const fmtSize = (b) => {
    if (!b) return '';
    const k = 1024, s = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(b) / Math.log(k));
    return parseFloat((b / Math.pow(k, i)).toFixed(1)) + ' ' + s[i];
  };

  const fmtTime = (t) => {
    if (!t || isNaN(t) || !isFinite(t)) return '0:00';
    const m = Math.floor(t / 60);
    const s = String(Math.floor(t % 60)).padStart(2, '0');
    return `${m}:${s}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const isDirectDrive = audioUrl && audioUrl.includes('googleapis.com');
  const hasStreamToken = audioUrl && audioUrl.includes('?st=');
  const needsCredentials = !isDirectDrive && !hasStreamToken;

  return (
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-[460px] bg-slate-900/80 border border-white/15 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl relative select-none flex flex-col gap-5 cursor-default">
      {/* ── Top Header ESC Hint ── */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Audio Player</span>
        <span className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">Press ESC to exit</span>
      </div>

      {/* ── Header Metadata & Spinning Vinyl Art ── */}
      <div className="flex items-center gap-4">
        {/* Vinyl Disk Artwork */}
        <div className={cn(
          "w-16 h-16 rounded-full bg-slate-950 border-2 border-white/20 flex items-center justify-center shrink-0 relative shadow-2xl overflow-hidden transition-all duration-700",
          playing && !isAudioLoading ? "animate-spin" : ""
        )} style={{ animationDuration: '12s' }}>
          {isAudioLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-20">
              <svg className="animate-spin h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}
          {thumbnail ? (
            <img src={thumbnail} alt={`Album art of ${filename}`} className="w-full h-full object-cover rounded-full" />
          ) : (
            <>
              {/* Vinyl grooves */}
              <div className="absolute inset-1 rounded-full border border-white/10 pointer-events-none" />
              <div className="absolute inset-3 rounded-full border border-white/10 pointer-events-none" />
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-sky-400 border border-white/40 flex items-center justify-center shadow-inner">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-white text-base font-semibold truncate" title={filename}>{filename}</p>
          {fileSize > 0 && <p className="text-white/40 text-xs mt-0.5 font-mono">{fmtSize(fileSize)}</p>}
        </div>
      </div>

      {/* ── Real-time Frequency Spectrum Equalizer Canvas ── */}
      <div className="relative w-full h-24 bg-black/40 rounded-2xl overflow-hidden border border-white/10 flex items-end p-2 shadow-inner">
        <canvas ref={canvasRef} width="400" height="80" className="w-full h-full" />
      </div>

      {/* ── Timeline & Controls ── */}
      <div className="flex flex-col gap-4">
        {/* Scrubber */}
        <div className="flex flex-col gap-1.5">
          <div className="relative flex items-center w-full h-2 group cursor-pointer">
            <div className="absolute inset-x-0 h-1.5 bg-white/15 rounded-full" />
            <div className="absolute left-0 h-1.5 bg-gradient-to-r from-blue-500 to-sky-400 rounded-full" style={{ width: `${progressPercent}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>
          <div className="flex justify-between text-[11px] text-white/50 font-mono">
            <span>{fmtTime(currentTime)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white flex items-center justify-center shadow-xl transform active:scale-95 transition-all border border-white/20 relative"
              title={playing ? "Pause" : "Play"}
            >
              {isAudioLoading && playing ? (
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : playing ? (
                <Icons.Pause />
              ) : (
                <Icons.Play />
              )}
            </button>

            <button onClick={() => seekRelative(-10)} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Icons.Replay10 />
            </button>
            <button onClick={() => seekRelative(10)} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <Icons.Forward10 />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {/* Speed selection */}
            <div className="relative" ref={speedRef}>
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="px-2.5 py-1 rounded-xl border border-white/10 text-xs font-semibold text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              >
                {speed === 1 ? '1.0x' : `${speed}x`}
              </button>
              {showSpeedMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-28 rounded-xl bg-slate-950/95 border border-white/15 shadow-2xl overflow-hidden z-40 backdrop-blur-2xl animate-slideUpFluid origin-bottom-right">
                    {SPEEDS.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSpeedSelect(s)}
                        className={cn(
                          "w-full px-3 py-1.5 text-left text-xs transition-colors font-medium",
                          s === speed ? "bg-blue-600 text-white font-bold" : "text-white/70 hover:bg-white/10 hover:text-white"
                        )}
                      >
                        {`${s}x`}
                      </button>
                    ))}
                </div>
              )}
            </div>

            {/* Loop Toggle */}
            <button
              onClick={() => {
                const next = !isLooping;
                setIsLooping(next);
                if (audioRef.current) audioRef.current.loop = next;
              }}
              className={cn("p-2 rounded-xl transition-all", isLooping ? "text-blue-400 bg-blue-500/20 border border-blue-500/30" : "text-white/60 hover:text-white hover:bg-white/10")}
              title="Repeat Track"
            >
              <Icons.Repeat />
            </button>

            {/* Volume: Tap to Mute/Unmute on Mobile, Hover Slider on Desktop */}
            <div className="flex items-center gap-1 group/vol">
              <button onClick={toggleMute} className="p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors" title={muted ? "Unmute" : "Mute"}>
                {muted || volume === 0 ? <Icons.VolumeMute /> : <Icons.VolumeHigh />}
              </button>
              <div className="hidden sm:flex relative w-0 group-hover/vol:w-16 sm:group-hover/vol:w-20 transition-all duration-300 h-1.5 overflow-hidden items-center">
                <div className="absolute inset-x-0 h-1.5 bg-white/20 rounded-full" />
                <div className="absolute left-0 h-1.5 bg-blue-500 rounded-full" style={{ width: `${muted ? 0 : volume * 100}%` }} />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={muted ? 0 : volume}
                  onChange={handleVolChange}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={audioUrl}
        {...(needsCredentials ? { crossOrigin: 'use-credentials' } : {})}
        preload="auto"
        onTimeUpdate={handleTimeUpdate}
        onDurationChange={() => audioRef.current && setDuration(audioRef.current.duration)}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); setIsAudioLoading(false); }}
        onCanPlay={() => {
          setIsAudioLoading(false);
          if (autoPlayPendingRef.current && audioRef.current && audioRef.current.paused) {
            audioRef.current.play().then(() => {
              autoPlayPendingRef.current = false;
              setPlaying(true);
            }).catch((err) => console.warn('Audio auto-play onCanPlay deferred:', err.message));
          }
        }}
        onWaiting={() => setIsAudioLoading(true)}
        onPlaying={() => setIsAudioLoading(false)}
        onPlay={() => { setPlaying(true); setIsAudioLoading(false); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); autoPlayPendingRef.current = false; }}
        onError={handleAudioError}
      />
    </div>
  );
};

// ─── Main FileItem Component ──────────────────────────────────────────────────
const FileItem = ({ file, refresh, showDetails, darkMode, isSelected, onSelect, selectionMode, viewType }) => {
  const backendUrl = import.meta.env.VITE_BACKEND_URL;

  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [showViewer, setShowViewer] = useState(false);
  const [streamUrl, setStreamUrl] = useState(null);
  const [proxyUrl, setProxyUrl] = useState(null);
  const [isMediaLoading, setIsMediaLoading] = useState(false);

  const menuRef = useRef(null);
  const shareModalRef = useRef(null);
  const deleteModalRef = useRef(null);
  const shareLinkInputRef = useRef(null);

  // Close modals & overlays on outside clicks
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        const menuButton = menuRef.current.previousElementSibling;
        if (!menuButton || !menuButton.contains(event.target)) {
          setShowMenu(false);
        }
      }
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
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMenu, showShare, showDeleteConfirm, showViewer]);

  // Close dynamic dropdown on scroll
  useEffect(() => {
    if (!showMenu) return;
    const close = () => setShowMenu(false);
    window.addEventListener('scroll', close, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [showMenu]);

  // Escape key events & viewer shortcut isolation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') {
      if (showViewer) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        setShowViewer(false);
        return;
      }
      if (showShare) setShowShare(false);
      if (showDeleteConfirm) setShowDeleteConfirm(false);
      if (showMenu) setShowMenu(false);
      return;
    }

    if (showViewer) {
      if (document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.stopPropagation();
      }
    }
  }, [showShare, showDeleteConfirm, showMenu, showViewer]);

  // Lock body scroll when viewer modal is open
  useEffect(() => {
    if (showViewer) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [showViewer]);

  useEffect(() => {
    if (showShare || showDeleteConfirm || showMenu || showViewer) {
      window.addEventListener('keydown', handleKeyDown, { capture: true });
    } else {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    }
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [showShare, showDeleteConfirm, showMenu, showViewer, handleKeyDown]);

  const download = async () => {
    setShowMenu(false);
    setIsActionLoading(true);
    setDownloadProgress(0);
    try {
      const response = await axios({
        url: `${backendUrl}/api/files/download/${file._id}`,
        method: 'GET',
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (progressEvent.total && progressEvent.total > 0) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setDownloadProgress(percentCompleted);
          }
        },
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setIsActionLoading(false);
      setTimeout(() => setDownloadProgress(0), 1200);
    }
  };

  const deleteFile = async () => {
    setIsActionLoading(true);
    try {
      await axios.delete(`${backendUrl}/api/files/${file._id}`);
      setShowDeleteConfirm(false);
      refresh();
    } catch (err) {
      console.error('Delete failed:', err);
      setIsActionLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const share = async () => {
    setShowMenu(false);
    setIsActionLoading(true);
    setShareLink('');
    setCopied(false);
    setShowShare(true);
    try {
      const res = await axios.post(`${backendUrl}/api/files/share/${file._id}`);
      setShareLink(res.data.url);
    } catch (err) {
      console.error('Share failed:', err);
      setShowShare(false);
    } finally {
      setIsActionLoading(false);
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
    setStreamUrl(null);
    setProxyUrl(null);
    setShowViewer(true);
    const type = getFileType(file);
    if (type === 'video' || type === 'audio') {
      setIsMediaLoading(true);
      try {
        const res = await axios.get(`${backendUrl}/api/files/stream-url/${file._id}`);
        if (res.data?.url) setStreamUrl(res.data.url);
        if (res.data?.proxyUrl) setProxyUrl(res.data.proxyUrl);
      } catch (err) {
        console.warn('Could not retrieve direct stream URL, falling back to secure preview proxy:', err.message);
      } finally {
        setIsMediaLoading(false);
      }
    } else {
      setIsMediaLoading(false);
    }
  };

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
      return 'Invalid date';
    }
  };

  const FileTypeIcon = ({ type, darkMode, size = "h-10 w-10" }) => {
    const iconColor = darkMode ? "text-gray-400" : "text-gray-500";
    const icons = {
      image: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
      video: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
      audio: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" /></svg>,
      document: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
      other: <svg xmlns="http://www.w3.org/2000/svg" className={size} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    };
    return <div className={iconColor}>{icons[type] || icons['other']}</div>;
  };

  const renderPreview = (isListView) => {
    const previewUrl = `${backendUrl}/api/files/preview/${file._id}`;
    const type = file.metadata?.type || 'other';
    const imageVideoPreviewClasses = 'absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300';
    let containerBaseClasses = `relative overflow-hidden group ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} flex items-center justify-center`;

    if (isListView) {
      containerBaseClasses += ' w-24 h-24 sm:w-28 sm:h-28 rounded-lg flex-shrink-0';
    } else {
      containerBaseClasses += ' h-32 mb-2 rounded-t-xl';
    }

    if (type === 'image') {
      return (
        <div className={containerBaseClasses}>
          <img
            src={previewUrl}
            alt={`Preview of ${file.filename}`}
            className={imageVideoPreviewClasses}
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>
      );
    }

    if (type === 'video') {
      const existingThumb = file.metadata?.thumbnail || file.thumbnail || file.poster;
      return (
        <div className={containerBaseClasses}>
          {existingThumb ? (
            <img
              src={existingThumb}
              alt={`Thumbnail of ${file.filename}`}
              className={imageVideoPreviewClasses}
              loading="lazy"
            />
          ) : (
            <video
              src={`${previewUrl}#t=5`}
              preload="none"
              muted
              playsInline
              className={`${imageVideoPreviewClasses} bg-black`}
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
      );
    }

    if (type === 'audio') {
      const audioThumb = file.metadata?.thumbnail || file.thumbnail || file.poster || file.albumArt || file.metadata?.cover;
      if (audioThumb) {
        return (
          <div className={containerBaseClasses}>
            <img
              src={audioThumb}
              alt={`Album art of ${file.filename}`}
              className={imageVideoPreviewClasses}
              loading="lazy"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-all duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/90 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8.118v3.764a1 1 0 001.555.832l3.197-1.882a1 1 0 000-1.664l-3.197-1.882z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        );
      }
    }

    const fileExtension = file.filename.split('.').pop().toUpperCase();
    return (
      <div className={`${containerBaseClasses} flex flex-col items-center justify-center`}>
        <FileTypeIcon type={type} darkMode={darkMode} size={isListView ? "h-8 w-8 sm:h-10 w-10" : "h-10 w-10"} />
        {type !== 'audio' && (
          <span className={`mt-1 text-xs font-semibold tracking-wide ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {fileExtension}
          </span>
        )}
      </div>
    );
  };

  const lastTouchTimeRef = useRef(0);

  const handleItemClick = (e) => {
    const menuButton = e.currentTarget.querySelector('[aria-label="File options"]');
    if (menuButton && menuButton.contains(e.target)) {
      return;
    }
    if (selectionMode) {
      e.preventDefault();
      onSelect(file._id);
      return;
    }
    if (isTouchSelectEnabled()) {
      e.preventDefault();
      onSelect(file._id);
    }
  };

  const isTouchSelectEnabled = () => {
    const saved = localStorage.getItem('airstream_touch_select');
    return saved === null ? true : saved === 'true';
  };

  const handleDoubleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu((prev) => !prev);
  };

  const handleTouchEnd = (e) => {
    const now = Date.now();
    if (now - lastTouchTimeRef.current < 300) {
      e.preventDefault();
      e.stopPropagation();
      setShowMenu((prev) => !prev);
    }
    lastTouchTimeRef.current = now;
  };

  return (
    <>
      {/* ── File Card Container ── */}
      <div
        className={cn(
          "relative text-sm rounded-xl shadow-md border transition-all duration-200 ease-in-out select-none",
          isSelected
            ? `ring-2 ring-offset-1 ${darkMode ? 'ring-blue-500 bg-gray-750 border-blue-700' : 'ring-blue-600 bg-blue-50 border-blue-400'}`
            : `${darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'}`,
          darkMode ? 'text-white' : 'text-gray-900',
          selectionMode ? 'cursor-pointer' : '',
          'transform hover:-translate-y-0.5 hover:shadow-lg',
          viewType === 'list'
            ? 'flex items-center p-3 gap-3 min-h-[90px] sm:min-h-[110px]'
            : 'flex flex-col justify-between h-full min-h-[200px]',
          showMenu ? 'z-30' : 'z-10'
        )}
        onClick={handleItemClick}
        onDoubleClick={handleDoubleClick}
        onTouchEnd={handleTouchEnd}
        role="listitem"
        aria-selected={isSelected}
      >
        {viewType === 'list' && (
          <>
            {renderPreview(true)}
            <div className="flex flex-col flex-grow min-w-0">
              <h3 title={file.filename} className={cn("font-medium text-sm truncate mb-1", darkMode ? 'text-gray-100' : 'text-gray-800')}>
                {file.filename}
              </h3>
              <div className={cn("text-xs mt-0.5", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
              </div>
              {showDetails && (
                <div className={cn("mt-2 text-xs space-y-1 pt-2 border-t", darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200')}>
                  {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                  <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                  {file.metadata?.dimensions && <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>}
                </div>
              )}
            </div>

            <div className="flex-shrink-0 ml-auto self-start pt-1">
              {selectionMode ? (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150", isSelected ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500') : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80'))}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              ) : (
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }} className={cn("p-1.5 rounded-full transition-colors duration-150", showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700') : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'), 'backdrop-blur-sm bg-opacity-50')} aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {showMenu && (
                    <div ref={menuRef} className={cn("absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border backdrop-blur-md", darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200')} role="menu">
                      {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                        <>
                          <button onClick={openViewer} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                        </>
                      )}
                      <button onClick={download} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                        Get
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={share} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400' : 'text-red-600')} role="menuitem">
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
            {renderPreview(false)}
            <div className="p-3 pt-2 flex flex-col flex-grow">
              <h3 title={file.filename} className={cn("font-medium text-sm truncate mb-1", darkMode ? 'text-gray-100' : 'text-gray-800')}>
                {file.filename}
              </h3>
              <div className={cn("text-xs mt-0.5", darkMode ? 'text-gray-400' : 'text-gray-500')}>
                <p className="truncate">{formatSize(file.length)}</p>
              </div>
              {showDetails && <div className="flex-grow min-h-[1rem]" />}
              {showDetails && (
                <div className={cn("mt-2 text-xs space-y-1 pt-2 border-t", darkMode ? 'text-gray-400 border-gray-600' : 'text-gray-500 border-gray-200')}>
                  {file.metadata?.type && <p><span className="font-semibold">Type:</span> {file.metadata.type}</p>}
                  <p><span className="font-semibold">Uploaded:</span> {formatDate(file.uploadDate)}</p>
                  {file.metadata?.dimensions && <p><span className="font-semibold">Dimensions:</span> {file.metadata.dimensions}</p>}
                </div>
              )}
            </div>

            <div className="absolute top-1.5 right-1.5 z-10">
              {selectionMode ? (
                <div className={cn("w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-150", isSelected ? (darkMode ? 'bg-blue-500 border-blue-400' : 'bg-blue-600 border-blue-500') : (darkMode ? 'bg-gray-600/80 border-gray-500 hover:bg-gray-500/80' : 'bg-white/80 border-gray-400 hover:bg-gray-50/80'))}>
                  {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
              ) : (
                <div className="relative">
                  <button onClick={(e) => { e.stopPropagation(); setShowMenu(prev => !prev); }} className={cn("p-1.5 rounded-full transition-colors duration-150", showMenu ? (darkMode ? 'bg-gray-600 text-gray-100' : 'bg-gray-200 text-gray-700') : (darkMode ? 'text-gray-400 hover:bg-gray-700/80 hover:text-gray-100' : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-700'), 'backdrop-blur-sm bg-opacity-50')} aria-label="File options" aria-haspopup="true" aria-expanded={showMenu} title="Options">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" /></svg>
                  </button>

                  {showMenu && (
                    <div ref={menuRef} className={cn("absolute right-0 mt-1 py-1 sm:w-40 w-36 rounded-md shadow-xl z-50 border backdrop-blur-md", darkMode ? 'bg-gray-800/90 border-gray-600' : 'bg-white/90 border-gray-200')} role="menu">
                      {(file.metadata?.type === 'image' || file.metadata?.type === 'video' || file.metadata?.type === 'audio') && (
                        <>
                          <button onClick={openViewer} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            View
                          </button>
                          <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                        </>
                      )}
                      <button onClick={download} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-current opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" /></svg>
                        Get
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={share} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-white' : 'text-gray-700')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                      </button>
                      <div className={`border-t my-1 ${darkMode ? 'border-gray-700/50' : 'border-gray-200/70'}`} />
                      <button onClick={(e) => { e.stopPropagation(); setShowMenu(false); setShowDeleteConfirm(true); }} className={cn('w-full text-left px-3.5 py-1.5 text-sm flex items-center gap-2.5', darkMode ? 'text-red-400' : 'text-red-600')} role="menuitem">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {isActionLoading && downloadProgress > 0 && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-20 rounded-lg backdrop-blur-sm animate-fadeIn">
            <div className="w-4/5 max-w-xs text-center">
              <div className="mb-1.5 text-xs font-medium text-white">Downloading... {downloadProgress}%</div>
              <div className="w-full bg-gray-600 rounded-full h-1.5 overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all duration-150 ease-out" style={{ width: `${downloadProgress}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Share Modal ── */}
      {showShare && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] px-4 backdrop-blur-sm animate-fadeIn">
          <div ref={shareModalRef} className={cn("p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn", darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200')} role="dialog" aria-modal="true" aria-labelledby="share-file-title">
            <button onClick={() => setShowShare(false)} className={cn("absolute top-3 right-3 p-1.5 rounded-full transition-colors disabled:opacity-50", isActionLoading ? "cursor-not-allowed" : (darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'))} disabled={isActionLoading} title="Close" aria-label="Close share dialog">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <h2 id="share-file-title" className={cn("font-semibold mb-5 text-lg text-center truncate px-8", darkMode ? 'text-white' : 'text-gray-800')}>Share</h2>
            <div className="flex justify-center mb-5">
              <div className={cn("p-2 border rounded-lg", darkMode ? 'border-gray-600 bg-gray-900' : 'border-gray-300 bg-gray-50')}>
                {isActionLoading && !shareLink ? (
                  <div className="w-40 h-40 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  </div>
                ) : shareLink ? (
                  <QRCodeSVG value={shareLink} size={160} bgColor="transparent" fgColor={darkMode ? "#FFFFFF" : "#000000"} level="M" includeMargin={false} className="block" />
                ) : (
                  <div className="w-40 h-40 flex items-center justify-center text-center text-xs text-red-500 p-2">Failed to load QR Code.</div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2.5 mb-4">
              <input ref={shareLinkInputRef} value={isActionLoading ? 'Generating...' : shareLink || 'Error generating link'} readOnly className={cn("w-full px-3 py-2 rounded font-mono text-xs border overflow-x-auto whitespace-nowrap", darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-800', 'disabled:opacity-70')} disabled={isActionLoading} aria-label="Shareable link" onClick={(e) => e.target.select()} />
              <button onClick={() => copyToClipboard(shareLink)} disabled={!shareLink || copied || isActionLoading} className={cn("w-full px-3 py-2 rounded-md font-medium text-sm transition-colors flex items-center justify-center gap-2", copied ? 'bg-green-600 text-white cursor-default' : !shareLink || isActionLoading ? (darkMode ? 'bg-gray-600 text-gray-400 cursor-not-allowed' : 'bg-gray-300 text-gray-500 cursor-not-allowed') : 'bg-blue-600 hover:bg-blue-700 text-white')}>
                {copied ? <><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Copied!</> : 'Copy Link'}
              </button>
            </div>
            <p className={cn("text-xs text-center", darkMode ? 'text-gray-400' : 'text-gray-500')}>Anyone with this link can view or download this file.</p>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] px-4 backdrop-blur-sm animate-fadeIn">
          <div ref={deleteModalRef} className={cn("p-6 rounded-xl max-w-sm w-full relative shadow-xl border animate-modalIn", darkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-800')} role="alertdialog" aria-modal="true" aria-labelledby="delete-file-title" aria-describedby="delete-file-desc">
            <h2 id="delete-file-title" className={cn("font-semibold mb-2 text-lg", darkMode ? 'text-white' : 'text-gray-800')}>Confirm Delete</h2>
            <p id="delete-file-desc" className={cn("text-sm mb-3", darkMode ? 'text-gray-300' : 'text-gray-600')}>Are you sure you want to permanently delete this file?</p>
            <div className={cn("font-medium max-w-full truncate overflow-hidden whitespace-nowrap my-3 p-2 rounded text-sm", darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700 border border-gray-200')}>{file.filename}</div>
            <p className={cn("text-sm mb-5", darkMode ? 'text-gray-400' : 'text-gray-500')}>This action cannot be undone.</p>
            <div className="flex w-full justify-between gap-3 mt-4">
              <button onClick={() => setShowDeleteConfirm(false)} disabled={isActionLoading} className={cn("flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm", isActionLoading ? (darkMode ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed') : (darkMode ? 'bg-gray-600 text-gray-200 hover:bg-gray-500' : 'bg-gray-200 text-gray-800 hover:bg-gray-300 border border-gray-300'))}>Cancel</button>
              <button onClick={deleteFile} disabled={isActionLoading} className={cn("flex-1 px-4 py-2 rounded-md font-medium transition-colors text-sm text-white flex items-center justify-center gap-2", isActionLoading ? 'bg-red-500 cursor-wait' : 'bg-red-600 hover:bg-red-700')}>
                {isActionLoading && <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dynamic Media Viewer Overlays ── */}
      {showViewer && (() => {
        const type = getFileType(file);
        if (type !== 'video' && type !== 'audio' && type !== 'image') return null;
        const safeBackendUrl = backendUrl || '';
        const previewUrl = `${safeBackendUrl}/api/files/preview/${file._id}`;
        
        return ReactDOM.createPortal(
          <MediaViewerErrorBoundary onClose={() => setShowViewer(false)}>
            <div className="fixed inset-0 z-[9999] animate-fadeIn flex flex-col touch-none overscroll-none bg-slate-950 text-white" style={{ background: 'rgba(8,14,28,0.96)', backdropFilter: 'blur(10px)' }} onClick={() => setShowViewer(false)} onTouchMove={(e) => e.preventDefault()} role="dialog" aria-modal="true" aria-label={`Viewing ${file.filename}`}>
              <div className="flex flex-col h-full w-full bg-slate-950 text-white">
                {/* Header Bar */}
                <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                    <span className={cn('flex-shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 sm:px-2.5 sm:py-1 rounded border', type === 'image' ? 'bg-blue-600/20 border-blue-500/40 text-blue-300' : type === 'video' ? 'bg-indigo-600/20 border-indigo-500/40 text-indigo-300' : 'bg-sky-600/20 border-sky-500/40 text-sky-300')}>
                      {type}
                    </span>
                    <h2 className="text-white/90 text-xs sm:text-sm font-semibold truncate" title={file.filename}>{file.filename}</h2>
                  </div>
                  <button onClick={() => setShowViewer(false)} className="flex-shrink-0 ml-2 p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all" aria-label="Close viewer" title="Close (Esc)">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Main Content Area — Clicking anywhere outside media container closes viewer */}
                <div className="flex-1 flex items-center justify-center overflow-hidden p-2 sm:p-4 cursor-pointer" onClick={() => setShowViewer(false)}>
                  <div className="w-full max-w-3xl sm:max-w-4xl max-h-full cursor-default flex items-center justify-center">
                    {isMediaLoading ? (
                      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-3 p-8 bg-slate-950/60 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xl">
                        <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs font-bold tracking-widest text-blue-400">INITIALIZING FAST STREAM...</span>
                      </div>
                    ) : (
                      <>
                        {type === 'image' && (
                          <ImageViewerContainer src={previewUrl} filename={file.filename} />
                        )}
                        {type === 'video' && (
                          <CustomVideoPlayer 
                            src={proxyUrl || previewUrl || streamUrl} 
                            fallbackSrc={previewUrl} 
                            filename={file.filename} 
                          />
                        )}
                        {type === 'audio' && (
                          <CustomAudioPlayer 
                            src={proxyUrl || previewUrl || streamUrl} 
                            fallbackSrc={previewUrl} 
                            filename={file.filename} 
                            fileSize={file.length} 
                            thumbnail={file.metadata?.thumbnail || file.thumbnail || file.poster || file.albumArt || file.metadata?.cover}
                          />
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="flex-shrink-0 pb-2.5 sm:pb-3 text-center pointer-events-none">
                  <p className="text-white/30 text-[11px] font-medium tracking-wide">Press ESC or click outside container to close</p>
                </div>
              </div>
            </div>
          </MediaViewerErrorBoundary>,
          document.body
        );
      })()}

      <style jsx="true">{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-in-out; }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-modalIn { animation: modalIn 0.25s ease-out; }
      `}</style>
    </>
  );
};

export default FileItem;
