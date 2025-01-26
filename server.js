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
    socket.broadcast.emit('register_test', data);
    onlineUsers.set(socket.id, username);
    io.emit('userList', Array.from(onlineUsers.entries()));
  });

  // Call invitation
  socket.on('callInvite', (data) => {
    socket.broadcast.emit('callInvite_test', data);
    socket.to(data.targetSocketId).emit('incomingCall', {
      callerSocketId: socket.id,
      callerName: data.callerName
    });
  });

  // Handle call response
  socket.on('callResponse', (data) => {
    socket.broadcast.emit('callResponse_test', data);
    if (data.response === 'accept') {
      // Broadcast accept to both parties
      io.to(data.callerSocketId).emit('callAccepted');
      io.to(socket.id).emit('callAccepted');
    } else {
      // Broadcast reject to caller
      io.to(data.callerSocketId).emit('callRejected');
    }
  });

  // Signaling for WebRTC
  socket.on('signal', (data) => {
    // Log the signaling data
    socket.broadcast.emit('signal_test', data);
    if (data.type === 'offer') {
      console.log(`SDP Offer from ${socket.id} to ${data.targetSocketId}:`, data.offer);
    } else if (data.type === 'answer') {
      console.log(`SDP Answer from ${socket.id} to ${data.targetSocketId}:`, data.answer);
    } else if (data.type === 'candidate') {
      console.log(`ICE Candidate from ${socket.id} to ${data.targetSocketId}:`, data.candidate);
    }

    // Forward the signal to the target user
    socket.to(data.targetSocketId).emit('signal', data);
    
  });
  socket.on('receiveoffer', (data) => {
    socket.broadcast.emit('receiveoffe_test', data);
    if (data.type === 'offer') {
        console.log(`SDP Offer from ${socket.id} to ${data.targetSocketId}:`, data.offer);
      }
      console.log(`SDP Offer from targetSocketId to ${data.targetSocketId}:`);
      
      socket.to(data.targetSocketId).emit('takeoffer', data);
  });
  socket.on('receiveAnswer', (data) => {
    socket.broadcast.emit('receiveAnswer_test', data);
    if (data.type === 'answer') {
        console.log(`SDP Answer from ${socket.id} to ${data.targetSocketId}:`, data.answer);
      }
      
      socket.to(data.targetSocketId).emit('sendeAnswer', data);
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
