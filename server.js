// server.js

// --- IMPORTS ---
const http = require('http');
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');

// Custom modules
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const folderRoutes = require('./routes/folderRoutes');
const { authenticate, optionalAuth } = require('./middleware/auth');
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
    methods: ["GET", "POST", "DELETE", "PUT"]
  }
});

// Make io instance available in Express app
app.set('io', io);

// --- MIDDLEWARE ---

// Enable CORS
app.use(cors({ 
  origin: process.env.FRONTEND_URL,
  credentials: true 
}));

// Parse JSON request bodies
app.use(express.json());

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// --- ROUTES ---

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Airstream API is running',
    version: '2.0.0',
    endpoints: {
      auth: '/api/auth',
      files: '/api/files',
      folders: '/api/folders'
    }
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Short share link access route (public, rate-limited)
// This route serves files directly
app.get('/s/:shareId', apiLimiter, accessSharedFile);

// API routes

// Auth routes (public, some with rate limiting)
app.use('/api/auth', authRoutes);

// Folder routes (protected, requires auth and email verification)
app.use('/api/folders', folderRoutes);

// File routes (protected, requires auth and email verification)
// Add authentication middleware to all file routes
app.use('/api/files', authenticate, fileRoutes);

// --- ERROR HANDLING ---

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path 
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error:', err);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// --- WEBSOCKET HANDLING ---

io.on('connection', (socket) => {
  console.log('Client connected via WebSocket:', socket.id);

  // Listen for 'fileUploaded' event
  socket.on('fileUploaded', () => {
    console.log(`Received 'fileUploaded' event from ${socket.id}`);
    socket.broadcast.emit('refreshFileList');
  });

  // Listen for 'folderCreated' event
  socket.on('folderCreated', () => {
    console.log(`Received 'folderCreated' event from ${socket.id}`);
    socket.broadcast.emit('refreshFolders');
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected from WebSocket:', socket.id);
  });
});

// --- SCHEDULED TASKS ---

const ONE_HOUR_IN_MS = 60 * 60 * 1000;

// Function to run cleanup and log results
const runAndLogCleanup = async (context = 'periodic') => {
  try {
    const cleanedCount = await scheduleCleanup();
    if (cleanedCount > 0) {
      console.log(`${context} cleanup: Cleaned up ${cleanedCount} expired share links.`);
    } else {
      console.log(`${context} cleanup: No share links needed cleanup.`);
    }
  } catch (error) {
    console.error(`Error during ${context} cleanup:`, error);
  }
};

// Schedule periodic cleanup
setInterval(() => runAndLogCleanup('Periodic'), ONE_HOUR_IN_MS);

// Perform cleanup on startup
console.log('Performing cleanup on server startup...');
runAndLogCleanup('Server startup');

// --- SERVER START ---

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════╗
║                                       ║
║        🚀 AIRSTREAM API v2.0         ║
║                                       ║
║  Server running on port ${PORT}         ║
║  Frontend: ${process.env.FRONTEND_URL || 'Not configured'}
║                                       ║
║  Features:                            ║
║  ✓ JWT Authentication                 ║
║  ✓ Email Verification                 ║
║  ✓ Password Reset                     ║
║  ✓ Folder Management                  ║
║  ✓ File Upload/Download               ║
║  ✓ Share Links                        ║
║  ✓ WebSocket Support                  ║
║                                       ║
╚═══════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
