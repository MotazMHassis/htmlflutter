const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store online users with unique identifiers
const onlineUsers = new Map(); // Map<string, { username: string, ws: WebSocket }>

// Broadcast updated user list to all connected clients
function broadcastUserList() {
  const userList = Array.from(onlineUsers.values()).map(user => user.username);
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

// WebSocket connection handler
wss.on('connection', (ws) => {
  const connectionId = uuidv4(); // Generate unique connection ID

  console.log(`New WebSocket connection: ${connectionId}`);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`Received message type: ${data.type}`);

      switch (data.type) {
        case 'register':
          // Register new user
          onlineUsers.set(connectionId, { 
            username: data.username, 
            ws 
          });
          console.log(`User registered: ${data.username}`);
          broadcastUserList();
          break;
        
        case 'callInvite':
          // Send call invitation to target user
          const targetUser = Array.from(onlineUsers.values())
            .find(user => user.username === data.targetUsername);
          
          if (targetUser) {
            targetUser.ws.send(JSON.stringify({
              type: 'incomingCall',
              callerSocketId: connectionId,
              callerName: data.callerName,
            }));
            console.log(`Call invite sent to ${data.targetUsername}`);
          } else {
            console.log(`Target user ${data.targetUsername} not found`);
          }
          break;

        case 'callResponse':
          // Handle call response (accept/reject)
          const callerUser = Array.from(onlineUsers.values())
            .find(user => user.username === data.callerName);
          
          if (callerUser) {
            callerUser.ws.send(JSON.stringify({
              type: 'callResponse',
              response: data.response
            }));
            console.log(`Call response: ${data.response}`);
          }
          break;

        case 'offer':
        case 'answer':
        case 'candidate':
          // Forward WebRTC signaling data
          const targetUserForSignal = Array.from(onlineUsers.values())
            .find(user => user.username === data.targetUsername);
          
          if (targetUserForSignal) {
            targetUserForSignal.ws.send(JSON.stringify(data));
            console.log(`Signaling data forwarded to ${data.targetUsername}`);
          } else {
            console.log(`Target user ${data.targetUsername} not found for signaling`);
          }
          break;

        default:
          console.warn(`Unknown message type: ${data.type}`);
          break;
      }
    } catch (error) {
      console.error('Message processing error:', error);
    }
  });

  // Handle user disconnection
  ws.on('close', () => {
    const disconnectedUser = onlineUsers.get(connectionId);
    if (disconnectedUser) {
      console.log(`User disconnected: ${disconnectedUser.username}`);
    }
    onlineUsers.delete(connectionId);
    broadcastUserList();
  });
});

// Error handling for the server
server.on('error', (error) => {
  console.error('Server error:', error);
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`WebSocket signaling server running on port ${PORT}`);
});
