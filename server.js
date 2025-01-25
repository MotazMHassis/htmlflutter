const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Store online users
const onlineUsers = new Map();

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Register user
  socket.on('register', (username) => {
    onlineUsers.set(socket.id, username);
    io.emit('userList', Array.from(onlineUsers.entries()));
  });

  // Call invitation
  socket.on('callInvite', (data) => {
    socket.to(data.targetSocketId).emit('incomingCall', {
      callerSocketId: socket.id,
      callerName: data.callerName
    });
  });

  // Handle call response
  socket.on('callResponse', (data) => {
    socket.to(data.callerSocketId).emit('callResponse', data);
  });

  // Signaling for WebRTC
  socket.on('signal', (data) => {
    socket.to(data.targetSocketId).emit('signal', data);
  });

  // Disconnect
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('userList', Array.from(onlineUsers.entries()));
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
