// middleware/rateLimiter.js
/**
 * Rate limiting middleware to prevent abuse
 * Limits the number of requests from a single IP
 */
const rateLimit = require('express-rate-limit');

// Create different rate limiters for different routes
const rateLimiters = {
  // General API rate limiter
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' }
  }),
  
  // More permissive rate limiter for file downloads
  download: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 30, // Limit each IP to 30 downloads per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many download requests, please try again later' }
  }),
  
  // Stricter rate limiter for file uploads and deletions
  upload: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 uploads/deletes per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many upload/delete requests, please try again later' }
  }),
  
  // Very permissive for shared files to allow public access
  shared: rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 60, // Limit each IP to 60 share accesses per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests to shared files, please try again later' }
  })
};

module.exports = rateLimiters;
