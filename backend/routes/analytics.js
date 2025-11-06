import express from "express";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import Class from "../models/Class.js";
import User from "../models/User.js";

const router = express.Router();

// Models to be injected
let Grade, Exam, ExamSubmission, MaterialSubmission, Announcement;

export function setupAnalyticsModels(models) {
  Grade = models.Grade;
  Exam = models.Exam;
  ExamSubmission = models.ExamSubmission;
  MaterialSubmission = models.MaterialSubmission;
  Announcement = models.Announcement;
}

// Get class analytics overview
router.get("/analytics/class/:className", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { className } = req.params;
    
    // Verify class exists and user has access
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to view analytics for this class" });
    }
    
    // Get student count
    const studentCount = cls.students?.length || 0;
    
    // Get exam count
    const examCount = await Exam.countDocuments({ class: className });
    
    // Get announcement count
    const announcementCount = await Announcement.countDocuments({ class: className });
    
    // Get average grade
    const grades = await Grade.find({ class: className });
    let averageGrade = 'N/A';
    if (grades.length > 0) {
      // Convert letter grades to numbers for averaging (simple conversion)
      const gradeMap = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'F': 50 };
      let total = 0;
      let count = 0;
      
      grades.forEach(g => {
        const numGrade = parseFloat(g.grade) || gradeMap[g.grade.toUpperCase()] || null;
        if (numGrade !== null) {
          total += numGrade;
          count++;
        }
      });
      
      if (count > 0) {
        averageGrade = (total / count).toFixed(2);
      }
    }
    
    // Get submission stats
    const totalSubmissions = await ExamSubmission.countDocuments({ className });
    
    res.json({
      className,
      studentCount,
      examCount,
      announcementCount,
      averageGrade,
      totalSubmissions,
      teacher: cls.teacher
    });
  } catch (err) {
    console.error("Get class analytics error:", err);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Get student performance analytics
router.get("/analytics/student/:username", authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { class: className } = req.query;
    
    // Students can only view their own analytics
    if (req.user.role === "Student" && req.user.username !== username) {
      return res.status(403).json({ error: "You can only view your own analytics" });
    }
    
    // Teachers can view any student in their class
    if (req.user.role === "Teacher" && className) {
      const cls = await Class.findOne({ name: className });
      if (!cls || cls.teacher !== req.user.username) {
        return res.status(403).json({ error: "You are not authorized to view this student's analytics" });
      }
    }
    
    // Get student info
    const student = await User.findOne({ username });
    if (!student) {
      return res.status(404).json({ error: "Student not found" });
    }
    
    // Build filter
    const filter = { student: username };
    if (className) {
      filter.class = className;
    }
    
    // Get grades
    const grades = await Grade.find(filter);
    
    // Get exam submissions
    const submissions = await ExamSubmission.find({ 
      username,
      ...(className ? { className } : {})
    });
    
    // Calculate statistics
    const gradeMap = { 'A': 95, 'B': 85, 'C': 75, 'D': 65, 'F': 50 };
    let totalScore = 0;
    let gradeCount = 0;
    
    grades.forEach(g => {
      const numGrade = parseFloat(g.grade) || gradeMap[g.grade.toUpperCase()] || null;
      if (numGrade !== null) {
        totalScore += numGrade;
        gradeCount++;
      }
    });
    
    const averageGrade = gradeCount > 0 ? (totalScore / gradeCount).toFixed(2) : 'N/A';
    
    // Count completed vs pending exams
    const completedExams = submissions.length;
    const totalExams = className ? await Exam.countDocuments({ class: className }) : 0;
    const pendingExams = totalExams - completedExams;
    
    res.json({
      username,
      name: student.name,
      averageGrade,
      totalGrades: grades.length,
      completedExams,
      pendingExams,
      totalExams,
      grades: grades.map(g => ({
        class: g.class,
        grade: g.grade,
        feedback: g.feedback,
        examId: g.examId
      }))
    });
  } catch (err) {
    console.error("Get student analytics error:", err);
    res.status(500).json({ error: "Failed to fetch student analytics" });
  }
});

// Get exam submission statistics
router.get("/analytics/exam/:examId", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { examId } = req.params;
    
    // Get exam
    const exam = await Exam.findById(examId);
    if (!exam) {
      return res.status(404).json({ error: "Exam not found" });
    }
    
    // Verify user owns the exam
    if (req.user.role === "Teacher" && exam.createdBy !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to view analytics for this exam" });
    }
    
    // Get submissions
    const submissions = await ExamSubmission.find({ examId });
    
    // Get class student count
    const cls = await Class.findOne({ name: exam.class });
    const totalStudents = cls?.students?.length || 0;
    
    // Calculate statistics
    let totalScore = 0;
    let gradedCount = 0;
    
    submissions.forEach(sub => {
      if (typeof sub.score === 'number') {
        totalScore += sub.score;
        gradedCount++;
      }
    });
    
    const averageScore = gradedCount > 0 ? (totalScore / gradedCount).toFixed(2) : 'N/A';
    const submissionRate = totalStudents > 0 ? ((submissions.length / totalStudents) * 100).toFixed(2) : 0;
    
    res.json({
      examId,
      examTitle: exam.title,
      class: exam.class,
      totalStudents,
      submissionCount: submissions.length,
      submissionRate: `${submissionRate}%`,
      gradedCount,
      averageScore,
      dueDate: exam.due
    });
  } catch (err) {
    console.error("Get exam analytics error:", err);
    res.status(500).json({ error: "Failed to fetch exam analytics" });
  }
});

// Get engagement analytics for a class
router.get("/analytics/engagement/:className", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { className } = req.params;
    
    // Verify class exists and user has access
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to view analytics for this class" });
    }
    
    // Get recent activity counts (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentAnnouncements = await Announcement.countDocuments({
      class: className,
      date: { $gte: thirtyDaysAgo }
    });
    
    const recentExams = await Exam.countDocuments({
      class: className,
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const recentSubmissions = await ExamSubmission.countDocuments({
      className,
      submittedAt: { $gte: thirtyDaysAgo }
    });
    
    // Get active students (students who submitted something in last 30 days)
    const activeStudents = await ExamSubmission.distinct('username', {
      className,
      submittedAt: { $gte: thirtyDaysAgo }
    });
    
    const totalStudents = cls.students?.length || 0;
    const engagementRate = totalStudents > 0 ? ((activeStudents.length / totalStudents) * 100).toFixed(2) : 0;
    
    res.json({
      className,
      totalStudents,
      activeStudents: activeStudents.length,
      engagementRate: `${engagementRate}%`,
      recentActivity: {
        announcements: recentAnnouncements,
        exams: recentExams,
        submissions: recentSubmissions
      },
      period: 'Last 30 days'
    });
  } catch (err) {
    console.error("Get engagement analytics error:", err);
    res.status(500).json({ error: "Failed to fetch engagement analytics" });
  }
});

export default router;
