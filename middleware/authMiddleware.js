// middleware/authMiddleware.js
/**
 * Middleware to protect API routes.
 * - Auth routes (/api/auth/*) are allowed with origin check only (no JWT needed for login/logout)
 * - Public share routes are allowed without auth
 * - All other /api routes require a valid JWT in httpOnly cookie
 */

const jwt = require('jsonwebtoken');

const protectRoute = (req, res, next) => {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const frontendURL = process.env.FRONTEND_URL;

  const isFromAuthorizedOrigin =
    (origin && origin === frontendURL) ||
    (referer && referer.startsWith(frontendURL)) ||
    process.env.NODE_ENV === 'development';

  // ─── 1. Always allow public shared‑file GET routes ───────────────────────
  if (req.method === 'GET' && (req.path.includes('/share/') || req.path.includes('/s/'))) {
    return next();
  }

  // ─── 2. Auth routes: only require valid origin (no JWT needed yet) ────────
  //    e.g. POST /api/auth/google, GET /api/auth/me, POST /api/auth/logout
  if (req.path.startsWith('/auth/')) {
    if (!isFromAuthorizedOrigin) {
      console.log(`Auth route blocked – origin: ${origin}, referer: ${referer}`);
      return res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
    }
    return next();
  }

  // ─── 3. All other API routes: require valid JWT in httpOnly cookie ────────
  if (!isFromAuthorizedOrigin) {
    console.log(`API route blocked – origin: ${origin}, referer: ${referer}, path: ${req.path}`);
    return res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
  }

  const token = req.cookies && req.cookies.airstream_session;
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, googleId, email, name, picture, iat, exp }
    next();
  } catch (err) {
    console.log('JWT verification failed:', err.message);
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
  }
};

module.exports = protectRoute;
