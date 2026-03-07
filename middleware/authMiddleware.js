// middleware/authMiddleware.js
/**
 * Middleware to protect API routes.
 * - Auth routes (/api/auth/*) are allowed with origin check only (no JWT needed for login/logout)
 * - Public share routes are allowed without auth
 * - Export-download routes are allowed without auth (token-gated by the route itself)
 * - All other /api routes require a valid JWT in httpOnly cookie
 *
 * SECURITY FIXES:
 *  - [MED-01] Removed Referer header fallback — only Origin is trusted for origin validation.
 *             Referer is spoofable and not a reliable security boundary.
 *  - [LOW-04] DEV_ORIGINS are now gated behind NODE_ENV !== 'production' so localhost
 *             origins are never accepted in a production deployment.
 */

const jwt = require('jsonwebtoken');

// Only active in non-production environments.
// In production this array is empty, so only FRONTEND_URL is accepted.
const DEV_ORIGINS =
  process.env.NODE_ENV !== 'production'
    ? [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4173',
      ]
    : [];

const protectRoute = (req, res, next) => {
  const origin = req.headers.origin;
  const frontendURL = process.env.FRONTEND_URL;

  // [MED-01] Only check the Origin header — Referer is no longer used.
  // Origin is sent by browsers for all cross-origin requests and cannot be
  // forged by a page-level script. Referer can be omitted or faked by
  // server-side callers and is not a trustworthy security signal.
  const isFromAuthorizedOrigin =
    origin && (origin === frontendURL || DEV_ORIGINS.includes(origin));

  // ─── 1. Always allow public shared-file GET routes ────────────────────────
  if (req.method === 'GET' && (req.path.includes('/share/') || req.path.includes('/s/'))) {
    return next();
  }

  // ─── 2. Always allow export-download GET routes (token-gated by the route) ─
  if (req.method === 'GET' && req.path.includes('/export-download/')) {
    return next();
  }

  // ─── 3. Auth routes: only require valid origin (no JWT needed yet) ────────
  if (req.path.startsWith('/auth/')) {
    if (!isFromAuthorizedOrigin) {
      console.log(`Auth route blocked – origin: ${origin}`);
      return res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
    }
    return next();
  }

  // ─── 4. All other API routes: require valid JWT in httpOnly cookie ─────────
  if (!isFromAuthorizedOrigin) {
    console.log(`API route blocked – origin: ${origin}, path: ${req.path}`);
    return res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
  }

  const token = req.cookies && req.cookies.airstream_session;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
  }

  try {
    // Algorithm pinned to HS256 to prevent algorithm-confusion attacks (LOW-01)
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.user = decoded; // { userId, googleId, email, name, picture, iat, exp }
    next();
  } catch (err) {
    console.log('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
};

module.exports = protectRoute;
