// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

// ─────────────────────────────────────────────────────────────────────────────
// Key generator: identify by userId from JWT cookie, fall back to IP.
// This means limits are per-user rather than per-IP.
// ─────────────────────────────────────────────────────────────────────────────
const userKeyGenerator = (req) => {
  try {
    const raw = req.headers.cookie || '';
    const parsed = cookie.parse(raw);
    const token = parsed.airstream_session;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
      if (decoded?.userId) return `user_${decoded.userId}`;
    }
  } catch (_) {}
  return req.ip; // fallback for unauthenticated routes (share links etc.)
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload — generous since it's a personal project
// ─────────────────────────────────────────────────────────────────────────────
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 500,
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit reached. Try again later.' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Download / Preview
// ─────────────────────────────────────────────────────────────────────────────
const downloadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 1000,
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Download limit reached. Try again later.' },
});

// ─────────────────────────────────────────────────────────────────────────────
// General API (list files, delete, share generation, folders, etc.)
// ─────────────────────────────────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 300,
  keyGenerator: userKeyGenerator,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Auth (login attempts) — tighter, IP-based since no session yet
// ─────────────────────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Public share link access — IP-based since no auth
// ─────────────────────────────────────────────────────────────────────────────
const shareLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests for this share link.' },
});

module.exports = {
  apiLimiter,
  authLimiter,
  uploadLimiter,
  downloadLimiter,
  shareLimiter,
};
