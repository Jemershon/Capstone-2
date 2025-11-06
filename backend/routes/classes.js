import express from "express";
import Class from "../models/Class.js";

const router = express.Router();

// Get all classes
router.get("/classes", async (req, res) => {
  try {
    const { page = 1, limit = 100, includeArchived = false } = req.query;
    const filter = includeArchived === 'true' ? {} : { archived: { $ne: true } };
    const classes = await Class.find(filter)
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    res.json(classes);
  } catch (err) {
    console.error("Get classes error:", err);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Add class
router.post("/classes", async (req, res) => {
  try {
    const { name, section, code, teacher, bg, schedule } = req.body;
    if (!name || !section || !code || !teacher) {
      return res.status(400).json({ error: "All fields are required" });
    }
    const existingClass = await Class.findOne({ code });
    if (existingClass) {
      return res.status(400).json({ error: "Class code already exists" });
    }
    const cls = new Class({ name, section, code: code.toUpperCase(), teacher, students: [], bg, schedule });
    await cls.save();
    res.status(201).json({ message: "Class created successfully" });
  } catch (err) {
    console.error("Create class error:", err);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Delete class
router.delete("/classes/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Class.findByIdAndDelete(id);
    
    if (!result) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    res.json({ message: "Class deleted successfully" });
  } catch (err) {
    console.error("Delete class error:", err);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// Archive class
router.patch("/classes/:id/archive", async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await Class.findByIdAndUpdate(
      id,
      { archived: true, archivedAt: new Date() },
      { new: true }
    );
    
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    res.json({ message: "Class archived successfully", class: cls });
  } catch (err) {
    console.error("Archive class error:", err);
    res.status(500).json({ error: "Failed to archive class" });
  }
});

// Restore class
router.patch("/classes/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    const cls = await Class.findByIdAndUpdate(
      id,
      { archived: false, archivedAt: null },
      { new: true }
    );
    
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    res.json({ message: "Class restored successfully", class: cls });
  } catch (err) {
    console.error("Restore class error:", err);
    res.status(500).json({ error: "Failed to restore class" });
  }
});

export default router;