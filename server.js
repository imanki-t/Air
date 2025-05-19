// server.js with backend-only security (no frontend changes needed)
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const http = require('http');
const { Server } = require('socket.io');
const originAuth = require('./middleware/originAuth');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Connect to MongoDB
connectDB();

// Enhanced security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", process.env.FRONTEND_URL]
    }
  },
  // Disable some features for compatibility if needed
  crossOriginEmbedderPolicy: false
}));

// Cookie parser for CSRF protection
app.use(cookieParser());

// Advanced CORS configuration
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      // In production, you might want to restrict this further
      return callback(null, true);
    }
    
    const allowedOrigins = [process.env.FRONTEND_URL];
    
    // Allow localhost in development
    if (process.env.NODE_ENV !== 'production') {
      allowedOrigins.push('http://localhost:3000');
    }
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true, // Important for cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-XSRF-TOKEN'],
  maxAge: 86400 // Cache preflight requests for 24 hours
}));

// Parse JSON requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route (open for health checks)
app.get('/', (req, res) => {
  res.send('Storage API');
});

// Apply origin authentication to all routes
app.use('/api', originAuth);

// Mount file routes
app.use('/api/files', fileRoutes);

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Socket.IO with origin validation
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Apply the same origin rules as the rest API
      if (!origin) {
        return callback(null, true);
      }
      
      const allowedOrigins = [process.env.FRONTEND_URL];
      if (process.env.NODE_ENV !== 'production') {
        allowedOrigins.push('http://localhost:3000');
      }
      
      if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  }
});

// Attach io instance to app for use in routes
app.set('io', io);

// Socket.IO connection handler
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Get origin of connection
  const origin = socket.handshake.headers.origin;
  console.log(`Socket connection from origin: ${origin}`);

  socket.on('fileUploaded', () => {
    console.log('Received fileUploaded, broadcasting refreshFileList...');
    socket.broadcast.emit('refreshFileList');
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
