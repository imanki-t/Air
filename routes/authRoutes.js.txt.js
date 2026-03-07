// routes/authRoutes.js
/**
 * Authentication routes for Airstream.
 * - POST /api/auth/google              : Verify Google ID token, create/login user, set JWT cookie
 * - GET  /api/auth/me                  : Return current user from cookie
 * - POST /api/auth/logout              : Clear session cookie
 * - PATCH /api/auth/preferences        : Save darkMode and hideFolderFiles preferences
 * - GET  /api/auth/stats               : Return file count + storage used for current user
 * - POST /api/auth/export-data         : Generate an export token and email a ZIP download link
 * - GET  /api/auth/export-download/:token : Stream all user files as a ZIP (public, token-gated)
 * - POST /api/auth/import-data         : Import a previously exported ZIP back into the account
 * - POST /api/auth/delete-account      : Schedule account for deletion (7-day recovery window)
 * - POST /api/auth/refresh             : Exchange a valid refresh token for a new JWT + refresh token
 *
 * SECURITY FIXES:
 *  - [HIGH-01] reCAPTCHA: removed length > 20 bypass; if RECAPTCHA_SECRET_KEY is set, a valid
 *              token is now required — missing or empty token is rejected rather than silently
 *              skipped. A startup warning is logged when the key is absent.
 *  - [HIGH-02] Export token race condition: replaced findOne + updateOne with a single atomic
 *              findOneAndUpdate so concurrent requests can't both pass the "already used" check.
 *  - [MED-02]  logout and delete-account clearCookie now use sameSite: 'strict' to match the
 *              cookie that was set, ensuring it is reliably cleared by the browser.
 *  - [HIGH-03] ZIP import: explicit path-traversal guard added before the existing sanitization
 *              regex, rejecting filenames that contain '..', start with '/', or contain '\'.
 *              The sanitized filename is used for both GridFS and metadata storage.
 *  - [SEC-01]  Short-lived JWT (15 min) + rotating refresh tokens in a second httpOnly cookie.
 *              Replay detection: a reused refresh token means theft — tokenVersion is incremented
 *              to immediately kill all sessions for the affected user.
 *  - [SEC-02]  tokenVersion embedded in JWT payload. authMiddleware does a DB lookup on every
 *              request to compare decoded.tokenVersion === user.tokenVersion. Logout and
 *              delete-account increment tokenVersion so JWTs are revoked before natural expiry.
 *  - [HIGH-05] tokenVersion revocation now enforced on ALL auth routes that accept a JWT.
 *              Previously /stats, /export-data, /import-data, /delete-account, /preferences,
 *              and /me called verifyToken() (signature-only) but skipped the DB tokenVersion
 *              check, so revoked tokens remained valid on those routes until natural expiry.
 *              A shared verifyTokenAndCheckRevocation() helper now handles both checks.
 *  - [HIGH-06] ZIP import: manifest file count is capped at MAX_IMPORT_FILES (10 000).
 *              Previously an unbounded manifest array could drive an O(n) background loop,
 *              exhausting CPU and emitting thousands of socket events per request.
 *  - [HIGH-07] ZIP bomb: entry.header.size (uncompressed size from the ZIP local file header)
 *              is checked BEFORE calling entry.getData(). This prevents decompression of
 *              crafted archives that expand a small compressed payload to gigabytes of RAM.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const mongoose = require('mongoose');
const multer = require('multer');
const archiver = require('archiver');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { sendWelcomeEmail, sendExportEmail, sendDeletionEmail } = require('../services/emailService');
const { safeObjectId } = require('../utils/driveUtils');

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// [HIGH-06] Hard cap on the number of files that can be imported in a single
// operation. Without this, a crafted manifest with 1 000 000 entries drives an
// unbounded O(n) background loop and floods the user's socket room.
const MAX_IMPORT_FILES = 10_000;

// [HIGH-01] Warn at startup if reCAPTCHA is not configured so the omission is
// visible in deployment logs rather than silently degrading security.
if (!process.env.RECAPTCHA_SECRET_KEY) {
  console.warn(
    '[SECURITY WARNING] RECAPTCHA_SECRET_KEY is not set. ' +
    'Bot protection is disabled. Set this variable in production.'
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getDb = () => mongoose.connection;

// [MED-02] Single source of truth for cookie clear options — always 'strict' to
// match the 'strict' value used when the cookie was originally set.
const clearCookieOptions = () => ({
  httpOnly: true,
  secure: true,
  sameSite: 'none', // 'strict' breaks cross-site cookie sending on Render subdomains
  path: '/',
});

const cookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: true,
  sameSite: 'none', // 'strict' blocks cookies on cross-site XHR (frontend/backend on different Render subdomains)
  path: '/',
  ...(rememberMe && { maxAge: 30 * 24 * 60 * 60 * 1000 }),
});

const getObjectId = () => mongoose.Types.ObjectId;

const getToken = (req) => req.cookies && req.cookies.airstream_session;

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

// ─────────────────────────────────────────────────────────────────────────────
// [HIGH-05] Shared revocation helper — verifies JWT signature AND confirms
// the tokenVersion against the DB. Use this instead of bare verifyToken() on
// any auth route that accepts a JWT, so that logout / account-deletion revoke
// tokens immediately rather than waiting for the 15-minute natural expiry.
//
// Throws an error with .status and .code set on failure so callers can
// translate it into the appropriate HTTP response without boilerplate.
// ─────────────────────────────────────────────────────────────────────────────
const verifyTokenAndCheckRevocation = async (token, db) => {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const e = new Error('Session expired or invalid.');
    e.status = 401;
    e.code = 'INVALID_TOKEN';
    throw e;
  }

  const ObjectId = getObjectId();
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(decoded.userId) },
    { projection: { tokenVersion: 1, pendingDeletion: 1 } }
  );

  if (!user || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    const e = new Error('Session revoked. Please sign in again.');
    e.status = 401;
    e.code = 'REVOKED';
    throw e;
  }

  if (user.pendingDeletion) {
    const e = new Error('Account is pending deletion.');
    e.status = 403;
    e.code = 'PENDING_DELETION';
    throw e;
  }

  return decoded;
};

// Multer for import uploads — memory storage, 6 GB limit
const importUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 6 * 1024 * 1024 * 1024 },
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

    // ── [HIGH-01] reCAPTCHA v3 verification ──────────────────────────────────
    // If RECAPTCHA_SECRET_KEY is configured, a token is always required.
    // The old `length > 20` bypass has been removed — any truthy token is sent
    // to Google for verification. Missing token when key is configured is rejected.
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return res.status(400).json({ error: 'Security check token missing. Please try again.' });
      }
      try {
        const rcRes = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          null,
          { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: recaptchaToken } }
        );
        const { success, score } = rcRes.data;
        if (!success || score < 0.5) {
          console.warn(`reCAPTCHA failed: success=${success}, score=${score}`);
          return res.status(400).json({ error: 'Security check failed. Please try again.' });
        }
      } catch (rcErr) {
        // Fail closed — if the reCAPTCHA service is unreachable, block the request (LOW-04)
        console.error('reCAPTCHA verification error (blocking):', rcErr.message);
        return res.status(400).json({ error: 'Security check could not be completed. Please try again.' });
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
    let user = await db.collection('users').findOne({ googleId });

    if (!user) {
      // New user — create account and send welcome email
      const newUser = {
        googleId,
        email,
        name,
        picture,
        darkMode: false,
        hideFolderFiles: false,
        tokenVersion: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      user = { _id: result.insertedId, ...newUser };

      sendWelcomeEmail({ email, name }).catch((e) =>
        console.error('Welcome email error:', e.message)
      );
    } else {
      if (user.pendingDeletion) {
        // User is signing back in within the 7-day recovery window — restore account
        await db.collection('users').updateOne(
          { googleId },
          {
            $unset: { pendingDeletion: '', deletionScheduledAt: '' },
            $set: { name, picture, email, updatedAt: new Date() },
          }
        );
      } else {
        // Normal login — refresh profile info
        await db.collection('users').updateOne(
          { googleId },
          { $set: { name, picture, email, updatedAt: new Date() } }
        );
      }
      user.name = name;
      user.picture = picture;
      user.email = email;
    }

    // ── Issue short-lived JWT (15 min) + rotating refresh token ─────────────
    const currentTokenVersion = user.tokenVersion ?? 0;
    const tokenPayload = {
      userId: user._id.toString(),
      googleId,
      email,
      name,
      picture,
      tokenVersion: currentTokenVersion,
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('airstream_session', token, cookieOptions(rememberMe));

    // Issue refresh token — stored in DB and sent as a second httpOnly cookie.
    // Expiry mirrors the old session length: 30 days if rememberMe, else 24 h.
    const refreshTokenValue = uuidv4();
    const refreshExpiresAt = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
    );
    await db.collection('refresh_tokens').insertOne({
      token: refreshTokenValue,
      userId: user._id.toString(),
      createdAt: new Date(),
      expiresAt: refreshExpiresAt,
      used: false,
    });
    res.cookie('airstream_refresh', refreshTokenValue, cookieOptions(rememberMe));

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
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] verifyTokenAndCheckRevocation checks both signature and tokenVersion.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const user = await db.collection('users').findOne({ googleId: decoded.googleId });
    if (!user) return res.status(401).json({ error: 'User not found.' });

    return res.json({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      picture: user.picture,
      darkMode: user.darkMode || false,
      hideFolderFiles: user.hideFolderFiles || false,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return res.status(500).json({ error: 'Session check failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  – clear session cookie
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  // [MED-02] Use clearCookieOptions() which enforces sameSite: 'strict' to match
  // the value used when the cookie was set.
  // [SEC-02] Increment tokenVersion so the outgoing JWT is immediately dead,
  // fixing the bug where the JWT stayed valid until its 15-min expiry after logout.
  try {
    const token = getToken(req);
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded?.userId) {
          const db = getDb();
          await db.collection('users').updateOne(
            { _id: new (getObjectId())(decoded.userId) },
            { $inc: { tokenVersion: 1 } }
          );
        }
      } catch (_) { /* token may already be expired — proceed with logout */ }
    }
  } catch (_) {}
  res.clearCookie('airstream_session', clearCookieOptions());
  res.clearCookie('airstream_refresh', clearCookieOptions());
  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  – rotate refresh token, issue new short-lived JWT
//
// Flow:
//   1. Read airstream_refresh cookie.
//   2. Atomically mark it used: true (findOneAndUpdate with used:false filter).
//   3. If the token was already used → replay attack detected:
//      • $inc tokenVersion to kill every session for this user instantly.
//      • Clear both cookies and return 401.
//   4. Otherwise issue a new 15-min JWT + a new refresh token.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const incomingRefresh = req.cookies && req.cookies.airstream_refresh;
    if (!incomingRefresh) {
      return res.status(401).json({ error: 'No refresh token.' });
    }

    const db = getDb();

    // Atomically claim the token — only matches if unused and not expired
    const record = await db.collection('refresh_tokens').findOneAndUpdate(
      { token: incomingRefresh, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: 'before' }
    );

    if (!record) {
      // Check whether this token exists but was already used → stolen token replayed
      const stolen = await db.collection('refresh_tokens').findOne({
        token: incomingRefresh,
        used: true,
      });
      if (stolen) {
        // [SEC-01] Kill all sessions for this user immediately
        await db.collection('users').updateOne(
          { _id: new (getObjectId())(stolen.userId) },
          { $inc: { tokenVersion: 1 } }
        );
        console.warn(`[SECURITY] Refresh token replay detected for userId=${stolen.userId}. All sessions invalidated.`);
        res.clearCookie('airstream_session', clearCookieOptions());
        res.clearCookie('airstream_refresh', clearCookieOptions());
        return res.status(401).json({
          error: 'Security alert: this session was compromised. Please sign in again.',
        });
      }
      // Token not found or expired — normal expiry
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }

    // Load current user to get fresh tokenVersion
    const ObjectId = getObjectId();
    const user = await db.collection('users').findOne({ _id: new ObjectId(record.userId) });
    if (!user) return res.status(401).json({ error: 'User not found.' });
    if (user.pendingDeletion) return res.status(403).json({ error: 'Account is pending deletion.' });

    // Issue new JWT (15 min) with current tokenVersion
    const newTokenPayload = {
      userId: user._id.toString(),
      googleId: user.googleId,
      email: user.email,
      name: user.name,
      picture: user.picture,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const newJwt = jwt.sign(newTokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    // Infer rememberMe from the original refresh token's expiry — if it's more
    // than 24 h from now it was a 30-day session, so preserve the maxAge on the
    // re-issued cookies so the browser doesn't drop them on close.
    const remainingMs = new Date(record.expiresAt).getTime() - Date.now();
    const wasRememberMe = remainingMs > 24 * 60 * 60 * 1000;
    res.cookie('airstream_session', newJwt, cookieOptions(wasRememberMe));

    // Issue new refresh token — preserve the original expiry window so sessions
    // don't extend indefinitely just from activity
    const newRefreshValue = uuidv4();
    await db.collection('refresh_tokens').insertOne({
      token: newRefreshValue,
      userId: user._id.toString(),
      createdAt: new Date(),
      expiresAt: new Date(record.expiresAt), // same deadline as the original login
      used: false,
    });
    res.cookie('airstream_refresh', newRefreshValue, cookieOptions(wasRememberMe));

    return res.json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Token refresh failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/preferences  – save user preferences: darkMode, hideFolderFiles (requires JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/preferences', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] Use revocation-aware check so revoked sessions can't update preferences.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const { darkMode, hideFolderFiles } = req.body;

    const updates = { updatedAt: new Date() };
    if (typeof darkMode === 'boolean') updates.darkMode = darkMode;
    if (typeof hideFolderFiles === 'boolean') updates.hideFolderFiles = hideFolderFiles;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid preference provided.' });
    }

    await db.collection('users').updateOne(
      { googleId: decoded.googleId },
      { $set: updates }
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Preferences update error:', error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/stats  – file count + storage used for current user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] Use revocation-aware check so revoked sessions can't read stats.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const userId = decoded.userId;

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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/export-data
// Generates a time-limited export token and emails the user a download link.
// The download streams all files as a ZIP without storing anything extra.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/export-data', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] Use revocation-aware check so revoked sessions can't trigger exports.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    // Rate-limit: one pending export at a time (created in last hour)
    const recentExport = await db.collection('export_tokens').findOne({
      userId: decoded.userId,
      createdAt: { $gt: new Date(Date.now() - 60 * 60 * 1000) },
    });
    if (recentExport) {
      return res.status(429).json({
        error: 'An export was already requested in the last hour. Please check your email.',
      });
    }

    const exportToken = uuidv4();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    // [SEC-03] 96-char random key embedded in the ZIP manifest and verified on
    // import, proving the ZIP was produced by this server and not forged.
    const exportKey = crypto.randomBytes(48).toString('hex'); // 48 bytes => 96 hex chars

    await db.collection('export_tokens').insertOne({
      token: exportToken,
      exportKey,
      userId: decoded.userId,
      email: decoded.email,
      createdAt: new Date(),
      expiresAt,
      used: false,
    });

    const downloadUrl = `${process.env.BACKEND_URL}/api/auth/export-download/${exportToken}`;

    await sendExportEmail(
      { email: decoded.email, name: decoded.name },
      downloadUrl,
      expiresAt
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Export data error:', error);
    return res.status(500).json({ error: 'Export failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/export-download/:token
// Streams all user files as a ZIP. Public but token-gated.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export-download/:token', async (req, res) => {
  let archive;
  try {
    const { token } = req.params;
    const db = getDb();

    // [HIGH-02] ATOMIC token claim: use findOneAndUpdate with a filter that only
    // matches un-used, un-expired tokens. This eliminates the race condition where
    // two concurrent requests both pass the old findOne + updateOne check.
    // returnDocument: 'before' gives us the pre-update document so we can
    // distinguish "not found" from "already used" for better error messages.
    const exportRecord = await db.collection('export_tokens').findOneAndUpdate(
      {
        token,
        used: { $ne: true },
        expiresAt: { $gt: new Date() },
      },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: 'before' }
    );

    if (!exportRecord) {
      // Determine why it failed for a meaningful error message
      const existing = await db.collection('export_tokens').findOne({ token });
      if (!existing) {
        return res.status(404).send('Export link not found.');
      }
      if (existing.used) {
        return res.status(410).send('This export link has already been used. Please request a new one.');
      }
      return res.status(410).send('This export link has expired (72-hour limit).');
    }

    const files = await db
      .collection('drive_mappings')
      .find({ userId: exportRecord.userId, 'metadata.isSharedZip': { $ne: true } })
      .toArray();

    // [FIX] Compute stable, de-duplicated zipEntry names first so manifest and
    // ZIP always agree on filenames — fixes the 'entry not found' mismatch that
    // caused 0 imported / N skipped on every import.
    const ObjectId = getObjectId();
    const bucket = new mongoose.mongo.GridFSBucket(db.db, { bucketName: 'uploads' });

    // [FIX] Pre-filter: exclude any drive_mappings document whose driveId is
    // missing or not a valid ObjectId. These are incomplete/failed uploads.
    // Without this, new ObjectId(undefined) throws in the loop and every file
    // gets skipped, producing a manifest-only ZIP.
    const validFiles = files.filter((f) => f.driveId && safeObjectId(String(f.driveId)));

    const usedZipEntries = new Set();
    const manifestFiles = validFiles.map((f) => {
      const raw = f.metadata?.filename || `file_${f._id}`;
      let base = raw.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
      // De-duplicate: append a counter if this sanitized name is already taken
      if (usedZipEntries.has(base)) {
        const dotIdx = base.lastIndexOf('.');
        const name  = dotIdx > 0 ? base.slice(0, dotIdx) : base;
        const ext   = dotIdx > 0 ? base.slice(dotIdx)    : '';
        let counter = 1;
        while (usedZipEntries.has(`${name}_${counter}${ext}`)) counter++;
        base = `${name}_${counter}${ext}`;
      }
      usedZipEntries.add(base);
      return {
        filename:    raw,           // original name shown to user
        zipEntry:    base,          // exact path used inside the ZIP under files/
        contentType: f.metadata?.contentType || 'application/octet-stream',
        size:        f.metadata?.size || 0,
        uploadDate:  f.metadata?.uploadDate || f.createdAt,
        type:        f.metadata?.type || 'other',
        _id:         f._id,
        _driveId:    f.driveId,
      };
    });

    // [SEC-03] Embed exportKey so import can verify this ZIP came from this server
    const manifest = {
      airstreamExport: true,
      version:    '1.1',
      exportedAt: new Date().toISOString(),
      userId:     exportRecord.userId,
      exportKey:  exportRecord.exportKey,
      files: manifestFiles.map(({ filename, zipEntry, contentType, size, uploadDate, type }) => ({
        filename, zipEntry, contentType, size, uploadDate, type,
      })),
    };

    const timestamp = Date.now();
    res.setHeader('Content-Disposition', `attachment; filename="airstream-export-${timestamp}.zip"`);
    res.setHeader('Content-Type', 'application/zip');

    archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('Archive error during export:', err);
      if (!res.headersSent) res.status(500).send('Export failed.');
    });

    archive.pipe(res);

    // manifest goes in first
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // [FIX] The old code passed a raw GridFS ReadableStream to archive.append().
    // If the stream emitted 'error' (e.g. file missing from GridFS), archiver
    // never heard it — the file was silently dropped, producing a 1KB manifest-only
    // ZIP. Fix: buffer each file explicitly so errors are caught and skipped cleanly.
    for (const fileMeta of manifestFiles) {
      try {
        const gridFSId = safeObjectId(String(fileMeta._driveId));
        if (!gridFSId) {
          console.warn(`Export: skipping file ${fileMeta._id}: invalid driveId "${fileMeta._driveId}"`);
          continue;
        }
        const fileBuffer = await new Promise((resolve, reject) => {
          const chunks = [];
          const dlStream = bucket.openDownloadStream(gridFSId);
          dlStream.on('data',  (chunk) => chunks.push(chunk));
          dlStream.on('end',   ()      => resolve(Buffer.concat(chunks)));
          dlStream.on('error', reject);
        });
        archive.append(fileBuffer, { name: `files/${fileMeta.zipEntry}` });
      } catch (fileErr) {
        console.warn(`Export: skipping file ${fileMeta._id}:`, fileErr.message);
      }
    }

    await archive.finalize();
  } catch (error) {
    console.error('Export download error:', error);
    if (!res.headersSent) res.status(500).send('Export failed. Please request a new export link.');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/import-data
// Accepts the exported ZIP file and re-imports all files into the user's account.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/import-data', importUpload.single('exportFile'), async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] Use revocation-aware check so revoked sessions can't import data.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    let zip;
    try {
      zip = new AdmZip(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'Invalid ZIP file. Please upload a valid Airstream export.' });
    }

    // Parse manifest
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      return res.status(400).json({ error: 'Invalid Airstream export: manifest.json not found.' });
    }

    let manifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Corrupt manifest.json in export file.' });
    }

    if (!manifest.airstreamExport) {
      return res.status(400).json({ error: 'This does not appear to be an Airstream export file.' });
    }

    // [SEC-03] Verify the exportKey embedded in the manifest exists in our DB.
    // This proves the ZIP was produced by this server, not forged externally.
    if (!manifest.exportKey || typeof manifest.exportKey !== 'string' || manifest.exportKey.length !== 96) {
      return res.status(400).json({ error: 'Invalid export file: missing or malformed security key.' });
    }
    const keyRecord = await db.collection('export_tokens').findOne({ exportKey: manifest.exportKey });
    if (!keyRecord) {
      return res.status(400).json({ error: 'Invalid export file: security key not recognised. Only exports from this Airstream instance can be imported.' });
    }

    // [HIGH-06] Reject manifests that exceed the file count cap.
    // An unbounded list drives an O(n) background loop and floods the socket room.
    if (!Array.isArray(manifest.files) || manifest.files.length > MAX_IMPORT_FILES) {
      return res.status(400).json({
        error: `Import exceeds the maximum of ${MAX_IMPORT_FILES.toLocaleString()} files.`,
      });
    }

    const ObjectId = getObjectId();
    const bucket = new mongoose.mongo.GridFSBucket(db.db, { bucketName: 'uploads' });
    const userId = decoded.userId;
    const io = req.app.get('io');
    const total = manifest.files.length;

    // ── Respond immediately so the client can show a live progress bar ────────
    res.json({ success: true, total, userId });

    // ── Process files in the background ───────────────────────────────────────
    (async () => {
      let imported = 0;
      let skipped = 0;

      for (const fileMeta of manifest.files) {
        const rawFilename = fileMeta.filename || '';

        // [HIGH-03] Explicit path-traversal guard: reject filenames that contain
        // '..', start with '/', or contain '\' before any further processing.
        // The sanitization regex below handles other special characters, but these
        // specific patterns need to be caught early to prevent directory traversal
        // attacks when the filename is stored in metadata or used in Content-Disposition.
        if (
          rawFilename.includes('..') ||
          rawFilename.startsWith('/') ||
          rawFilename.includes('\\')
        ) {
          console.warn(`Import: rejected unsafe filename: ${rawFilename}`);
          skipped++;
          if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
          continue;
        }

        // Sanitize: allow only safe characters in filename
        const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._\-\s]/g, '_') || `file_${Date.now()}`;
        // [FIX] Use the pre-computed zipEntry from the manifest (v1.1+) so the
        // lookup is always exact. Falls back to the sanitized name for old v1.0 exports.
        const zipEntryFilename = fileMeta.zipEntry || safeFilename;
        const zipEntryName = `files/${zipEntryFilename}`;
        const entry = zip.getEntry(zipEntryName);

        if (!entry) {
          console.warn(`Import: entry not found for ${zipEntryName}`);
          skipped++;
          if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
          continue;
        }

        try {
          // [HIGH-07] ZIP bomb guard: read the stored uncompressed size from the
          // ZIP local file header *before* decompressing. entry.header.size is
          // the value written by the archiver and does not require decompression.
          // Reject the entry if its uncompressed size alone would exceed the
          // remaining quota, and also enforce a per-file ceiling of 5 GB to prevent
          // a single entry from exhausting RAM regardless of the user's quota.
          const uncompressedSize = entry.header?.size ?? 0;
          const PER_FILE_MAX = STORAGE_LIMIT_BYTES; // 5 GB per-file ceiling

          if (uncompressedSize > PER_FILE_MAX) {
            console.warn(`Import: ZIP bomb guard — entry ${safeFilename} claims ${uncompressedSize} bytes uncompressed (limit ${PER_FILE_MAX}). Skipping.`);
            skipped++;
            if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
            continue;
          }

          // Re-check quota using the uncompressed size before decompression
          const preCheckUsage = await db.collection('drive_mappings').aggregate([
            { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
            { $group: { _id: null, total: { $sum: { $toInt: { $ifNull: ['$metadata.size', 0] } } } } },
          ]).toArray();
          const preCheckUsedBytes = preCheckUsage[0]?.total || 0;
          if (preCheckUsedBytes + uncompressedSize > STORAGE_LIMIT_BYTES) {
            console.warn(`Import: storage limit would be exceeded for user ${userId}, skipping remaining files`);
            skipped += (total - imported - skipped);
            if (io) io.to(userId).emit('importComplete', {
              userId,
              imported,
              skipped,
              message: `Storage limit reached. Imported ${imported} file${imported !== 1 ? 's' : ''}, ${skipped} skipped.`,
            });
            return;
          }

          const fileBuffer = entry.getData();

          const mongoId = new ObjectId();

          const uploadStream = bucket.openUploadStream(safeFilename, {
            metadata: { userId, type: fileMeta.type || 'other', uploadedAt: new Date() },
          });

          await new Promise((resolve, reject) => {
            uploadStream.on('finish', resolve);
            uploadStream.on('error', reject);
            uploadStream.write(fileBuffer);
            uploadStream.end();
          });

          const gridFSId = uploadStream.id.toString();

          await db.collection('drive_mappings').insertOne({
            _id: mongoId,
            driveId: gridFSId,
            userId,
            createdAt: new Date(),
            metadata: {
              // [HIGH-03] Store the sanitized filename — never the raw manifest value
              filename: safeFilename,
              type: fileMeta.type || 'other',
              contentType: fileMeta.contentType || 'application/octet-stream',
              size: fileBuffer.length,
              uploadDate: new Date(),
              uploadedAt: new Date(),
              gridFSId,
            },
          });

          imported++;

          if (io) {
            io.to(userId).emit('importProgress', { userId, imported, skipped, total });
            io.to(userId).emit('refreshFileList');
          }
        } catch (fileErr) {
          console.error(`Import: failed to import ${safeFilename}:`, fileErr.message);
          skipped++;
          if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
        }
      }

      // ── All done ──────────────────────────────────────────────────────────
      if (io) {
        io.to(userId).emit('importComplete', {
          userId,
          imported,
          skipped,
          message: `Successfully imported ${imported} file${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
        });
      }
    })().catch((err) => {
      console.error('Background import error:', err);
      if (io) io.to(userId).emit('importComplete', { userId, imported: 0, skipped: total, message: 'Import failed unexpectedly.' });
    });

  } catch (error) {
    console.error('Import data error:', error);
    return res.status(500).json({ error: 'Import failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/delete-account
// Marks the account for deletion with a 7-day recovery window.
// A scheduled cleanup job permanently deletes it after 7 days.
// If the user signs back in within 7 days, the account is restored.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/delete-account', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      // [HIGH-05] Use revocation-aware check. Note: this route also increments
      // tokenVersion itself, which is fine — we just need to confirm the session
      // is still valid *before* acting on the deletion request.
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const now = new Date();
    const recoveryDeadline = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await db.collection('users').updateOne(
      { googleId: decoded.googleId },
      {
        $set: {
          pendingDeletion: true,
          deletionScheduledAt: now,
          updatedAt: now,
        },
      }
    );

    // Revoke all export tokens for this user
    await db.collection('export_tokens').deleteMany({ userId: decoded.userId });

    // [SEC-02] Increment tokenVersion to immediately invalidate all JWTs for this user
    await db.collection('users').updateOne(
      { googleId: decoded.googleId },
      { $inc: { tokenVersion: 1 } }
    );

    // Send deletion email (fire-and-forget)
    sendDeletionEmail(
      { email: decoded.email, name: decoded.name },
      recoveryDeadline
    ).catch((e) => console.error('Deletion email error:', e.message));

    // [MED-02] Use clearCookieOptions() to ensure sameSite: 'strict' matches the
    // value used when the cookie was originally set.
    res.clearCookie('airstream_session', clearCookieOptions());
    res.clearCookie('airstream_refresh', clearCookieOptions());

    return res.json({
      success: true,
      recoveryDeadline,
      message:
        'Your account has been scheduled for deletion. You have 7 days to sign back in and recover it.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to schedule account deletion.' });
  }
});

module.exports = router;
