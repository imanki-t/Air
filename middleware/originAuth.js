// middleware/originAuth.js
/**
 * Origin authentication middleware that protects API routes
 * by verifying the request origin without requiring API keys
 */
const originAuthMiddleware = (req, res, next) => {
  try {
    // Get the request origin and referer
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    
    // Get the frontend URL from environment variable
    const allowedOrigin = process.env.FRONTEND_URL;
    
    // Check if either origin or referer match our frontend URL
    let isValidOrigin = false;
    
    if (origin && origin.startsWith(allowedOrigin)) {
      isValidOrigin = true;
    } else if (referer && referer.startsWith(allowedOrigin)) {
      isValidOrigin = true;
    }
    
    // For local development, also allow localhost requests
    const isLocalDevelopment = process.env.NODE_ENV !== 'production';
    if (isLocalDevelopment) {
      const localOrigins = ['http://localhost:', 'http://127.0.0.1:'];
      if (origin && localOrigins.some(local => origin.startsWith(local))) {
        isValidOrigin = true;
      } else if (referer && localOrigins.some(local => referer.startsWith(local))) {
        isValidOrigin = true;
      }
    }
    
    // If the request has no origin or referer headers, it might be a direct API call
    if (!origin && !referer) {
      // In production, block requests with no origin/referer
      if (!isLocalDevelopment) {
        return res.status(403).json({ 
          error: 'Forbidden: Missing origin information'
        });
      }
    }
    
    // In production, enforce valid origin
    if (!isLocalDevelopment && !isValidOrigin) {
      return res.status(403).json({ 
        error: 'Forbidden: Request origin not allowed'
      });
    }
    
    // If we get here, the origin is valid or we're in development mode
    next();
  } catch (error) {
    console.error('Origin auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = originAuthMiddleware;
