// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

// Rate limiter specifically for GET requests on share link access
const shareLinkLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 share link GET requests per minute
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many share link requests from this IP, please try again after a minute'
  },
  // Only apply to GET requests on share link routes
  skip: (req) => {
    // Apply rate limiting only to GET requests on share link access routes
    const isShareRoute = req.path.includes('/share/') || req.path.includes('/s/');
    const isGetRequest = req.method === 'GET';
    return !(isShareRoute && isGetRequest);
  }
});

module.exports = {
  shareLinkLimiter
};
