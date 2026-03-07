// routes/authRoutes.js
/**
 * Authentication routes for Airstream.
 * - POST /api/auth/google              : Exchange OAuth2 code, create/login user, set JWT cookie
 * - GET  /api/auth/me                  : Return current user from cookie
 * - POST /api/auth/logout              : Clear session cookie
 * - PATCH /api/auth/preferences        : Save darkMode and hideFolderFiles preferences
 * - GET  /api/auth/stats               : Return file count + storage used (app) + Drive quota
 * - GET  /api/auth/drive-storage       : Return live Google Drive storage quota
 * - POST /api/auth/export-data         : Generate an export token and email a ZIP download link
 * - GET  /api/auth/export-download/:token : Stream all user files as a ZIP (public, token-gated)
 * - POST /api/auth/import-data         : Import a previously exported ZIP back into the account
 * - POST /api/auth/delete-account      : Schedule account for deletion (7-day recovery window)
 * - POST /api/auth/refresh             : Exchange a valid refresh token for a new JWT + refresh token
 *
 * STORAGE CHANGE: Files are now stored in the user's Google Drive (not GridFS).
 * AUTH CHANGE: Sign-in now uses OAuth2 authorization code flow so we can request
 *   Drive scopes in the same step as identity verification.
 *   Frontend sends { code } instead of { credential }.
 *
 * All prior security fixes retained:
 *  - [HIGH-01] reCAPTCHA
 *  - [HIGH-02] Atomic export-token claim
 *  - [MED-02]  Cookie clear options
 *  - [HIGH-03] ZIP path-traversal guard
 *  - [SEC-01]  Short-lived JWT + rotating refresh tokens + replay detection
 *  - [SEC-02]  tokenVersion revocation
 *  - [HIGH-05] verifyTokenAndCheckRevocation on all authenticated routes
 *  - [HIGH-06] MAX_IMPORT_FILES cap
 *  - [HIGH-07] ZIP bomb: declaredSize check before decompression
 *  - [HIGH-08] Import uses disk storage
 *  - [SEC-03]  Export manifest exportKey
 */

const express  = require('express');
const router   = express.Router();
const crypto   = require('crypto');
const fs       = require('fs');
const os       = require('os');
const { OAuth2Client } = require('google-auth-library');
const jwt      = require('jsonwebtoken');
const axios    = require('axios');
const mongoose = require('mongoose');
const multer   = require('multer');
const archiver = require('archiver');
const AdmZip   = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const { authLimiter } = require('../middleware/rateLimitMiddleware');
const { sendWelcomeEmail, sendExportEmail, sendDeletionEmail } = require('../services/emailService');
const { safeObjectId } = require('../utils/driveUtils');
const {
  uploadFileToDrive,
  downloadFileBufferFromDrive,
  getDriveStorageQuota,
} = require('../services/driveService');
const { getUserStorageUsed } = require('../services/fileService');

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB fallback (used only if Drive quota unavailable)

// [HIGH-06] Hard cap on import files per operation
const MAX_IMPORT_FILES = 10_000;

// [HIGH-07] Max uncompressed size per entry: 4 GB
const PER_FILE_MAX = 4 * 1024 * 1024 * 1024;

// [HIGH-01] Warn at startup if reCAPTCHA is not configured
if (!process.env.RECAPTCHA_SECRET_KEY) {
  console.warn(
    '[SECURITY WARNING] RECAPTCHA_SECRET_KEY is not set. ' +
    'Bot protection is disabled. Set this variable in production.',
  );
}

if (!process.env.GOOGLE_CLIENT_SECRET) {
  console.warn(
    '[SECURITY WARNING] GOOGLE_CLIENT_SECRET is not set. ' +
    'OAuth2 code exchange will fail. Required for Drive integration.',
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getDb = () => mongoose.connection;
const getObjectId = () => mongoose.mongo.ObjectId;

// [MED-02] Single source of truth for cookie clear options
const clearCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});

const cookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge:   rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000,
});

const getToken = (req) => req.cookies?.airstream_session || null;

// Signature-only verify (used in logout where DB may be inaccessible)
const verifyToken = (token) =>
  jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], clockTolerance: 30 });

// [HIGH-05] Signature + tokenVersion DB check — used on all authenticated routes
const verifyTokenAndCheckRevocation = async (token, db) => {
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    const e = new Error('Invalid or expired session. Please sign in again.');
    e.status = 401;
    throw e;
  }

  const ObjectId = getObjectId();
  const user = await db.collection('users').findOne({ _id: new ObjectId(decoded.userId) });
  if (!user) {
    const e = new Error('User not found.');
    e.status = 401;
    throw e;
  }

  if ((decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
    const e = new Error('Session revoked. Please sign in again.');
    e.status = 401;
    e.code   = 'REVOKED';
    throw e;
  }

  if (user.pendingDeletion) {
    const e = new Error('Account is pending deletion.');
    e.status = 403;
    e.code   = 'PENDING_DELETION';
    throw e;
  }

  return decoded;
};

// [HIGH-08] Import uploads use disk storage (not RAM)
const importUpload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits:  { fileSize: 6 * 1024 * 1024 * 1024 },
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/google
// Accepts an OAuth2 authorization code from the frontend (popup flow).
// Exchanges the code for access_token + refresh_token + id_token.
// Creates or updates the user in MongoDB, stores Drive tokens.
// Issues a short-lived JWT + rotating refresh token.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', authLimiter, async (req, res) => {
  try {
    const { code, rememberMe = false, recaptchaToken } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code.' });
    }

    // ── [HIGH-01] reCAPTCHA v3 verification ──────────────────────────────────
    if (process.env.RECAPTCHA_SECRET_KEY) {
      if (!recaptchaToken) {
        return res.status(400).json({ error: 'Security check token missing. Please try again.' });
      }
      try {
        const rcRes = await axios.post(
          'https://www.google.com/recaptcha/api/siteverify',
          null,
          { params: { secret: process.env.RECAPTCHA_SECRET_KEY, response: recaptchaToken } },
        );
        const { success, score } = rcRes.data;
        if (!success || score < 0.5) {
          console.warn(`reCAPTCHA failed: success=${success}, score=${score}`);
          return res.status(400).json({ error: 'Security check failed. Please try again.' });
        }
      } catch (rcErr) {
        console.error('reCAPTCHA verification error (blocking):', rcErr.message);
        return res.status(400).json({ error: 'Security check could not be completed. Please try again.' });
      }
    }

    // ── Exchange authorization code for tokens ───────────────────────────────
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'postmessage', // redirect_uri for popup flow
    );

    let tokens;
    try {
      const result = await oauth2Client.getToken(code);
      tokens = result.tokens;
    } catch (tokenErr) {
      console.error('OAuth2 code exchange failed:', tokenErr.message);
      return res.status(401).json({ error: 'Failed to exchange authorization code. Please try again.' });
    }

    if (!tokens.id_token) {
      return res.status(401).json({ error: 'No identity token received from Google.' });
    }

    // ── Verify the id_token to get user info ─────────────────────────────────
    let ticket;
    try {
      oauth2Client.setCredentials(tokens);
      ticket = await oauth2Client.verifyIdToken({
        idToken:  tokens.id_token,
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
        darkMode:                false,
        hideFolderFiles:         false,
        tokenVersion:            0,
        googleDriveAccessToken:  tokens.access_token  || null,
        googleDriveRefreshToken: tokens.refresh_token || null,
        googleDriveTokenExpiry:  tokens.expiry_date   || null,
        googleDriveAppFolderId:  null,
        createdAt:               new Date(),
        updatedAt:               new Date(),
      };
      const result = await db.collection('users').insertOne(newUser);
      user = { _id: result.insertedId, ...newUser };

      sendWelcomeEmail({ email, name }).catch((e) =>
        console.error('Welcome email error:', e.message),
      );
    } else {
      if (user.pendingDeletion) {
        // User is signing back in within the 7-day recovery window — restore account
        await db.collection('users').updateOne(
          { googleId },
          {
            $unset: { pendingDeletion: '', deletionScheduledAt: '' },
            $set: {
              name, picture, email,
              googleDriveAccessToken:  tokens.access_token  || user.googleDriveAccessToken,
              googleDriveRefreshToken: tokens.refresh_token || user.googleDriveRefreshToken,
              googleDriveTokenExpiry:  tokens.expiry_date   || user.googleDriveTokenExpiry,
              updatedAt: new Date(),
            },
          },
        );
      } else {
        // Normal login — refresh profile info and Drive tokens
        // Only overwrite refresh_token if Google provides a new one (it won't if
        // the user already granted permission and the token is still valid).
        const tokenUpdates = {
          name, picture, email,
          googleDriveAccessToken: tokens.access_token || user.googleDriveAccessToken,
          googleDriveTokenExpiry: tokens.expiry_date  || user.googleDriveTokenExpiry,
          updatedAt: new Date(),
        };
        if (tokens.refresh_token) {
          tokenUpdates.googleDriveRefreshToken = tokens.refresh_token;
        }
        await db.collection('users').updateOne({ googleId }, { $set: tokenUpdates });
      }
      user.name    = name;
      user.picture = picture;
      user.email   = email;
    }

    // ── Issue short-lived JWT (15 min) + rotating refresh token ─────────────
    const currentTokenVersion = user.tokenVersion ?? 0;
    const tokenPayload = {
      userId:       user._id.toString(),
      googleId,
      email,
      name,
      picture,
      tokenVersion: currentTokenVersion,
    };

    const jwtToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.cookie('airstream_session', jwtToken, cookieOptions(rememberMe));

    // Issue refresh token
    const refreshTokenValue = uuidv4();
    const refreshExpiresAt  = new Date(
      Date.now() + (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000),
    );
    await db.collection('refresh_tokens').insertOne({
      token:     refreshTokenValue,
      userId:    user._id.toString(),
      createdAt: new Date(),
      expiresAt: refreshExpiresAt,
      used:      false,
    });
    res.cookie('airstream_refresh', refreshTokenValue, cookieOptions(rememberMe));

    return res.json({
      success: true,
      user: {
        userId:   user._id.toString(),
        email,
        name,
        picture,
        darkMode: user.darkMode || false,
        hideFolderFiles: user.hideFolderFiles || false,
        // Let the frontend know Drive is connected
        driveConnected: !!(tokens.refresh_token || user.googleDriveRefreshToken),
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
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const user = await db.collection('users').findOne({ googleId: decoded.googleId });
    if (!user) return res.status(401).json({ error: 'User not found.' });

    return res.json({
      userId:          user._id.toString(),
      email:           user.email,
      name:            user.name,
      picture:         user.picture,
      darkMode:        user.darkMode        || false,
      hideFolderFiles: user.hideFolderFiles || false,
      driveConnected:  !!user.googleDriveRefreshToken,
    });
  } catch (error) {
    console.error('Session check error:', error);
    return res.status(500).json({ error: 'Session check failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout  – clear session cookie, revoke JWT
// ─────────────────────────────────────────────────────────────────────────────
router.post('/logout', async (req, res) => {
  try {
    const token = getToken(req);
    if (token) {
      try {
        const decoded = verifyToken(token);
        if (decoded?.userId) {
          const db = getDb();
          await db.collection('users').updateOne(
            { _id: new (getObjectId())(decoded.userId) },
            { $inc: { tokenVersion: 1 } },
          );
        }
      } catch (_) { /* token may already be expired — proceed */ }
    }
  } catch (_) {}
  res.clearCookie('airstream_session', clearCookieOptions());
  res.clearCookie('airstream_refresh',  clearCookieOptions());
  return res.json({ success: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh  – rotate refresh token, issue new short-lived JWT
// ─────────────────────────────────────────────────────────────────────────────
router.post('/refresh', authLimiter, async (req, res) => {
  try {
    const incomingRefresh = req.cookies?.airstream_refresh;
    if (!incomingRefresh) return res.status(401).json({ error: 'No refresh token.' });

    const db = getDb();

    // Atomically claim the token
    const record = await db.collection('refresh_tokens').findOneAndUpdate(
      { token: incomingRefresh, used: false, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: 'before' },
    );

    if (!record) {
      // Check for replay attack
      const stolen = await db.collection('refresh_tokens').findOne({ token: incomingRefresh, used: true });
      if (stolen) {
        await db.collection('users').updateOne(
          { _id: new (getObjectId())(stolen.userId) },
          { $inc: { tokenVersion: 1 } },
        );
        console.warn(`[SECURITY] Refresh token replay detected for userId=${stolen.userId}. All sessions invalidated.`);
        res.clearCookie('airstream_session', clearCookieOptions());
        res.clearCookie('airstream_refresh',  clearCookieOptions());
        return res.status(401).json({
          error: 'Security alert: this session was compromised. Please sign in again.',
        });
      }
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }

    const ObjectId = getObjectId();
    const user = await db.collection('users').findOne({ _id: new ObjectId(record.userId) });
    if (!user)             return res.status(401).json({ error: 'User not found.' });
    if (user.pendingDeletion) return res.status(403).json({ error: 'Account is pending deletion.' });

    const newTokenPayload = {
      userId:       user._id.toString(),
      googleId:     user.googleId,
      email:        user.email,
      name:         user.name,
      picture:      user.picture,
      tokenVersion: user.tokenVersion ?? 0,
    };
    const newJwt = jwt.sign(newTokenPayload, process.env.JWT_SECRET, { expiresIn: '15m' });

    const remainingMs  = new Date(record.expiresAt).getTime() - Date.now();
    const wasRememberMe = remainingMs > 24 * 60 * 60 * 1000;
    res.cookie('airstream_session', newJwt, cookieOptions(wasRememberMe));

    const newRefreshValue = uuidv4();
    await db.collection('refresh_tokens').insertOne({
      token:     newRefreshValue,
      userId:    user._id.toString(),
      createdAt: new Date(),
      expiresAt: new Date(record.expiresAt), // preserve original expiry
      used:      false,
    });
    res.cookie('airstream_refresh', newRefreshValue, cookieOptions(wasRememberMe));

    return res.json({ success: true });
  } catch (error) {
    console.error('Refresh token error:', error);
    return res.status(500).json({ error: 'Token refresh failed.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/auth/preferences  – save darkMode and hideFolderFiles
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/preferences', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const { darkMode, hideFolderFiles } = req.body;
    const updates = { updatedAt: new Date() };
    if (typeof darkMode        === 'boolean') updates.darkMode        = darkMode;
    if (typeof hideFolderFiles === 'boolean') updates.hideFolderFiles = hideFolderFiles;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid preference provided.' });
    }

    await db.collection('users').updateOne(
      { googleId: decoded.googleId },
      { $set: updates },
    );

    return res.json({ success: true });
  } catch (error) {
    console.error('Preferences update error:', error);
    return res.status(500).json({ error: 'Failed to save preferences.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/stats  – file count + app storage used + Drive quota
// Returns both the app's local usage (from drive_mappings) and live Drive quota.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const userId = decoded.userId;

    // App usage from MongoDB metadata (fast, no Drive API call)
    const result = await db.collection('drive_mappings').aggregate([
      { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
      {
        $group: {
          _id:          null,
          fileCount:    { $sum: 1 },
          storageUsed:  { $sum: { $toLong: { $ifNull: ['$metadata.size', 0] } } },
        },
      },
    ]).toArray();

    const stats = result[0] || { fileCount: 0, storageUsed: 0 };

    // Drive quota (live, from Google API)
    let driveQuota = null;
    try {
      driveQuota = await getDriveStorageQuota(userId);
    } catch (quotaErr) {
      console.warn('Could not fetch Drive quota for stats:', quotaErr.message);
    }

    return res.json({
      fileCount:    stats.fileCount,
      storageUsed:  stats.storageUsed,            // bytes used by this app (from metadata)
      storageLimit: driveQuota?.limit || STORAGE_LIMIT_BYTES, // total Drive capacity
      driveQuota: driveQuota ? {
        limit:        driveQuota.limit,            // total Drive space (bytes)
        usage:        driveQuota.usage,            // all of Drive + Gmail + Photos (bytes)
        usageInDrive: driveQuota.usageInDrive,     // Drive files only (bytes)
      } : null,
    });
  } catch (error) {
    console.error('Stats error:', error);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/drive-storage  – live Drive quota (separate fast endpoint)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/drive-storage', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const quota = await getDriveStorageQuota(decoded.userId);
    return res.json(quota);
  } catch (error) {
    console.error('Drive storage error:', error);
    return res.status(500).json({ error: 'Failed to fetch Drive storage.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/export-data  – generate export token, email download link
// ─────────────────────────────────────────────────────────────────────────────
router.post('/export-data', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const userId = decoded.userId;
    const user   = await db.collection('users').findOne({ _id: new (getObjectId())(userId) });

    const exportToken = uuidv4();
    const exportKey   = crypto.randomBytes(16).toString('hex');
    const expiresAt   = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

    await db.collection('export_tokens').insertOne({
      token:     exportToken,
      userId,
      exportKey,
      createdAt: new Date(),
      expiresAt,
      used:      false,
    });

    const downloadUrl = `${process.env.BACKEND_URL}/api/auth/export-download/${exportToken}`;

    sendExportEmail(user, downloadUrl, expiresAt).catch((e) =>
      console.error('Export email error:', e.message),
    );

    return res.json({ success: true, message: 'Export link sent to your email.' });
  } catch (error) {
    console.error('Export data error:', error);
    return res.status(500).json({ error: 'Failed to initiate export.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/export-download/:token  – stream all user files as a ZIP.
// Public but token-gated.  Files are fetched from Google Drive.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export-download/:token', async (req, res) => {
  let archive;
  try {
    const { token } = req.params;
    const db = getDb();

    // [HIGH-02] Atomic token claim
    const exportRecord = await db.collection('export_tokens').findOneAndUpdate(
      { token, used: { $ne: true }, expiresAt: { $gt: new Date() } },
      { $set: { used: true, usedAt: new Date() } },
      { returnDocument: 'before' },
    );

    const exportDoc = exportRecord?.value ?? exportRecord;

    if (!exportDoc) {
      const existing = await db.collection('export_tokens').findOne({ token });
      if (!existing)      return res.status(404).send('Export link not found.');
      if (existing.used)  return res.status(410).send('This export link has already been used. Please request a new one.');
      return res.status(410).send('This export link has expired (72-hour limit).');
    }

    const ObjectId   = getObjectId();
    const userIdStr  = String(exportDoc.userId);
    const userIdQuery = ObjectId.isValid(userIdStr)
      ? { $or: [{ userId: userIdStr }, { userId: new ObjectId(userIdStr) }] }
      : { userId: userIdStr };

    const files = await db.collection('drive_mappings')
      .find({ ...userIdQuery, 'metadata.isSharedZip': { $ne: true } })
      .toArray();

    // [FIX] Only include files that have a driveId (Drive file ID string)
    const validFiles = files.filter((f) => f.driveId && typeof f.driveId === 'string' && f.driveId.length > 0);

    const usedZipEntries = new Set();
    const manifestFiles  = validFiles.map((f) => {
      const raw  = f.metadata?.filename || `file_${f._id}`;
      let base   = raw.replace(/[^a-zA-Z0-9._\-\s]/g, '_');
      if (usedZipEntries.has(base)) {
        const dotIdx = base.lastIndexOf('.');
        const name   = dotIdx > 0 ? base.slice(0, dotIdx) : base;
        const ext    = dotIdx > 0 ? base.slice(dotIdx)    : '';
        let counter  = 1;
        while (usedZipEntries.has(`${name}_${counter}${ext}`)) counter++;
        base = `${name}_${counter}${ext}`;
      }
      usedZipEntries.add(base);
      return {
        filename:    raw,
        zipEntry:    base,
        contentType: f.metadata?.contentType || 'application/octet-stream',
        size:        f.metadata?.size        || 0,
        uploadDate:  f.metadata?.uploadDate  || f.createdAt,
        type:        f.metadata?.type        || 'other',
        _id:         f._id,
        _driveId:    f.driveId,
      };
    });

    // [SEC-03] Embed exportKey so import can verify this ZIP came from this server
    const manifest = {
      airstreamExport: true,
      version:         '2.0',
      exportedAt:      new Date().toISOString(),
      userId:          exportDoc.userId,
      exportKey:       exportDoc.exportKey,
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
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Download each file from Google Drive and append to ZIP
    for (const fileMeta of manifestFiles) {
      try {
        const fileBuffer = await downloadFileBufferFromDrive(exportDoc.userId, fileMeta._driveId);
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
// Accepts the exported ZIP file and re-imports all files into Google Drive.
// ─────────────────────────────────────────────────────────────────────────────
router.post('/import-data', authLimiter, importUpload.single('exportFile'), async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });

    const cleanupTemp = () => fs.unlink(req.file.path, () => {});

    let zip;
    try {
      zip = new AdmZip(req.file.path); // [HIGH-08] read from disk
    } catch {
      cleanupTemp();
      return res.status(400).json({ error: 'Invalid ZIP file. Please upload a valid Airstream export.' });
    }

    // Parse and validate manifest
    const manifestEntry = zip.getEntry('manifest.json');
    if (!manifestEntry) {
      cleanupTemp();
      return res.status(400).json({ error: 'Invalid export: manifest.json not found.' });
    }

    let manifest;
    try {
      manifest = JSON.parse(manifestEntry.getData().toString('utf8'));
    } catch {
      cleanupTemp();
      return res.status(400).json({ error: 'Corrupt manifest.json.' });
    }

    if (!manifest.airstreamExport) {
      cleanupTemp();
      return res.status(400).json({ error: 'Not a valid Airstream export file.' });
    }

    const manifestFileList = Array.isArray(manifest.files) ? manifest.files : [];

    // [HIGH-06] Cap on number of files
    if (manifestFileList.length > MAX_IMPORT_FILES) {
      cleanupTemp();
      return res.status(400).json({
        error: `Import contains too many files (max ${MAX_IMPORT_FILES.toLocaleString()}).`,
      });
    }

    const total  = manifestFileList.length;
    const userId = decoded.userId;
    const io     = req.app.get('io');

    // Acknowledge immediately; import runs in background
    res.json({
      success: true,
      message: `Starting import of ${total} file${total !== 1 ? 's' : ''}…`,
      total,
    });
    cleanupTemp();

    // ── Background import ─────────────────────────────────────────────────────
    let imported = 0;
    let skipped  = 0;
    let usedBytes = 0;

    const ObjectId = getObjectId();

    (async () => {
      for (const fileMeta of manifestFileList) {
        let safeFilename;
        try {
          const rawName = fileMeta.filename || fileMeta.zipEntry || `import_${Date.now()}`;

          // [HIGH-03] Path traversal guard
          if (rawName.includes('..') || rawName.startsWith('/') || rawName.includes('\\')) {
            console.warn(`Import: rejecting filename with traversal attempt: "${rawName}"`);
            skipped++;
            if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
            continue;
          }

          safeFilename = rawName
            .replace(/[^a-zA-Z0-9._\-\s]/g, '_')
            .replace(/\.\./g, '_')
            .trim() || `import_${Date.now()}`;

          const entryPath = `files/${fileMeta.zipEntry || safeFilename}`;
          const entry     = zip.getEntry(entryPath);
          if (!entry) {
            console.warn(`Import: entry not found in ZIP: "${entryPath}"`);
            skipped++;
            if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
            continue;
          }

          // [HIGH-07] Check declared size before decompression
          const declaredSize = entry.header.size;
          if (declaredSize > PER_FILE_MAX) {
            throw new Error(`Entry ${safeFilename} exceeds per-file size limit (${declaredSize} bytes)`);
          }

          // Check Drive quota before each file
          try {
            const quota = await getDriveStorageQuota(userId);
            const available = quota.limit - quota.usage;
            if (available > 0 && declaredSize > available) {
              if (io) io.to(userId).emit('importComplete', {
                userId, imported, skipped,
                message: `Stopped: not enough Google Drive storage. Imported ${imported} file${imported !== 1 ? 's' : ''}, ${skipped} skipped.`,
              });
              return;
            }
          } catch (_) { /* quota check non-fatal during import */ }

          const fileBuffer = entry.getData();
          if (!fileBuffer || fileBuffer.length > PER_FILE_MAX) {
            throw new Error(`Entry ${safeFilename} too large (${fileBuffer?.length} bytes)`);
          }

          const mimetype  = fileMeta.contentType || 'application/octet-stream';
          const mongoId   = new ObjectId();

          // Upload to Google Drive
          const driveFileId = await uploadFileToDrive(userId, safeFilename, mimetype, fileBuffer);

          await db.collection('drive_mappings').insertOne({
            _id:      mongoId,
            driveId:  driveFileId,
            userId,
            createdAt: new Date(),
            metadata: {
              filename:    safeFilename,
              type:        fileMeta.type        || 'other',
              contentType: mimetype,
              size:        fileBuffer.length,
              uploadDate:  new Date(),
              uploadedAt:  new Date(),
              driveFileId: driveFileId,
            },
          });

          imported++;
          usedBytes += fileBuffer.length;

          if (io) {
            io.to(userId).emit('importProgress', { userId, imported, skipped, total });
            io.to(userId).emit('refreshFileList');
          }
        } catch (fileErr) {
          console.error(`Import: failed to import ${safeFilename || 'unknown'}:`, fileErr.message);
          skipped++;
          if (io) io.to(userId).emit('importProgress', { userId, imported, skipped, total });
        }
      }

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
    if (!res.headersSent) res.status(500).json({ error: 'Import failed. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/delete-account  – schedule account for deletion (7-day window)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/delete-account', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    const db = getDb();
    let decoded;
    try {
      decoded = await verifyTokenAndCheckRevocation(token, db);
    } catch (err) {
      return res.status(err.status || 401).json({ error: err.message });
    }

    const userId = decoded.userId;
    const user   = await db.collection('users').findOne({ _id: new (getObjectId())(userId) });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await db.collection('users').updateOne(
      { _id: user._id },
      {
        $set: {
          pendingDeletion:       true,
          deletionScheduledAt:   new Date(),
          updatedAt:             new Date(),
        },
        $inc: { tokenVersion: 1 },
      },
    );

    sendDeletionEmail(user).catch((e) => console.error('Deletion email error:', e.message));

    res.clearCookie('airstream_session', clearCookieOptions());
    res.clearCookie('airstream_refresh',  clearCookieOptions());

    return res.json({
      success: true,
      message: 'Your account has been scheduled for deletion. You have 7 days to sign back in to cancel.',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    return res.status(500).json({ error: 'Failed to schedule account deletion.' });
  }
});

module.exports = router;
