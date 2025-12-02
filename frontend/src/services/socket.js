// src/services/socket.js
import { io } from 'socket.io-client';

// Cũng đổi thành 127.0.0.1
const socket = io('http://127.0.0.1:5000', {
  transports: ['websocket'],
  withCredentials: true
});

export default socket;