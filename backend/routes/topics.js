import express from "express";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import Topic from "../models/Topic.js";
import Class from "../models/Class.js";

const router = express.Router();

// Get all topics for a class
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { className } = req.query;
    
    if (!className) {
      return res.status(400).json({ error: "Class name is required" });
    }

    // Verify user has access to this class
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }

    // Students can only view their enrolled classes, teachers their own classes
    if (req.user.role === "Student" && !cls.students.includes(req.user.username)) {
      return res.status(403).json({ error: "Not enrolled in this class" });
    }
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized for this class" });
    }

    const topics = await Topic.find({ class: className }).sort({ order: 1, createdAt: 1 });
    res.json(topics);
  } catch (err) {
    console.error("Get topics error:", err);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
});

// Create a new topic
router.post("/", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { name, color, className } = req.body;

    if (!name || !className) {
      return res.status(400).json({ error: "Name and class are required" });
    }

    // Verify class exists and teacher owns it
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }

    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to create topics for this class" });
    }

    // Check if topic already exists
    const existingTopic = await Topic.findOne({ class: className, name: name });
    if (existingTopic) {
      return res.status(400).json({ error: "Topic with this name already exists in this class" });
    }

    // Get the highest order number for this class
    const lastTopic = await Topic.findOne({ class: className }).sort({ order: -1 });
    const order = lastTopic ? lastTopic.order + 1 : 0;

    const topic = new Topic({
      name,
      color: color || "#6c757d",
      class: className,
      teacher: req.user.username,
      order
    });

    await topic.save();
    res.status(201).json({ message: "Topic created successfully", topic });
  } catch (err) {
    console.error("Create topic error:", err);
    res.status(500).json({ error: "Failed to create topic" });
  }
});

// Update a topic
router.put("/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, color, order } = req.body;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Verify teacher owns the class
    const cls = await Class.findOne({ name: topic.class });
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to update this topic" });
    }

    // Check for duplicate name if changing name
    if (name && name !== topic.name) {
      const duplicate = await Topic.findOne({ class: topic.class, name: name });
      if (duplicate) {
        return res.status(400).json({ error: "Topic with this name already exists in this class" });
      }
      topic.name = name;
    }

    if (color) topic.color = color;
    if (typeof order === 'number') topic.order = order;

    await topic.save();
    res.json({ message: "Topic updated successfully", topic });
  } catch (err) {
    console.error("Update topic error:", err);
    res.status(500).json({ error: "Failed to update topic" });
  }
});

// Delete a topic
router.delete("/:id", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const topic = await Topic.findById(id);
    if (!topic) {
      return res.status(404).json({ error: "Topic not found" });
    }

    // Verify teacher owns the class
    const cls = await Class.findOne({ name: topic.class });
    if (req.user.role === "Teacher" && cls.teacher !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to delete this topic" });
    }

    // Note: We don't delete announcements with this topic, just set their topic to null
    // This is handled by the database's reference behavior
    await Topic.findByIdAndDelete(id);
    
    res.json({ message: "Topic deleted successfully" });
  } catch (err) {
    console.error("Delete topic error:", err);
    res.status(500).json({ error: "Failed to delete topic" });
  }
});

export default router;
