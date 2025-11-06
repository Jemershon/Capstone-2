import express from "express";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import Material from "../models/Material.js";
import Class from "../models/Class.js";
import Exam from "../models/Exam.js";

const router = express.Router();

// Models to be injected
let Announcement;

export function setupReuseModels(models) {
  Announcement = models.Announcement;
}

// Reuse announcement in another class
router.post("/reuse/announcement", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { announcementId, targetClass } = req.body;
    
    if (!announcementId || !targetClass) {
      return res.status(400).json({ error: "Announcement ID and target class are required" });
    }
    
    // Get original announcement
    const original = await Announcement.findById(announcementId);
    if (!original) {
      return res.status(404).json({ error: "Announcement not found" });
    }
    
    // Verify user owns the original
    if (req.user.role === "Teacher" && original.teacher !== req.user.username) {
      return res.status(403).json({ error: "You can only reuse your own announcements" });
    }
    
    // Verify target class exists and user has access
    const targetCls = await Class.findOne({ name: targetClass });
    if (!targetCls) {
      return res.status(404).json({ error: "Target class not found" });
    }
    
    if (req.user.role === "Teacher" && targetCls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to post to the target class" });
    }
    
    // Create new announcement
    const newAnnouncement = new Announcement({
      message: original.message,
      date: new Date(),
      teacher: req.user.username,
      teacherName: req.user.name || req.user.username,
      class: targetClass,
      likes: 0,
      attachments: original.attachments || [],
      topic: null // Don't copy topic to new class
    });
    
    await newAnnouncement.save();
    
    // Emit socket event
    if (req.app.io) {
      req.app.io.to(`class:${targetClass}`).emit('announcement-created', newAnnouncement);
    }
    
    res.json({ 
      message: "Announcement reused successfully",
      announcement: newAnnouncement
    });
  } catch (err) {
    console.error("Reuse announcement error:", err);
    res.status(500).json({ error: "Failed to reuse announcement" });
  }
});

// Reuse material in another class
router.post("/reuse/material", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { materialId, targetClass } = req.body;
    
    if (!materialId || !targetClass) {
      return res.status(400).json({ error: "Material ID and target class are required" });
    }
    
    // Get original material
    const original = await Material.findById(materialId);
    if (!original) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    // Verify user owns the original
    if (req.user.role === "Teacher" && original.teacher !== req.user.username) {
      return res.status(403).json({ error: "You can only reuse your own materials" });
    }
    
    // Verify target class exists and user has access
    const targetCls = await Class.findOne({ name: targetClass });
    if (!targetCls) {
      return res.status(404).json({ error: "Target class not found" });
    }
    
    if (req.user.role === "Teacher" && targetCls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to post to the target class" });
    }
    
    // Create new material
    const newMaterial = new Material({
      title: original.title,
      description: original.description,
      type: original.type,
      content: original.content,
      class: targetClass,
      teacher: req.user.username
    });
    
    await newMaterial.save();
    
    res.json({ 
      message: "Material reused successfully",
      material: newMaterial
    });
  } catch (err) {
    console.error("Reuse material error:", err);
    res.status(500).json({ error: "Failed to reuse material" });
  }
});

// Reuse exam in another class
router.post("/reuse/exam", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { examId, targetClass, newDueDate } = req.body;
    
    if (!examId || !targetClass) {
      return res.status(400).json({ error: "Exam ID and target class are required" });
    }
    
    // Get original exam
    const original = await Exam.findById(examId);
    if (!original) {
      return res.status(404).json({ error: "Exam not found" });
    }
    
    // Verify user owns the original
    if (req.user.role === "Teacher" && original.createdBy !== req.user.username) {
      return res.status(403).json({ error: "You can only reuse your own exams" });
    }
    
    // Verify target class exists and user has access
    const targetCls = await Class.findOne({ name: targetClass });
    if (!targetCls) {
      return res.status(404).json({ error: "Target class not found" });
    }
    
    if (req.user.role === "Teacher" && targetCls.teacher !== req.user.username) {
      return res.status(403).json({ error: "You are not authorized to post to the target class" });
    }
    
    // Create new exam
    const newExam = new Exam({
      title: original.title,
      description: original.description,
      class: targetClass,
      due: newDueDate ? new Date(newDueDate) : original.due,
      questions: original.questions,
      createdBy: req.user.username,
      manualGrading: original.manualGrading,
      allowResubmission: original.allowResubmission
    });
    
    await newExam.save();
    
    // Send notifications to students in target class
    if (targetCls.students && targetCls.students.length > 0) {
      const Notification = req.app.models?.Notification;
      if (Notification) {
        const notifications = targetCls.students.map(studentUsername => ({
          recipient: studentUsername,
          sender: req.user.username,
          type: 'assignment',
          message: `New exam posted: "${original.title}"`,
          referenceId: newExam._id,
          class: targetClass,
          read: false,
          createdAt: new Date()
        }));
        
        await Notification.insertMany(notifications);
      }
    }
    
    // Emit socket event
    if (req.app.io) {
      req.app.io.to(`class:${targetClass}`).emit('exam-created', newExam);
    }
    
    res.json({ 
      message: "Exam reused successfully",
      exam: newExam
    });
  } catch (err) {
    console.error("Reuse exam error:", err);
    res.status(500).json({ error: "Failed to reuse exam" });
  }
});

export default router;
