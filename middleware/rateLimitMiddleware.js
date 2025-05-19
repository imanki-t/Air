// middleware/rateLimitMiddleware.js
const rateLimit = require('express-rate-limit');

// Create a rate limiter that limits each IP to 30 requests per minute
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'Too many requests from this IP, please try again after a minute'
  },
  // Skip rate limiting for trusted sources like internal services if needed
  // skipSuccessfulRequests: false, // counts all requests against the limit
  // skip: (req) => req.ip === '127.0.0.1', // example of skipping localhost
});

// Create a more strict limiter for authentication routes if you add any
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts from this IP, please try again after 15 minutes'
  }
});

module.exports = {
  apiLimiter,
  authLimiter
};
