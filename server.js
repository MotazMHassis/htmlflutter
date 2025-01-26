const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Store online users
const onlineUsers = new Map();

wss.on('connection', (ws) => {
  console.log('A user connected');

  ws.on('message', (message) => {
    const data = JSON.parse(message);
    let targetWs; // Declare targetWs once at the beginning of the scope
    switch (data.type) {
      case 'register':
        onlineUsers.set(ws, data.username);
        broadcastUserList();
        break;
      case 'callInvite':
        targetWs = Array.from(onlineUsers.keys()).find(key => onlineUsers.get(key) === data.targetUsername);
        if (targetWs) {
          targetWs.send(JSON.stringify({
            type: 'incomingCall',
            callerSocketId: ws,
            callerName: data.callerName
          }));
        }
        break;
      case 'callResponse':
        const callerWs = data.callerSocketId;
        if (data.response === 'accept') {
          callerWs.send(JSON.stringify({ type: 'callAccepted' }));
          ws.send(JSON.stringify({ type: 'callAccepted' }));
        } else {
          callerWs.send(JSON.stringify({ type: 'callRejected' }));
        }
        break;
      case 'signal':
        targetWs = Array.from(onlineUsers.keys()).find(key => onlineUsers.get(key) === data.targetUsername);
        if (targetWs) {
          targetWs.send(JSON.stringify(data));
        }
        break;
    }
  });

  ws.on('close', () => {
    onlineUsers.delete(ws);
    broadcastUserList();
    console.log('User disconnected');
  });
});

function broadcastUserList() {
  const userList = Array.from(onlineUsers.values());
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'userList', users: userList }));
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
