import dotenv from "dotenv";
dotenv.config();
import express from "express";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import cors from "cors";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

// Fix __dirname for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:3000" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// MongoDB Connection
mongoose.connect("mongodb://localhost:27017/notetify", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
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
});

const ClassSchema = new mongoose.Schema({
  name: String,
  section: String,
  code: { type: String, unique: true },
  teacher: String,
  students: [{ type: String }],
  bg: { type: String, default: "#FFF0D8" },
});

const AssignmentSchema = new mongoose.Schema({
  class: String,
  title: String,
  description: String,
  due: Date,
  status: { type: String, default: "Pending" },
  createdBy: String,
  submittedFile: String,
  studentUsername: String,
});

const AnnouncementSchema = new mongoose.Schema({
  teacher: String,
  date: Date,
  message: String,
  likes: { type: Number, default: 0 },
});

const ExamSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: [{ text: String, type: String, options: [String] }],
  createdBy: String,
});

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
const Grade = mongoose.model("Grade", GradeSchema);

// Middleware
const authenticateToken = async (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    await User.insertMany(users);
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
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET, {
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
      return res.status(403).json({ error: "Teachers can only create classes for themselves" });
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

// Teacher: Get announcements
app.get("/api/announcements", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const announcements = await Announcement.find({ teacher: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(announcements);
  } catch (err) {
    console.error("Get announcements error:", err);
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

// Teacher: Create announcement
app.post("/api/announcements", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { message, date, teacher } = req.body;
    if (!message || !date || !teacher) {
      return res.status(400).json({ error: "Message, date, and teacher are required" });
    }
    if (req.user.role === "Teacher" && req.user.username !== teacher) {
      return res.status(403).json({ error: "You can only post announcements as yourself" });
    }
    const announcement = new Announcement({ message, date, teacher, likes: 0 });
    await announcement.save();
    res.status(201).json({ message: "Announcement created successfully" });
  } catch (err) {
    console.error("Create announcement error:", err);
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

// Teacher: Get exams
app.get("/api/exams", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const exams = await Exam.find({ createdBy: req.user.username })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(exams);
  } catch (err) {
    console.error("Get exams error:", err);
    res.status(500).json({ error: "Failed to fetch exams" });
  }
});

// Teacher: Create exam
app.post("/api/exams", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, questions, createdBy } = req.body;
    if (!title || !questions || !createdBy) {
      return res.status(400).json({ error: "Title, questions, and creator are required" });
    }
    if (req.user.role === "Teacher" && req.user.username !== createdBy) {
      return res.status(403).json({ error: "You can only create exams as yourself" });
    }
    const exam = new Exam({ title, description, questions, createdBy });
    await exam.save();
    res.status(201).json({ message: "Exam created successfully" });
  } catch (err) {
    console.error("Create exam error:", err);
    res.status(500).json({ error: "Failed to create exam" });
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

// Student: Get announcements
app.get("/api/student/announcements", authenticateToken, requireStudent, async (req, res) => {
  try {
    const { page = 1, limit = 100 } = req.query;
    const classes = await Class.find({ students: req.user.username }).select("teacher");
    const teachers = classes.map(cls => cls.teacher);
    const announcements = await Announcement.find({ teacher: { $in: teachers } })
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

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));