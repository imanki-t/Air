// server.js

const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
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
// Without this express-rate-limit throws ERR_ERL_UNEXPECTED_X_FORWARDED_FOR
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

setInterval(() => runAndLogCleanup('Periodic'), ONE_HOUR_IN_MS);
runAndLogCleanup('Startup');

// --- START ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS origin: ${process.env.FRONTEND_URL}`);
});
