const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the HTML ppppppage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO for signaling
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle signaling messages
    socket.on('signal', (data) => {
        // Broadcast the signal to the other peer
        socket.broadcast.emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
