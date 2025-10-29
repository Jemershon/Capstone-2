import express from 'express';
import Exam from '../models/Exam.js';
import Notification from '../models/Notification.js';
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

// Teacher: Grade a manual exam submission
router.post('/manual/:examId/submissions/:submissionId/grade', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!exam.manualGrading) return res.status(400).json({ error: 'Exam is not set for manual grading' });
    if (req.user.role === 'Teacher' && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { finalScore, feedback } = req.body;
    if (typeof finalScore !== 'number') return res.status(400).json({ error: 'finalScore must be a number' });
  const submission = await ExamSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    submission.finalScore = finalScore;
    submission.feedback = feedback || '';
    submission.gradedAt = new Date();
    // Do NOT create Grade entry yet; teacher must 'return' the grade to make it visible to students
    // returned remains false until the teacher explicitly returns the grade
    await submission.save();
    res.json({ message: 'Grade saved (not returned)', finalScore, feedback });
  } catch (err) {
    console.error('Error grading manual exam submission:', err);
    res.status(500).json({ error: 'Failed to grade manual exam submission' });
  }
});
// Teacher: Get all submissions for a manual grading exam (with student answers and correct answers)
router.get('/manual/:examId/submissions', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!exam.manualGrading) return res.status(400).json({ error: 'Exam is not set for manual grading' });
    if (req.user.role === 'Teacher' && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized' });
    }
  const submissions = await ExamSubmission.find({ examId: exam._id });
    // Attach correct answers to each submission for teacher reference
    const result = submissions.map(sub => ({
      _id: sub._id,
      student: sub.student,
      answers: sub.answers,
      rawScore: sub.rawScore,
      finalScore: sub.finalScore,
      returned: !!sub.returned,
      feedback: sub.feedback,
      gradedAt: sub.gradedAt || null,
      manualGrading: sub.manualGrading || false,
      questions: exam.questions.map(q => ({ text: q.text, correctAnswer: q.correctAnswer, type: q.type, options: q.options }))
    }));
    res.json(result);
  } catch (err) {
    console.error('Error fetching manual exam submissions:', err);
    res.status(500).json({ error: 'Failed to fetch manual exam submissions' });
  }
});
// Teacher: Get all manual grading exams and their submissions
router.get('/manual/list', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    // Only show exams created by this teacher with manualGrading enabled
    const exams = await Exam.find({ createdBy: req.user.username, manualGrading: true }).sort({ createdAt: -1 });
    // For each exam, count submissions
    const examList = await Promise.all(exams.map(async exam => {
      const submissionsCount = await ExamSubmission.countDocuments({ examId: exam._id });
      return {
        _id: exam._id,
        title: exam.title,
        class: exam.class,
        due: exam.due,
        submissionsCount
      };
    }));
    res.json(examList);
  } catch (err) {
    console.error('Error fetching manual grading exams:', err);
    res.status(500).json({ error: 'Failed to fetch manual grading exams' });
  }
});

// Teacher: Return a graded submission (make grade visible to the student)
router.post('/manual/:examId/submissions/:submissionId/return', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!exam.manualGrading) return res.status(400).json({ error: 'Exam is not set for manual grading' });
    if (req.user.role === 'Teacher' && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const submission = await ExamSubmission.findById(req.params.submissionId);
    if (!submission) return res.status(404).json({ error: 'Submission not found' });

    // Must be graded before returning
    if (typeof submission.finalScore !== 'number' || !submission.gradedAt) {
      return res.status(400).json({ error: 'Submission has not been graded yet' });
    }

    // Create or update Grade entry (this makes it visible to students via /api/student/grades)
    let gradeEntry = await Grade.findOne({ class: exam.class, student: submission.student });
    if (!gradeEntry) {
      gradeEntry = new Grade({ class: exam.class, student: submission.student });
    }
    gradeEntry.grade = `${submission.finalScore}/${exam.questions.length}`;
    gradeEntry.feedback = submission.feedback || '';
    await gradeEntry.save();

    // Mark submission as returned
    submission.returned = true;
    await submission.save();

    // Create a notification to the student
    try {
      const notif = new Notification({
        recipient: submission.student,
        sender: req.user.username,
        type: 'grade',
        message: `Your grade for \"${exam.title}\" is ${submission.finalScore}/${exam.questions.length}`,
        referenceId: exam._id,
        class: exam.class,
        read: false,
        createdAt: new Date()
      });
      await notif.save();

      // Emit socket events if available
      if (req.app.io) {
        req.app.io.to(`user:${submission.student}`).emit('grade-returned', {
          examId: exam._id,
          examTitle: exam.title,
          finalScore: submission.finalScore,
          feedback: submission.feedback || ''
        });
        req.app.io.to(`user:${submission.student}`).emit('new-notification', {
          type: 'grade',
          message: notif.message,
          class: exam.class,
          sender: req.user.username
        });
      }
    } catch (notifErr) {
      console.error('Failed to create/emit notification on grade return:', notifErr);
    }

    res.json({ message: 'Grade returned to student', finalScore: submission.finalScore });
  } catch (err) {
    console.error('Error returning grade:', err);
    res.status(500).json({ error: 'Failed to return grade' });
  }
});

// Teacher: Return ALL graded submissions for an exam (bulk return)
router.post('/manual/:examId/submissions/return-all', authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const exam = await Exam.findById(req.params.examId);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (!exam.manualGrading) return res.status(400).json({ error: 'Exam is not set for manual grading' });
    if (req.user.role === 'Teacher' && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Find submissions that have been graded but not returned
    const submissions = await ExamSubmission.find({ examId: exam._id, gradedAt: { $ne: null }, returned: false });
    let returnedCount = 0;
    for (const submission of submissions) {
      try {
        // Create/update grade entry
        let gradeEntry = await Grade.findOne({ class: exam.class, student: submission.student });
        if (!gradeEntry) gradeEntry = new Grade({ class: exam.class, student: submission.student });
        gradeEntry.grade = `${submission.finalScore}/${exam.questions.length}`;
        gradeEntry.feedback = submission.feedback || '';
        await gradeEntry.save();

        // Mark submission as returned
        submission.returned = true;
        await submission.save();

        // Create notification
        try {
          const notif = new Notification({
            recipient: submission.student,
            sender: req.user.username,
            type: 'grade',
            message: `Your grade for \"${exam.title}\" is ${submission.finalScore}/${exam.questions.length}`,
            referenceId: exam._id,
            class: exam.class,
            read: false,
            createdAt: new Date()
          });
          await notif.save();

          if (req.app.io) {
            req.app.io.to(`user:${submission.student}`).emit('grade-returned', {
              examId: exam._id,
              examTitle: exam.title,
              finalScore: submission.finalScore,
              feedback: submission.feedback || ''
            });
            req.app.io.to(`user:${submission.student}`).emit('new-notification', {
              type: 'grade',
              message: notif.message,
              class: exam.class,
              sender: req.user.username
            });
          }
        } catch (notifErr) {
          console.error('Failed to create/emit notification for submission', submission._id, notifErr);
        }

        returnedCount++;
      } catch (innerErr) {
        console.error('Failed to return grade for submission', submission._id, innerErr);
      }
    }

    res.json({ message: `Returned ${returnedCount} grades`, returned: returnedCount });
  } catch (err) {
    console.error('Error bulk returning grades:', err);
    res.status(500).json({ error: 'Failed to return grades' });
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
    
  const { title, description, class: className, questions, createdBy, due, manualGrading } = req.body;
    
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
    
    console.log(`Creating exam "${title}" for class "${className}" with due date: ${due}`);
    
    const exam = new Exam({
      title,
      description,
      class: className,
      questions,
      createdBy: createdBy || req.user.username,
      due: due ? new Date(due) : null,
      manualGrading: !!manualGrading,
    });
    
    await exam.save();
    console.log(`Exam created successfully with ID: ${exam._id}`);
    
    // Send notifications to all students in the class
    try {
      const classDoc = await Class.findOne({ name: className });
      if (classDoc && classDoc.students && classDoc.students.length > 0) {
        console.log(`Sending notifications to ${classDoc.students.length} students in class ${className}`);
        
        const notifications = classDoc.students.map(studentUsername => ({
          recipient: studentUsername,
          sender: req.user.username,
          type: 'assignment',
          message: `New exam posted: "${title}"`,
          referenceId: exam._id,
          class: className,
          read: false,
          createdAt: new Date()
        }));
        
        await Notification.insertMany(notifications);
        console.log(`✅ Notifications sent to students in ${className}`);
        
        // Emit socket event to notify students in real-time
        if (req.app.io) {
          req.app.io.to(`class:${className}`).emit('new-exam', {
            exam,
            message: `${req.user.username} posted a new exam: ${title}`
          });
          
          // Send notification event to each student
          classDoc.students.forEach(studentUsername => {
            req.app.io.to(`user:${studentUsername}`).emit('new-notification', {
              type: 'assignment',
              message: `New exam posted: "${title}"`,
              class: className,
              sender: req.user.username
            });
          });
        }
      } else {
        console.log(`⚠️ No students found in class ${className} to notify`);
      }
    } catch (notifErr) {
      console.error('Error sending notifications:', notifErr);
      // Don't fail the exam creation if notifications fail
    }
    
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
    
    const { title, description, questions, due } = req.body;
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
    exam.due = due ? new Date(due) : null;
    
    console.log(`Updating exam ${req.params.id} with due date: ${exam.due}`);
    
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
    // Enforce exam expiry: do not allow submissions after due date
    if (exam.due && new Date() > new Date(exam.due)) {
      console.log(`Submission attempt after due date for exam ${exam._id} by ${req.user.username}`);
      return res.status(400).json({ error: 'Exam has expired and can no longer be submitted' });
    }
    
    // Prevent multiple submissions
    const existing = await ExamSubmission.findOne({ examId: exam._id, student: req.user.username });
    if (existing) {
      return res.status(400).json({ error: 'You have already submitted this exam' });
    }
    
    let rawScore = 0;
    const total = exam.questions.length;
    let finalScore = null;
    let creditsToUse = 0;
    let gradeEntry = null;
    let feedback = '';
    if (exam.manualGrading) {
      // For manual grading, do not auto-grade or assign credits
      feedback = 'Pending manual grading by teacher.';
      finalScore = null; // Always null until graded
      creditsToUse = 0;
    } else {
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
      creditsToUse = Math.min(user.creditPoints, missing);
      finalScore = rawScore + creditsToUse;
      user.creditPoints = Math.max(0, user.creditPoints - creditsToUse);
      await user.save();
      feedback = `Exam: ${exam.title} (raw ${rawScore}/${total}, +${creditsToUse} credits)`;
      gradeEntry = new Grade({ 
        class: exam.class, 
        student: req.user.username, 
        grade: `${finalScore}/${total}`, 
        feedback
      });
      await gradeEntry.save();
    }
    const submission = new ExamSubmission({ 
      examId: exam._id, 
      student: req.user.username, 
      answers, 
      rawScore, 
      finalScore, 
      totalQuestions: total,
      className: cls.name || exam.class,
      classCourse: cls.course || '',
      classYear: cls.year || '',
      creditsUsed: creditsToUse,
      manualGrading: !!exam.manualGrading,
      gradedAt: null,
      returned: false
    });
    await submission.save();
    res.json({ 
      message: exam.manualGrading ? 'Submission recorded, pending manual grading.' : 'Submission recorded', 
      rawScore, 
      finalScore, 
      total, 
      creditsUsed: creditsToUse, 
      creditBalance: exam.manualGrading ? undefined : (await User.findOne({ username: req.user.username })).creditPoints
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