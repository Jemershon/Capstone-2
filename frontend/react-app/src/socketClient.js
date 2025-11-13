import { io } from 'socket.io-client';
import { API_BASE_URL, getAuthToken } from './api';

let socket = null;

// Create (but don't auto-connect) a singleton socket instance.
export function getSocket() {
  if (socket) return socket;

  try {
    // Let the client use default transport strategy (polling -> websocket fallback)
    const secure = typeof API_BASE_URL === 'string' && API_BASE_URL.startsWith('https');
  console.log('[Socket.IO] initializing client to', API_BASE_URL, 'secure:', secure);
  socket = io(API_BASE_URL, {
      // do not force a single transport to allow polling fallback in constrained environments
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
      // mark secure when using https to ensure correct websocket protocol (wss)
      secure
    });

    // Authenticate on connect if a token is available
    socket.on('connect', () => {
      const token = getAuthToken();
      console.log('[Socket.IO] Connected:', socket.id);
      if (token) {
        socket.emit('authenticate', token);
        console.log('[Socket.IO] Sent authenticate event');
      }
    });

    socket.on('disconnect', (reason) => {
      console.warn('[Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket.IO] Connect error:', err && err.message ? err.message : err);
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
