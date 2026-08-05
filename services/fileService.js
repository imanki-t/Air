// services/fileService.js
// All file storage uses Google Drive — GridFS has been removed.
//
// Security fixes retained:
//  - [HIGH-04] isUnsafePreviewType: HTML/SVG/XML/JS forced to attachment.
//  - [CRITICAL-01] Storage quota check against real Drive quota before every upload.
//  - [MED-03] Expired/voided shared ZIPs: Drive file deleted + mapping removed.
//  - [LOW-03] 8-byte (64-bit) share IDs.

const mongoose = require('mongoose');
const crypto   = require('crypto');

const getFileCategory = require('../utils/fileType');
const {
  getFileMapping,
  storeDriveMapping,
  safeObjectId,
} = require('../utils/driveUtils');
const { cleanupFileFromFolders } = require('./folderService');
const {
  uploadFileToDrive,
  downloadFileStreamFromDrive,
  downloadFileStreamFromDriveRange,
  downloadFileBufferFromDrive,
  deleteFileFromDrive,
  getDriveStorageQuota,
  getDirectStreamUrl,
} = require('./driveService');

const getObjectId = () => mongoose.mongo.ObjectId;

const db = mongoose.connection;

const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB fallback

// ─────────────────────────────────────────────────────────────────────────────
// [HIGH-04] MIME types that must never be served inline — they would be
// executed by the browser as code, enabling stored XSS.
// Any content-type that starts with one of these prefixes is treated as unsafe.
// ─────────────────────────────────────────────────────────────────────────────
const UNSAFE_PREVIEW_MIME_PREFIXES = [
  'text/html',
  'text/xml',
  'application/xml',
  'application/xhtml',
  'application/javascript',
  'text/javascript',
  'application/x-javascript',
  'image/svg+xml',
  'text/x-javascript',
  'module',
];

const isUnsafePreviewType = (mimeType) => {
  const lower = (mimeType || '').toLowerCase().split(';')[0].trim();
  return UNSAFE_PREVIEW_MIME_PREFIXES.some((prefix) => lower.startsWith(prefix));
};

// ─────────────────────────────────────────────────────────────────────────────
// [LOW-03] Generate a short share ID — upgraded to 8 bytes (64-bit entropy).
// The previous 4-byte implementation had only ~16 million possible values.
// 8 bytes yields ~1.8×10¹⁹ possible IDs, making brute-force enumeration
// infeasible even from a large distributed set of IPs.
// ─────────────────────────────────────────────────────────────────────────────
const generateShortShareId = () => {
  return crypto
    .randomBytes(8)                   // 64 bits of entropy (was 4 bytes / 24 bits)
    .toString('base64')
    .replace(/\+/g, '0')
    .replace(/\//g, '1')
    .replace(/=/g, '')
    .substring(0, 11);               // 11 base64 chars represent ~66 bits
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: verify ownership of a file mapping
// ─────────────────────────────────────────────────────────────────────────────
const checkOwnership = (mapping, reqUserId) => {
  if (!mapping) return { allowed: false, mapping: null };
  // [FIX] IDOR: previously `mapping.userId &&` meant documents with no userId
  // field silently passed the check. Now a missing userId also denies access.
  if (!mapping.userId || mapping.userId !== reqUserId) {
    return { allowed: false, mapping };
  }
  return { allowed: true, mapping };
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: get total storage used by a user (excluding shared ZIPs)
// ─────────────────────────────────────────────────────────────────────────────
const getUserStorageUsed = async (userId) => {
  const result = await db.collection('drive_mappings').aggregate([
    { $match: { userId, 'metadata.isSharedZip': { $ne: true } } },
    {
      $group: {
        _id: null,
        total: { $sum: { $toLong: { $ifNull: ['$metadata.size', 0] } } }, // [FIX] $toLong handles files >2.1 GB ($toInt overflows at 2^31-1)
      },
    },
  ]).toArray();
  return result[0]?.total || 0;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: convert buffer or stream → Buffer
// ─────────────────────────────────────────────────────────────────────────────
const toBuffer = async (streamOrBuffer) => {
  if (Buffer.isBuffer(streamOrBuffer)) return streamOrBuffer;
  return new Promise((resolve, reject) => {
    const chunks = [];
    streamOrBuffer.on('data', (c) => chunks.push(c));
    streamOrBuffer.on('end', () => resolve(Buffer.concat(chunks)));
    streamOrBuffer.on('error', reject);
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload file → Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const uploadFile = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const userId = req.user?.userId;
    const { originalname, mimetype, buffer, stream, size } = req.file;

    // ── Check Drive quota before uploading ──────────────────────────────────
    if (userId) {
      const fileSize = size || buffer?.length || 0;
      try {
        const quota = await getDriveStorageQuota(userId);
        const available = quota.limit - quota.usage;
        if (available > 0 && fileSize > available) {
          return res.status(413).json({
            error: `Not enough Google Drive storage. You have ${(available / (1024 ** 3)).toFixed(2)} GB available.`,
          });
        }
      } catch (quotaErr) {
        // Non-fatal — Drive API will reject if truly out of space
        console.warn('Quota pre-check failed (non-fatal):', quotaErr.message);
      }
    }

    const type = getFileCategory(mimetype);
    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;
    const uploadDate = new Date();

    const sanitizedName = (originalname || '')
      .replace(/[/\\]/g, '_')
      .replace(/\.\./g, '_')
      .replace(/[\x00-\x1f\x7f]/g, '_')
      .trim() || `upload_${Date.now()}`;

    const driveFileId = await uploadFileToDrive(userId, sanitizedName, mimetype, fileBuffer);

    const mongoId = new ObjectId();
    const metadata = {
      filename:    sanitizedName,
      type,
      contentType: mimetype,
      size:        fileSize,
      uploadDate,
      uploadedAt:  uploadDate,
    };

    await storeDriveMapping(mongoId, driveFileId, metadata, { userId });

    const responseBody = {
      _id:         mongoId,
      length:      fileSize,
      chunkSize:   261120,
      uploadDate,
      updatedAt:   uploadDate,
      filename:    sanitizedName,
      contentType: mimetype,
      customIconDriveId: null,
      customIconUrl: null,
      customIcon: null,
      metadata,
    };

    // Push to the user's other live sessions (other tabs/devices) so they see
    // the new file appear without polling or a full refetch. The uploading
    // client itself uses the response body directly instead of waiting for this.
    try {
      req.app.get('io')?.to(userId).emit('fileAdded', responseBody);
    } catch (_) { /* non-fatal — sockets are a live-update convenience, not a source of truth */ }

    res.status(201).json(responseBody);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed. Please try again.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Shape a raw drive_mappings document the way the frontend expects it.
// Shared by getFiles, uploadFile's socket push, and updateFileIcon's socket push
// so every code path (initial load, delta sync, live push) agrees on the shape.
// ─────────────────────────────────────────────────────────────────────────────
const formatFileForClient = (file) => {
  const driveId = file.metadata?.customIconDriveId || file.customIconDriveId || null;
  const iconUrl = driveId ? `/api/files/icon/${driveId}` : (file.metadata?.customIconUrl || file.customIconUrl || file.metadata?.customIcon || file.customIcon || null);
  return {
    _id: file._id,
    length: file.metadata?.size ? parseInt(file.metadata.size) : 0,
    chunkSize: 261120,
    uploadDate: file.metadata?.uploadDate || file.createdAt,
    updatedAt: file.updatedAt || file.createdAt,
    filename: file.metadata?.filename,
    contentType: file.metadata?.contentType,
    customIconDriveId: driveId,
    customIconUrl: iconUrl,
    customIcon: iconUrl,
    metadata: {
      ...file.metadata,
      customIconDriveId: driveId,
      customIconUrl: iconUrl,
      customIcon: iconUrl,
    },
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Get files for the current user.
//
// Bandwidth strategies supported (combine freely):
//  - Plain request (no params): full list, but ETag-conditional — a matching
//    If-None-Match returns 304 with no body if nothing changed since last time.
//  - ?ids=<id1,id2,...>       : only those files (used for the "R" quick-refresh
//                                of the current page).
//  - ?limit=<n>&?skip=<n>     : paginate the initial load instead of pulling
//                                everything at once.
//  - ?since=<ISO timestamp>   : delta sync — only files changed after that time,
//                                plus a deletedIds list (from tombstones) so the
//                                client can prune files removed since then.
// ─────────────────────────────────────────────────────────────────────────────
const getFiles = async (req, res) => {
  try {
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });

    const baseQuery = { userId, 'metadata.isSharedZip': { $ne: true } };

    const idsParam = req.query.ids;
    const sinceParam = req.query.since;
    const isFullRequest = !idsParam && !sinceParam;

    // ── ETag / 304 support (only meaningful for "give me everything" requests —
    // ids/since/limit requests are already minimal, so skip the extra lookups) ─
    if (isFullRequest) {
      const [latest, totalCount] = await Promise.all([
        db.collection('drive_mappings').find(baseQuery).project({ updatedAt: 1 }).sort({ updatedAt: -1 }).limit(1).next(),
        db.collection('drive_mappings').countDocuments(baseQuery),
      ]);
      const version = `${latest?.updatedAt ? new Date(latest.updatedAt).getTime() : 0}-${totalCount}`;
      const etag = `"${version}"`;
      res.setHeader('ETag', etag);
      res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
      if (req.headers['if-none-match'] === etag) {
        return res.status(304).end();
      }
    }

    const query = { ...baseQuery };

    if (idsParam) {
      const ids = String(idsParam)
        .split(',')
        .map((s) => safeObjectId(s.trim()))
        .filter(Boolean);
      if (ids.length) query._id = { $in: ids };
    } else if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        query.updatedAt = { $gt: sinceDate };
      }
    }

    let cursor = db.collection('drive_mappings').find(query).sort({ createdAt: -1 });

    if (!idsParam) {
      const limitParam = parseInt(req.query.limit, 10);
      const skipParam = parseInt(req.query.skip, 10);
      if (Number.isFinite(skipParam) && skipParam > 0) cursor = cursor.skip(skipParam);
      if (Number.isFinite(limitParam) && limitParam > 0) cursor = cursor.limit(Math.min(limitParam, 500));
    }

    const files = await cursor.toArray();
    const formattedFiles = files.map(formatFileForClient);

    // ── Delta sync: report files deleted since `since` from tombstones ───────
    let deletedIds = [];
    if (sinceParam) {
      const sinceDate = new Date(sinceParam);
      if (!isNaN(sinceDate.getTime())) {
        const deleted = await db.collection('deleted_files')
          .find({ userId, deletedAt: { $gt: sinceDate } })
          .project({ fileId: 1 })
          .toArray();
        deletedIds = deleted.map((d) => d.fileId);
      }
    }

    res.json({
      files: formattedFiles,
      deletedIds,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error retrieving files:', error);
    res.status(500).json({ error: 'Failed to retrieve files.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a file — ownership check then Drive delete
// ─────────────────────────────────────────────────────────────────────────────
const deleteFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const mapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied. You do not own this file.' });
    }

    if (!mapping.driveId) {
      return res.status(500).json({ error: 'File record is corrupt (missing storage ID).' });
    }

    // Delete main file & custom icon from Google Drive (non-fatal if 404)
    await deleteFileFromDrive(userId, mapping.driveId);

    const iconDriveId = mapping.customIconDriveId || mapping.metadata?.customIconDriveId;
    if (iconDriveId) {
      await deleteFileFromDrive(userId, iconDriveId).catch(() => {});
    }

    const objectId = safeObjectId(fileId);
    const deleteQuery = objectId ? { _id: objectId } : { 'metadata.filename': fileId };
    await db.collection('drive_mappings').deleteOne(deleteQuery);

    await cleanupFileFromFolders(userId, fileId);

    // Tombstone so delta-sync (?since=) clients — including ones offline right
    // now — learn this file is gone next time they sync, instead of it just
    // silently vanishing from a full refetch with no explanation.
    const deletedAt = new Date();
    try {
      await db.collection('deleted_files').insertOne({
        userId,
        fileId: String(objectId || fileId),
        deletedAt,
        expiresAt: new Date(deletedAt.getTime() + 30 * 24 * 60 * 60 * 1000), // 30-day TTL
      });
    } catch (tombstoneErr) {
      console.warn('Failed to record delete tombstone (non-fatal):', tombstoneErr.message);
    }

    // Push to the user's other live sessions so they remove the file instantly.
    try {
      req.app.get('io')?.to(userId).emit('fileDeleted', { fileId: String(objectId || fileId) });
    } catch (_) { /* non-fatal */ }

    res.json({ message: 'File deleted successfully.' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a file — streams from Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const downloadFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    if (!fileMapping.driveId) return res.status(500).json({ error: 'File record is corrupt (missing storage ID).' });
    const filename = fileMapping.metadata?.filename || 'download';
    const contentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize = fileMapping.metadata?.size;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', contentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const downloadStream = await downloadFileStreamFromDrive(userId, fileMapping.driveId);
    downloadStream.on('error', (err) => {
      console.error('Drive download stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    res.on('close', () => downloadStream.destroy()); // cleanup if client disconnects
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Download file error:', error);
    res.status(500).json({ error: 'Failed to download file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Preview a file (inline, with caching) — streams from Google Drive
// Supports HTTP Range requests (206 Partial Content) so that mobile browsers
// (Chrome/Safari) can seek video/audio and receive the correct total duration.
// Without proper Range support the browser calculates duration from the first
// chunk only, producing the "5s → 10s → ..." stepping bug.
// ─────────────────────────────────────────────────────────────────────────────
const previewFile = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    if (!fileMapping) return res.status(404).json({ error: 'File not found.' });

    if (userId && fileMapping.userId) {
      const { allowed } = checkOwnership(fileMapping, userId);
      if (!allowed) return res.status(403).json({ error: 'Access denied.' });
    }

    const ownerUserId = fileMapping.userId || userId;
    if (!fileMapping.driveId || !ownerUserId) return res.status(500).json({ error: 'File record is corrupt (missing storage ID or owner).' });

    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';

    // [HIGH-04] Prevent stored XSS: force unsafe types to download as opaque binary.
    const isUnsafe = isUnsafePreviewType(storedContentType);
    const servedContentType = isUnsafe ? 'application/octet-stream' : storedContentType;
    const filename   = fileMapping.metadata?.filename || 'preview';
    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    const fileSize   = fileMapping.metadata?.size ? parseInt(fileMapping.metadata.size, 10) : null;

    // ── Shared security headers ─────────────────────────────────────────────
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');

    if (isUnsafe) {
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
      const stream = await downloadFileStreamFromDrive(ownerUserId, fileMapping.driveId);
      stream.on('error', (err) => { console.error('Drive preview stream error:', err); if (!res.headersSent) res.status(404).json({ error: 'File not found.' }); });
      res.on('close', () => stream.destroy()); // cleanup if client disconnects
      return stream.pipe(res);
    }

    res.setHeader('Content-Type', servedContentType);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    const allowedOrigin = process.env.FRONTEND_URL || '*';
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Accept-Ranges, Content-Length');

    // ── HTTP Range & Fast Media Stream Optimization ──────────────────────────
    const isMedia = servedContentType.startsWith('video/') || servedContentType.startsWith('audio/') || ['video', 'audio'].includes(fileMapping.metadata?.type);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');

    const rangeHeader = req.headers['range'];

    if ((rangeHeader || isMedia) && fileSize) {
      let start = 0;
      let requestedEnd = null;

      if (rangeHeader) {
        const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!match) {
          res.setHeader('Content-Range', `bytes */${fileSize}`);
          return res.status(416).end();
        }
        start = parseInt(match[1], 10);
        requestedEnd = match[2] ? parseInt(match[2], 10) : null;
      }

      // High-performance streaming: 2MB initial chunk for instant startup & 2s HD buffer,
      // 8MB seeking chunk limit for smooth continuous playback without frequent request overhead.
      const initialChunkSize = 2 * 1024 * 1024;
      const maxChunkSize     = 8 * 1024 * 1024;
      const maxChunk = start === 0 ? initialChunkSize : maxChunkSize;
      const calcEnd = requestedEnd !== null ? requestedEnd : (start + maxChunk - 1);
      const clampedEnd = Math.min(calcEnd, fileSize - 1);

      if (start > clampedEnd || start < 0) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).end();
      }

      const chunkSize = clampedEnd - start + 1;

      res.status(206);
      res.setHeader('Content-Range',  `bytes ${start}-${clampedEnd}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize);

      const rangeStream = await downloadFileStreamFromDriveRange(ownerUserId, fileMapping.driveId, start, clampedEnd);
      rangeStream.on('error', (err) => {
        console.error('Drive range stream error:', err);
        if (!res.headersSent) res.status(404).json({ error: 'File not found.' });
      });
      res.on('close', () => rangeStream.destroy());
      return rangeStream.pipe(res);
    }

    // ── Full file (no Range header, or fileSize unknown) ────────────────────
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const fullStream = await downloadFileStreamFromDrive(ownerUserId, fileMapping.driveId);
    fullStream.on('error', (err) => {
      console.error('Drive preview stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found.' });
    });
    res.on('close', () => fullStream.destroy()); // cleanup if client disconnects
    fullStream.pipe(res);
  } catch (error) {
    console.error('Preview file error:', error);
    res.status(500).json({ error: 'Failed to preview file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Return a short-lived direct Google Drive URL for video/audio streaming.
// The browser hits Google's CDN directly — no Render proxy hop — so playback
// starts instantly and seeking is near-instant.
// The token embedded in the URL is valid for ~1 hour.
// ─────────────────────────────────────────────────────────────────────────────
const getVideoStreamUrl = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;

    const fileMapping = await getFileMapping(fileId);
    if (!fileMapping) return res.status(404).json({ error: 'File not found.' });

    if (userId && fileMapping.userId) {
      const { allowed } = checkOwnership(fileMapping, userId);
      if (!allowed) return res.status(403).json({ error: 'Access denied.' });
    }

    const ownerUserId = fileMapping.userId || userId;
    if (!fileMapping.driveId || !ownerUserId) return res.status(500).json({ error: 'File record is corrupt (missing storage ID or owner).' });

    let url = null;
    try {
      url = await getDirectStreamUrl(ownerUserId, fileMapping.driveId);
    } catch (e) {
      console.warn("Direct stream URL failed (non-fatal), falling back to proxy stream:", e.message);
    }
    // Generate a short-lived stream token so <video>/<audio> tags can authenticate
    // via URL parameter instead of cookies (which fail cross-origin).
    const jwt = require('jsonwebtoken');
    const streamToken = jwt.sign(
      { userId: ownerUserId, fileId },
      process.env.JWT_SECRET,
      { expiresIn: '2h', algorithm: 'HS256' }
    );
    const backendUrl = process.env.BACKEND_URL || '';
    const proxyUrl = `${backendUrl}/api/files/preview/${fileId}?st=${streamToken}`;
    res.json({ url, proxyUrl });
  } catch (error) {
    console.error('getVideoStreamUrl error:', error);
    res.status(500).json({ error: 'Failed to generate stream URL.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate a share link for a file
// ─────────────────────────────────────────────────────────────────────────────
const generateShareLink = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;
    const rawDays = req.body.expiresInDays;
    // [FIX] Validate and clamp expiresInDays — must be a number between 1 and 365.
    // Unvalidated, a caller could pass -1 (instant expiry) or 99999 (never expires).
    const expiresInDays = (Number.isFinite(Number(rawDays)) && Number(rawDays) >= 1)
      ? Math.min(Math.floor(Number(rawDays)), 365)
      : 7;

    const fileMapping = await getFileMapping(fileId);
    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + expiresInDays);

    const objectId = safeObjectId(fileId);
    const updateQuery = objectId
      ? { _id: objectId }
      : { 'metadata.filename': fileId };

    await db.collection('drive_mappings').updateOne(
      updateQuery,
      {
        $set: {
          'metadata.shareId': shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided': false,
        },
      }
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Generate share link error:', error);
    res.status(500).json({ error: 'Failed to generate share link.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Access a shared file via short share ID — uses owner's Drive credentials
// [HIGH-04] XSS guard applied; CSP sandbox added
// ─────────────────────────────────────────────────────────────────────────────
const accessSharedFile = async (req, res) => {
  try {
    const shareId = req.params.shareId;

    const fileMapping = await db.collection('drive_mappings').findOne({
      'metadata.shareId': shareId,
    });

    if (!fileMapping) return res.status(404).json({ error: 'Shared file not found.' });

    const { shareExpires, shareVoided } = fileMapping.metadata;
    if (shareVoided) return res.status(410).json({ error: 'This share link has been revoked.' });
    if (shareExpires && new Date(shareExpires) < new Date()) {
      return res.status(410).json({ error: 'This share link has expired.' });
    }

    if (!fileMapping.driveId) return res.status(500).json({ error: 'Shared file record is corrupt.' });

    const ownerUserId     = fileMapping.userId;
    const filename        = fileMapping.metadata?.filename || 'download';
    const storedContentType = fileMapping.metadata?.contentType || 'application/octet-stream';
    const fileSize        = fileMapping.metadata?.size;

    const safeContentType = isUnsafePreviewType(storedContentType)
      ? 'application/octet-stream'
      : storedContentType;

    const safeFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', 'sandbox');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader('Content-Type', safeContentType);
    if (fileSize) res.setHeader('Content-Length', fileSize);

    const downloadStream = await downloadFileStreamFromDrive(ownerUserId, fileMapping.driveId);
    downloadStream.on('error', (err) => {
      console.error('Drive share stream error:', err);
      if (!res.headersSent) res.status(404).json({ error: 'File not found in storage.' });
    });
    res.on('close', () => downloadStream.destroy()); // cleanup if client disconnects
    downloadStream.pipe(res);
  } catch (error) {
    console.error('Access shared file error:', error);
    res.status(500).json({ error: 'Failed to access shared file.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup incomplete upload artefacts
// ─────────────────────────────────────────────────────────────────────────────
const cleanupIncompleteUpload = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const fileId   = req.params.fileId;
    const userId   = req.user?.userId;

    if (!fileId) return res.status(400).json({ message: 'Invalid file ID' });

    let query;
    try {
      if (ObjectId.isValid(fileId) && String(new ObjectId(fileId)) === fileId) {
        query = { _id: new ObjectId(fileId) };
      } else {
        query = { 'metadata.filename': fileId };
      }
    } catch {
      query = { 'metadata.filename': fileId };
    }

    const fileMapping = await db.collection('drive_mappings').findOne(query);
    if (!fileMapping) return res.json({ message: 'No file found to clean up' });

    const { allowed } = checkOwnership(fileMapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    // Delete from Drive (non-fatal)
    try {
      if (fileMapping.driveId) {
        await deleteFileFromDrive(userId, fileMapping.driveId);
      }
      const iconDriveId = fileMapping.customIconDriveId || fileMapping.metadata?.customIconDriveId;
      if (iconDriveId) {
        await deleteFileFromDrive(userId, iconDriveId).catch(() => {});
      }
    } catch (driveErr) {
      console.warn('Drive cleanup warning (non-fatal):', driveErr.message);
    }

    await db.collection('drive_mappings').deleteOne({ _id: fileMapping._id });
    res.json({ message: 'Incomplete upload cleaned up' });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: 'Cleanup failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload & share a ZIP (batch share) — stores in Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const uploadAndShareZip = async (req, res) => {
  try {
    const ObjectId = getObjectId();
    const userId = req.user?.userId;
    const { originalname, buffer, stream } = req.file;
    const filename = originalname || `shared_archive_${Date.now()}.zip`;
    const mimetype = 'application/zip';
    const uploadDate = new Date();

    const fileBuffer = buffer || (await toBuffer(stream));
    const fileSize = fileBuffer.length;

    // Check Drive quota before uploading
    if (userId) {
      try {
        const quota = await getDriveStorageQuota(userId);
        const available = quota.limit - quota.usage;
        if (available > 0 && fileSize > available) {
          return res.status(413).json({
            error: `Not enough Google Drive storage. You have ${(available / (1024 ** 3)).toFixed(2)} GB available.`,
          });
        }
      } catch (quotaErr) {
        console.warn('Quota pre-check failed for share-zip (non-fatal):', quotaErr.message);
      }
    }

    const driveFileId = await uploadFileToDrive(userId, filename, mimetype, fileBuffer);

    const mongoId = new ObjectId();
    const metadata = {
      filename,
      type:        'document',
      contentType: mimetype,
      size:        fileSize,
      uploadDate,
      uploadedAt:  uploadDate,
      isSharedZip: true,
    };

    await storeDriveMapping(mongoId, driveFileId, metadata, { userId });

    const shareId = generateShortShareId();
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    await db.collection('drive_mappings').updateOne(
      { _id: mongoId },
      {
        $set: {
          'metadata.shareId':      shareId,
          'metadata.shareExpires': expirationDate,
          'metadata.shareVoided':  false,
        },
      }
    );

    const shareURL = `${process.env.BACKEND_URL}/s/${shareId}`;
    res.status(201).json({ url: shareURL, expires: expirationDate });
  } catch (error) {
    console.error('Error uploading and sharing zip:', error);
    res.status(500).json({ error: 'Upload and share failed.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Cleanup expired / voided share links
// [MED-03] Shared ZIPs: Drive file deleted + drive_mappings record removed.
//          Regular share links: only share metadata unset (file itself kept).
// ─────────────────────────────────────────────────────────────────────────────
const cleanupExpiredLinks = async () => {
  try {
    const now = new Date();
    if (!db || !db.collection) return 0;

    // Step 1: Find and delete expired/voided shared ZIP documents
    const expiredZips = await db.collection('drive_mappings').find({
      'metadata.isSharedZip': true,
      $or: [
        { 'metadata.shareExpires': { $lt: now } },
        { 'metadata.shareVoided': true },
      ],
    }).toArray();

    let deletedZipCount = 0;
    for (const zip of expiredZips) {
      // Delete the actual Drive file & custom icon using the file owner's credentials
      try {
        if (zip.driveId && zip.userId) {
          await deleteFileFromDrive(zip.userId, zip.driveId);
        }
        const iconDriveId = zip.customIconDriveId || zip.metadata?.customIconDriveId;
        if (iconDriveId && zip.userId) {
          await deleteFileFromDrive(zip.userId, iconDriveId).catch(() => {});
        }
      } catch (driveErr) {
        console.warn(`Cleanup: Drive delete warning for shared ZIP ${zip._id}:`, driveErr.message);
      }
      try {
        await db.collection('drive_mappings').deleteOne({ _id: zip._id });
        deletedZipCount++;
      } catch (dbErr) {
        console.warn(`Cleanup: drive_mappings delete warning for ${zip._id}:`, dbErr.message);
      }
    }

    if (deletedZipCount > 0) {
      console.log(`Cleanup: deleted ${deletedZipCount} expired/voided shared ZIP(s) and their Drive files.`);
    }

    // Step 2: Unset share metadata on expired/voided regular file links (keep the files)
    const result = await db.collection('drive_mappings').updateMany(
      {
        'metadata.isSharedZip': { $ne: true },
        $or: [
          { 'metadata.shareExpires': { $lt: now } },
          { 'metadata.shareVoided': true },
        ],
      },
      {
        $unset: {
          'metadata.shareId':      '',
          'metadata.shareExpires': '',
          'metadata.shareVoided':  '',
        },
      }
    );

    return (result.modifiedCount || 0) + deletedZipCount;
  } catch (error) {
    console.error('Cleanup expired links error:', error);
    return 0;
  }
};

const scheduleCleanup = async () => {
  try {
    if (!mongoose.connection.readyState || mongoose.connection.readyState !== 1) {
      console.log('MongoDB connection not ready. Skipping cleanup.');
      return 0;
    }
    return await cleanupExpiredLinks();
  } catch (error) {
    console.error('Schedule cleanup error:', error);
    return 0;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Stream custom file icon from Google Drive
// ─────────────────────────────────────────────────────────────────────────────
const getIconStream = async (req, res) => {
  try {
    const iconId = req.params.iconId;
    const userId = req.user?.userId;

    if (!userId) return res.status(401).json({ error: 'Not authenticated.' });
    if (!iconId) return res.status(400).json({ error: 'Icon ID is required.' });

    const stream = await downloadFileStreamFromDrive(userId, iconId);
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    stream.pipe(res);
  } catch (error) {
    console.error('Error fetching icon stream:', error);
    res.status(404).json({ error: 'Icon not found.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Update custom icon / thumbnail for a file mapping in Google Drive & MongoDB
// ─────────────────────────────────────────────────────────────────────────────
const updateFileIcon = async (req, res) => {
  try {
    const fileId = req.params.id;
    const userId = req.user?.userId;
    const { customIcon } = req.body || {};

    const mapping = await getFileMapping(fileId);
    if (!mapping) return res.status(404).json({ error: 'File not found.' });

    const { allowed } = checkOwnership(mapping, userId);
    if (!allowed) return res.status(403).json({ error: 'Access denied.' });

    const objectId = safeObjectId(fileId);
    if (!objectId) return res.status(400).json({ error: 'Invalid file ID.' });

    const existingIconDriveId = mapping.metadata?.customIconDriveId || mapping.customIconDriveId;

    if (customIcon || req.file) {
      let buffer, mimeType = 'image/png';
      if (typeof customIcon === 'string' && customIcon.startsWith('data:')) {
        const matches = customIcon.match(/^data:(image\/[a-zA-Z0-9\+\-\.]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          buffer = Buffer.from(matches[2], 'base64');
        } else {
          buffer = Buffer.from(customIcon, 'base64');
        }
      } else if (req.file) {
        buffer = req.file.buffer || (await toBuffer(req.file.stream));
        mimeType = req.file.mimetype || 'image/png';
      } else {
        buffer = Buffer.from(customIcon || '', 'utf-8');
      }

      // Delete existing custom icon from Google Drive if present
      if (existingIconDriveId) {
        await deleteFileFromDrive(userId, existingIconDriveId).catch(() => {});
      }

      // Upload icon image to Google Drive
      const iconFilename = `icon_${fileId}_${Date.now()}.png`;
      const iconDriveId = await uploadFileToDrive(userId, iconFilename, mimeType, buffer);
      const iconUrl = `/api/files/icon/${iconDriveId}`;

      // Save ONLY the Google Drive icon ID & stream URL in MongoDB
      await db.collection('drive_mappings').updateOne(
        { _id: objectId },
        {
          $set: {
            'metadata.customIconDriveId': iconDriveId,
            'metadata.customIconUrl': iconUrl,
            'metadata.customIcon': iconUrl,
            customIconDriveId: iconDriveId,
            customIconUrl: iconUrl,
            customIcon: iconUrl,
            updatedAt: new Date(),
          },
          $unset: {
            'metadata.thumbnail': '',
          },
        }
      );

      res.json({
        success: true,
        fileId,
        customIconDriveId: iconDriveId,
        customIconUrl: iconUrl,
        customIcon: iconUrl,
      });

      // Push to the user's other live sessions so they update the icon in
      // place, without a refetch — this is what makes the "R" quick-refresh
      // mostly unnecessary in normal use and only a manual fallback.
      try {
        req.app.get('io')?.to(userId).emit('fileIconUpdated', {
          fileId,
          customIconDriveId: iconDriveId,
          customIconUrl: iconUrl,
          customIcon: iconUrl,
        });
      } catch (_) { /* non-fatal */ }
    } else {
      // Removing custom icon
      if (existingIconDriveId) {
        await deleteFileFromDrive(userId, existingIconDriveId).catch(() => {});
      }

      await db.collection('drive_mappings').updateOne(
        { _id: objectId },
        {
          $unset: {
            'metadata.customIconDriveId': '',
            'metadata.customIconUrl': '',
            'metadata.customIcon': '',
            'metadata.thumbnail': '',
            customIconDriveId: '',
            customIconUrl: '',
            customIcon: '',
          },
          $set: { updatedAt: new Date() },
        }
      );

      res.json({
        success: true,
        fileId,
        customIconDriveId: null,
        customIconUrl: null,
        customIcon: null,
      });

      try {
        req.app.get('io')?.to(userId).emit('fileIconUpdated', {
          fileId,
          customIconDriveId: null,
          customIconUrl: null,
          customIcon: null,
        });
      } catch (_) { /* non-fatal */ }
    }
  } catch (error) {
    console.error('Update file icon error:', error);
    res.status(500).json({ error: 'Failed to update file icon.' });
  }
};

module.exports = {
  uploadFile,
  getFiles,
  downloadFile,
  previewFile,
  streamFile: previewFile,
  getVideoStreamUrl,
  deleteFile,
  updateFileIcon,
  getIconStream,
  generateShareLink,
  accessSharedFile,
  uploadAndShareZip,
  cleanupIncompleteUpload,
  scheduleCleanup,
  getUserStorageUsed,
};
