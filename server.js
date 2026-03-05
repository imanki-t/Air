// server.js

// --- IMPORTS ---

// Core Node.js modules
const http = require('http');

// Third-party modules
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

// Custom modules
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const protectRoute = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { scheduleCleanup, accessSharedFile } = require('./services/fileService');

// --- INITIALIZATION & CONFIGURATION ---

dotenv.config();

const app = express();

connectDB();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  },
});

app.set('io', io);

// --- MIDDLEWARE ---

// Enable CORS with credentials (required for httpOnly cookie auth)
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // Allow cookies to be sent cross-origin
  })
);

// Parse JSON bodies
app.use(express.json());

// Parse cookies (required for JWT httpOnly cookie)
app.use(cookieParser());

// --- ROUTES ---

// Health check
app.get('/', (req, res) => {
  res.send('Storage API is running');
});

// Public short share link route (rate-limited, no auth)
app.get('/s/:shareId', apiLimiter, accessSharedFile);

// All /api routes go through origin+JWT protection middleware
app.use('/api', protectRoute);

// Authentication routes (origin-checked only, no JWT required)
app.use('/api/auth', authRoutes);

// File API routes (full JWT auth required via protectRoute)
app.use('/api/files', fileRoutes);

// --- WEBSOCKET HANDLING ---

io.on('connection', (socket) => {
  console.log('Client connected via WebSocket:', socket.id);

  socket.on('fileUploaded', () => {
    console.log(`Received 'fileUploaded' event from ${socket.id}, broadcasting 'refreshFileList'.`);
    socket.broadcast.emit('refreshFileList');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket:', socket.id);
  });
});

// --- SCHEDULED TASKS ---

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

const runAndLogCleanup = async (context = 'periodic') => {
  try {
    const cleanedCount = await scheduleCleanup();
    if (cleanedCount > 0) {
      console.log(`${context} cleanup: Cleaned up ${cleanedCount} expired or voided share links.`);
    } else {
      console.log(`${context} cleanup: No share links needed cleanup.`);
    }
  } catch (error) {
    console.error(`Error during ${context} cleanup:`, error);
  }
};

setInterval(() => runAndLogCleanup('Periodic'), ONE_HOUR_IN_MS);

console.log('Performing cleanup on server startup...');
runAndLogCleanup('Server startup');

// --- SERVER START ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL configured for CORS: ${process.env.FRONTEND_URL}`);
});
