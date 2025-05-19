// middleware/authMiddleware.js
/**
 * Middleware to protect API routes by verifying request origin
 * Only allows requests from the authorized frontend URL
 * Excludes shared file routes which should be publicly accessible
 */
const protectRoute = (req, res, next) => {
  // Allow access to ALL shared file routes (for accessing shared files)
  // This specifically targets ALL routes for accessing already shared files
  if (req.path.includes('/api/files/share/')) {
    return next();
  }
  
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Get the authorized frontend URL from environment variables
  const frontendURL = process.env.FRONTEND_URL;
  
  // Check if the request is coming from the authorized frontend
  if (
    (origin && origin === frontendURL) || 
    (referer && referer.startsWith(frontendURL)) ||
    // Allow local development
    process.env.NODE_ENV === 'development'
  ) {
    // Request is from authorized source, proceed to the route handler
    next();
  } else {
    // Request is not from authorized source, deny access
    console.log(`Access denied from origin: ${origin}, referer: ${referer}, path: ${req.path}`);
    res.status(403).json({ error: 'Access denied. Unauthorized origin.' });
  }
};

module.exports = protectRoute;
