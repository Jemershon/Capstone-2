import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import multer from 'multer';

const app = express();
app.use(cors());
app.use(express.json());

// --- MongoDB Connection Setup ---
mongoose.connect('mongodb://localhost:27017/notetify', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('✅ MongoDB connected to notetify database'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  name: String,
  username: { type: String, unique: true },
  password: String,
  role: String,
});

const ClassSchema = new mongoose.Schema({
  name: String,
  teacher: String,
  code: String,
  section: String,
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // track student IDs
  bg: String,
});

const AssignmentSchema = new mongoose.Schema({
  class: String,
  title: String,
  description: String,
  status: String,
  submittedFile: String,
  due: String,
  studentUsername: String, // ✅ changed from studentEmail
});

const AnnouncementSchema = new mongoose.Schema({
  teacher: String,
  date: String,
  message: String,
  likes: Number,
  likedByMe: Boolean,
  saved: Boolean,
});

const ExamSchema = new mongoose.Schema({
  title: String,
  description: String,
  questions: Array,
  createdBy: String,
});

const GradeSchema = new mongoose.Schema({
  class: String,
  student: String,
  grade: String,
  feedback: String,
});

const User = mongoose.model('User', UserSchema);
const Class = mongoose.model('Class', ClassSchema);
const Assignment = mongoose.model('Assignment', AssignmentSchema);
const Announcement = mongoose.model('Announcement', AnnouncementSchema);
const Exam = mongoose.model('Exam', ExamSchema);
const Grade = mongoose.model('Grade', GradeSchema);

// --- Multer for file uploads ---
const upload = multer({ dest: 'uploads/' });

// --- Auth Middleware ---
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, 'secret');
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// --- Auth Endpoints ---
app.post('/api/register', async (req, res) => {
  console.log(req.body); // Add this line
  const { name, username, password, role } = req.body;
  if (!name || !username || !password || !role) return res.status(400).json({ error: 'Missing fields' });
  const hash = await bcrypt.hash(password, 10);
  try {
    const user = await User.create({ name, username, password: hash, role });
    res.json({ success: true, user: { name, username, role } });
  } catch (e) {
    res.status(400).json({ error: 'Username already exists' });
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: 'Invalid username or password' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: 'Invalid username or password' });
  const token = jwt.sign({ id: user._id, role: user.role }, 'secret');
  res.json({ success: true, token, user: { name: user.name, username: user.username, role: user.role } });
});

// --- User Profile ---
app.get('/api/profile', auth, async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ name: user.name, username: user.username, role: user.role });
});

// --- Classes ---
app.get('/api/classes', async (req, res) => {
  const classes = await Class.find();
  res.json(classes);
});

app.post('/api/classes', auth, async (req, res) => {
  const cls = await Class.create(req.body);
  res.json(cls);
});

app.post('/api/classes/join', auth, async (req, res) => {
  const { code } = req.body;
  const cls = await Class.findOne({ code });
  if (!cls) return res.status(404).json({ error: "Class not found" });

  // Prevent duplicate join
  if (cls.students.includes(req.user.id)) {
    return res.status(400).json({ error: "Already joined this class" });
  }

  // Add student to class
  cls.students.push(req.user.id);
  await cls.save();

  res.json({ success: true, class: cls });
});

// NEW: Get students in a class
app.get('/api/classes/:id/students', auth, async (req, res) => {
  const cls = await Class.findById(req.params.id).populate("students", "name username role");
  if (!cls) return res.status(404).json({ error: "Class not found" });
  res.json(cls.students);
});

// --- Assignments ---
app.get('/api/assignments', async (req, res) => {
  const assignments = await Assignment.find();
  res.json(assignments);
});

app.post('/api/assignments', auth, async (req, res) => {
  const assignment = await Assignment.create(req.body);
  res.json(assignment);
});

app.put('/api/assignments/:id', auth, async (req, res) => {
  const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(assignment);
});

app.post('/api/assignments/upload', upload.single('file'), (req, res) => {
  res.json({ filename: req.file.filename, originalname: req.file.originalname });
});

// --- Announcements ---
app.get('/api/announcements', async (req, res) => {
  const announcements = await Announcement.find();
  res.json(announcements);
});

app.post('/api/announcements', auth, async (req, res) => {
  const announcement = await Announcement.create(req.body);
  res.json(announcement);
});

// --- Exams ---
app.get('/api/exams', async (req, res) => {
  const exams = await Exam.find();
  res.json(exams);
});

app.post('/api/exams', auth, async (req, res) => {
  const exam = await Exam.create(req.body);
  res.json(exam);
});

// --- Grades ---
app.get('/api/grades', async (req, res) => {
  const grades = await Grade.find();
  res.json(grades);
});

app.post('/api/grades', auth, async (req, res) => {
  const grade = await Grade.create(req.body);
  res.json(grade);
});

// --- Admin Dashboard ---
app.get('/api/admin/classes', async (req, res) => {
  const classes = await Class.find();
  res.json(classes);
});

app.get('/api/admin/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

// --- Start server ---
app.listen(4000, () => console.log('Server running on http://localhost:4000'));
