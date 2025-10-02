import express from "express";
import Material from "../models/Material.js";
import Notification from "../models/Notification.js";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";

// Import Class model for getting students
let Class;
export const setupMaterialsModels = (models) => {
  Class = models.Class;
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
    const { title, description, type, content, class: className } = req.body;
    
    if (!title || !type || !content || !className) {
      return res.status(400).json({ error: "Required fields: title, type, content, class" });
    }
    
    const material = new Material({
      title,
      description,
      type,
      content,
      class: className,
      teacher: req.user.username
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
          type: 'material',
          message: `New material posted in ${className}: "${title}"`,
          referenceId: material._id,
          class: className,
          read: false,
          createdAt: new Date()
        }));
        
        await Notification.insertMany(notifications);
        console.log(`✅ Material notifications sent to students in ${className}`);
        
        // Emit socket event to notify students in real-time
        if (req.app.io) {
          classDoc.students.forEach(studentUsername => {
            req.app.io.to(`user:${studentUsername}`).emit('new-notification', {
              type: 'material',
              message: `New material posted in ${className}: "${title}"`,
              class: className,
              sender: req.user.username
            });
          });
        }
      }
    } catch (notifErr) {
      console.error('Error sending material notifications:', notifErr);
      // Don't fail the material creation if notifications fail
    }
    
    res.status(201).json({ message: "Material created successfully", material });
  } catch (err) {
    console.error("Create material error:", err);
    res.status(500).json({ error: "Failed to create material" });
  }
});

// Update material
router.put("/materials/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { title, description, type, content } = req.body;
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    // Verify teacher owns this material
    if (material.teacher !== req.user.username && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to update this material" });
    }
    
    material.title = title || material.title;
    material.description = description || material.description;
    material.type = type || material.type;
    material.content = content || material.content;
    material.updatedAt = Date.now();
    
    await material.save();
    res.json({ message: "Material updated successfully", material });
  } catch (err) {
    console.error("Update material error:", err);
    res.status(500).json({ error: "Failed to update material" });
  }
});

// Delete material
router.delete("/materials/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const material = await Material.findById(req.params.id);
    
    if (!material) {
      return res.status(404).json({ error: "Material not found" });
    }
    
    // Verify teacher owns this material
    if (material.teacher !== req.user.username && req.user.role !== "Admin") {
      return res.status(403).json({ error: "Not authorized to delete this material" });
    }
    
    await Material.findByIdAndDelete(req.params.id);
    res.json({ message: "Material deleted successfully" });
  } catch (err) {
    console.error("Delete material error:", err);
    res.status(500).json({ error: "Failed to delete material" });
  }
});

export default router;