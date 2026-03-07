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

// Security headers (LOW-02) — helmet sets X-Frame-Options, X-Content-Type-Options,
// HSTS, CSP and more. crossOriginResourcePolicy is set to cross-origin so the
// frontend can load previews/downloads from the API domain.
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
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

    if (!token) {
      return next(new Error('Not authenticated'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // [FIX] Check tokenVersion against the DB — bare jwt.verify() only checks
    // the signature, not revocation. A logged-out user with a still-valid 15-min
    // JWT could otherwise keep an active socket connection and receive events.
    const db = mongoose.connection.db;
    const user = await db.collection('users').findOne(
      { _id: new mongoose.Types.ObjectId(decoded.userId) },
      { projection: { tokenVersion: 1 } }
    );
    if (!user || (decoded.tokenVersion ?? 0) !== (user.tokenVersion ?? 0)) {
      return next(new Error('Session revoked'));
    }

    socket.userId = decoded.userId; // attach userId to the socket for room use
    next();
  } catch (err) {
    next(new Error('Invalid or expired session'));
  }
});

io.on('connection', (socket) => {
  // Join a private room for this user so events are scoped per-user
  const userId = socket.userId;
  socket.join(userId);
  console.log(`Client connected: ${socket.id} (user: ${userId})`);

  socket.on('fileUploaded', () => {
    // Emit only to this user's room, not all connected clients
    io.to(userId).emit('refreshFileList');
  });

  socket.on('folderUpdated', () => {
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
const cleanupPendingDeletions = async () => {
  try {
    const db = mongoose.connection.db;
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersToDelete = await db.collection('users').find({
      pendingDeletion: true,
      deletionScheduledAt: { $lt: cutoff },
    }).toArray();

    for (const user of usersToDelete) {
      try {
        const userId = user._id.toString();
        const mappings = await db.collection('drive_mappings').find({ userId }).toArray();
        const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: 'uploads' });
        for (const mapping of mappings) {
          try {
            await bucket.delete(new mongoose.Types.ObjectId(mapping.driveId));
          } catch (e) {
            console.warn(`GridFS delete warning for user ${userId}:`, e.message);
          }
        }
        await db.collection('drive_mappings').deleteMany({ userId });
        await db.collection('user_folders').deleteMany({ userId });
        await db.collection('export_tokens').deleteMany({ userId });
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

// FIX: same as above — use mongoose.connection.db
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
// Running immediately (before connectDB resolves) causes mongoose.connection.db
// to be undefined, which crashes cleanupPendingDeletions and cleanupExpiredExportTokens.
mongoose.connection.once('open', () => {
  runAllCleanup('Startup');
});

// ── Start ─────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${process.env.FRONTEND_URL}`);
});
