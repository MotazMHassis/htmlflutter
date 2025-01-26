const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const users = {}; // Store users and their socket IDs

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for a new user joining
  socket.on('join', (username) => {
    users[username] = socket.id; // Map username to socket ID
    io.emit('updateUsers', Object.keys(users)); // Send updated user list to all clients
    console.log(`${username} joined the chat`);
  });

  // Listen for a chat message
  socket.on('chatMessage', ({ sender, receiver, message }) => {
    const receiverSocketId = users[receiver];
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('message', { sender, message }); // Send message to the receiver
      io.to(receiverSocketId).emit('notification', `${sender} sent you a message`); // Send notification
    }
  });

  // Handle user disconnect
  socket.on('disconnect', () => {
    const username = Object.keys(users).find((key) => users[key] === socket.id);
    if (username) {
      delete users[username]; // Remove user from the list
      io.emit('updateUsers', Object.keys(users)); // Send updated user list to all clients
      console.log(`${username} left the chat`);
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
