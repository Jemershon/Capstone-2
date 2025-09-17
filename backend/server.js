import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.CORS_ORIGIN || "http://localhost:5173" }));
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use("/uploads", express.static(uploadsDir));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/notetify", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) return cb(null, true);
    cb(new Error("Only JPEG, PNG, or PDF files are allowed"));
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

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
    due: Date,
    status: { type: String, default: "Pending" },
    createdBy: String,
    submittedFile: String,
    studentUsername: String,
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
  },
  { timestamps: true }
);

const ExamSchema = new mongoose.Schema(
  {
    title: String,
    description: String,
    class: String,
    due: Date,
    questions: [
      {
        text: { type: String, required: true },
        type: { type: String, enum: ["short", "multiple"], default: "short" },
        options: { type: [String], default: [] },
        correctAnswer: { type: String, default: "" },
      },
    ],
    createdBy: String,
  },
  { timestamps: true }
);

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
const Exam = mongoose.model("Exam", ExamSchema);
const ExamSubmission = mongoose.model("ExamSubmission", ExamSubmissionSchema);
const Grade = mongoose.model("Grade", GradeSchema);

// Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "devsecret123");
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: "Invalid token" });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== "Admin") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

const requireTeacherOrAdmin = (req, res, next) => {
  if (req.user.role !== "Teacher" && req.user.role !== "Admin") {
    return res.status(403).json({ error: "Teacher or Admin access required" });
  }
  next();
};

const requireStudent = (req, res, next) => {
  if (req.user.role !== "Student") {
    return res.status(403).json({ error: "Student access required" });
  }
  next();
};

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
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || "devsecret123", {
      expiresIn: "1h",
    });
    res.json({ token, user: { role: user.role, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
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

// Admin/Teacher: Create class
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

// Admin: Delete class
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

// Teacher: Create class
app.post("/api/classes", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, section, code, teacher, bg } = req.body;
    if (!name || !section || !code || !teacher) {
      return res.status(400).json({ error: "All fields are required" });
    }
    if (req.user.role === "Teacher" && req.user.username !== teacher) {
      return res.status(403).json({ error: "Teachers can only create classes for themselves. Use your username: " + req.user.username });
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

// Teacher: Get class-scoped announcements
app.get("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, className } = req.query;
    const filter = { teacher: req.user.username };
    if (className) filter.class = className;
    const announcements = await Announcement.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(announcements);
  } catch (err) {
    console.error("Get announcements error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Teacher: Create class-scoped announcement (optionally attach examId)
app.post("/api/announcements", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { message, date, teacher, class: className, examId } = req.body;
    if (!message || !date || !teacher || !className) {
      return res.status(400).json({ error: "Message, date, teacher, and class are required" });
    }
    if (req.user.role === "Teacher" && req.user.username !== teacher) {
      return res.status(403).json({ error: "You can only post announcements as yourself" });
    }
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to post to this class" });
    }
    const announcement = new Announcement({ message, date, teacher, class: className, examId: examId || null, likes: 0 });
    await announcement.save();
    res.status(201).json({ message: "Announcement created successfully", announcement });
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Teacher: Get exams (optionally by class)
app.get("/api/exams", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100, className } = req.query;
    const filter = { createdBy: req.user.username };
    if (className) filter.class = className;
    const exams = await Exam.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(exams);
  } catch (err) {
    console.error("Get exams error:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

// Teacher: Create exam (Google Form-like)
app.post("/api/exams", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, questions, createdBy, class: className, due } = req.body;
    if (!title || !questions || !createdBy || !className) {
      return res.status(400).json({ error: "Title, questions, class, and creator are required" });
    }
    if (req.user.role === "Teacher" && req.user.username !== createdBy) {
      return res.status(403).json({ error: "You can only create exams as yourself" });
    }
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to create exams for this class" });
    }
    const exam = new Exam({ title, description, class: className, due: due ? new Date(due) : null, questions, createdBy });
    await exam.save();
    res.status(201).json({ message: "Exam created successfully", exam });
  } catch (err) {
    console.error("Create exam error:", err);
    res.status(500).json({ error: "Failed to create exam" });
  }
});

// Teacher/Student: Get exam by id (teacher must own; student must be enrolled)
app.get("/api/exams/:id", authenticateToken, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    // Teacher can view own exam
    if (req.user.role === "Teacher" && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to view this exam" });
    }
    if (req.user.role === "Student") {
      const cls = await Class.findOne({ name: exam.class });
      if (!cls || !cls.students.includes(req.user.username)) {
        return res.status(403).json({ error: "Not enrolled in this class" });
      }
    }
    res.json(exam);
  } catch (err) {
    console.error("Get exam by id error:", err);
    res.status(500).json({ error: "Failed to fetch exam" });
  }
});

// Student: Submit exam answers; auto-score and save to grades
app.post("/api/exams/:id/submit", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { answers } = req.body; // [{questionIndex, answer}]
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    const cls = await Class.findOne({ name: exam.class });
    if (!cls || !cls.students.includes(req.user.username)) {
      return res.status(403).json({ error: "Not enrolled in this class" });
    }
    // Prevent multiple submissions
    const existing = await ExamSubmission.findOne({ examId: exam._id, student: req.user.username });
    if (existing) {
      return res.status(400).json({ error: "You have already submitted this exam" });
    }
    // Score raw
    let rawScore = 0;
    const total = exam.questions.length;
    for (const ans of answers || []) {
      const q = exam.questions[ans.questionIndex];
      if (!q) continue;
      if (q.type === "multiple" && q.correctAnswer && ans.answer === q.correctAnswer) rawScore++;
      if (q.type === "short" && q.correctAnswer && ans.answer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) rawScore++;
    }
    // Determine early/late and adjust credit points
    const now = new Date();
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: "User not found" });
    let creditDelta = 0;
    if (exam.due) {
      if (now < new Date(exam.due)) creditDelta = 1; else creditDelta = -2;
    }
    user.creditPoints = Math.max(0, (user.creditPoints || 0) + creditDelta);
    // Fill missing points using available credits
    const missing = Math.max(0, total - rawScore);
    const creditsToUse = Math.min(user.creditPoints, missing);
    const finalScore = rawScore + creditsToUse;
    user.creditPoints = Math.max(0, user.creditPoints - creditsToUse);
    await user.save();

    const submission = new ExamSubmission({ examId: exam._id, student: req.user.username, answers, rawScore, finalScore, creditsUsed: creditsToUse });
    await submission.save();
    // Create grade entry for this exam with breakdown
    const gradeEntry = new Grade({ class: exam.class, student: req.user.username, grade: `${finalScore}/${total}`, feedback: `Exam: ${exam.title} (raw ${rawScore}/${total}, +${creditsToUse} credits)` });
    await gradeEntry.save();
    res.json({ message: "Submission recorded", rawScore, finalScore, total, creditsUsed: creditsToUse, creditBalance: user.creditPoints });
  } catch (err) {
    console.error("Submit exam error:", err);
    res.status(500).json({ error: "Failed to submit exam" });
  }
});

// Teacher: List submissions for an exam
app.get("/api/exams/:id/submissions", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    if (req.user.role === "Teacher" && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: "Not authorized" });
    }
    const submissions = await ExamSubmission.find({ examId: exam._id });
    res.json(submissions);
  } catch (err) {
    console.error("List submissions error:", err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

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
    console.error("Delete announcement error:", err);
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

app.delete("/api/exams/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: "Exam not found" });
    if (req.user.role === "Teacher" && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: "Not authorized" });
    }
    await Exam.deleteOne({ _id: exam._id });
    await ExamSubmission.deleteMany({ examId: exam._id });
    res.json({ message: "Exam and submissions deleted" });
  } catch (err) {
    console.error("Delete exam error:", err);
    res.status(500).json({ error: "Failed to delete exam" });
  }
});

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

// Student: Upload assignment
app.post("/api/assignments/upload", authenticateToken, requireStudent, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    res.json({ filename: req.file.filename });
  } catch (err) {
    console.error("Upload assignment error:", err);
    res.status(500).json({ error: "Failed to upload assignment" });
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

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({ message: "Backend is working", timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`JWT_SECRET: ${process.env.JWT_SECRET ? 'Set' : 'Not set'}`);
  console.log(`MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/notetify'}`);
});