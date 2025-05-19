// middleware/csrfProtection.js
/**
 * CSRF protection middleware
 * Generates and validates CSRF tokens using the double-submit cookie pattern
 */
const crypto = require('crypto');

// Function to generate random tokens
const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// Create CSRF protection middleware
const csrfProtection = {
  // Middleware to set CSRF token cookie on GET requests
  setCsrfToken: (req, res, next) => {
    // Only set tokens on GET requests from the frontend
    if (req.method === 'GET') {
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      const frontendUrl = process.env.FRONTEND_URL;
      
      // Only set cookie if request is from our frontend
      if ((origin && origin.startsWith(frontendUrl)) || 
          (referer && referer.startsWith(frontendUrl))) {
        
        // Generate a new token
        const csrfToken = generateToken();
        
        // Set cookie with httpOnly: false so frontend JS can read it
        res.cookie('XSRF-TOKEN', csrfToken, {
          httpOnly: false,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      }
    }
    next();
  },
  
  // Middleware to verify CSRF token on state-changing requests
  validateCsrfToken: (req, res, next) => {
    // Only validate on state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      const csrfCookie = req.cookies['XSRF-TOKEN'];
      const csrfHeader = req.headers['x-xsrf-token'];
      
      // Check if both token sources exist and match
      if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
        return res.status(403).json({ error: 'CSRF validation failed' });
      }
    }
    next();
  }
};

module.exports = csrfProtection;
