// server.js

// --- IMPORTS ---

// Core Node.js modules
const http = require('http');

// Third-party modules
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');
const helmet = require('helmet');
const xss = require('xss-clean');
const mongoSanitize = require('mongo-sanitize');
const hpp = require('hpp');

// Custom modules
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const protectRoute = require('./middleware/authMiddleware');
const { apiLimiter } = require('./middleware/rateLimitMiddleware');
const { scheduleCleanup, accessSharedFile } = require('./services/fileService');

// --- INITIALIZATION & CONFIGURATION ---

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"]
  }
});

// Make io instance available in Express app
app.set('io', io);

// --- MIDDLEWARE ---

// Security Middleware
app.use(helmet()); // Set security headers
app.use(xss()); // Prevent XSS attacks (sanitize user input)
// app.use(mongoSanitize()); // Prevent NoSQL injection (NOTE: mongo-sanitize is a function to sanitize data, not express middleware directly? Wait, typical usage is: app.use(mongoSanitize()); if using express-mongo-sanitize. But package installed is 'mongo-sanitize'.
// 'mongo-sanitize' package usage: sanitize(req.body). It does not export a middleware.
// Let's create a simple middleware for it.

app.use((req, res, next) => {
  req.body = mongoSanitize(req.body);
  req.query = mongoSanitize(req.query);
  req.params = mongoSanitize(req.params);
  next();
});

app.use(hpp()); // Prevent http param pollution

// Enable CORS
app.use(cors({ origin: process.env.FRONTEND_URL }));

// Parse JSON request bodies
app.use(express.json());

// --- ROUTES ---

// Root route
app.get('/', (req, res) => {
  res.send('Storage API is running');
});

// Short share link access route (public, rate-limited)
app.get('/s/:shareId', apiLimiter, accessSharedFile);

// Auth routes
app.use('/api/auth', authRoutes);

// File-related API routes
// We apply protectRoute inside the routes themselves or here.
// Existing fileRoutes logic has some public endpoints (like share-zip?).
// Let's apply protectRoute to /api/files but we need to be careful if fileRoutes has public endpoints.
// Looking at fileRoutes.js:
// /share-zip is there.
// /share/:shareId is there.
// Most file management should be protected.
// `protectRoute` middleware has logic to allow shared links.
app.use('/api/files', protectRoute, fileRoutes);

// --- WEBSOCKET HANDLING ---

io.on('connection', (socket) => {
  console.log('Client connected via WebSocket:', socket.id);

  // Listen for 'fileUploaded' event from a client
  socket.on('fileUploaded', () => {
    console.log(`Received 'fileUploaded' event from ${socket.id}, broadcasting 'refreshFileList'.`);
    // Broadcast to all other clients to refresh their file list
    socket.broadcast.emit('refreshFileList');
  });

  // Handle client disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket:', socket.id);
  });
});

// --- SCHEDULED TASKS ---

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// Function to run the cleanup and log results
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

// Schedule periodic cleanup of expired share links
setInterval(() => runAndLogCleanup('Periodic'), ONE_HOUR_IN_MS);

// Perform cleanup on server startup
console.log('Performing cleanup on server startup...');
runAndLogCleanup('Server startup');


// --- SERVER START ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Frontend URL configured for CORS: ${process.env.FRONTEND_URL}`);
});
