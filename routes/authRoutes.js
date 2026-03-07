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
 */

const express = require('express');
const router = express.Router();
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

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const getDb = () => mongoose.connection;

const cookieOptions = (rememberMe = false) => ({
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
  ...(rememberMe && { maxAge: 30 * 24 * 60 * 60 * 1000 }),
});

const getObjectId = () => mongoose.Types.ObjectId;

const getToken = (req) => req.cookies && req.cookies.airstream_session;

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

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

    // ── reCAPTCHA v3 verification (if configured) ────────────────────────────
    if (process.env.RECAPTCHA_SECRET_KEY && recaptchaToken && recaptchaToken.length > 20) {
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
        console.warn('reCAPTCHA verification error (non-blocking):', rcErr.message);
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
    let isNewUser = false;

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
      isNewUser = true;
      console.log(`New user created: ${email}`);

      // Send welcome email (fire-and-forget)
      sendWelcomeEmail({ email, name }).catch((e) =>
        console.error('Welcome email error:', e.message)
      );
    } else {
      // ── Check if account is pending deletion ─────────────────────────────
      if (user.pendingDeletion) {
        const sevenDaysAfterDeletion = new Date(
          new Date(user.deletionScheduledAt).getTime() + 7 * 24 * 60 * 60 * 1000
        );

        if (new Date() < sevenDaysAfterDeletion) {
          // Within 7-day recovery window — restore account
          await db.collection('users').updateOne(
            { googleId },
            {
              $set: { name, picture, email, updatedAt: new Date() },
              $unset: { pendingDeletion: '', deletionScheduledAt: '' },
            }
          );
          user.pendingDeletion = false;
          console.log(`Account restored for: ${email}`);
        } else {
          // Past recovery window — account should have been cleaned up by now
          return res.status(403).json({
            error: 'This account has been permanently deleted and cannot be recovered.',
          });
        }
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
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired. Please sign in again.' });
    }

    const db = getDb();
    const user = await db.collection('users').findOne({ googleId: decoded.googleId });
    if (!user) return res.status(401).json({ error: 'User not found.' });

    // Reject sessions for pending-deletion accounts
    if (user.pendingDeletion) {
      return res.status(403).json({ error: 'Account is pending deletion.' });
    }

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
// PATCH /api/auth/preferences  – save user preferences: darkMode, hideFolderFiles (requires JWT)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/preferences', async (req, res) => {
  try {
    const token = getToken(req);
    if (!token) return res.status(401).json({ error: 'Not authenticated.' });

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const { darkMode, hideFolderFiles } = req.body;

    const updates = { updatedAt: new Date() };
    if (typeof darkMode === 'boolean') updates.darkMode = darkMode;
    if (typeof hideFolderFiles === 'boolean') updates.hideFolderFiles = hideFolderFiles;

    if (Object.keys(updates).length === 1) {
      return res.status(400).json({ error: 'No valid preference provided.' });
    }

    const db = getDb();
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

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const db = getDb();
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

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const db = getDb();

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
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.collection('export_tokens').insertOne({
      token: exportToken,
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
      expiresAt,
      createdAt: new Date(),
    });

    const downloadUrl = `${process.env.BACKEND_URL}/api/auth/export-download/${exportToken}`;

    // Fire-and-forget email
    sendExportEmail(
      { email: decoded.email, name: decoded.name },
      downloadUrl,
      expiresAt
    ).catch((e) => console.error('Export email error:', e.message));

    return res.json({
      success: true,
      message: 'Export link sent! Check your email — the download link expires in 30 days.',
    });
  } catch (error) {
    console.error('Export data error:', error);
    return res.status(500).json({ error: 'Failed to initiate export.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/export-download/:token
// Public route (no JWT) — streams all user files as a ZIP archive.
// The ZIP contains manifest.json + files/ directory.
// This same ZIP can be re-imported via /api/auth/import-data.
// ─────────────────────────────────────────────────────────────────────────────
router.get('/export-download/:token', async (req, res) => {
  let archive;
  try {
    const { token } = req.params;
    const db = getDb();

    const exportRecord = await db.collection('export_tokens').findOne({ token });
    if (!exportRecord) {
      return res.status(404).send('Export link not found.');
    }
    if (new Date(exportRecord.expiresAt) < new Date()) {
      return res.status(410).send('This export link has expired (30-day limit).');
    }

    const files = await db
      .collection('drive_mappings')
      .find({ userId: exportRecord.userId, 'metadata.isSharedZip': { $ne: true } })
      .toArray();

    // Build manifest
    const manifest = {
      airstreamExport: true,
      version: '1.0',
      exportedAt: new Date().toISOString(),
      userId: exportRecord.userId,
      files: files.map((f) => ({
        filename: f.metadata?.filename || 'unknown',
        contentType: f.metadata?.contentType || 'application/octet-stream',
        size: f.metadata?.size || 0,
        uploadDate: f.metadata?.uploadDate || f.createdAt,
        type: f.metadata?.type || 'other',
      })),
    };

    const timestamp = Date.now();
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="airstream-export-${timestamp}.zip"`
    );
    res.setHeader('Content-Type', 'application/zip');

    // Dynamically require GridFS bucket from the app
    const mongoose_conn = db;
    const bucket = new mongoose.mongo.GridFSBucket(mongoose_conn.db, {
      bucketName: 'uploads',
    });

    archive = archiver('zip', { zlib: { level: 6 } });
    archive.on('error', (err) => {
      console.error('Archive error during export:', err);
      if (!res.headersSent) res.status(500).send('Export failed.');
    });

    archive.pipe(res);

    // Add manifest first
    archive.append(JSON.stringify(manifest, null, 2), { name: 'manifest.json' });

    // Stream each file from GridFS
    const ObjectId = getObjectId();
    for (const file of files) {
      try {
        const gridFSId = new ObjectId(file.driveId);
        const dlStream = bucket.openDownloadStream(gridFSId);
        const safeFilename = (file.metadata?.filename || `file_${file._id}`)
          .replace(/[^a-zA-Z0-9._\-\s]/g, '_');
        archive.append(dlStream, { name: `files/${safeFilename}` });
      } catch (fileErr) {
        console.warn(`Export: skipping file ${file._id}:`, fileErr.message);
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

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
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

    const db = getDb();
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
        const zipEntryName = `files/${fileMeta.filename.replace(/[^a-zA-Z0-9._\-\s]/g, '_')}`;
        const entry = zip.getEntry(zipEntryName);

        if (!entry) {
          console.warn(`Import: entry not found for ${zipEntryName}`);
          skipped++;
          if (io) io.emit('importProgress', { userId, imported, skipped, total });
          continue;
        }

        try {
          const fileBuffer = entry.getData();
          const mongoId = new ObjectId();

          const uploadStream = bucket.openUploadStream(fileMeta.filename, {
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
              filename: fileMeta.filename,
              type: fileMeta.type || 'other',
              contentType: fileMeta.contentType || 'application/octet-stream',
              size: fileBuffer.length,
              uploadDate: new Date(),
              uploadedAt: new Date(),
              gridFSId,
            },
          });

          imported++;

          // Emit per-file progress + trigger file list refresh so file appears immediately
          if (io) {
            io.emit('importProgress', { userId, imported, skipped, total });
            io.emit('refreshFileList');
          }
        } catch (fileErr) {
          console.error(`Import: failed to import ${fileMeta.filename}:`, fileErr.message);
          skipped++;
          if (io) io.emit('importProgress', { userId, imported, skipped, total });
        }
      }

      // ── All done ─────────────────────────────────────────────────────────────
      if (io) {
        io.emit('importComplete', {
          userId,
          imported,
          skipped,
          message: `Successfully imported ${imported} file${imported !== 1 ? 's' : ''}${skipped > 0 ? `, ${skipped} skipped` : ''}.`,
        });
      }
    })().catch((err) => {
      console.error('Background import error:', err);
      if (io) io.emit('importComplete', { userId, imported: 0, skipped: total, message: 'Import failed unexpectedly.' });
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

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch {
      return res.status(401).json({ error: 'Session expired.' });
    }

    const db = getDb();
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

    // Send deletion email (fire-and-forget)
    sendDeletionEmail(
      { email: decoded.email, name: decoded.name },
      recoveryDeadline
    ).catch((e) => console.error('Deletion email error:', e.message));

    // Clear session cookie
    res.clearCookie('airstream_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
    });

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
