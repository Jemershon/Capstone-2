import express from 'express';
import Exam from '../models/Exam.js';
import { authenticateToken, requireTeacherOrAdmin, requireStudent } from '../middlewares/auth.js';

// We'll import these models from server.js
let User, Class, Grade, ExamSubmission;

// Setup function to initialize models
export const setupModels = (models) => {
  User = models.User;
  Class = models.Class;
  Grade = models.Grade;
  ExamSubmission = models.ExamSubmission;
};

const router = express.Router();

// Get all exams (with optional className filter)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { className, page = 1, limit = 100 } = req.query;
    
    console.log('GET /api/exams - Request details:', { 
      user: req.user.username,
      role: req.user.role,
      params: req.query
    });
    
    // Build query based on role and parameters
    let query = {};
    
    // Filter by class name if provided - this takes precedence
    if (className) {
      console.log(`Finding exams for class: ${className}`);
      // Look for both field names that might be used in the database
      query.$or = [
        { class: className },        // Field from model definition
        { className: className }     // Alternative field name that might be used
      ];
      
      // For students, they should only see exams for classes they're enrolled in
      if (req.user.role === 'Student') {
        const cls = await Class.findOne({ name: className });
        if (!cls) {
          console.log(`Class not found: ${className}`);
          return res.status(404).json({ error: 'Class not found', className });
        }
        if (!cls.students.includes(req.user.username)) {
          console.log(`Student ${req.user.username} not enrolled in ${className}`);
          return res.status(403).json({ error: 'Not enrolled in this class' });
        }
      }
    } else if (req.user.role === 'Teacher') {
      // If no class filter, for teachers show their own exams across all classes
      console.log(`Finding exams created by teacher: ${req.user.username}`);
      query.createdBy = req.user.username;
    }
    
    console.log('Final query:', JSON.stringify(query));
    
    const exams = await Exam.find(query)
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });
    
    console.log(`Found ${exams.length} exams`);
    res.json(exams);
  } catch (err) {
    console.error('Error fetching exams:', err);
    res.status(500).json({ 
      error: 'Failed to fetch exams',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// Get a specific exam by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    res.json(exam);
  } catch (err) {
    console.error('Error fetching exam:', err);
    res.status(500).json({ error: 'Failed to fetch exam' });
  }
});

// Create a new exam
router.post('/', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    console.log('POST /api/exams - Request received:', {
      user: req.user.username,
      role: req.user.role,
      body: req.body
    });
    
    const { title, description, class: className, questions, createdBy } = req.body;
    
    if (!title) {
      console.log('Validation error: Title is required');
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!className) {
      console.log('Validation error: Class name is required');
      return res.status(400).json({ error: 'Class name is required' });
    }
    
    if (!questions || questions.length === 0) {
      console.log('Validation error: At least one question is required');
      return res.status(400).json({ error: 'At least one question is required' });
    }
    
    console.log(`Creating exam "${title}" for class "${className}"`);
    
    const exam = new Exam({
      title,
      description,
      class: className,
      questions,
      createdBy: createdBy || req.user.username,
    });
    
    await exam.save();
    console.log(`Exam created successfully with ID: ${exam._id}`);
    
    res.status(201).json({ message: 'Exam created successfully', exam });
  } catch (err) {
    console.error('Error creating exam:', err);
    res.status(500).json({ 
      error: 'Failed to create exam',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// Update an exam
router.put('/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    console.log('PUT /api/exams/:id - Request received:', {
      user: req.user.username,
      role: req.user.role,
      examId: req.params.id
    });
    
    const { title, description, questions } = req.body;
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      console.log('Exam not found:', req.params.id);
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Only allow updating by the creator
    if (exam.createdBy !== req.user.username && req.user.role !== 'Admin') {
      console.log('Authorization denied for user:', req.user.username);
      return res.status(403).json({ error: 'Not authorized to update this exam' });
    }
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!questions || questions.length === 0) {
      return res.status(400).json({ error: 'At least one question is required' });
    }
    
    // Update the exam fields
    exam.title = title;
    exam.description = description;
    exam.questions = questions;
    
    // Keep the class field as is - don't change it during updates
    // This prevents issues if the frontend sends a different value
    
    // Save changes
    await exam.save();
    console.log(`Exam ${req.params.id} updated successfully`);
    
    // Emit socket event for real-time updates
    // This will be picked up by connected clients
    if (req.app.io) {
      req.app.io.to(exam.class).emit('exam-updated', exam);
    }
    
    res.json({ message: 'Exam updated successfully', exam });
  } catch (err) {
    console.error('Error updating exam:', err);
    res.status(500).json({ 
      error: 'Failed to update exam',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// Delete an exam
router.delete('/:id', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    console.log('DELETE /api/exams/:id - Request received:', {
      user: req.user.username,
      role: req.user.role,
      examId: req.params.id
    });
    
    const exam = await Exam.findById(req.params.id);
    
    if (!exam) {
      console.log('Exam not found:', req.params.id);
      return res.status(404).json({ error: 'Exam not found' });
    }
    
    // Only allow deletion by the creator or admin
    if (exam.createdBy !== req.user.username && req.user.role !== 'Admin') {
      console.log('Authorization denied for user:', req.user.username);
      return res.status(403).json({ error: 'Not authorized to delete this exam' });
    }
    
    // Store className before deleting for socket notifications
    const className = exam.class;
    
    // Delete the exam
    await exam.deleteOne();
    console.log(`Exam ${req.params.id} deleted successfully`);
    
    // Emit socket event for real-time updates
    // This will be picked up by connected clients
    if (req.app.io) {
      // Emit to the class room that an exam was deleted
      req.app.io.to(className).emit('exam-deleted', { 
        examId: req.params.id,
        message: `Assignment "${exam.title}" was deleted by ${req.user.username}`
      });
    }
    
    res.json({ 
      message: 'Exam deleted successfully',
      examId: req.params.id
    });
  } catch (err) {
    console.error('Error deleting exam:', err);
    res.status(500).json({ 
      error: 'Failed to delete exam',
      message: err.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  }
});

// Student: Submit exam answers
router.post('/:id/submit', authenticateToken, requireStudent, async (req, res) => {
  try {
    const { answers } = req.body; // [{questionIndex, answer}]
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    const cls = await Class.findOne({ name: exam.class });
    if (!cls || !cls.students.includes(req.user.username)) {
      return res.status(403).json({ error: 'Not enrolled in this class' });
    }
    
    // Prevent multiple submissions
    const existing = await ExamSubmission.findOne({ examId: exam._id, student: req.user.username });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted this exam' });
    }
    
    // Score raw
    let rawScore = 0;
    const total = exam.questions.length;
    for (const ans of answers || []) {
      const q = exam.questions[ans.questionIndex];
      if (!q) continue;
      if (q.type === 'multiple' && q.correctAnswer && ans.answer === q.correctAnswer) rawScore++;
      if (q.type === 'short' && q.correctAnswer && ans.answer?.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()) rawScore++;
    }
    
    // Determine early/late and adjust credit points
    const now = new Date();
    const user = await User.findOne({ username: req.user.username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
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

    const submission = new ExamSubmission({ 
      examId: exam._id, 
      student: req.user.username, 
      answers, 
      rawScore, 
      finalScore, 
      creditsUsed: creditsToUse 
    });
    await submission.save();
    
    // Create grade entry for this exam with breakdown
    const gradeEntry = new Grade({ 
      class: exam.class, 
      student: req.user.username, 
      grade: `${finalScore}/${total}`, 
      feedback: `Exam: ${exam.title} (raw ${rawScore}/${total}, +${creditsToUse} credits)` 
    });
    await gradeEntry.save();
    
    res.json({ 
      message: 'Submission recorded', 
      rawScore, 
      finalScore, 
      total, 
      creditsUsed: creditsToUse, 
      creditBalance: user.creditPoints 
    });
  } catch (err) {
    console.error('Submit exam error:', err);
    res.status(500).json({ error: 'Failed to submit exam' });
  }
});

// Teacher: List submissions for an exam
router.get('/:id/submissions', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    
    if (req.user.role === 'Teacher' && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    const submissions = await ExamSubmission.find({ examId: exam._id });
    res.json(submissions);
  } catch (err) {
    console.error('List submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

export default router;