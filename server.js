// server.js

const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');

const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const protectRoute = require('./middleware/authMiddleware');
const { shareLimiter } = require('./middleware/rateLimitMiddleware');
const { scheduleCleanup, accessSharedFile } = require('./services/fileService');
const { deleteFileFromDrive } = require('./services/driveService');

dotenv.config();

const app = express();

// Trust the first proxy — required on Render/Heroku/Railway
app.set('trust proxy', 1);

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'DELETE', 'PATCH', 'PUT'],
    credentials: true,
  },
});

app.set('io', io);

// ── Middleware ────────────────────────────────────────────────────────────────

// Security headers — helmet sets X-Frame-Options, X-Content-Type-Options,
// HSTS, CSP and more. crossOriginResourcePolicy is set to cross-origin so the
// frontend can load previews/downloads from the API domain.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json({ limit: '32kb' }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/', (req, res) => {
  res.send('Storage API is running');
});

// Public share link route
app.get('/s/:shareId', shareLimiter, accessSharedFile);

// All /api routes: origin + JWT check
app.use('/api', protectRoute);

// Auth routes (no JWT needed, origin check only)
app.use('/api/auth', authRoutes);

// File routes (full JWT auth)
app.use('/api/files', fileRoutes);

// Folder routes (full JWT auth)
app.use('/api/folders', folderRoutes);

// ── WebSocket ─────────────────────────────────────────────────────────────────

io.use(async (socket, next) => {
  // Verify the JWT cookie on every new Socket.IO connection.
  // Unauthenticated connections are rejected before they can receive any events.
  try {
    const rawCookies = socket.handshake.headers.cookie || '';
    const parsed = cookie.parse(rawCookies);
    const token = parsed.airstream_session;

    if (!token) return next(new Error('Not authenticated'));

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], clockTolerance: 30 });

    // Check tokenVersion against the DB — bare jwt.verify() only checks the signature.
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(decoded.userId) },
      { projection: { tokenVersion: 1 } },
    );
    if (!user || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return next(new Error('Session revoked'));
    }

    socket.userId      = decoded.userId;
    socket.decodedToken = decoded;
    socket.join(decoded.userId); // each user joins a room named by their userId
    console.log(`Client connected: ${socket.id} (user: ${decoded.userId})`);
    next();
  } catch (err) {
    console.warn('WebSocket auth failed:', err.message);
    next(new Error('Not authenticated'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.userId;

  // Periodic re-validation: a revoked session (logout, delete-account) would
  // otherwise keep receiving events for up to 15 min.
  const revalidateSocket = async () => {
    try {
      const db = mongoose.connection.db;
      const user = await db.collection('users').findOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { projection: { tokenVersion: 1 } },
      );
      const decoded = socket.decodedToken;
      if (!user || (decoded?.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
        socket.disconnect(true);
        return false;
      }
      return true;
    } catch {
      socket.disconnect(true);
      return false;
    }
  };

  socket.on('fileUploaded', async () => {
    if (!await revalidateSocket()) return;
    io.to(userId).emit('refreshFileList');
  });

  socket.on('folderUpdated', async () => {
    if (!await revalidateSocket()) return;
    io.to(userId).emit('refreshFolderList');
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id} (user: ${userId})`);
  });
});

// ── Scheduled Cleanup ─────────────────────────────────────────────────────────

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// ── Expired share link cleanup ────────────────────────────────────────────────
const runAndLogCleanup = async (context = 'Periodic') => {
  try {
    const cleanedCount = await scheduleCleanup();
    if (cleanedCount > 0) {
      console.log(`${context} cleanup: removed ${cleanedCount} expired share links.`);
    }
  } catch (error) {
    console.error(`Error during ${context} cleanup:`, error);
  }
};

// ── Pending account deletion cleanup ─────────────────────────────────────────
// Permanently deletes accounts where pendingDeletion=true and 7 days have passed.
// Deletes all Drive files using the user's stored credentials, then cleans MongoDB.
const cleanupPendingDeletions = async () => {
  try {
    const db = mongoose.connection.db;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersToDelete = await db.collection('users').find({
      pendingDeletion:     true,
      deletionScheduledAt: { $lt: cutoff },
    }).toArray();

    for (const user of usersToDelete) {
      try {
        const userId   = user._id.toString();
        const mappings = await db.collection('drive_mappings').find({ userId }).toArray();

        // Delete each file from Google Drive using the user's stored tokens
        for (const mapping of mappings) {
          try {
            if (mapping.driveId && user.googleDriveRefreshToken) {
              await deleteFileFromDrive(userId, mapping.driveId);
            }
          } catch (driveErr) {
            console.warn(`Drive delete warning for user ${userId}:`, driveErr.message);
          }
        }

        await db.collection('drive_mappings').deleteMany({ userId });
        await db.collection('user_folders').deleteMany({ userId });
        await db.collection('export_tokens').deleteMany({ userId });
        await db.collection('refresh_tokens').deleteMany({ userId });
        await db.collection('users').deleteOne({ _id: user._id });
        console.log(`Permanently deleted account for user ${userId}`);
      } catch (userErr) {
        console.error(`Error deleting user ${user._id}:`, userErr);
      }
    }
  } catch (error) {
    console.error('Error during pending deletion cleanup:', error);
  }
};

const cleanupExpiredExportTokens = async () => {
  try {
    const db = mongoose.connection.db;
    const result = await db.collection('export_tokens').deleteMany({
      expiresAt: { $lt: new Date() },
    });
    if (result.deletedCount > 0) {
      console.log(`Export token cleanup: removed ${result.deletedCount} expired token(s).`);
    }
  } catch (error) {
    console.error('Error during export token cleanup:', error);
  }
};

// Run all cleanup tasks
const runAllCleanup = async (context = 'Periodic') => {
  await runAndLogCleanup(context);
  await cleanupPendingDeletions();
  await cleanupExpiredExportTokens();
};

setInterval(() => runAllCleanup('Periodic'), ONE_HOUR_IN_MS);

// Wait for MongoDB to be connected before running startup cleanup.
mongoose.connection.once('open', () => {
  runAllCleanup('Startup');
  // TTL indexes are created in config/db.js on connect — no need to recreate here.
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${process.env.FRONTEND_URL}`);
});
