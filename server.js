// server.js with limited rate limiting
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const http = require('http');
const { Server } = require('socket.io');
const protectRoute = require('./middleware/authMiddleware'); // Import our middleware
const { shareLinkLimiter } = require('./middleware/rateLimitMiddleware'); // Import share link rate limiter
const { scheduleCleanup } = require('./services/fileService'); // Import the cleanup function
const { accessSharedFile } = require('./services/fileService'); // Import for shorter share links

dotenv.config();
const app = express();
connectDB();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.send('Storage API');
});

// Apply rate limiting ONLY to share link routes
app.use('/s/*', shareLinkLimiter);
app.use('/api/files/share/*', shareLinkLimiter);

// Short share link route (public, with rate limiting)
app.get('/s/:shareId', accessSharedFile);

// Apply the protection middleware to all API routes
app.use('/api', protectRoute);

// Routes (now protected but no general rate limiting)
app.use('/api/files', fileRoutes);

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"]
  }
});

// Attach io instance to app for use in routes/controllers
app.set('io', io);

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('fileUploaded', () => {
    console.log('Received fileUploaded, broadcasting refreshFileList...');
    socket.broadcast.emit('refreshFileList');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Schedule periodic cleanup of expired links (every hour)
const ONE_HOUR = 60 * 60 * 1000;
setInterval(async () => {
  try {
    const cleanedCount = await scheduleCleanup();
    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired or voided share links`);
    }
  } catch (error) {
    console.error('Error during scheduled cleanup:', error);
  }
}, ONE_HOUR);

// Also clean up on server start
scheduleCleanup()
  .then(count => {
    if (count > 0) {
      console.log(`Server startup: Cleaned up ${count} expired or voided share links`);
    }
  })
  .catch(err => {
    console.error('Error cleaning up links during server startup:', err);
  });

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
