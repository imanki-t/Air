// server.js

const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const protectRoute = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
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

// --- MIDDLEWARE ---

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// --- ROUTES ---

app.get('/', (req, res) => {
  res.send('Storage API is running');
});

// Public share link route
app.get('/s/:shareId', apiLimiter, accessSharedFile);

// All /api routes: origin + JWT check
app.use('/api', protectRoute);

// Auth routes (no JWT needed, origin check only)
app.use('/api/auth', authRoutes);

// File routes (full JWT auth)
app.use('/api/files', fileRoutes);

// Folder routes (full JWT auth)
app.use('/api/folders', folderRoutes);

// --- WEBSOCKET ---

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('fileUploaded', () => {
    socket.broadcast.emit('refreshFileList');
  });

  socket.on('folderUpdated', () => {
    socket.broadcast.emit('refreshFolderList');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// --- SCHEDULED CLEANUP ---

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// ── Expired share link cleanup ────────────────────────────────────────────────
const runAndLogCleanup = async (context = 'periodic') => {
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
    const db = mongoose.connection;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const usersToDelete = await db.collection('users').find({
      pendingDeletion: true,
      deletionScheduledAt: { $lt: sevenDaysAgo },
    }).toArray();

    if (usersToDelete.length === 0) return;

    console.log(`Deletion cleanup: permanently deleting ${usersToDelete.length} account(s)...`);

    const bucket = new mongoose.mongo.GridFSBucket(db.db, { bucketName: 'uploads' });

    for (const user of usersToDelete) {
      const userId = user._id.toString();
      try {
        // Get all files for this user
        const fileMappings = await db.collection('drive_mappings')
          .find({ userId })
          .toArray();

        // Delete each file from GridFS
        for (const mapping of fileMappings) {
          try {
            const gridFSId = new mongoose.Types.ObjectId(mapping.driveId);
            await bucket.delete(gridFSId);
          } catch (gfsErr) {
            console.warn(`Deletion cleanup: GridFS delete failed for ${mapping.driveId}:`, gfsErr.message);
          }
        }

        // Delete all drive_mappings
        await db.collection('drive_mappings').deleteMany({ userId });

        // Delete all folders
        await db.collection('folders').deleteMany({ userId });

        // Delete all export tokens
        await db.collection('export_tokens').deleteMany({ userId });

        // Delete the user record
        await db.collection('users').deleteOne({ _id: user._id });

        console.log(`Deletion cleanup: permanently deleted account ${user.email} (${userId})`);
      } catch (userErr) {
        console.error(`Deletion cleanup: failed to delete account ${user.email}:`, userErr.message);
      }
    }
  } catch (error) {
    console.error('Error during pending deletion cleanup:', error);
  }
};

// ── Expired export tokens cleanup ─────────────────────────────────────────────
const cleanupExpiredExportTokens = async () => {
  try {
    const db = mongoose.connection;
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
runAllCleanup('Startup');

// --- START ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${process.env.FRONTEND_URL}`);
});
