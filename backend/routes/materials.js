import express from "express";
import mongoose from "mongoose";
import Material from "../models/Material.js";
import MaterialSubmission from "../models/MaterialSubmission.js";
import Notification from "../models/Notification.js";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";

// Import Class model for getting students
let Class;
let User;
export const setupMaterialsModels = (models) => {
  Class = models.Class;
  User = models.User;
};

const router = express.Router();

// Get all materials (filtered by class)
router.get("/materials", authenticateToken, async (req, res) => {
  try {
    const { className, page = 1, limit = 10 } = req.query;
    const query = className ? { class: className } : {};
    
    const materials = await Material.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    res.json(materials);
  } catch (err) {
    console.error("Get materials error:", err);
    res.status(500).json({ error: "Failed to fetch materials" });
  }
});

// Get material by ID
router.get("/materials/:id", authenticateToken, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    res.json(material);
  } catch (err) {
    console.error("Get material error:", err);
    res.status(500).json({ error: "Failed to fetch material" });
  }
});

// Create material
router.post("/materials", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, type, content, class: className, openingTime, closingTime } = req.body;

    if (!title || !type || !content || !className) {
      return res.status(400).json({ error: "Required fields: title, type, content, class" });
    }

    const material = new Material({
      title,
      description,
      type,
      content,
      class: className,
      teacher: req.user.username,
      openingTime: openingTime ? new Date(openingTime) : undefined,
      closingTime: closingTime ? new Date(closingTime) : undefined
    });

    await material.save();

    // Send notifications to all students in the class
    try {
      const classDoc = await Class.findOne({ name: className });
      if (classDoc && classDoc.students && classDoc.students.length > 0) {
        console.log(`Sending material notifications to ${classDoc.students.length} students in class ${className}`);

        const notifications = classDoc.students.map(studentUsername => ({
          recipient: studentUsername,
          sender: req.user.username,
          senderName: req.user.name || req.user.username,
          type: "material",
          message: `${req.user.name || req.user.username} posted a new material "${title}"`,
          referenceId: material._id,
          class: className,
          read: false,
          createdAt: new Date()
        }));

        await Notification.insertMany(notifications);

        // Emit socket notifications to connected students
        try {
          if (req.app.io) {
            classDoc.students.forEach(studentUsername => {
              req.app.io.to(`user:${studentUsername}`).emit('new-notification', {
                type: 'material',
                message: `${req.user.name || req.user.username} posted a new material "${title}"`,
                class: className,
                sender: req.user.username
              });
            });
          }
        } catch (emitErr) {
          console.warn('Failed to emit new-notification to students', emitErr);
        }
      }
    } catch (notifErr) {
      console.error('Failed to create/send material notifications', notifErr);
    }

    res.status(201).json({ material });
  } catch (err) {
    console.error("Create material error:", err);
    res.status(500).json({ error: "Failed to create material" });
  }
});

// Delete a material and any related announcements
router.delete("/materials/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const materialId = req.params.id;
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Only the owner teacher or admin can delete
    if (material.teacher !== req.user.username && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to delete this material" });
    }

    await Material.findByIdAndDelete(materialId);

    // Delete related announcements that reference this material
    try {
      const Announcement = mongoose.models['Announcement'] || mongoose.model('Announcement');

      // Find candidate announcements that either have materialRef or attachments
      const candidates = await Announcement.find({
        $or: [
          { materialRef: { $exists: true, $ne: null } },
          { attachments: { $exists: true, $ne: [] } }
        ]
      });

      const toDelete = [];
      const materialIdStr = materialId.toString();

      for (const ann of candidates) {
        let matched = false;

        if (!matched && ann.materialRef && ann.materialRef._id) {
          try {
            if (ann.materialRef._id.toString() === materialIdStr) matched = true;
          } catch (e) {
            // ignore
          }
        }

        if (!matched && ann.attachments && ann.attachments.length > 0 && material.content) {
          for (const att of ann.attachments) {
            if (!att) continue;
            const filePath = (att.filePath || att.path || '').toString();
            const materialContent = (material.content || '').toString();
            if (filePath && materialContent && (filePath === materialContent || filePath.endsWith(materialContent) || materialContent.endsWith(filePath))) {
              matched = true;
              break;
            }
            const original = (att.originalName || att.filename || '').toString();
            if (original && material.title && original === material.title) {
              matched = true;
              break;
            }
          }
        }

        if (matched) toDelete.push(ann._id);
      }

      if (toDelete.length > 0) {
        const deleted = await Announcement.deleteMany({ _id: { $in: toDelete } });
        console.log(`✅ Deleted ${deleted.deletedCount} related announcements for material ${materialId}`);

        // Emit socket event to notify clients
        try {
          if (req.app.io && material.class) {
            req.app.io.to(`class:${material.class}`).emit('announcement-deleted', {
              materialId,
              message: 'Material and related announcement deleted'
            });
            console.log(`📡 Emitted announcement-deleted event to class:${material.class}`);
          }
        } catch (emitErr) {
          console.warn('Failed to emit announcement-deleted event', emitErr);
        }
      } else {
        console.log(`⚠️ No announcements found related to material ${materialId}`);
      }
    } catch (annErr) {
      console.error('Failed to delete related announcements for material', materialId, annErr);
    }

    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

// Student: Submit a file response to a material
router.post("/materials/:materialId/submit", authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.params;
    const { fileName, filePath, fileSize, mimeType } = req.body;

    console.log('📤 Material submission request:', { 
      materialId, 
      student: req.user.username,
      fileName, 
      filePath: filePath?.substring(0, 50) 
    });

    if (!fileName || !filePath) {
      return res.status(400).json({ error: "fileName and filePath are required" });
    }

    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      console.error('❌ Material not found:', materialId);
      return res.status(404).json({ error: "Material not found" });
    }

    console.log('✅ Material found:', material.title);

    // Get student name from User model
    let studentName = req.user.username;
    if (!User) {
      console.error('❌ User model not initialized! Using username as fallback.');
    } else {
      try {
        const user = await User.findOne({ username: req.user.username });
        if (user && user.name) {
          studentName = user.name;
          console.log('✅ Student name resolved:', studentName);
        }
      } catch (err) {
        console.warn("Failed to fetch student name:", err);
      }
    }

    // Create submission
    const submission = new MaterialSubmission({
      materialId: material._id,
      class: material.class,
      student: req.user.username,
      studentName: studentName,
      fileName,
      filePath,
      fileSize: fileSize || 0,
      mimeType: mimeType || 'application/octet-stream',
      status: "submitted"
    });

    console.log('💾 Saving submission...');
    await submission.save();
    console.log('✅ Submission saved successfully');

    // Notify teacher about the submission
    try {
      const notification = new Notification({
        recipient: material.teacher,
        sender: req.user.username,
        senderName: studentName,
        type: "material",
        message: `${studentName} submitted a response to "${material.title}"`,
        referenceId: material._id,
        class: material.class,
        read: false,
        createdAt: new Date()
      });
      await notification.save();

      // Emit socket event
      if (req.app.io) {
        req.app.io.to(`user:${material.teacher}`).emit('new-notification', {
          type: 'material',
          message: notification.message,
          class: material.class,
          sender: req.user.username
        });
      }
    } catch (notifErr) {
      console.error("Failed to send submission notification:", notifErr);
    }

    res.status(201).json({ 
      message: "Submission created successfully", 
      submission 
    });
  } catch (err) {
    console.error("❌ Create material submission error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ 
      error: "Failed to submit material response",
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Get all submissions for a material (teacher only)
router.get("/materials/:materialId/submissions", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { materialId } = req.params;

    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Verify teacher owns this material
    if (material.teacher !== req.user.username && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to view submissions for this material" });
    }

    // Get all submissions for this material
    const submissions = await MaterialSubmission.find({ materialId: material._id })
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (err) {
    console.error("Get material submissions error:", err);
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Get student submissions for a material (student can only see their own)
router.get("/materials/:materialId/my-submission", authenticateToken, async (req, res) => {
  try {
    const { materialId } = req.params;

    const submission = await MaterialSubmission.findOne({
      materialId,
      student: req.user.username
    });

    res.json(submission || null);
  } catch (err) {
    console.error("Get student submission error:", err);
    res.status(500).json({ error: "Failed to fetch submission" });
  }
});

// Teacher: Grade/provide feedback on a submission
router.put("/materials/:materialId/submissions/:submissionId/grade", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { materialId, submissionId } = req.params;
    const { score, feedback } = req.body;

    // Find the material
    const material = await Material.findById(materialId);
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }

    // Verify teacher owns this material
    if (material.teacher !== req.user.username && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized" });
    }

    // Find and update the submission
    const submission = await MaterialSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    submission.score = score !== undefined ? score : submission.score;
    submission.feedback = feedback !== undefined ? feedback : submission.feedback;
    submission.status = "graded";
    submission.gradedAt = new Date();
    await submission.save();

    // Notify student about grade
    try {
      const studentName = submission.studentName || submission.student;
      const notification = new Notification({
        recipient: submission.student,
        sender: req.user.username,
        senderName: req.user.name || req.user.username,
        type: "material",
        message: `Your submission for "${material.title}" has been graded`,
        referenceId: material._id,
        class: material.class,
        read: false,
        createdAt: new Date()
      });
      await notification.save();

      // Emit socket event
      if (req.app.io) {
        req.app.io.to(`user:${submission.student}`).emit('new-notification', {
          type: 'material',
          message: notification.message,
          class: material.class,
          sender: req.user.username
        });
      }
    } catch (notifErr) {
      console.error("Failed to send grade notification:", notifErr);
    }

    res.json({ message: "Submission graded successfully", submission });
  } catch (err) {
    console.error("Grade material submission error:", err);
    res.status(500).json({ error: "Failed to grade submission" });
  }
});

// Delete a submission
router.delete("/materials/:materialId/submissions/:submissionId", authenticateToken, async (req, res) => {
  try {
    const { materialId, submissionId } = req.params;

    const submission = await MaterialSubmission.findById(submissionId);
    if (!submission) {
      return res.status(404).json({ error: "Submission not found" });
    }

    // Student can only delete their own submission, teacher can delete any
    if (submission.student !== req.user.username && req.user.role !== "Teacher" && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to delete this submission" });
    }

    await MaterialSubmission.findByIdAndDelete(submissionId);
    res.json({ message: "Submission deleted successfully" });
  } catch (err) {
    console.error("Delete material submission error:", err);
    res.status(500).json({ error: "Failed to delete submission" });
  }
});

export default router;