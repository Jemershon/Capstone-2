import { io } from 'socket.io-client';
import jwt from 'jsonwebtoken';

const API_URL = process.env.API_URL || 'https://goals-ccs.onrender.com';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';

async function run() {
  const token = jwt.sign({ username: 'testuser', role: 'Student' }, JWT_SECRET, { expiresIn: '1h' });
  const socket = io(API_URL, { autoConnect: true, transports: ['polling', 'websocket'], upgrade: true });

  socket.on('connect', () => {
    console.log('Connected to socket server:', socket.id);
    socket.emit('authenticate', token);
    // Join test class
    socket.emit('join-class', 'TEST_CLASS');
  });

  socket.on('connect_error', (err) => {
    console.error('Connect error:', err && err.message ? err.message : err);
    if (err && err.message && err.message.includes('xhr poll error')) {
      console.error('XHR poll error detected — server may be blocking CORS or not reachable');
    }
  });

  socket.on('test-event', (payload) => {
    console.log('Received test-event:', payload);
    process.exit(0);
  });

  socket.on('new-notification', (n) => {
    console.log('New-notification event:', n);
  });
}

run().catch(err => {
  console.error('Test client error:', err);
  process.exit(1);
});
