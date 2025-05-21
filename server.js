// server.js

// --- IMPORTS ---

// Core Node.js modules
const http = require('http');

// Third-party modules
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { Server } = require('socket.io');

// Custom modules
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const protectRoute = require('./middleware/authMiddleware'); //
const { apiLimiter } = require('./middleware/rateLimitMiddleware'); //
const { scheduleCleanup, accessSharedFile } = require('./services/fileService'); //

// --- INITIALIZATION & CONFIGURATION ---

// Load environment variables
dotenv.config(); //

// Initialize Express app
const app = express(); //

// Connect to MongoDB
connectDB(); //

// Create HTTP server
const server = http.createServer(app); //

// Initialize Socket.IO server
const io = new Server(server, { //
  cors: {
    origin: process.env.FRONTEND_URL, //
    methods: ["GET", "POST", "DELETE"] //
  }
});

// Make io instance available in Express app (for use in routes/controllers)
app.set('io', io); //

// --- MIDDLEWARE ---

// Enable CORS
app.use(cors({ origin: process.env.FRONTEND_URL })); //

// Parse JSON request bodies
app.use(express.json()); //

// --- ROUTES ---

// Root route
app.get('/', (req, res) => { //
  res.send('Storage API is running'); //
});

// Short share link access route (public, rate-limited)
// This route serves files directly.
// IMPORTANT: The 'accessSharedFile' service should ensure 'Content-Length'
// header is set for accurate client-side download progress.
app.get('/s/:shareId', apiLimiter, accessSharedFile); //

// API routes
// Apply authentication middleware to all /api routes
app.use('/api', protectRoute); //

// File-related API routes (e.g., upload, delete, generate share links, authenticated downloads)
// IMPORTANT: Within 'fileRoutes' (especially for the file download endpoint,
// likely something like '/api/files/download/:id'), ensure the 'Content-Length'
// header is set for accurate client-side download progress.
app.use('/api/files', fileRoutes); //

// --- WEBSOCKET HANDLING ---

io.on('connection', (socket) => { //
  console.log('Client connected via WebSocket:', socket.id); //

  // Listen for 'fileUploaded' event from a client
  socket.on('fileUploaded', () => { //
    console.log(`Received 'fileUploaded' event from ${socket.id}, broadcasting 'refreshFileList'.`); //
    // Broadcast to all other clients to refresh their file list
    socket.broadcast.emit('refreshFileList'); //
  });

  // Handle client disconnection
  socket.on('disconnect', () => { //
    console.log('Client disconnected from WebSocket:', socket.id); //
  });
});

// --- SCHEDULED TASKS ---

const ONE_HOUR_IN_MS = 60 * 60 * 1000; //

// Function to run the cleanup and log results
const runAndLogCleanup = async (context = 'periodic') => {
  try {
    const cleanedCount = await scheduleCleanup(); //
    if (cleanedCount > 0) {
      console.log(`${context} cleanup: Cleaned up ${cleanedCount} expired or voided share links.`); //
    } else {
      console.log(`${context} cleanup: No share links needed cleanup.`);
    }
  } catch (error) {
    console.error(`Error during ${context} cleanup:`, error); //
  }
};

// Schedule periodic cleanup of expired share links
setInterval(() => runAndLogCleanup('Periodic'), ONE_HOUR_IN_MS); //

// Perform cleanup on server startup
console.log('Performing cleanup on server startup...');
runAndLogCleanup('Server startup'); //


// --- SERVER START ---

const PORT = process.env.PORT || 5000; //
server.listen(PORT, () => { //
  console.log(`Server running on port ${PORT}`); //
  console.log(`Frontend URL configured for CORS: ${process.env.FRONTEND_URL}`);
});

