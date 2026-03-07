// middleware/authMiddleware.js
/**
 * Middleware to protect API routes.
 * - Auth routes (/api/auth/*) are allowed with origin check only (no JWT needed for login/logout)
 * - Public share routes are allowed without auth
 * - Export-download routes are allowed without auth (token-gated by the route itself)
 * - All other /api routes require a valid JWT in httpOnly cookie
 */

const jwt = require('jsonwebtoken');

// Explicit localhost origins allowed in development — never a blanket NODE_ENV bypass
const DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

const protectRoute = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const frontendURL = process.env.FRONTEND_URL;

  const isFromAuthorizedOrigin =
    (origin && (origin === frontendURL || DEV_ORIGINS.includes(origin))) ||
    (referer && (referer.startsWith(frontendURL) || DEV_ORIGINS.some(o => referer.startsWith(o))));

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
      console.log(`Auth route blocked – origin: ${origin}, referer: ${referer}`);
      return res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
    }
    return next();
  }

  // ─── 4. All other API routes: require valid JWT in httpOnly cookie ─────────
  if (!isFromAuthorizedOrigin) {
    console.log(`API route blocked – origin: ${origin}, referer: ${referer}, path: ${req.path}`);
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
