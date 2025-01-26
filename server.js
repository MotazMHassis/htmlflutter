const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store online users
const onlineUsers = new Map(); // Map<WebSocket, username>

// Broadcast user list to all connected clients
function broadcastUserList() {
  const userList = Array.from(onlineUsers.values());
  const message = JSON.stringify({
    type: 'userList',
    users: userList,
  });

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('A user connected');

  // Handle incoming messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'register':
          // Register user
          onlineUsers.set(ws, data.username);
          console.log(`User registered: ${data.username}`);
          broadcastUserList();
          break;

        case 'callInvite':
          // Send call invitation to target user
          const targetUser = data.targetUsername;
          const targetWs = Array.from(onlineUsers.entries()).find(
            ([_, username]) => username === targetUser
          )?.[0];

          if (targetWs) {
            targetWs.send(
              JSON.stringify({
                type: 'incomingCall',
                callerSocketId: ws, // Pass the caller's WebSocket object
                callerName: data.callerName,
              })
            );
            console.log(`Call invitation sent to ${targetUser}`);
          } else {
            console.log(`Target user ${targetUser} not found`);
          }
          break;

        case 'callResponse':
          // Handle call response (accept/reject)
          const callerWs = data.callerSocketId;
          if (data.response === 'accept') {
            callerWs.send(JSON.stringify({ type: 'callAccepted' }));
            ws.send(JSON.stringify({ type: 'callAccepted' }));
            console.log('Call accepted');
          } else {
            callerWs.send(JSON.stringify({ type: 'callRejected' }));
            console.log('Call rejected');
          }
          break;

        case 'signal':
          // Forward WebRTC signaling data (offer, answer, ICE candidates)
          const targetUserForSignal = data.targetUsername;
          const targetWsForSignal = Array.from(onlineUsers.entries()).find(
            ([_, username]) => username === targetUserForSignal
          )?.[0];

          if (targetWsForSignal) {
            targetWsForSignal.send(JSON.stringify(data));
            console.log(`Signaling data forwarded to ${targetUserForSignal}`);
          } else {
            console.log(`Target user ${targetUserForSignal} not found`);
          }
          break;

        default:
          console.warn('Unknown message type:', data.type);
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle user disconnection
  ws.on('close', () => {
    onlineUsers.delete(ws);
    broadcastUserList();
    console.log('User disconnected');
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
