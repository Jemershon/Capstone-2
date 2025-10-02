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
import materialsRoutes from "./routes/materials.js";
import commentsRoutes from "./routes/comments.js";
import notificationsRoutes from "./routes/notifications.js";
import uploadRoutes from "./routes/upload.js";
import examsRoutes, { setupModels } from "./routes/exams.js";
import reactionsRoutes from "./routes/reactions.js";
import Exam from "./models/Exam.js";

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
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:5173";

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
        "https://capstone-2-ten-pied.vercel.app",
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

// Static file serving (only for development)
if (NODE_ENV === 'development') {
  const uploadsDir = path.join(__dirname, "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.use("/uploads", express.static(uploadsDir));
  console.log("ℹ️ Serving static files locally (development mode)");
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
  role: { type: String, enum: ["Student", "Teacher", "Admin"], default: "Student" },
  creditPoints: { type: Number, default: 0 },
});

const ClassSchema = new mongoose.Schema({
  name: String,
  section: String,
  code: { type: String, unique: true },
  teacher: String,
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
        status: "Pending",
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
    if (!name || !username || !email || !password || !["Student", "Teacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid input data" });
    }
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
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
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    
    // If user doesn't have createdAt (legacy user), add it
    if (!user.createdAt) {
      user.createdAt = user._id.getTimestamp(); // Use ObjectId timestamp as fallback
      await user.save();
    }
    
    res.json(user);
  } catch (err) {
    console.error("Profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

// Admin: Get all users
app.get("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const users = await User.find()
      .select("-password")
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(users);
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Admin: Create user
app.post("/api/admin/users", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !email || !password || !["Student", "Teacher", "Admin"].includes(role)) {
      return res.status(400).json({ error: "Invalid input data" });
    }
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword, role });
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
    const { name, section, code, teacher, bg } = req.body;
    if (!name || !section || !code || !teacher) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existingClass = await Class.findOne({ code });
    if (existingClass) {
      return res.status(400).json({ error: "Class code already exists" });
    }
    const cls = new Class({ name, section, code: code.toUpperCase(), teacher, students: [], bg });
    await cls.save();
    res.status(201).json({ message: "Class created successfully" });
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
    const { name, section, code, bg } = req.body;
    if (!name || !section || !code) {
      return res.status(400).json({ error: "All fields are required" });
    }
    // teacher is from token
    const teacherUsername = req.user.username;
    const existingClass = await Class.findOne({ code: code.toUpperCase() });
    if (existingClass) {
      return res.status(400).json({ error: "Class code already exists" });
    }
    const cls = new Class({ name, section, code: code.toUpperCase(), teacher: teacherUsername, students: [], bg });
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
    const classes = await Class.find({ teacher: req.user.username }).select("name");
    const classNames = classes.map(cls => cls.name);
    
    // Get all exams for these classes
    const exams = await Exam.find({ className: { $in: classNames } })
      .select("title className due");
    
    // Get all exam submissions for these exams
    const examIds = exams.map(exam => exam._id);
    const submissions = await ExamSubmission.find({ examId: { $in: examIds } })
      .populate('examId', 'title className due')
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
    
    // Transform submissions data for leaderboard
    const leaderboardData = submissions.map(submission => ({
      _id: submission._id,
      student: submission.student,
      studentEmail: userMap[submission.student]?.email || '',
      section: userMap[submission.student]?.section || 'No Section',
      creditPoints: userMap[submission.student]?.creditPoints || 0,
      examTitle: submission.examId?.title || 'Unknown Exam',
      className: submission.examId?.className || 'Unknown Class',
      rawScore: submission.rawScore || 0,
      finalScore: submission.finalScore || 0,
      creditsUsed: submission.creditsUsed || 0,
      submittedAt: submission.submittedAt,
      examDue: submission.examId?.due || null,
      isEarly: submission.examId?.due ? new Date(submission.submittedAt) < new Date(submission.examId.due) : null,
      isLate: submission.examId?.due ? new Date(submission.submittedAt) > new Date(submission.examId.due) : null
    }));
    
    // Group by class and section for organized display
    const groupedData = {
      allSubmissions: leaderboardData,
      byClass: {},
      bySection: {},
      summary: {
        totalSubmissions: leaderboardData.length,
        totalStudents: studentUsernames.length,
        classes: classNames,
        topPerformers: leaderboardData.slice(0, 10)
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
    res.json(groupedData);
    
  } catch (err) {
    console.error("Get leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard data" });
  }
});

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

// Use route modules
app.use("/api", materialsRoutes);
app.use("/api", commentsRoutes);
app.use("/api", notificationsRoutes);
app.use("/api", uploadRoutes);
app.use("/api", reactionsRoutes);
app.use("/api/exams", examsRoutes);

// Student: Submit exam answers
app.post("/api/exam-submissions", authenticateToken, async (req, res) => {
  try {
    console.log("Exam submission request received");
    console.log("User:", req.user);
    console.log("Body:", req.body);
    
    const { examId, answers, useCreditPoints = false } = req.body;
    const student = req.user.username;

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
    console.log("Exam className:", exam.className);
    console.log("Exam full object:", JSON.stringify(exam, null, 2));

    // Try multiple ways to find the class
    let cls = await Class.findOne({ name: exam.className });
    
    if (!cls && exam.className) {
      // Try finding by decoded class name in case of URL encoding issues
      const decodedClassName = decodeURIComponent(exam.className);
      cls = await Class.findOne({ name: decodedClassName });
      console.log("Tried decoded class name:", decodedClassName);
    }
    
    if (!cls) {
      // Try case-insensitive search
      cls = await Class.findOne({ name: { $regex: new RegExp(`^${exam.className}$`, 'i') } });
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

    // Check if student has already submitted this exam
    const existingSubmission = await ExamSubmission.findOne({ examId, student });
    if (existingSubmission) {
      console.log("Exam already submitted");
      return res.status(400).json({ error: "You have already submitted this exam" });
    }

    // Calculate raw score
    let correctAnswers = 0;
    const totalQuestions = exam.questions.length;

    answers.forEach(answer => {
      const question = exam.questions[answer.questionIndex];
      if (question && question.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    });

    const rawScore = correctAnswers;
    
    // Get user for credit points management
    const user = await User.findOne({ username: student });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Store original credit points before any modifications
    const originalCreditPoints = user.creditPoints || 0;
    
    // Validate user credit points - ensure it's a valid number and initialize if needed
    if (typeof user.creditPoints !== 'number' || isNaN(user.creditPoints) || user.creditPoints === undefined) {
      console.log(`⚠️ Invalid/missing credit points for user ${student}, initializing to 5`);
      user.creditPoints = 5; // Initialize new users with 5 credit points
    }
    
    console.log(`Student ${student} has ${originalCreditPoints} credit points available`);
    
    // Apply credit points if student chose to use them (from ORIGINAL amount)
    let creditsUsed = 0;
    let finalScore = rawScore;
    
    if (useCreditPoints && originalCreditPoints > 0) {
      const missing = Math.max(0, totalQuestions - rawScore);
      creditsUsed = Math.min(originalCreditPoints, missing);
      finalScore = rawScore + creditsUsed;
      console.log(`Used ${creditsUsed} credit points from original ${originalCreditPoints}. Final score: ${finalScore}/${totalQuestions}`);
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
          creditDelta = 1; // +1 for early submission
          console.log("✅ Early submission: +1 credit point bonus");
        } else {
          creditDelta = -2; // -2 for late submission
          console.log("❌ Late submission: -2 credit points penalty");
        }
      } else {
        console.log("⚠️ Invalid due date format - giving +1 completion bonus instead");
        creditDelta = 1; // +1 for completing exam even with invalid due date
      }
    } else {
      console.log("⚠️ No due date set for this exam - giving +1 completion bonus");
      creditDelta = 1; // +1 for completing any exam (base reward)
    }
    
    // Calculate final credit points: original - used + timing bonus/penalty
    const calculatedCreditPoints = originalCreditPoints - creditsUsed + creditDelta;
    const finalCreditPoints = Math.max(0, calculatedCreditPoints);
    
    console.log(`Credit points calculation: ${originalCreditPoints} - ${creditsUsed} + ${creditDelta} = ${calculatedCreditPoints} → ${finalCreditPoints} (min 0)`);
    
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

    // Convert to percentage
    const finalScorePercentage = totalQuestions > 0 ? Math.round((finalScore / totalQuestions) * 100) : 0;

    console.log("Score calculated:", finalScorePercentage);

    // Create submission
    const submission = new ExamSubmission({
      examId,
      student,
      answers,
      rawScore,
      finalScore: finalScorePercentage,
      creditsUsed,
      submittedAt: new Date()
    });

    await submission.save();
    console.log("Submission saved successfully");

    // Create grade entry with detailed feedback
    const feedbackText = creditsUsed > 0 
      ? `Exam: ${exam.title} (raw ${rawScore}/${totalQuestions}, +${creditsUsed} credits used, final ${finalScore}/${totalQuestions})`
      : `Exam: ${exam.title} (raw ${rawScore}/${totalQuestions}, no credits used)`;

    try {
      const gradeEntry = new Grade({
        class: exam.className,
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
      score: finalScorePercentage,
      correctAnswers: finalScore,
      totalQuestions,
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
    
    const submissions = await ExamSubmission.find({ student }).select('examId submittedAt finalScore');
    
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

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working", timestamp: new Date().toISOString() });
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

// Start server
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log(`💾 Database: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
  console.log(`🔧 File Storage: ${NODE_ENV === 'production' ? 'Cloudinary (Cloud)' : 'Local Filesystem'}`);
  console.log(`🌐 CORS Origin: ${CORS_ORIGIN}`);
  console.log(`📡 WebSocket server initialized`);
  console.log(`🔄 Restarting after MongoDB IP whitelist update`);
});
