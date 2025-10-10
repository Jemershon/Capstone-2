import { io } from 'socket.io-client';
import { API_BASE_URL, getAuthToken } from './api';

let socket = null;

// Create (but don't auto-connect) a singleton socket instance.
export function getSocket() {
  if (socket) return socket;

  try {
    socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      timeout: 10000
    });

    // Authenticate on connect if a token is available
    socket.on('connect', () => {
      const token = getAuthToken();
      if (token) {
        socket.emit('authenticate', token);
      }
    });

    socket.on('connect_error', (err) => {
      console.debug('Socket connect_error:', err && err.message ? err.message : err);
    });

    // Defer actual connection until a component requests it
    // Consumers should call getSocket() which will ensure the socket exists
  } catch (err) {
    console.error('Failed to create socket client:', err);
    socket = null;
  }

  return socket;
}

export function ensureSocketConnected() {
  const s = getSocket();
  if (!s) return null;
  if (!s.connected && !s.connecting) {
    try { s.connect(); } catch (e) { console.debug('Socket connect error:', e); }
  }
  return s;
}

export function disconnectSocket() {
  if (socket) {
    try { socket.disconnect(); } catch (e) { /* ignore */ }
    socket = null;
  }
}
