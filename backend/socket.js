// socket.js - Socket.io configuration for real-time notifications

import { Server } from "socket.io";
import jwt from "jsonwebtoken";

export function setupSocketIO(httpServer) {
  // Build a safe allowlist for Socket.IO CORS handling.
  // Use CORS_ORIGIN environment variable if provided (trim trailing slashes),
  // and allow common local development origins. Also allow Vercel-hosted frontends
  // with the pattern https://*.vercel.app.
  const normalize = (u) => (typeof u === 'string' ? u.trim().replace(/\/+$/g, '') : u);
  const envOrigin = normalize(process.env.CORS_ORIGIN);
  const allowedOrigins = new Set([
    envOrigin || 'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000'
  ].filter(Boolean));

  const vercelRegex = /^https:\/\/([a-z0-9-]+\.)?vercel\.app$/i;

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests without origin (tools, mobile apps, or same-origin)
        if (!origin) return callback(null, true);

        const normalized = normalize(origin);
        if (allowedOrigins.has(normalized) || vercelRegex.test(normalized)) {
          return callback(null, true);
        }

        console.warn('Socket CORS blocked origin:', origin);
        return callback(new Error('Not allowed by CORS'), false);
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true
    }
  });

  // Socket connection handling
  io.on("connection", (socket) => {
    console.log("New socket connection:", socket.id);
    
    // Authenticate socket connection
    socket.on("authenticate", (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret123");
        // Join user to their personal room for targeted messages
        const userRoom = `user:${decoded.username}`;
        socket.join(userRoom);
        socket.user = decoded;
        console.log(`User ${decoded.username} authenticated and joined room ${userRoom}`);
      } catch (err) {
        console.error("Socket authentication failed:", err.message);
      }
    });
    
    // Join a class room for class-specific updates
    // Note: Server will prefix with "class:" internally
    socket.on("join-class", (className) => {
      if (socket.user) {
        // Create a room name with class: prefix for better organization
        const roomName = `class:${className}`;
        socket.join(roomName);
        console.log(`User ${socket.user.username} joined room ${roomName}`);
      }
    });
    
    // Leave a class room
    socket.on("leave-class", (className) => {
      const roomName = `class:${className}`;
      socket.leave(roomName);
      console.log(`User ${socket.user?.username} left room ${roomName}`);
    });
    
    // Handle disconnection
    socket.on("disconnect", () => {
      // Disconnection handled automatically by Socket.io
    });
  });

  // Export the io instance to be used elsewhere
  return io;
}

// Function to send notification to a specific user
export function sendNotificationToUser(io, username, notification) {
  if (!io) return;
  const userRoom = `user:${username}`;
  console.log(`Sending notification to room: ${userRoom}`);
  io.to(userRoom).emit('new-notification', notification);
}

// Function to broadcast notification to all connected clients
export function broadcastNotification(io, notification) {
  if (!io) return;
  io.emit('broadcast-notification', notification);
}

// Function to send update to a specific class
export function sendClassUpdate(io, className, eventName, data) {
  if (!io) return;
  io.to(`class:${className}`).emit(eventName, data);
}

// Function to emit an exam creation event
export function emitExamCreated(io, exam) {
  if (!io) return;
  io.to(`class:${exam.class}`).emit('exam-created', exam);
}

// Function to emit an announcement creation event
export function emitAnnouncementCreated(io, announcement) {
  if (!io) return;
  io.to(`class:${announcement.class}`).emit('announcement-created', announcement);
}