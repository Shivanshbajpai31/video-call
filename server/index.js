const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); // Enable CORS for all routes
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: 'http://localhost:3000', // Allow your React app to connect
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Handle joining a room
  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Handle signaling data (offer, answer, ICE candidates)
  socket.on('signal', (data) => {
    io.to(data.roomId).emit('signal', data);
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5889, () => {
  console.log('Server is running on port 5889');
});