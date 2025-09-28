import express from "express";
import Comment from "../models/Comment.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Get comments for a specific item (assignment, announcement, etc.)
router.get("/comments", authenticateToken, async (req, res) => {
  try {
    const { referenceType, referenceId, page = 1, limit = 20 } = req.query;
    
    if (!referenceType || !referenceId) {
      return res.status(400).json({ error: "Required fields: referenceType, referenceId" });
    }
    
    const comments = await Comment.find({ 
      referenceType, 
      referenceId 
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
    
    res.json(comments);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Add a comment
router.post("/comments", authenticateToken, async (req, res) => {
  try {
    const { content, referenceType, referenceId, class: className } = req.body;
    
    if (!content || !referenceType || !referenceId || !className) {
      return res.status(400).json({ error: "Required fields: content, referenceType, referenceId, class" });
    }
    
    const comment = new Comment({
      content,
      author: req.user.username,
      authorRole: req.user.role,
      referenceType,
      referenceId,
      class: className,
    });
    
    await comment.save();
    res.status(201).json({ message: "Comment added successfully", comment });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
});

// Delete a comment
router.delete("/comments/:id", authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    // Only author or admin/teacher can delete
    if (comment.author !== req.user.username && req.user.role === "Student") {
      return res.status(403).json({ error: "Not authorized to delete this comment" });
    }
    
    await Comment.findByIdAndDelete(req.params.id);
    res.json({ message: "Comment deleted successfully" });
  } catch (err) {
    console.error("Delete comment error:", err);
    res.status(500).json({ error: "Failed to delete comment" });
  }
});

// Update a comment
router.put("/comments/:id", authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ error: "Comment not found" });
    }
    
    // Only author can edit
    if (comment.author !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to update this comment" });
    }
    
    comment.content = content;
    comment.updatedAt = Date.now();
    
    await comment.save();
    res.json({ message: "Comment updated successfully", comment });
  } catch (err) {
    console.error("Update comment error:", err);
    res.status(500).json({ error: "Failed to update comment" });
  }
});

export default router;