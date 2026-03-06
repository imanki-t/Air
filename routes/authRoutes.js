// routes/authRoutes.js
/**
 * Authentication routes for Airstream.
 * - POST /api/auth/google     : Verify Google ID token, create/login user, set JWT cookie
 * - GET  /api/auth/me         : Return current user from cookie
 * - POST /api/auth/logout     : Clear session cookie
 * - PATCH /api/auth/preferences : Save dark-mode preference
 * - GET  /api/auth/stats      : Return file count + storage used for current user
 */

const express = require('express');
const router = express.Router();
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const { authLimiter } = require('../middleware/rateLimitMiddleware');

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// ─────────────────────────────────────────────────────────────────────────────
// Helper: return the raw MongoDB database instance
// ─────────────────────────────────────────────────────────────────────────────
const getDb = () => mongoose.connection;

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build secure cookie options
// SameSite: 'none' + Secure: true is required for cross-origin cookie auth
// (e.g. frontend on Vercel, backend on Render)
// ─────────────────────────────────────────────────────────────────────────────
const cookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',    // same-origin via _redirects proxy, lax works now
  path: '/',
  ...(rememberMe && { maxAge: 30 * 24 * 60 * 60 * 1000 }), // 30 days in ms
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google  – verify Google ID token, issue session cookie
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { credential, rememberMe = false, recaptchaToken } = req.body;

    if (!credential) {
      return res.status(400).json({ error: 'Missing Google credential.' });
    }

    // ── reCAPTCHA v3 verification (if configured) ────────────────────────────
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken && recaptchaToken.length > 20) {
      try {
        const rcRes = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          null,
          {
            params: {
              secret: process.env.RECAPTCHA_SECRET_KEY,
              response: recaptchaToken,
            },
          }
        );
        const { success, score } = rcRes.data;
        if (!success || score < 0.5) {
          console.warn(`reCAPTCHA failed: success=${success}, score=${score}`);
          return res.status(400).json({ error: 'Security check failed. Please try again.' });
        }
      } catch (rcErr) {
        console.warn('reCAPTCHA verification error (non-blocking):', rcErr.message);
        // Non-fatal: continue if reCAPTCHA service is unreachable
      }
    }

    // ── Verify Google ID token ───────────────────────────────────────────────
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    let ticket;
    try {
      ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (verifyErr) {
      console.error('Google token verification failed:', verifyErr.message);
      return res.status(401).json({ error: 'Invalid Google credential.' });
    }

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture, email_verified } = payload;

    if (!email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified.' });
    }

    const db = getDb();

    // ── Find or create user ──────────────────────────────────────────────────
    let user = await db.collection('users').findOne({ googleId });

    if (!user) {
      const newUser = {
        googleId,
        email,
        name,
        picture,
        darkMode: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      user = { ...newUser, _id: result.insertedId };
      console.log(`New user created: ${email}`);
    } else {
      // Refresh profile info in case name/picture changed
      await db.collection('users').updateOne(
        { googleId },
        { $set: { name, picture, email, updatedAt: new Date() } }
      );
      user.name = name;
      user.picture = picture;
      user.email = email;
    }

    // ── Issue JWT ────────────────────────────────────────────────────────────
    const tokenPayload = {
      userId: user._id.toString(),
      googleId,
      email,
      name,
      picture,
    };

    const expiresIn = rememberMe ? '30d' : '24h';
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn });

    // ── Set httpOnly cookie ──────────────────────────────────────────────────
    res.cookie('airstream_session', token, cookieOptions(rememberMe));

    return res.json({
      success: true,
      user: {
        userId: user._id.toString(),
        email,
        name,
        picture,
        darkMode: user.darkMode || false,
      },
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({ error: 'Authentication failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  – validate existing session cookie, return user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.airstream_session;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ googleId: decoded.googleId });
    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    return res.json({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
      darkMode: user.darkMode || false,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return res.status(500).json({ error: 'Session check failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  – clear session cookie
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  res.clearCookie('airstream_session', {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
  });
  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/preferences  – save dark-mode preference (requires JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/preferences', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.airstream_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const { darkMode } = req.body;
    if (typeof darkMode !== 'boolean') {
      return res.status(400).json({ error: 'Invalid darkMode value.' });
    }

    const db = getDb();
    await db.collection('users').updateOne(
      { googleId: decoded.googleId },
      { $set: { darkMode, updatedAt: new Date() } }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Preferences update error:', error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/stats  – file count + storage used for current user (requires JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const token = req.cookies && req.cookies.airstream_session;
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const db = getDb();
    const userId = decoded.userId;

    // Aggregate file count and total storage for this user
    const result = await db.collection('drive_mappings').aggregate([
      { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
      {
        $group: {
          _id: null,
          fileCount: { $sum: 1 },
          storageUsed: { $sum: { $toInt: { $ifNull: ['$metadata.size', 0] } } },
        },
      },
    ]).toArray();

    const stats = result[0] || { fileCount: 0, storageUsed: 0 };

    return res.json({
      fileCount: stats.fileCount,
      storageUsed: stats.storageUsed,
      storageLimit: STORAGE_LIMIT_BYTES,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

module.exports = router;
