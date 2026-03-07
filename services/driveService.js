// services/driveService.js
// All Google Drive API operations — replaces GridFS storage.
//
// Design:
//  - Each user authorises the app once (OAuth2 code flow) and we store their
//    refresh_token in MongoDB.  The access_token is refreshed automatically by
//    the googleapis client and persisted back to the DB.
//  - Files are stored inside an "Airstream" folder that this service creates
//    (and re-creates if the user trashes it).
//  - driveId in drive_mappings is now a Google Drive file-ID string
//    (e.g. "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74") not a MongoDB ObjectId.
//
// Required env vars:
//   GOOGLE_CLIENT_ID      — same client used for sign-in
//   GOOGLE_CLIENT_SECRET  — needed to exchange authorization codes for tokens

const { google } = require('googleapis');
const mongoose   = require('mongoose');
const { Readable } = require('stream');

const AIRSTREAM_FOLDER_NAME = 'Airstream';

// ─────────────────────────────────────────────────────────────────────────────
// Build an OAuth2 client using a user's stored tokens.
// googleapis auto-refreshes the access_token when it expires.
// ─────────────────────────────────────────────────────────────────────────────
const buildOAuth2Client = (accessToken, refreshToken) => {
  const client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'postmessage', // redirect_uri for popup / authorization-code flow
  );
  client.setCredentials({
    access_token:  accessToken  || undefined,
    refresh_token: refreshToken || undefined,
  });
  return client;
};

// ─────────────────────────────────────────────────────────────────────────────
// Return a Drive-ready OAuth2 client for a given userId.
// Persists any freshly-refreshed access_token back to MongoDB.
// ─────────────────────────────────────────────────────────────────────────────
const getUserDriveClient = async (userId) => {
  const ObjectId = mongoose.mongo.ObjectId;
  const db = mongoose.connection.db;

  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
  if (!user?.googleDriveRefreshToken) {
    throw new Error('Google Drive not connected for this user. Please sign in again.');
  }

  const auth = buildOAuth2Client(user.googleDriveAccessToken, user.googleDriveRefreshToken);

  // When googleapis refreshes the access_token automatically, save the new one.
  auth.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            googleDriveAccessToken: tokens.access_token,
            googleDriveTokenExpiry: tokens.expiry_date || null,
            updatedAt: new Date(),
          },
        },
      );
    }
  });

  return auth;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ensure the "Airstream" folder exists in the user's Drive.
// Stores the folder ID in the users collection so we only create it once.
// Re-creates it if the user has moved it to trash.
// ─────────────────────────────────────────────────────────────────────────────
const ensureAppFolder = async (userId) => {
  const ObjectId = mongoose.mongo.ObjectId;
  const db = mongoose.connection.db;

  const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });

  if (user?.googleDriveAppFolderId) {
    // Verify it still exists and hasn't been trashed
    try {
      const auth = await getUserDriveClient(userId);
      const drive = google.drive({ version: 'v3', auth });
      const f = await drive.files.get({
        fileId: user.googleDriveAppFolderId,
        fields: 'id,trashed',
      });
      if (!f.data.trashed) return user.googleDriveAppFolderId;
    } catch (_) {
      // 404 or other error — fall through to recreate
    }
  }

  // Create the app folder
  const auth = await getUserDriveClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const folder = await drive.files.create({
    requestBody: {
      name: AIRSTREAM_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id',
  });

  const folderId = folder.data.id;
  await db.collection('users').updateOne(
    { _id: new ObjectId(userId) },
    { $set: { googleDriveAppFolderId: folderId, updatedAt: new Date() } },
  );
  return folderId;
};

// ─────────────────────────────────────────────────────────────────────────────
// Upload a file (Buffer) to the user's Airstream Drive folder.
// Returns the Google Drive file ID string.
// ─────────────────────────────────────────────────────────────────────────────
const uploadFileToDrive = async (userId, filename, mimetype, fileBuffer) => {
  const auth     = await getUserDriveClient(userId);
  const drive    = google.drive({ version: 'v3', auth });
  const folderId = await ensureAppFolder(userId);

  const response = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType: mimetype, body: Readable.from(fileBuffer) },
    fields: 'id',
  });

  return response.data.id; // Google Drive file ID (not a MongoDB ObjectId)
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a file from Drive — returns a readable stream.
// Used for serving individual file downloads / previews.
// ─────────────────────────────────────────────────────────────────────────────
const downloadFileStreamFromDrive = async (userId, driveFileId) => {
  const auth  = await getUserDriveClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream' },
  );
  return response.data; // Node.js readable stream
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a byte range from Drive — returns a readable stream.
// Used for HTTP 206 Partial Content responses (video/audio seeking on mobile).
// The `Range: bytes=start-end` header is forwarded directly to the Drive API
// so we never buffer more than the requested slice in memory.
// ─────────────────────────────────────────────────────────────────────────────
const downloadFileStreamFromDriveRange = async (userId, driveFileId, start, end) => {
  const auth  = await getUserDriveClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'stream', headers: { Range: `bytes=${start}-${end}` } },
  );
  return response.data; // Node.js readable stream of the requested slice
};

// ─────────────────────────────────────────────────────────────────────────────
// Download a file from Drive — returns a Buffer.
// Used for ZIP packaging (export, batch-share).
// ─────────────────────────────────────────────────────────────────────────────
const downloadFileBufferFromDrive = async (userId, driveFileId) => {
  const auth  = await getUserDriveClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const response = await drive.files.get(
    { fileId: driveFileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(response.data);
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a file from Drive.  Non-fatal if already gone (404 ignored).
// ─────────────────────────────────────────────────────────────────────────────
const deleteFileFromDrive = async (userId, driveFileId) => {
  if (!driveFileId) return;
  try {
    const auth  = await getUserDriveClient(userId);
    const drive = google.drive({ version: 'v3', auth });
    await drive.files.delete({ fileId: driveFileId });
  } catch (err) {
    // 404 = already deleted or never existed — treat as success
    if (err?.response?.status !== 404 && err?.code !== 404) {
      throw err;
    }
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Generate a short-lived direct Google Drive streaming URL.
// The access_token is embedded as a query parameter so the browser can stream
// the file straight from Google's CDN with no Render proxy hop in between.
// Tokens are valid for ~1 hour — plenty for a single viewing session.
// ─────────────────────────────────────────────────────────────────────────────
const getDirectStreamUrl = async (userId, driveFileId) => {
  const auth = await getUserDriveClient(userId);
  const { token } = await auth.getAccessToken(); // refreshes automatically if expired
  return `https://www.googleapis.com/drive/v3/files/${driveFileId}?alt=media&access_token=${token}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Get Google Drive storage quota for the user.
// Returns an object with all quota values in bytes:
//   limit             — total quota (e.g. 15 GB standard, more with Google One)
//   usage             — total used across Drive + Gmail + Photos
//   usageInDrive      — Drive files only
//   usageInDriveTrash — bytes in Trash
// ─────────────────────────────────────────────────────────────────────────────
const getDriveStorageQuota = async (userId) => {
  const auth  = await getUserDriveClient(userId);
  const drive = google.drive({ version: 'v3', auth });
  const about = await drive.about.get({ fields: 'storageQuota' });
  const q = about.data.storageQuota || {};
  return {
    limit:             parseInt(q.limit             || '0'),
    usage:             parseInt(q.usage             || '0'), // Drive + Gmail + Photos
    usageInDrive:      parseInt(q.usageInDrive      || '0'), // Drive files only
    usageInDriveTrash: parseInt(q.usageInDriveTrash || '0'),
  };
};

module.exports = {
  uploadFileToDrive,
  downloadFileStreamFromDrive,
  downloadFileStreamFromDriveRange,
  downloadFileBufferFromDrive,
  deleteFileFromDrive,
  getDriveStorageQuota,
  getDirectStreamUrl,
  ensureAppFolder,
  getUserDriveClient,
  buildOAuth2Client,
};
