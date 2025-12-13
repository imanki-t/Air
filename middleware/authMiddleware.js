// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware to protect API routes by verifying JWT
 * Also allows public access to specific share routes
 */
const protectRoute = async (req, res, next) => {
  // Allow public access ONLY to GET requests to shared file routes
  if (req.method === 'GET' && (req.path.includes('/share/') || req.path.includes('/s/'))) {
    return next();
  }

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    // Set token from Bearer token in header
    token = req.headers.authorization.split(' ')[1];
  }

  // Make sure token exists
  if (!token) {
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from the token and attach to req
    req.user = await User.findById(decoded.id);

    if (!req.user) {
        return res.status(401).json({ success: false, error: 'User not found' });
    }

    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ success: false, error: 'Not authorized to access this route' });
  }
};

module.exports = protectRoute;
