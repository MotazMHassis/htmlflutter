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
        console.log(`User ${socket.id} registered with username: ${username}`);
        onlineUsers.set(socket.id, username);
        io.emit('userList', Array.from(onlineUsers.entries()));
        console.log('Updated user list:', Array.from(onlineUsers.entries()));
    });

    // Call invitation
    socket.on('callInvite', (data) => {
        console.log(`Call invite from ${socket.id} to ${data.targetSocketId}:`, data);
        socket.to(data.targetSocketId).emit('incomingCall', {
            callerSocketId: socket.id,
            callerName: data.callerName
        });
    });

    // Handle call response
    socket.on('callResponse', (data) => {
        console.log(`Call response from ${socket.id} to ${data.callerSocketId}:`, data);
        if (data.response === 'accept') {
            // Broadcast accept to both parties
            io.to(data.callerSocketId).emit('callAccepted');
            io.to(socket.id).emit('callAccepted');
            console.log(`Call accepted by ${socket.id}`);
        } else {
            // Broadcast reject to caller
            io.to(data.callerSocketId).emit('callRejected');
            console.log(`Call rejected by ${socket.id}`);
        }
    });

    // Signaling for WebRTC
    socket.on('signaloffer', (data) => {
        console.log('signaloffer');
        // Log the signaling data
        if (data.type === 'offer') {
            console.log(`SDP Offer from ${socket.id} to ${data.targetSocketId}:`, data.offer);
        }
        // Forward the signal to the target user
        socket.to(data.targetSocketId).emit('signal', data);
        console.log(`signaloffer forwarded from ${socket.id} to ${data.targetSocketId}`);
    });
    socket.on('signalAnswer', (data) => {
        console.log('signalAnswer');
        // Log the signaling data
        if (data.type === 'answer') {
            console.log(`SDP Answer from ${socket.id} to ${data.targetSocketId}:`, data.answer);
        }
        // Forward the signal to the target user
        socket.to(data.targetSocketId).emit('signal', data);
        console.log(`signalAnswer forwarded from ${socket.id} to ${data.targetSocketId}`);
    });
    socket.on('signalcandidate', (data) => {
        console.log('signalcandidate');
        // Log the signaling data
        if (data.type === 'candidate') {
            console.log(`ICE Candidate from ${socket.id} to ${data.targetSocketId}:`, data.candidate);
        }
        // Forward the signal to the target user
        socket.to(data.targetSocketId).emit('signal', data);
        console.log(`signalcandidate forwarded from ${socket.id} to ${data.targetSocketId}`);
    });



    // Disconnect
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);
        onlineUsers.delete(socket.id);
        io.emit('userList', Array.from(onlineUsers.entries()));
        console.log('Updated user list:', Array.from(onlineUsers.entries()));
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
