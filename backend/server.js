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

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = await User.findOne({ username });
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
app.use("/api/exams", examsRoutes);

// Student: Submit exam answers
app.post("/api/exam-submissions", authenticateToken, async (req, res) => {
  try {
    console.log("Exam submission request received");
    console.log("User:", req.user);
    console.log("Body:", req.body);
    
    const { examId, answers } = req.body;
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

    // Calculate score
    let correctAnswers = 0;
    const totalQuestions = exam.questions.length;

    answers.forEach(answer => {
      const question = exam.questions[answer.questionIndex];
      if (question && question.correctAnswer === answer.answer) {
        correctAnswers++;
      }
    });

    const rawScore = correctAnswers;
    const finalScore = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    console.log("Score calculated:", finalScore);

    // Create submission
    const submission = new ExamSubmission({
      examId,
      student,
      answers,
      rawScore,
      finalScore,
      submittedAt: new Date()
    });

    await submission.save();
    console.log("Submission saved successfully");

    res.status(201).json({
      message: "Exam submitted successfully",
      score: finalScore,
      correctAnswers,
      totalQuestions
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
});
