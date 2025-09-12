import express from "express";
import Class from "../models/Class.js";

const router = express.Router();

// Get all classes
router.get("/classes", async (req, res) => {
  const classes = await Class.find().populate("students", "name email");
  res.json(classes);
});

// Add class
router.post("/classes", async (req, res) => {
  const { name, teacher } = req.body;
  if (!name || !teacher) return res.status(400).json({ error: "Name and teacher required" });
  const newClass = await Class.create({ name, teacher });
  res.json(newClass);
});

export default router;