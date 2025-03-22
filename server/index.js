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
    socket.emit('room-joined', roomId); // Notify the user that they joined the room
  });

  // Handle signaling data (offer, answer, ICE candidates)
  socket.on('signal', (data) => {
    io.to(data.roomId).emit('signal', data); // Send signaling data to users in the same room
  });

  // Handle chat messages
  socket.on('send-message', (data) => {
    io.to(data.roomId).emit('receive-message', data); // Send chat messages to users in the same room
  });

  // Handle sending a call request
  socket.on('send-call-request', (data) => {
    const { to, from, roomId } = data;
    io.to(to).emit('receive-call-request', { from, roomId }); // Send call request to the target user
  });

  // Handle accepting a call request
  socket.on('accept-call-request', (data) => {
    const { to, roomId } = data;
    io.to(to).emit('call-request-accepted', { roomId }); // Notify the caller that the request was accepted
  });

  // Handle rejecting a call request
  socket.on('reject-call-request', (data) => {
    const { to } = data;
    io.to(to).emit('call-request-rejected'); // Notify the caller that the request was rejected
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(5889, () => {
  console.log('Server is running on port 5889');
});