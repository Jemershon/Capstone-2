import express from "express";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import Class from "../models/Class.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Models to be injected
let Grade, Announcement, Exam;

export function setupBulkActionModels(models) {
  Grade = models.Grade;
  Announcement = models.Announcement;
  Exam = models.Exam;
}

// Bulk grade assignment
router.post("/bulk/grades", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, grades } = req.body;
    
    if (!className || !grades || !Array.isArray(grades)) {
      return res.status(400).json({ error: "Class and grades array are required" });
    }
    
    // Verify teacher owns the class
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to grade this class" });
    }
    
    const results = [];
    
    for (const gradeData of grades) {
      const { student, grade, feedback, examId } = gradeData;
      
      if (!student || !grade) {
        results.push({ student, success: false, error: "Student and grade are required" });
        continue;
      }
      
      try {
        const gradeEntry = new Grade({
          class: className,
          student,
          grade,
          feedback: feedback || '',
          examId: examId || null
        });
        await gradeEntry.save();
        results.push({ student, success: true });
      } catch (err) {
        results.push({ student, success: false, error: err.message });
      }
    }
    
    res.json({ 
      message: "Bulk grading completed", 
      results 
    });
  } catch (err) {
    console.error("Bulk grade error:", err);
    res.status(500).json({ error: "Failed to process bulk grades" });
  }
});

// Bulk delete announcements
router.post("/bulk/announcements/delete", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs array is required" });
    }
    
    // Verify ownership of all announcements
    const announcements = await Announcement.find({ _id: { $in: ids } });
    
    for (const ann of announcements) {
      if (req.user.role === "Teacher" && ann.teacher !== req.user.username) {
        return res.status(403).json({ error: "You can only delete your own announcements" });
      }
    }
    
    const result = await Announcement.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} announcements`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Bulk delete announcements error:", err);
    res.status(500).json({ error: "Failed to delete announcements" });
  }
});

// Bulk delete exams
router.post("/bulk/exams/delete", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: "IDs array is required" });
    }
    
    // Verify ownership of all exams
    const exams = await Exam.find({ _id: { $in: ids } });
    
    for (const exam of exams) {
      if (req.user.role === "Teacher" && exam.createdBy !== req.user.username) {
        return res.status(403).json({ error: "You can only delete your own exams" });
      }
    }
    
    const result = await Exam.deleteMany({ _id: { $in: ids } });
    
    res.json({ 
      message: `Successfully deleted ${result.deletedCount} exams`,
      deletedCount: result.deletedCount
    });
  } catch (err) {
    console.error("Bulk delete exams error:", err);
    res.status(500).json({ error: "Failed to delete exams" });
  }
});

// Bulk send notifications
router.post("/bulk/notifications", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { class: className, message, type = 'announcement' } = req.body;
    
    if (!className || !message) {
      return res.status(400).json({ error: "Class and message are required" });
    }
    
    // Verify teacher owns the class
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to send notifications to this class" });
    }
    
    // Send notification to all students
    const notifications = cls.students.map(student => ({
      recipient: student,
      sender: req.user.username,
      type,
      message,
      class: className,
      read: false,
      createdAt: new Date()
    }));
    
    await Notification.insertMany(notifications);
    
    // Emit socket event
    if (req.app.io) {
      req.app.io.to(`class:${className}`).emit('bulk-notification', {
        message,
        sender: req.user.username
      });
    }
    
    res.json({ 
      message: `Notification sent to ${notifications.length} students`,
      count: notifications.length
    });
  } catch (err) {
    console.error("Bulk notification error:", err);
    res.status(500).json({ error: "Failed to send notifications" });
  }
});

export default router;
