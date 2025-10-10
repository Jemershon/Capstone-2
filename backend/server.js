// Minimal log level control: set LOG_LEVEL=debug|info|warn|error in environment to see more logs
{
  const envLevel = (process.env.LOG_LEVEL || 'warn').toLowerCase();
  const levels = { error: 0, warn: 1, info: 2, debug: 3 };
  const current = levels[envLevel] ?? 1;
  const _orig = { log: console.log, info: console.info, warn: console.warn, error: console.error, debug: console.debug };
  console.log = (...args) => { if (current >= 2) _orig.log(...args); };
  console.info = (...args) => { if (current >= 2) _orig.info(...args); };
  console.debug = (...args) => { if (current >= 3) _orig.debug(...args); };
  console.warn = (...args) => { if (current >= 1) _orig.warn(...args); };
  console.error = (...args) => { _orig.error(...args); };
}

import dotenv from "dotenv";
dotenv.config();
// Force redeploy to pick up new environment variables
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { setupSocketIO } from "./socket.js";

// Import middleware and routes
import { authenticateToken, requireAdmin, requireTeacherOrAdmin, requireStudent } from "./middlewares/auth.js";
import materialsRoutes, { setupMaterialsModels } from "./routes/materials.js";
import commentsRoutes from "./routes/comments.js";
import notificationsRoutes from "./routes/notifications.js";
import testNotificationsRoutes from "./routes/testNotifications.js";
import uploadRoutes from "./routes/upload.js";
import examsRoutes, { setupModels } from "./routes/exams.js";
import reactionsRoutes from "./routes/reactions.js";
import Exam from "./models/Exam.js";
import Notification from "./models/Notification.js";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();

// Environment configuration with defaults
const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/notetify";
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-change-in-production";
const NODE_ENV = process.env.NODE_ENV || "development";
// Normalize CORS origin env value: trim trailing slashes so values like
// "https://goals-ccs.vercel.app/" and "https://goals-ccs.vercel.app" both work.
function normalizeOrigin(raw) {
  if (!raw || typeof raw !== 'string') return raw;
  return raw.trim().replace(/\/+$/g, '');
}

const CORS_ORIGIN = normalizeOrigin(process.env.CORS_ORIGIN) || "http://localhost:5173";

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Simple request logger to help debug incoming API calls
app.use((req, res, next) => {
  try {
    console.debug(`Incoming request: ${req.method} ${req.originalUrl}`);
  } catch (e) {
    // ignore
  }
  next();
});

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      CORS_ORIGIN,
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000"
    ];
    
    // In production, add your deployed frontend URL
    if (NODE_ENV === 'production') {
      // Add your specific Vercel URL
      allowedOrigins.push(
        "https://goals-ccs.vercel.app",
        "https://*.vercel.app" // Allow all Vercel apps as fallback
      );
    }
    
    // Check if origin is allowed or matches Vercel pattern
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === origin) return true;
      if (allowedOrigin.includes('*') && origin) {
        const pattern = allowedOrigin.replace('*', '.*');
        return new RegExp(pattern).test(origin);
      }
      return false;
    });
    
    if (isAllowed || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// Ensure uploads directory exists (only in development)
if (NODE_ENV === 'development') {
  const uploadsDir = path.join(__dirname, "uploads");
  const subdirs = ['materials', 'assignments', 'profiles'];
  
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("✅ Created uploads directory");
    }
    
    // Create subdirectories
    subdirs.forEach(subdir => {
      const subdirPath = path.join(uploadsDir, subdir);
      if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
        console.log(`✅ Created ${subdir} subdirectory`);
      }
    });
    
    app.use("/uploads", express.static(uploadsDir));
  console.debug("Serving static files locally (development mode)");
  } catch (error) {
    console.warn("⚠️ Could not create uploads directory:", error.message);
    console.warn("⚠️ File uploads may not work locally");
  }
} else {
  console.log("ℹ️ Production mode: Using Cloudinary for file storage");
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  if (NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Test route for API connectivity (public)
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'API is working', 
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    fileStorage: NODE_ENV === 'production' ? 'Cloudinary' : 'Local',
    version: '1.0.0'
  });
});

// Health check endpoint for Railway
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Railway healthcheck endpoint (alternative)
app.get('/', (req, res) => {
  res.json({
    message: 'Capstone-2 Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
  });
});

// Auth test route (protected)
app.get('/api/auth-test', authenticateToken, (req, res) => {
  res.json({
    authenticated: true,
    user: {
      username: req.user.username,
      role: req.user.role,
    },
    timestamp: new Date().toISOString()
  });
});

// MongoDB Connection with improved error handling and retry logic
const connectToMongoDB = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        socketTimeoutMS: 45000,
      });
      console.log(`✅ Connected to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);

      // Idempotent startup migration: fix duplicate-null-email unique index issue
      try {
        const db = mongoose.connection.db;
        const users = db.collection('users');
        // Run lightweight migration: remove null emails and ensure a safe unique index on email.
        const updateResult = await users.updateMany({ email: null }, { $unset: { email: '' } });
        if (updateResult.modifiedCount > 0) {
          console.info(`Startup migration: fixed ${updateResult.modifiedCount} user documents`);
        }

        // Recreate partial unique index on email so null/missing emails are allowed
        // Drop any existing index that targets the `email` key to avoid
        // IndexKeySpecsConflict when creating a new index with different options.
        try {
          const existingIndexes = await users.indexes();
          for (const idx of existingIndexes) {
            if (idx.key && idx.key.email === 1) {
                try {
                await users.dropIndex(idx.name);
                console.debug(`Startup migration: dropped index ${idx.name}`);
              } catch (dropErr) {
                console.warn(`Startup migration: failed dropping index ${idx.name}:`, dropErr.message);
              }
            }
          }
        } catch (listErr) {
          console.warn('Startup migration: could not list indexes:', listErr.message);
        }

        // Create a resilient unique index on email. Different MongoDB versions
        // support different partial expression operators; detect server version
        // and only attempt the preferred partial expression when supported.
        let supportsPreferredPartial = false;
        try {
          const admin = db.admin();
          const info = await admin.serverInfo();
          const ver = (info && info.version) ? info.version : '';
          const parts = ver.split('.').map(n => parseInt(n, 10) || 0);
          const major = parts[0] || 0;
          const minor = parts[1] || 0;
          // Assume preferred partial index expression is safe on MongoDB >= 4.4
          if (major > 4 || (major === 4 && minor >= 4)) supportsPreferredPartial = true;
          console.debug(`MongoDB version ${ver} - preferred partial index ${supportsPreferredPartial ? 'enabled' : 'disabled'}`);
        } catch (verErr) {
          console.debug('Could not determine MongoDB server version, will use fallback index strategy');
        }

        const tryCreateEmailIndex = async () => {
          // Preferred: partial index excluding nulls (most explicit)
          if (supportsPreferredPartial) {
            try {
              await users.createIndex(
                { email: 1 },
                { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
              );
              console.info('Startup migration: created preferred email unique index');
              return;
            } catch (e1) {
              console.debug('Startup migration: preferred partial index failed:', e1.message);
            }
          } else {
            console.debug('Skipping preferred partial index (server version does not support expression)');
          }

          // Fallback: partial index where email exists (may exclude missing fields)
          try {
            await users.createIndex(
              { email: 1 },
              { unique: true, partialFilterExpression: { email: { $exists: true } } }
            );
            console.info('Startup migration: created fallback email unique index');
            return;
          } catch (e2) {
            // Some MongoDB servers may report index name conflicts or unsupported
            // partial index expressions. In development we prefer to continue
            // rather than crash the whole server. If the error indicates an
            // existing index name conflict, log it and continue.
            console.debug('Startup migration: fallback partial index failed:', e2.message);
            if (e2 && (e2.codeName === 'IndexKeySpecsConflict' || /same name as the requested index/i.test(e2.message))) {
              console.warn('Startup migration: index name conflict detected; continuing without replacing index (development mode)');
            }
          }

          // Last resort: create a sparse unique index (supported on older servers)
          try {
            await users.createIndex({ email: 1 }, { unique: true, sparse: true });
            console.info('Startup migration: created sparse unique index (last resort)');
            return;
          } catch (e3) {
            // Last-resort index creation failed. If the failure is due to an
            // existing index (name conflict) we will continue in development
            // and avoid crashing the process. Otherwise rethrow so it can be
            // observed and handled upstream.
            if (e3 && (e3.codeName === 'IndexKeySpecsConflict' || /same name as the requested index/i.test(e3.message))) {
              console.error('Startup migration: index creation conflict detected, continuing in development:', e3.message);
            } else {
              console.error('Startup migration: failed to create any email unique index:', e3.message);
              throw e3;
            }
          }
        };

        await tryCreateEmailIndex();
      } catch (migErr) {
        console.error('Startup migration error:', migErr);
      }
      return;
    } catch (error) {
      console.error(`❌ MongoDB connection attempt ${i + 1}/${retries} failed:`, error.message);
      if (i === retries - 1) {
        // Last attempt failed
        if (NODE_ENV === 'production') {
          console.error("🚨 All MongoDB connection attempts failed in production.");
          console.error("⚠️ Server will continue running but database operations will fail");
          console.error("💡 Please check your MONGODB_URI environment variable");
          // Don't exit in production - let Railway healthcheck pass
        } else {
          console.warn("⚠️ Continuing without MongoDB in development mode");
        }
      } else {
        // Wait before retrying
        console.log(`⏳ Retrying in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
};

// Connect to MongoDB
connectToMongoDB();

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  email: { type: String, unique: true },
  password: String,
  googleId: { type: String, index: true, sparse: true },
  picture: String,
  role: { type: String, enum: ["Student", "Teacher", "Admin"], default: "Student" },
  creditPoints: { type: Number, default: 0, min: 0, max: 10 }, // Max 10 credit points
});

const ClassSchema = new mongoose.Schema({
  name: String,
  section: String,
  code: { type: String, unique: true },
  teacher: String,
  teacherPicture: String,
  students: [{ type: String }],
  bg: { type: String, default: "#FFF0D8" },
});

const AssignmentSchema = new mongoose.Schema(
  {
    class: String,
    title: String,
    description: String,
    instructions: String,
    due: Date,
    pointsPossible: { type: Number, default: 100 },
    status: { type: String, enum: ["Assigned", "Submitted", "Returned", "Missing"], default: "Assigned" },
    createdBy: String,
    attachments: [{ 
      filename: String,
      path: String,
      mimetype: String,
      uploadDate: { type: Date, default: Date.now }
    }],
    submissions: [{
      studentUsername: String,
      submittedFile: String,
      submittedAt: { type: Date, default: Date.now },
      grade: Number,
      feedback: String,
      status: { type: String, enum: ["Submitted", "Graded", "Late"], default: "Submitted" }
    }],
    topic: String, // For categorizing assignments
    allowLateSubmissions: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AnnouncementSchema = new mongoose.Schema(
  {
    teacher: String,
    class: String,
    date: Date,
    message: String,
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    likes: { type: Number, default: 0 },
    attachments: [{
      filename: String,
      originalName: String,
      filePath: String,
      fileSize: Number,
      mimeType: String
    }]
  },
  { timestamps: true }
);

// Exam schema is now imported from models/Exam.js

const ExamSubmissionSchema = new mongoose.Schema(
  {
    examId: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    student: String,
    answers: [
      {
        questionIndex: Number,
        answer: String,
      },
    ],
    rawScore: Number,
    finalScore: Number,
    totalQuestions: { type: Number, default: 0 },
    // Capture class context at submission time so grading can reference course/year
    className: String,
    classCourse: String,
    classYear: String,
    creditsUsed: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GradeSchema = new mongoose.Schema({
  class: String,
  student: String,
  grade: String,
  feedback: String,
});

const User = mongoose.model("User", UserSchema);
const Class = mongoose.model("Class", ClassSchema);
const Assignment = mongoose.model("Assignment", AssignmentSchema);
const Announcement = mongoose.model("Announcement", AnnouncementSchema);
// Exam model imported from models/Exam.js
const ExamSubmission = mongoose.model("ExamSubmission", ExamSubmissionSchema);
const Grade = mongoose.model("Grade", GradeSchema);

// Helper: generate a short, human-friendly class code (e.g., 6 chars alphanumeric)
function generateClassCode(length = 6) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // exclude ambiguous chars
  let code = '';
  for (let i = 0; i < length; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
  return code;
}

// Helper: generate a unique class code by checking the DB (retries up to attempts)
async function generateUniqueClassCode(attempts = 5, length = 6) {
  for (let i = 0; i < attempts; i++) {
    const code = generateClassCode(length);
    const exists = await Class.findOne({ code });
    if (!exists) return code;
  }
  throw new Error('Failed to generate unique class code');
}


// Seed data endpoint
app.post("/api/seed", async (req, res) => {
  try {
    await User.deleteMany({});
    await Class.deleteMany({});
    await Assignment.deleteMany({});
    await Announcement.deleteMany({});
    await Exam.deleteMany({});
    await Grade.deleteMany({});

    const hashedPassword = await bcrypt.hash("password123", 10);
    const users = [
      {
        name: "Admin User",
        username: "admin1",
        email: "admin1@example.com",
        password: hashedPassword,
        role: "Admin",
      },
      {
        name: "Teacher One",
        username: "teacher1",
        email: "teacher1@example.com",
        password: hashedPassword,
        role: "Teacher",
      },
      {
        name: "Student One",
        username: "student1",
        email: "student1@example.com",
        password: hashedPassword,
        role: "Student",
      },
      {
        name: "Student Two",
        username: "student2",
        email: "student2@example.com",
        password: hashedPassword,
        role: "Student",
      },
    ];

    const classes = [
      {
        name: "Math 101",
        section: "A",
        code: "MATH101",
        teacher: "teacher1",
        students: ["student1", "student2"],
      },
      {
        name: "Science 101",
        section: "B",
        code: "SCI101",
        teacher: "teacher1",
        students: ["student1"],
      },
    ];

    const assignments = [
      {
        class: "Math 101",
        title: "Homework 1",
        description: "Solve problems 1-10",
        due: new Date("2025-10-01"),
        status: "Assigned",
        createdBy: "teacher1",
      },
    ];

    const announcements = [
      {
        teacher: "teacher1",
        class: "Math 101",
        date: new Date(),
        message: "Welcome to Math 101!",
        likes: 0,
      },
    ];

    const exams = [
      {
        title: "Midterm",
        description: "Math 101 Midterm Exam",
        questions: [
          { text: "What is 2+2?", type: "short", options: [] },
          { text: "What is the capital of France?", type: "multiple", options: ["Paris", "London", "Berlin"] },
        ],
        createdBy: "teacher1",
      },
    ];

    const grades = [
      {
        class: "Math 101",
        student: "student1",
        grade: "A",
        feedback: "Excellent work!",
      },
    ];

    console.log("Inserting users...");
    const insertedUsers = await User.insertMany(users);
    console.log("Users inserted:", insertedUsers.length);
    console.log("Inserting classes...");
    await Class.insertMany(classes);
    console.log("Inserting assignments...");
    await Assignment.insertMany(assignments);
    console.log("Inserting announcements...");
    await Announcement.insertMany(announcements);
    console.log("Inserting exams...");
    await Exam.insertMany(exams);
    console.log("Inserting grades...");
    await Grade.insertMany(grades);

    res.json({ message: "Database seeded successfully" });
  } catch (err) {
    console.error("Seed error details:", err.stack);
    res.status(500).json({ error: "Failed to seed database", details: err.message });
  }
});

// Register endpoint
app.post("/api/register", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    // Email is now optional because users can sign up with Google
    if (!name || !username || !password || !["Student", "Teacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid input data" });
    }

    // Check uniqueness: username is required unique; email if provided must be unique
    const existingUser = await User.findOne({ $or: [{ username }, ...(email ? [{ email }] : [])] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email: email || undefined, password: hashedPassword, role });

    // Try to save. If a duplicate-key error occurs because of legacy documents that
    // have `email: null` and a non-partial unique index existed, attempt an
    // idempotent remediation: unset email:null documents and ensure a partial
    // unique index on `email`, then retry the save once.
    try {
      await user.save();
      return res.status(201).json({ message: "User registered successfully" });
    } catch (saveErr) {
      console.error('Register save error:', saveErr && saveErr.message ? saveErr.message : saveErr);

      // Detect Mongo duplicate key error
      if (saveErr && (saveErr.code === 11000 || (saveErr.name === 'MongoServerError' && /duplicate key/i.test(String(saveErr.message))))) {
        try {
          const db = mongoose.connection.db;
          const users = db.collection('users');

          console.log('Register handler remediation: unsetting legacy email:null documents');
          const upd = await users.updateMany({ email: null }, { $unset: { email: "" } });
          console.log(`Remediation: unset email on ${upd.modifiedCount} documents`);

          // Ensure partial unique index on email to avoid duplicate-null problems in future
          try {
            const existingIndexes = await users.indexes();
            for (const idx of existingIndexes) {
              if (idx.key && idx.key.email === 1) {
                try {
                  await users.dropIndex(idx.name);
                  console.log(`Remediation: dropped existing index ${idx.name} on email`);
                } catch (dErr) {
                  console.log(`Remediation: failed dropping index ${idx.name}:`, dErr.message);
                }
              }
            }
          } catch (listErr) {
            console.log('Remediation: could not list indexes:', listErr.message);
          }

          const tryCreateEmailIndex = async () => {
            try {
              await users.createIndex(
                { email: 1 },
                { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } }
              );
              console.log('Remediation: ensured partial unique index on email (\"$ne:null\")');
              return;
            } catch (e1) {
              console.log('Remediation: preferred partial index failed:', e1.message);
            }

            try {
              await users.createIndex(
                { email: 1 },
                { unique: true, partialFilterExpression: { email: { $exists: true } } }
              );
              console.log('Remediation: ensured partial unique index on email (\"$exists\")');
              return;
            } catch (e2) {
              console.log('Remediation: partial $exists index failed:', e2.message);
            }

            try {
              await users.createIndex({ email: 1 }, { unique: true, sparse: true });
              console.log('Remediation: ensured sparse unique index on email');
              return;
            } catch (e3) {
              console.error('Remediation: failed to create any email unique index:', e3.message);
              throw e3;
            }
          };

          await tryCreateEmailIndex();

          // Retry save once
          try {
            await user.save();
            return res.status(201).json({ message: "User registered successfully" });
          } catch (retryErr) {
            console.error('Register retry failed:', retryErr && retryErr.message ? retryErr.message : retryErr);
            return res.status(500).json({ error: 'Registration failed after remediation. Please contact the administrator.' });
          }
        } catch (remErr) {
          console.error('Register remediation error:', remErr && remErr.stack ? remErr.stack : remErr);
          return res.status(500).json({ error: 'Registration failed (remediation error). Please contact the administrator.' });
        }
      }

      // Default error flow
      return res.status(500).json({ error: 'Registration failed' });
    }
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Special admin registration endpoint (for initial setup)
app.post("/api/register-admin", async (req, res) => {
  try {
    const { name, username, email, password, adminKey } = req.body;
    
    // Simple admin key check for security
    if (adminKey !== "admin-setup-2025") {
      return res.status(403).json({ error: "Invalid admin key" });
    }
    
    if (!name || !username || !email || !password) {
      return res.status(400).json({ error: "Invalid input data" });
    }
    
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword, role: "Admin" });
    await user.save();
    res.status(201).json({ message: "Admin user registered successfully" });
  } catch (err) {
    console.error("Admin register error:", err);
    res.status(500).json({ error: "Admin registration failed" });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const loginIdentifier = username || email; // Prioritize username, fallback to email
    console.log("Login attempt for identifier:", loginIdentifier);
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    // Find user by username first, then by email as fallback
    let user;
    if (username) {
      user = await User.findOne({ username });
    } else if (email) {
      user = await User.findOne({ email });
    }
    
    console.log("User found:", user ? "Yes" : "No");
    if (user) {
      console.log("User role:", user.role);
      console.log("Password match:", await bcrypt.compare(password, user.password));
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    
    // Create JWT token with user information
    const token = jwt.sign(
      { 
        id: user._id, 
        role: user.role, 
        username: user.username,
        email: user.email,
        name: user.name
      }, 
      process.env.JWT_SECRET || "devsecret123", 
      { expiresIn: "1d" } // Increased token lifetime
    );
    
    console.log("Login successful for", username, "with role", user.role);
    console.log("Token generated:", token.substring(0, 20) + "...");
    
    // Return token and user info
    res.json({ 
      token, 
      user: { 
        id: user._id,
        role: user.role, 
        username: user.username,
        name: user.name
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Google Sign-In endpoint (verify ID token and issue app JWT)
import { OAuth2Client } from 'google-auth-library';
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || '');

// NOTE: we avoid warning at startup about GOOGLE_CLIENT_ID because some
// environments may still validate ID tokens successfully. Any real runtime
// failure during Google auth will be surfaced in the auth endpoint.

app.post('/api/auth/google', async (req, res) => {
  try {
    const { id_token } = req.body;
    if (!id_token) return res.status(400).json({ error: 'id_token is required' });

    // Verify the id_token with Google's library
    const ticket = await googleClient.verifyIdToken({ idToken: id_token, audience: process.env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified) {
      return res.status(401).json({ error: 'Google account not verified' });
    }

  const googleId = payload.sub;
  const email = payload.email;
  const name = payload.name || '';
  const picture = payload.picture || '';
  const requestedRole = req.body.requestedRole; // optional role from frontend when registering

    // Try to find an existing user by googleId or email
    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (!user) {
      // Create a username from email local part (ensure uniqueness)
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || `user${Date.now()}`;
      let username = baseUsername;
      let suffix = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix}`;
        suffix++;
      }

      // Validate requested role if provided (only allow Student or Teacher here)
      let roleToSet = 'Student';
      if (requestedRole && ['Student', 'Teacher'].includes(requestedRole)) {
        roleToSet = requestedRole;
      }

      user = new User({
        name,
        username,
        email,
        password: '', // no local password
        role: roleToSet,
        googleId,
        picture,
      });
      await user.save();
      console.log('Created new user from Google Sign-In:', user.username);
    } else {
      // If user exists but doesn't have googleId, attach it
      if (!user.googleId) {
        user.googleId = googleId;
        user.picture = user.picture || picture;
        await user.save();
      }
    }

    // Issue our app JWT
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username, email: user.email, name: user.name }, process.env.JWT_SECRET || 'devsecret123', { expiresIn: '1d' });

    res.json({ token, user: { id: user._id, role: user.role, username: user.username, name: user.name, email: user.email, picture: user.picture } });
  } catch (err) {
    // Log full error stack for debugging
    console.error('Google sign-in error:', err && err.stack ? err.stack : err);

    // In non-production, return error details to aid debugging (do NOT leak in production)
    if (NODE_ENV !== 'production') {
      return res.status(500).json({ error: 'Google authentication failed', details: err && err.message ? err.message : String(err) });
    }

    // Generic response for production
    res.status(500).json({ error: 'Google authentication failed' });
  }
});

// Debug endpoint to verify required Google env is present (no secret values returned)
app.get('/api/google-env-check', (req, res) => {
  res.json({
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
    nodeEnv: NODE_ENV
  });
});

// Forgot-password / reset-password endpoints removed per request

// Token verification endpoint
app.get("/api/verify-token", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ valid: false, error: "User not found" });
    }
    
    console.log("Token verified for user:", user.username, "with role:", user.role);
    
    res.json({ 
      valid: true,
      user: { 
        id: user._id,
        role: user.role, 
        username: user.username,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.error("Token verification error:", err);
    res.status(500).json({ valid: false, error: "Token verification failed" });
  }
});

// Profile endpoint
app.get("/api/profile", authenticateToken, async (req, res) => {
  try {
    console.log("Fetching profile for user ID:", req.user.id);
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      console.log("User not found with ID:", req.user.id);
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log("User found:", user.username, "Credit points:", user.creditPoints);
    
    let needsSave = false;
    
    // If user doesn't have createdAt (legacy user), add it
    if (!user.createdAt) {
      user.createdAt = user._id.getTimestamp(); // Use ObjectId timestamp as fallback
      needsSave = true;
      console.log("Added createdAt for legacy user");
    }
    
    // Ensure creditPoints is initialized for legacy users
    if (typeof user.creditPoints !== 'number' || isNaN(user.creditPoints) || user.creditPoints === undefined || user.creditPoints === null) {
      console.log(`Initializing credit points for user ${user.username} from ${user.creditPoints} to 0`);
      user.creditPoints = 0;
      needsSave = true;
    }
    
    // Ensure creditPoints doesn't exceed max
    if (user.creditPoints > 10) {
      console.log(`Capping credit points for user ${user.username} from ${user.creditPoints} to 10`);
      user.creditPoints = 10;
      needsSave = true;
    }
    
    // Ensure creditPoints is not negative
    if (user.creditPoints < 0) {
      console.log(`Fixing negative credit points for user ${user.username} from ${user.creditPoints} to 0`);
      user.creditPoints = 0;
      needsSave = true;
    }
    
    // Save if any changes were made
    if (needsSave) {
      try {
        await user.save();
        console.log("User profile updated successfully");
      } catch (saveErr) {
        console.error("Error saving user updates:", saveErr);
        // Continue anyway and return the user data
      }
    }
    
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    console.error("Profile error stack:", err.stack);
    res.status(500).json({ error: "Failed to fetch profile", message: err.message });
  }
});

// Update profile (allow changing name and optionally adding email/picture)
app.put("/api/profile", authenticateToken, async (req, res) => {
  try {
    const { name, email, picture } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // If email provided, ensure uniqueness (allow same email if it's the user's current email)
    if (email && email !== user.email) {
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ error: "Email already in use" });
      user.email = email;
    }

    if (typeof name === 'string' && name.trim().length > 0) {
      user.name = name.trim();
    }

    if (picture) {
      user.picture = picture;
    }

    await user.save();
    // Propagate picture changes to classes where this user is the teacher
    try {
      if (picture) {
        await Class.updateMany({ teacher: user.username }, { $set: { teacherPicture: picture } });
      } else {
        // If picture removed, clear teacherPicture on classes
        await Class.updateMany({ teacher: user.username }, { $unset: { teacherPicture: "" } });
      }
    } catch (updateErr) {
      console.warn('Failed to propagate user picture to classes:', updateErr && updateErr.message ? updateErr.message : updateErr);
    }
    const safeUser = user.toObject();
    delete safeUser.password;
    res.json(safeUser);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Admin: Get all users
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const users = await User.find()
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin utility: backfill teacherPicture for existing classes from the corresponding user's picture
app.post('/api/admin/backfill-class-pictures', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const classes = await Class.find();
    let updated = 0;
    for (const cls of classes) {
      if (!cls.teacher) continue;
      const teacherUser = await User.findOne({ username: cls.teacher });
      if (teacherUser && teacherUser.picture) {
        cls.teacherPicture = teacherUser.picture;
        await cls.save();
        updated++;
      }
    }
    res.json({ message: 'Backfill complete', updated });
  } catch (err) {
    console.error('Backfill error:', err);
    res.status(500).json({ error: 'Backfill failed' });
  }
});

// Admin: Create user
app.post("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    // Email is optional for admin-created users
    if (!name || !username || !password || !["Student", "Teacher", "Admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid input data" });
    }
    // Check username uniqueness and email uniqueness only if provided
    const lookup = [{ username }];
    if (email) lookup.push({ email });
    const existingUser = await User.findOne({ $or: lookup });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const userData = { name, username, password: hashedPassword, role };
    if (email) userData.email = email;
    const user = new User(userData);
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    console.error("Create user error:", err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Debug endpoint: Get current user credit points
app.get("/api/debug/credit-points", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    console.log(`Debug: User ${req.user.username} has ${user.creditPoints} credit points`);
    
    res.json({ 
      username: req.user.username,
      creditPoints: user.creditPoints,
      message: `User ${req.user.username} has ${user.creditPoints} credit points`
    });
  } catch (err) {
    console.error("Get credit points error:", err);
    res.status(500).json({ error: "Failed to get credit points" });
  }
});

// Debug endpoint: Reset credit points to 10 for testing
app.post("/api/debug/reset-credit-points", authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.user.username });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    const oldPoints = user.creditPoints;
    user.creditPoints = 10; // Reset to default
    await user.save();
    
    console.log(`Debug: Reset credit points for ${req.user.username} from ${oldPoints} to 10`);
    
    res.json({ 
      username: req.user.username,
      oldCreditPoints: oldPoints,
      newCreditPoints: 10,
      message: `Credit points reset from ${oldPoints} to 10`
    });
  } catch (err) {
    console.error("Reset credit points error:", err);
    res.status(500).json({ error: "Failed to reset credit points" });
  }
});

// Admin: Delete user
app.delete("/api/admin/users/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await User.deleteOne({ _id: req.params.id });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Admin: Unlink google account from user (clear googleId and picture)
app.put("/api/admin/users/:id/unlink-google", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    user.googleId = undefined;
    user.picture = undefined;
    await user.save();
    res.json({ message: "Google account unlinked successfully" });
  } catch (err) {
    console.error("Unlink google error:", err);
    res.status(500).json({ error: "Failed to unlink google account" });
  }
});

// Admin/Teacher: Get all classes
app.get("/api/admin/classes", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    let classes;
    if (req.user.role === "Teacher") {
      classes = await Class.find({ teacher: req.user.username })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    } else {
      classes = await Class.find()
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
    }
    res.json(classes);
  } catch (err) {
    console.error("Get classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Admin/Teacher: Create class (admin path)
app.post("/api/admin/classes", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
  let { name, section, code, teacher, bg, course, year } = req.body;
    // Accept either section or year (year may contain year-section like '4-2')
    if (!name || !(section || year) || !teacher) {
      return res.status(400).json({ error: "Name, year/section and teacher are required" });
    }
    // Prefer explicit section, otherwise fall back to year
    section = section || year;

    // Always generate server-side class code (do not accept client-supplied codes)
    try {
      code = await generateUniqueClassCode(10, 6);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to generate class code' });
    }
    const existingClass = await Class.findOne({ code });
    if (existingClass) {
      return res.status(400).json({ error: "Class code already exists" });
    }

  const cls = new Class({ name, section, course, year, code, teacher, students: [], bg });
    try {
      const teacherUser = await User.findOne({ username: teacher });
      if (teacherUser && teacherUser.picture) cls.teacherPicture = teacherUser.picture;
    } catch (e) {
      console.warn('Could not fetch teacher picture for admin-created class:', e.message || e);
    }
  await cls.save();
  res.status(201).json({ message: "Class created successfully", cls });
  } catch (err) {
    console.error("Create class error:", err);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Admin: Delete class (admin path)
app.delete("/api/admin/classes/:id", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    await Class.deleteOne({ _id: req.params.id });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error("Delete class error:", err);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// Teacher: Get classes
app.get("/api/classes", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ teacher: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(classes);
  } catch (err) {
    console.error("Get classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Get a specific class by name
app.get("/api/classes/:className", authenticateToken, async (req, res) => {
  try {
    const className = req.params.className;
    console.log(`Looking up class by name: ${className}`);
    
    // First check access permissions based on user role
    let query = { name: className };
    if (req.user.role === "Student") {
      query.students = req.user.username;
    } else if (req.user.role === "Teacher") {
      query.teacher = req.user.username;
    }
    
    const classData = await Class.findOne(query);
    
    if (!classData) {
      console.log(`Class not found or user doesn't have access: ${className}`);
      return res.status(404).json({ error: "Class not found or you don't have access" });
    }
    
    console.log(`Found class: ${classData.name}`);
    res.json(classData);
  } catch (err) {
    console.error(`Error retrieving class: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Teacher: Create class (FRONTEND uses POST /api/classes — this auto-assigns teacher)
app.post("/api/classes", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    // NOTE: we ignore any teacher field from the client and assign the logged-in user's username
  let { name, section, code, bg, course, year } = req.body;
    // Accept either section or year
    if (!name || !(section || year)) {
      return res.status(400).json({ error: "Name and year/section are required" });
    }
    // Use year as section when section is not provided
    section = section || year;

    // Always generate server-side class code (do not accept client-supplied codes)
    try {
      code = await generateUniqueClassCode(10, 6);
    } catch (e) {
      return res.status(500).json({ error: 'Failed to generate class code' });
    }
    // teacher is from token
    const teacherUsername = req.user.username;
    const existingClass = await Class.findOne({ code: code.toUpperCase() });
    if (existingClass) {
      return res.status(400).json({ error: "Class code already exists" });
    }
  const cls = new Class({ name, section, course, year, code: code.toUpperCase(), teacher: teacherUsername, students: [], bg });
    try {
      const teacherUser = await User.findOne({ username: teacherUsername });
      if (teacherUser && teacherUser.picture) cls.teacherPicture = teacherUser.picture;
    } catch (e) {
      console.warn('Could not fetch teacher picture for class creation:', e.message || e);
    }
    await cls.save();
    res.status(201).json({ message: "Class created successfully", cls });
  } catch (err) {
    console.error("Create class error:", err);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// NEW: Allow Teacher or Admin to DELETE a class by id (frontend uses this)
app.delete("/api/classes/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    // Teachers may only delete their own classes
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to delete this class" });
    }
    await Class.deleteOne({ _id: req.params.id });
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error("Delete class error:", err);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// Teacher: Get student details for a specific class
app.get("/api/classes/:className/students", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const className = req.params.className;
    console.log(`Getting students for class: ${className}`);
    
    // First get the class to verify teacher access and get student usernames
    const classData = await Class.findOne({ 
      name: className,
      teacher: req.user.username  // Ensure teacher can only access their own classes
    });
    
    if (!classData) {
      return res.status(404).json({ error: "Class not found or you don't have access" });
    }
    
    if (!classData.students || classData.students.length === 0) {
      return res.json([]);
    }
    
    // Get full user details for all students in the class
    const students = await User.find({
      username: { $in: classData.students },
      role: "Student"
    }).select("name username email role createdAt");
    
    console.log(`Found ${students.length} students for class ${className}`);
    res.json(students);
  } catch (err) {
    console.error("Get class students error:", err);
    res.status(500).json({ error: "Failed to get class students" });
  }
});

// Student: Get people (classmates and teacher) for a class they're enrolled in
app.get("/api/classes/:className/people", authenticateToken, requireStudent, async (req, res) => {
  try {
    const className = req.params.className;
    console.log(`Getting people for class: ${className} by student: ${req.user.username}`);
    
    // First verify the student is enrolled in this class
    const classData = await Class.findOne({ 
      name: className,
      students: req.user.username  // Ensure student is enrolled in this class
    });
    
    if (!classData) {
      return res.status(404).json({ error: "Class not found or you're not enrolled" });
    }
    
    // Get teacher details
    const teacher = await User.findOne({
      username: classData.teacher,
      role: "Teacher"
    }).select("name username email role");
    
    // Get all student details (including the requesting student)
    const classmates = await User.find({
      username: { $in: classData.students },
      role: "Student"
    }).select("name username email role");
    
    const result = {
      teacher: teacher ? {
        name: teacher.name || teacher.username,
        username: teacher.username,
        email: teacher.email,
        role: teacher.role
      } : null,
      classmates: classmates.map(student => ({
        name: student.name || student.username,
        username: student.username,
        email: student.email,
        role: student.role
      }))
    };
    
    console.log(`Found teacher and ${result.classmates.length} classmates for class ${className}`);
    res.json(result);
  } catch (err) {
    console.error("Get class people error:", err);
    res.status(500).json({ error: "Failed to get class people" });
  }
});

// Student: Get classes for a specific student
app.get("/api/student-classes/:username", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Ensure student can only access their own classes
    if (req.user.username !== username) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const classes = await Class.find({ students: username });
    console.log(`Found ${classes.length} classes for student ${username}`);
    res.json(classes);
  } catch (err) {
    console.error("Get student classes error:", err);
    res.status(500).json({ error: "Failed to fetch student classes" });
  }
});

// Student: Join a class using class code
app.post("/api/join-class", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { code, student } = req.body;
    console.log(`Join class request - Code: ${code}, Student: ${student}, Authenticated user: ${req.user.username}`);
    
    if (!code || !student) {
      console.log("Missing required fields");
      return res.status(400).json({ error: "Class code and student username are required" });
    }
    
    // Ensure student can only join classes for themselves
    if (req.user.username !== student) {
      console.log(`Access denied: ${req.user.username} tried to join class for ${student}`);
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Find the class by code (case-insensitive)
    const classToJoin = await Class.findOne({ code: code.toUpperCase() });
    
    if (!classToJoin) {
      console.log(`Class not found with code: ${code.toUpperCase()}`);
      // Debug: Show all available class codes
      const allClasses = await Class.find({}, 'name code');
      console.log('Available classes:', allClasses.map(c => `${c.name} (${c.code})`));
      return res.status(404).json({ error: "Class not found. Please check the class code." });
    }
    
    // Check if student is already enrolled
    if (classToJoin.students.includes(student)) {
      console.log(`Student ${student} already enrolled in ${classToJoin.name}`);
      return res.status(400).json({ error: "You are already enrolled in this class" });
    }
    
    // Add student to the class
    classToJoin.students.push(student);
    await classToJoin.save();
    
    console.log(`Student ${student} successfully joined class ${classToJoin.name} (${code.toUpperCase()})`);
    res.json({ 
      message: "Successfully joined the class", 
      class: classToJoin 
    });
  } catch (err) {
    console.error("Join class error:", err);
    res.status(500).json({ error: "Failed to join class", details: err.message });
  }
});

// Student: Unenroll/Leave a class
app.delete("/api/leave-class/:classId", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { classId } = req.params;
    const studentUsername = req.user.username;
    
    console.log(`Student ${studentUsername} attempting to leave class ${classId}`);
    
    // Find the class
    const classToLeave = await Class.findById(classId);
    
    if (!classToLeave) {
      console.log(`Class not found with ID: ${classId}`);
      return res.status(404).json({ error: "Class not found" });
    }
    
    // Check if student is enrolled in this class
    if (!classToLeave.students.includes(studentUsername)) {
      return res.status(400).json({ error: "You are not enrolled in this class" });
    }
    
    // Remove student from the class
    classToLeave.students = classToLeave.students.filter(student => student !== studentUsername);
    await classToLeave.save();
    
    console.log(`Student ${studentUsername} successfully left class ${classToLeave.name}`);
    res.json({ 
      message: `Successfully left ${classToLeave.name}`, 
      class: classToLeave 
    });
  } catch (err) {
    console.error("Leave class error:", err);
    res.status(500).json({ error: "Failed to leave class" });
  }
});

// Teacher: Remove a student from a class
app.delete("/api/remove-student/:classId/:studentUsername", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { classId, studentUsername } = req.params;
    const teacherUsername = req.user.username;
    
    console.log(`Teacher ${teacherUsername} attempting to remove student ${studentUsername} from class ${classId}`);
    
    // Find the class
    const classData = await Class.findById(classId);
    
    if (!classData) {
      console.log(`Class not found with ID: ${classId}`);
      return res.status(404).json({ error: "Class not found" });
    }
    
    // Check if the teacher is the owner of this class (for non-admin users)
    if (req.user.role !== "Admin" && classData.teacher !== teacherUsername) {
      return res.status(403).json({ error: "You can only remove students from your own classes" });
    }
    
    // Check if student is enrolled in this class
    if (!classData.students.includes(studentUsername)) {
      return res.status(400).json({ error: "Student is not enrolled in this class" });
    }
    
    // Remove student from the class
    classData.students = classData.students.filter(student => student !== studentUsername);
    await classData.save();
    
    console.log(`Teacher ${teacherUsername} successfully removed student ${studentUsername} from class ${classData.name}`);
    res.json({ 
      message: `Successfully removed ${studentUsername} from ${classData.name}`, 
      class: classData 
    });
  } catch (err) {
    console.error("Remove student error:", err);
    res.status(500).json({ error: "Failed to remove student" });
  }
});

// Student: Get grades for a specific student
app.get("/api/student-grades/:username", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { username } = req.params;
    
    // Ensure student can only access their own grades
    if (req.user.username !== username) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    const grades = await Grade.find({ student: username });
    console.log(`Found ${grades.length} grades for student ${username}`);
    res.json(grades);
  } catch (err) {
    console.error("Get student grades error:", err);
    res.status(500).json({ error: "Failed to fetch student grades" });
  }
});

// Teacher: Get assignments
app.get("/api/assignments", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const assignments = await Assignment.find({ createdBy: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(assignments);
  } catch (err) {
    console.error("Get assignments error:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// Teacher: Create assignment
app.post("/api/assignments", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, title, description, due, status } = req.body;
    if (!className || !title || !due) {
      return res.status(400).json({ error: "Class, title, and due date are required" });
    }
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to assign to this class" });
    }
    const assignment = new Assignment({
      class: className,
      title,
      description,
      due,
      status,
      createdBy: req.user.username,
    });
    await assignment.save();
    res.status(201).json({ message: "Assignment created successfully" });
  } catch (err) {
    console.error("Create assignment error:", err);
    res.status(500).json({ error: "Failed to create assignment" });
  }
});

// Get class-scoped announcements
app.get("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, className } = req.query;
    const filter = {};
    
    if (req.user.role === "Teacher") {
      // Teachers only see their own announcements
      filter.teacher = req.user.username;
    } else if (req.user.role === "Student") {
      // Students can see announcements for classes they're enrolled in
      if (className) {
        // Check if student is enrolled in the class
        const cls = await Class.findOne({ name: className });
        if (!cls || !cls.students.includes(req.user.username)) {
          return res.status(403).json({ error: "You are not enrolled in this class" });
        }
        filter.class = className;
      } else {
        // Get all classes the student is enrolled in
        const studentClasses = await Class.find({ students: req.user.username });
        const classNames = studentClasses.map(cls => cls.name);
        filter.class = { $in: classNames };
      }
    }
    
    if (className) filter.class = className;
    
    const announcements = await Announcement.find(filter)
      .sort({ date: -1 }) // Sort by date, newest first
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(announcements);
  } catch (err) {
    console.error("Get announcements error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Teacher: Create class-scoped announcement (optionally attach examId and files)
// Changes: server will set teacher = req.user.username and date = now if not provided
app.post("/api/announcements", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    let { message, date, teacher, class: className, examId, attachments } = req.body;

    // Normalize className
    if (!message || !className) {
      return res.status(400).json({ error: "Message and class are required" });
    }

    // Use logged-in user as teacher (ignore client-supplied teacher)
    teacher = req.user.username;

    // Default date to now if not provided
    date = date ? new Date(date) : new Date();

    // Ensure class exists
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to post to this class" });
    }

    const announcement = new Announcement({ 
      message, 
      date, 
      teacher, 
      class: className, 
      examId: examId || null, 
      likes: 0,
      attachments: attachments || []
    });
    await announcement.save();
    
    // Send notifications to all students in the class
    try {
      if (cls.students && cls.students.length > 0) {
        console.log(`Sending announcement notifications to ${cls.students.length} students in class ${className}`);
        
        const notifications = cls.students.map(studentUsername => ({
          recipient: studentUsername,
          sender: req.user.username,
          type: 'announcement',
          message: `New announcement in ${className}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"}`,
          referenceId: announcement._id,
          class: className,
          read: false,
          createdAt: new Date()
        }));
        
        await Notification.insertMany(notifications);
        console.log(`✅ Announcement notifications sent to students in ${className}`);
        
        // Emit socket event to notify students in real-time
        if (req.app.io) {
          cls.students.forEach(studentUsername => {
            req.app.io.to(`user:${studentUsername}`).emit('new-notification', {
              type: 'announcement',
              message: `New announcement in ${className}: "${message.substring(0, 50)}${message.length > 50 ? '...' : ''}"}`,
              class: className,
              sender: req.user.username
            });
          });
        }
      }
    } catch (notifErr) {
      console.error('Error sending announcement notifications:', notifErr);
      // Don't fail the announcement creation if notifications fail
    }
    
    // Emit announcement via socket.io to the class
    if (req.app.io) {
      console.log(`Emitting announcement to class:${className}`);
      req.app.io.to(`class:${className}`).emit('announcement-created', announcement);
    }
    
    res.status(201).json({ message: "Announcement created successfully", announcement });
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Teacher: Get exams (optionally by class)
// Now handled by exams.js router

// Teacher: Create exam (Google Form-like)
// Now handled by exams.js router

// Teacher/Student: Get exam by id (teacher must own; student must be enrolled)
// Now handled by exams.js router

// Student: Submit exam answers; auto-score and save to grades
// Now handled by exams.js router

// Teacher: List submissions for an exam
// Now handled by exams.js router

// Common delete endpoints
app.delete("/api/announcements/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ error: "Announcement not found" });
    if (req.user.role === "Teacher" && ann.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Announcement.deleteOne({ _id: ann._id });
    res.json({ message: "Announcement deleted" });
  } catch (err) {
    console.error("Delete announcement error:", err.response?.data || err.message);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

// Delete exam endpoint now handled by exams.js router


app.delete("/api/grades/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const grade = await Grade.findById(req.params.id);
    if (!grade) return res.status(404).json({ error: "Grade not found" });
    // Teachers can delete grades for their classes only
    if (req.user.role === "Teacher") {
      const cls = await Class.findOne({ name: grade.class });
      if (!cls || cls.teacher !== req.user.username) {
        return res.status(403).json({ error: "Not authorized" });
      }
    }
    await Grade.deleteOne({ _id: grade._id });
    res.json({ message: "Grade deleted" });
  } catch (err) {
    console.error("Delete grade error:", err);
    res.status(500).json({ error: "Failed to delete grade" });
  }
});

// Teacher: Get grades
app.get("/api/grades", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ teacher: req.user.username }).select("name");
    const classNames = classes.map(cls => cls.name);
    const grades = await Grade.find({ class: { $in: classNames } })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(grades);
  } catch (err) {
    console.error("Get grades error:", err);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

// Teacher: Create grade
app.post("/api/grades", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, student, grade, feedback } = req.body;
    if (!className || !student || !grade) {
      return res.status(400).json({ error: "Class, student, and grade are required" });
    }
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to grade this class" });
    }
    const gradeEntry = new Grade({ class: className, student, grade, feedback });
    await gradeEntry.save();
    res.status(201).json({ message: "Grade assigned successfully" });
  } catch (err) {
    console.error("Create grade error:", err);
    res.status(500).json({ error: "Failed to assign grade" });
  }
});

// Teacher: Get leaderboard data (exam scores by class)
app.get("/api/leaderboard", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    // Get all classes taught by this teacher
    const classes = await Class.find({ teacher: req.user.username }).select("name section students");
    const classNames = classes.map(cls => cls.name);
    
    // Get all exams for these classes
    const exams = await Exam.find({ class: { $in: classNames } })
      .select("title class due");
    
    // Get all exam submissions for these exams
    const examIds = exams.map(exam => exam._id);
    const submissions = await ExamSubmission.find({ examId: { $in: examIds } })
      .populate('examId', 'title class due')
      .sort({ finalScore: -1, submittedAt: 1 });
    
    // Get user data for student names and sections
    const studentUsernames = [...new Set(submissions.map(sub => sub.student))];
    const users = await User.find({ username: { $in: studentUsernames } })
      .select("username email role section creditPoints");
    
    // Create user lookup map
    const userMap = {};
    users.forEach(user => {
      userMap[user.username] = user;
    });
    
    // Create a map of student to their enrolled class(es)
    const studentClassMap = {};
    classes.forEach(cls => {
      cls.students.forEach(studentUsername => {
        if (!studentClassMap[studentUsername]) {
          studentClassMap[studentUsername] = [];
        }
        studentClassMap[studentUsername].push({
          className: cls.name,
          section: cls.section || 'No Section'
        });
      });
    });
    
    // Transform submissions data for leaderboard
    const leaderboardData = submissions.map(submission => {
      const examClassName = submission.examId?.class || 'Unknown Class';
      const studentUsername = submission.student;
      
      // Find the student's enrolled class that matches the exam's class
      let studentClass = { className: examClassName, section: 'No Section' };
      const studentClasses = studentClassMap[studentUsername] || [];
      
      // Try to find the exact class the exam belongs to
      const matchingClass = studentClasses.find(sc => sc.className === examClassName);
      if (matchingClass) {
        studentClass = matchingClass;
      } else if (studentClasses.length > 0) {
        // If no exact match, use the first enrolled class
        studentClass = studentClasses[0];
      }
      
      return {
        _id: submission._id,
        student: studentUsername,
        studentEmail: userMap[studentUsername]?.email || '',
        section: studentClass.section,
        creditPoints: userMap[studentUsername]?.creditPoints || 0,
        examTitle: submission.examId?.title || 'Unknown Exam',
        className: studentClass.className,
        rawScore: submission.rawScore || 0,
        finalScore: submission.finalScore || 0,
        totalQuestions: submission.totalQuestions || 0,
        creditsUsed: submission.creditsUsed || 0,
        submittedAt: submission.submittedAt,
        examDue: submission.examId?.due || null,
        isEarly: submission.examId?.due ? new Date(submission.submittedAt) < new Date(submission.examId.due) : null,
        isLate: submission.examId?.due ? new Date(submission.submittedAt) > new Date(submission.examId.due) : null
      };
    });
    
    // Group by class and section for organized display
    const groupedData = {
      allSubmissions: leaderboardData,
      byClass: {},
      bySection: {},
      summary: {
        totalSubmissions: leaderboardData.length,
        totalStudents: studentUsernames.length,
        classes: classNames
      }
    };
    
    // Group by class
    leaderboardData.forEach(item => {
      if (!groupedData.byClass[item.className]) {
        groupedData.byClass[item.className] = [];
      }
      groupedData.byClass[item.className].push(item);
    });
    
    // Group by section
    leaderboardData.forEach(item => {
      if (!groupedData.bySection[item.section]) {
        groupedData.bySection[item.section] = [];
      }
      groupedData.bySection[item.section].push(item);
    });
    
    console.log(`Leaderboard data: ${leaderboardData.length} submissions from ${studentUsernames.length} students`);
    console.log(`Classes found: ${classNames.join(', ')}`);
    console.log(`Sections found: ${Object.keys(groupedData.bySection).join(', ')}`);
    res.json(groupedData);
    
  } catch (err) {
    console.error("Get leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

// Teacher: Delete a single exam submission from leaderboard
app.delete("/api/exam-submissions/:submissionId", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { submissionId } = req.params;
    
    // Find the submission
    const submission = await ExamSubmission.findById(submissionId).populate('examId', 'class createdBy');
    
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }
    
    // Verify teacher owns the class this exam belongs to
    const exam = submission.examId;
    if (exam && exam.createdBy !== req.user.username && req.user.role !== 'admin') {
      return res.status(403).json({ error: "You can only delete submissions from your own classes" });
    }
    
    await ExamSubmission.findByIdAndDelete(submissionId);
    console.log(`Deleted submission ${submissionId} by ${req.user.username}`);
    
    res.json({ message: "Submission deleted successfully" });
    
  } catch (err) {
    console.error("Delete submission error:", err);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

// Teacher: Delete all exam submissions for their classes
app.delete("/api/exam-submissions", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    // Get all classes taught by this teacher
    const classes = await Class.find({ teacher: req.user.username }).select("name");
    const classNames = classes.map(cls => cls.name);
    
    // Get all exams for these classes
    const exams = await Exam.find({ class: { $in: classNames } }).select("_id");
    const examIds = exams.map(exam => exam._id);
    
    // Delete all submissions for these exams
    const result = await ExamSubmission.deleteMany({ examId: { $in: examIds } });
    
    console.log(`Deleted ${result.deletedCount} submissions by teacher ${req.user.username}`);
    
    res.json({ 
      message: "All submissions deleted successfully", 
      deletedCount: result.deletedCount 
    });
    
  } catch (err) {
    console.error("Delete all submissions error:", err);
    res.status(500).json({ error: "Failed to delete submissions" });
  }
});

// Auto-cleanup: Delete exam submissions older than 24 hours (run periodically)
async function cleanupOldSubmissions() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await ExamSubmission.deleteMany({ 
      submittedAt: { $lt: twentyFourHoursAgo } 
    });
    
    if (result.deletedCount > 0) {
      console.log(`🗑️ Auto-cleanup: Deleted ${result.deletedCount} submissions older than 24 hours`);
    }
  } catch (err) {
    console.error("Auto-cleanup error:", err);
  }
}

// Run cleanup every hour
setInterval(cleanupOldSubmissions, 60 * 60 * 1000);

// Run cleanup on server start
cleanupOldSubmissions();

// Student: Get classes
app.get("/api/student/classes", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ students: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(classes);
  } catch (err) {
    console.error("Get student classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Student: Join class
app.post("/api/classes/join", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: "Class code is required" });
    }
    const cls = await Class.findOne({ code: code.toUpperCase() });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (cls.students.includes(req.user.username)) {
      return res.status(400).json({ error: "You are already enrolled in this class" });
    }
    cls.students.push(req.user.username);
    await cls.save();
    res.json({ message: "Joined class successfully" });
  } catch (err) {
    console.error("Join class error:", err);
    res.status(500).json({ error: "Failed to join class" });
  }
});

// Student: Get assignments
app.get("/api/student/assignments", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ students: req.user.username }).select("name");
    const classNames = classes.map(cls => cls.name);
    const assignments = await Assignment.find({ class: { $in: classNames }, studentUsername: { $in: [req.user.username, null] } })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(assignments);
  } catch (err) {
    console.error("Get student assignments error:", err);
    res.status(500).json({ error: "Failed to fetch assignments" });
  }
});

// Student: Submit assignment
app.put("/api/assignments/:id", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { status, submittedFile, studentUsername } = req.body;
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }
    const cls = await Class.findOne({ name: assignment.class });
    if (!cls || !cls.students.includes(req.user.username)) {
      return res.status(403).json({ error: "You are not enrolled in this class" });
    }
    assignment.status = status;
    assignment.submittedFile = submittedFile;
    assignment.studentUsername = studentUsername;
    await assignment.save();
    res.json({ message: "Assignment submitted successfully" });
  } catch (err) {
    console.error("Submit assignment error:", err);
    res.status(500).json({ error: "Failed to submit assignment" });
  }
});

// Student: Get announcements for classes the student is enrolled in (optionally filtered by class)
app.get("/api/student/announcements", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100, className } = req.query;
    const classes = await Class.find({ students: req.user.username }).select("teacher name");
    const teachers = classes.map(cls => cls.teacher);
    const classNames = classes.map(cls => cls.name);
    const filter = { teacher: { $in: teachers }, class: { $in: classNames } };
    if (className) filter.class = className;
    const announcements = await Announcement.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(announcements);
  } catch (err) {
    console.error("Get student announcements error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Student: Get exams
app.get("/api/student/exams", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ students: req.user.username }).select("teacher");
    const teachers = classes.map(cls => cls.teacher);
    const exams = await Exam.find({ createdBy: { $in: teachers } })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(exams);
  } catch (err) {
    console.error("Get student exams error:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

// Student: Get grades
app.get("/api/student/grades", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const grades = await Grade.find({ student: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(grades);
  } catch (err) {
    console.error("Get student grades error:", err);
    res.status(500).json({ error: "Failed to fetch grades" });
  }
});

// Set up models for exams routes
setupModels({
  User,
  Class,
  Grade,
  ExamSubmission
});

// Set up models for materials routes
setupMaterialsModels({
  Class
});

// Use route modules
app.use("/api", materialsRoutes);
app.use("/api", commentsRoutes);
app.use("/api", notificationsRoutes);
app.use("/api", testNotificationsRoutes);
app.use("/api", uploadRoutes);
app.use("/api", reactionsRoutes);
app.use("/api/exams", examsRoutes);

// Student: Submit exam answers
// Check if student has already submitted an exam
app.get("/api/exam-submissions/check/:examId", authenticateToken, async (req, res) => {
  try {
    const examId = req.params.examId;
    const student = req.user.username;
    
    console.log(`Checking if student ${student} has already submitted exam ${examId}`);
    
    // Check if submission exists
    const existingSubmission = await ExamSubmission.findOne({ examId, student });
    
    return res.status(200).json({ 
      hasSubmitted: !!existingSubmission,
      message: existingSubmission ? "Student has already submitted this exam" : "Student has not submitted this exam yet"
    });
  } catch (err) {
    console.error("Error checking exam submission:", err);
    return res.status(500).json({ error: "Failed to check exam submission" });
  }
});

app.post("/api/exam-submissions", authenticateToken, async (req, res) => {
  try {
    console.log("Exam submission request received");
    console.log("User:", req.user);
    console.log("Body:", req.body);
    
    const { examId, answers, useCreditPoints = false } = req.body;
    const student = req.user.username;

    // Check if student has already submitted this exam
    const existingSubmission = await ExamSubmission.findOne({ examId, student });
    if (existingSubmission) {
      console.log(`Student ${student} already submitted exam ${examId}`);
      return res.status(400).json({ error: "You have already submitted this exam" });
    }

    if (!examId || !answers) {
      console.log("Missing examId or answers");
      return res.status(400).json({ error: "Exam ID and answers are required" });
    }

    console.log("Looking for exam with ID:", examId);
    // Check if exam exists
    const exam = await Exam.findById(examId);
    if (!exam) {
      console.log("Exam not found");
      return res.status(404).json({ error: "Exam not found" });
    }

    console.log("Found exam:", exam.title);
    console.log("Exam class:", exam.class);
    console.log("Exam full object:", JSON.stringify(exam, null, 2));

    // Try multiple ways to find the class
    let cls = await Class.findOne({ name: exam.class });
    
    if (!cls && exam.class) {
      // Try finding by decoded class name in case of URL encoding issues
      const decodedClassName = decodeURIComponent(exam.class);
      cls = await Class.findOne({ name: decodedClassName });
      console.log("Tried decoded class name:", decodedClassName);
    }
    
    if (!cls) {
      // Try case-insensitive search
      cls = await Class.findOne({ name: { $regex: new RegExp(`^${exam.class}$`, 'i') } });
      console.log("Tried case-insensitive search");
    }
    
    if (!cls) {
      // List all available classes for debugging
      const allClasses = await Class.find({}, 'name');
      console.log("All available classes:", allClasses.map(c => c.name));
      
      // If we still can't find the class, let's try to match by the current URL className
      // Get the className from the student's current session or context
      console.log("Could not find class, checking student's enrolled classes...");
      const studentClasses = await Class.find({ students: student });
      console.log("Student is enrolled in:", studentClasses.map(c => c.name));
      
      // If student is only enrolled in one class, assume that's the right one
      if (studentClasses.length === 1) {
        cls = studentClasses[0];
        console.log("Using student's only enrolled class:", cls.name);
      }
    }
    
    console.log("Final class found:", cls ? cls.name : "not found");
    
    if (!cls) {
      console.log("Class not found for exam");
      return res.status(404).json({ error: "Class not found for this exam" });
    }
    
    console.log("Class students:", cls.students);
    console.log("Current student:", student);
    
    // Check if student is enrolled (case-insensitive)
    const isEnrolled = cls.students.some(s => s.toLowerCase() === student.toLowerCase());
    
    if (!isEnrolled) {
      console.log("Student not enrolled in class");
      return res.status(403).json({ error: "You are not enrolled in this class" });
    }

    // Calculate raw score
    let correctAnswers = 0;
    const totalQuestions = exam.questions.length;

    console.log("========== SCORING DETAILS ==========");
    console.log("Total questions:", totalQuestions);
    console.log("Answers submitted:", answers.length);
    console.log("Exam questions:", JSON.stringify(exam.questions, null, 2));
    
    answers.forEach(answer => {
      const question = exam.questions[answer.questionIndex];
      if (question) {
        let isCorrect = false;
        
        // Handle different question types
        if (question.type === 'multiple') {
          // For multiple choice, exact match
          isCorrect = question.correctAnswer === answer.answer;
        } else if (question.type === 'short') {
          // For short answer, case-insensitive trimmed match
          const correctAns = (question.correctAnswer || '').trim().toLowerCase();
          const studentAns = (answer.answer || '').trim().toLowerCase();
          isCorrect = correctAns === studentAns;
        } else {
          // Default: exact match
          isCorrect = question.correctAnswer === answer.answer;
        }
        
        console.log(`Question ${answer.questionIndex} (${question.type || 'unknown'}):`);
        console.log(`  Question: "${question.text}"`);
        console.log(`  Correct Answer: "${question.correctAnswer}" (type: ${typeof question.correctAnswer})`);
        console.log(`  Student Answer: "${answer.answer}" (type: ${typeof answer.answer})`);
        console.log(`  Match: ${isCorrect ? "✓ CORRECT" : "✗ WRONG"}`);
        
        if (isCorrect) {
          correctAnswers++;
        }
      } else {
        console.log(`Question ${answer.questionIndex}: NOT FOUND`);
      }
    });

    const rawScore = correctAnswers;
    console.log("Raw Score:", rawScore, "/", totalQuestions);
    console.log("====================================");
    
    // Get user for credit points management
    const user = await User.findOne({ username: student });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Store original credit points before any modifications
    const originalCreditPoints = user.creditPoints || 0;
    
    // Validate user credit points - ensure it's a valid number and initialize if needed
    if (typeof user.creditPoints !== 'number' || isNaN(user.creditPoints) || user.creditPoints === undefined) {
      console.log(`⚠️ Invalid/missing credit points for user ${student}, initializing to 0`);
      user.creditPoints = 0; // Initialize new users with 0 credit points
    }
    
    console.log(`Student ${student} has ${originalCreditPoints} credit points available`);
    console.log(`Student wants to use: ${useCreditPoints} credit points`);
    
    // Apply credit points if student chose to use them
    let creditsUsed = 0;
    let finalScore = rawScore;
    
    // useCreditPoints is now a number (how many points student wants to use)
    const requestedCredits = parseInt(useCreditPoints) || 0;
    
    if (requestedCredits > 0 && originalCreditPoints > 0) {
      const missing = Math.max(0, totalQuestions - rawScore);
      // Use the minimum of: requested credits, available credits, and missing points
      creditsUsed = Math.min(requestedCredits, originalCreditPoints, missing);
      finalScore = rawScore + creditsUsed;
      console.log(`Student requested ${requestedCredits}, using ${creditsUsed} credit points from available ${originalCreditPoints}. Final score: ${finalScore}/${totalQuestions}`);
    } else {
      console.log(`No credit points requested or available`);
    }

    // Determine early/late submission timing bonus/penalty
    const now = new Date();
    let creditDelta = 0;
    console.log(`Exam due date: ${exam.due}`);
    console.log(`Current time: ${now}`);
    console.log(`Due date type: ${typeof exam.due}`);
    
    if (exam.due) {
      const dueDate = new Date(exam.due);
      console.log(`Due date parsed: ${dueDate}`);
      console.log(`Due date is valid: ${!isNaN(dueDate.getTime())}`);
      console.log(`Is now < due? ${now < dueDate}`);
      
      // Only apply timing bonus/penalty if due date is valid
      if (!isNaN(dueDate.getTime())) {
        if (now < dueDate) {
          creditDelta = 1; // +1 for early submission (before due date)
          console.log("✅ Early submission: +1 credit point bonus");
        } else if (now > dueDate) {
          creditDelta = -2; // -2 for late submission (after due date)
          console.log("❌ Late submission: -2 credit points penalty");
        } else {
          creditDelta = 0; // No bonus/penalty for on-time submission
          console.log("⏰ On-time submission: no bonus or penalty");
        }
      } else {
        console.log("⚠️ Invalid due date format - no bonus or penalty");
        creditDelta = 0; // No bonus for invalid due date
      }
    } else {
      console.log("⚠️ No due date set for this exam - no bonus or penalty");
      creditDelta = 0; // No bonus if no due date is set
    }
    
    // Calculate final credit points: original - used + timing bonus/penalty
    const calculatedCreditPoints = originalCreditPoints - creditsUsed + creditDelta;
    const finalCreditPoints = Math.max(0, Math.min(10, calculatedCreditPoints)); // Max 10, Min 0
    
    console.log(`Credit points calculation: ${originalCreditPoints} - ${creditsUsed} + ${creditDelta} = ${calculatedCreditPoints} → ${finalCreditPoints} (min 0, max 10)`);
    
    // Update user credit points
    user.creditPoints = finalCreditPoints;
    
    console.log(`Credit points: ${originalCreditPoints} → ${finalCreditPoints} (used: ${creditsUsed}, timing: ${creditDelta > 0 ? '+' : ''}${creditDelta})`);
    
    try {
      await user.save();
      console.log("✅ User credit points saved successfully");
    } catch (saveError) {
      console.error("❌ Error saving user credit points:", saveError);
      throw saveError;
    }

    // Store actual score (not percentage)
    console.log("Score calculated:", finalScore, "/", totalQuestions);

    // Create submission
    const submission = new ExamSubmission({
      examId,
      student,
      answers,
      rawScore,
      finalScore: finalScore,
      totalQuestions: totalQuestions,
      creditsUsed,
      submittedAt: new Date()
    });

    await submission.save();
    console.log("Submission saved successfully");

    // Emit exam submission event to the class for real-time updates
    if (req.app.io) {
      console.log(`Emitting exam-submitted to class:${exam.class}`);
      req.app.io.to(`class:${exam.class}`).emit('exam-submitted', {
        examId,
        student,
        score: finalScore,
        totalQuestions: totalQuestions,
        submittedAt: new Date()
      });
    }

    // Create notification for student about successful submission
    try {
      const notification = new Notification({
        recipient: student,
        sender: 'System',
        type: 'grade',
        message: `Exam "${exam.title}" submitted successfully! Score: ${finalScore}/${totalQuestions}`,
        class: exam.class
      });
      await notification.save();
      
      // Send real-time notification to student
      if (req.app.io) {
        req.app.io.to(`user:${student}`).emit('new-notification', notification);
      }
    } catch (notificationError) {
      console.log("Notification creation failed, but continuing:", notificationError.message);
    }

    // Notify teacher about student submission
    try {
      const teacherNotification = new Notification({
        recipient: exam.createdBy,
        sender: student,
        type: 'assignment',
        message: `${student} submitted exam: "${exam.title}" - Score: ${finalScore}/${totalQuestions}`,
        referenceId: examId,
        class: exam.class
      });
      await teacherNotification.save();
      
      // Send real-time notification to teacher
      if (req.app.io) {
        req.app.io.to(`user:${exam.createdBy}`).emit('new-notification', teacherNotification);
      }
      console.log(`✅ Teacher ${exam.createdBy} notified about submission from ${student}`);
    } catch (teacherNotifError) {
      console.log("Teacher notification failed, but continuing:", teacherNotifError.message);
    }

    // Create grade entry with detailed feedback
    const feedbackText = creditsUsed > 0 
      ? `Exam: ${exam.title} (raw ${rawScore}/${totalQuestions}, +${creditsUsed} credits used, final ${finalScore}/${totalQuestions})`
      : `Exam: ${exam.title} (raw ${rawScore}/${totalQuestions}, no credits used)`;

    try {
      const gradeEntry = new Grade({
        class: exam.class,
        student: student,
        grade: `${finalScore}/${totalQuestions}`,
        feedback: feedbackText,
        submittedAt: new Date()
      });
      await gradeEntry.save();
    } catch (gradeError) {
      console.log("Grade entry creation failed, but continuing:", gradeError.message);
    }

    res.status(201).json({
      message: "Exam submitted successfully",
      score: finalScore,
      totalQuestions,
      rawScore,
      creditsUsed,
      creditPointsRemaining: user.creditPoints
    });
  } catch (err) {
    console.error("Submit exam error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
});

// Get student's submitted exams
app.get("/api/exam-submissions/student", authenticateToken, async (req, res) => {
  try {
    const student = req.user.username;
    
    const submissions = await ExamSubmission.find({ student })
      .populate('examId', 'title className due')
      .select('examId submittedAt finalScore rawScore creditsUsed')
      .sort({ submittedAt: -1 });
    
    res.json(submissions);
  } catch (err) {
    console.error("Get student submissions error:", err);
    res.status(500).json({ error: "Failed to fetch submitted exams" });
  }
});

// Get all submissions for a specific exam (for teachers)
app.get("/api/exam-submissions/exam/:examId", authenticateToken, async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Get all submissions for this exam
    const submissions = await ExamSubmission.find({ examId })
      .select('student submittedAt finalScore answers')
      .sort({ submittedAt: -1 });
    
    res.json(submissions);
  } catch (err) {
    console.error("Get exam submissions error:", err);
    res.status(500).json({ error: "Failed to fetch exam submissions" });
  }
});

// Debug endpoint to list all classes (for testing)
app.get("/api/debug/classes", async (req, res) => {
  try {
    const classes = await Class.find({}, 'name code teacher students');
    res.json({
      message: 'All classes in database',
      count: classes.length,
      classes: classes.map(c => ({
        name: c.name,
        code: c.code,
        teacher: c.teacher,
        studentCount: c.students.length
      }))
    });
  } catch (err) {
    console.error("Debug classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Create HTTP server
const httpServer = createServer(app);

// Setup Socket.io and make it globally available
global.io = setupSocketIO(httpServer);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  if (err.message.includes('CORS')) {
    res.status(403).json({ error: 'CORS policy violation' });
  } else if (err.message.includes('File type')) {
    res.status(400).json({ error: err.message });
  } else {
    res.status(500).json({ 
      error: NODE_ENV === 'development' ? err.message : 'Internal server error' 
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  httpServer.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process in production
  if (NODE_ENV !== 'production') {
    console.warn('⚠️ Unhandled rejection detected - continuing in development');
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  // In development, log and continue to allow interactive debugging and
  // uninterrupted testing (do not exit). In production, prefer to log and
  // attempt to continue as well, but alert operators.
  try {
    if (NODE_ENV === 'production') {
      console.error('⚠️ Uncaught exception in production - attempting to continue');
      // Avoid exiting here so monitoring/hosting platforms can report the issue
      // and the process can be restarted cleanly if necessary.
    } else {
      console.warn('⚠️ Uncaught exception in development - continuing (non-fatal)');
    }
  } catch (e) {
    console.error('Error handling uncaught exception:', e);
  }
});

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  // Single clear startup message so it's obvious when the backend is running
  console.warn(`Backend running on port ${PORT}`);
});
