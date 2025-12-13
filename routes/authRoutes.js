const express = require('express');
const { check } = require('express-validator');
const {
  signup,
  login,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getMe,
  logout
} = require('../controllers/authController');
const protectRoute = require('../middleware/authMiddleware');

const router = express.Router();

router.post(
  '/signup',
  [
    check('username', 'Username is required').not().isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check('password', 'Password must be 8 or more characters').isLength({ min: 8 })
  ],
  signup
);

router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);
router.get('/logout', logout);
router.get('/me', protectRoute, getMe);

module.exports = router;
