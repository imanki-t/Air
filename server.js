// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const fileRoutes = require('./routes/fileRoutes');
const http = require('http');
const { Server } = require('socket.io');

dotenv.config();
const app = express();
connectDB();

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL }));
app.use(express.json());

// Routes
app.use('/api/files', fileRoutes);

// Root
app.get('/', (req, res) => {
  res.send('Storage API');
});

// Create HTTP server for WebSocket
const server = http.createServer(app);

// Socket.IO server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"]
  }
});

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
