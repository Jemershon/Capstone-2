import express from "express";
import Reaction from "../models/Reaction.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Get reactions for a specific item
router.get("/reactions", authenticateToken, async (req, res) => {
  try {
    const { referenceType, referenceId } = req.query;
    
    if (!referenceType || !referenceId) {
      return res.status(400).json({ error: "Required fields: referenceType, referenceId" });
    }
    
    // Get reaction counts by type
    const reactionCounts = await Reaction.aggregate([
      { $match: { referenceType, referenceId } },
      { $group: { _id: "$reactionType", count: { $sum: 1 } } }
    ]);
    
    // Get user's reaction if any
    const userReaction = await Reaction.findOne({
      userId: req.user.id,
      referenceType,
      referenceId
    });
    
    // Format response
    const reactions = {};
    reactionCounts.forEach(r => {
      reactions[r._id] = r.count;
    });
    
    res.json({
      reactions,
      userReaction: userReaction?.reactionType || null,
      totalReactions: reactionCounts.reduce((sum, r) => sum + r.count, 0)
    });
  } catch (err) {
    console.error("Get reactions error:", err);
    res.status(500).json({ error: "Failed to fetch reactions" });
  }
});

// Add or toggle a reaction
router.post("/reactions", authenticateToken, async (req, res) => {
  try {
    const { referenceType, referenceId, reactionType = "heart", class: className } = req.body;
    
    if (!referenceType || !referenceId || !className) {
      return res.status(400).json({ error: "Required fields: referenceType, referenceId, class" });
    }
    
    // Check if user already reacted
    const existingReaction = await Reaction.findOne({
      userId: req.user.id,
      referenceType,
      referenceId
    });
    
    if (existingReaction) {
      if (existingReaction.reactionType === reactionType) {
        // Same reaction - remove it (toggle off)
        await Reaction.findByIdAndDelete(existingReaction._id);
        return res.json({ 
          message: "Reaction removed", 
          action: "removed",
          reactionType 
        });
      } else {
        // Different reaction - update it
        existingReaction.reactionType = reactionType;
        existingReaction.updatedAt = new Date();
        await existingReaction.save();
        return res.json({ 
          message: "Reaction updated", 
          action: "updated",
          reactionType 
        });
      }
    } else {
      // New reaction
      const reaction = new Reaction({
        userId: req.user.id,
        username: req.user.username,
        userRole: req.user.role,
        referenceType,
        referenceId,
        reactionType,
        class: className,
      });
      
      await reaction.save();
      res.status(201).json({ 
        message: "Reaction added", 
        action: "added",
        reactionType,
        reaction 
      });
    }
  } catch (err) {
    console.error("Add reaction error:", err);
    res.status(500).json({ error: "Failed to add reaction" });
  }
});

// Get reactions with user details for a specific item
router.get("/reactions/details", authenticateToken, async (req, res) => {
  try {
    const { referenceType, referenceId, reactionType } = req.query;
    
    if (!referenceType || !referenceId) {
      return res.status(400).json({ error: "Required fields: referenceType, referenceId" });
    }
    
    const filter = { referenceType, referenceId };
    if (reactionType) {
      filter.reactionType = reactionType;
    }
    
    const reactions = await Reaction.find(filter)
      .select("username userRole reactionType createdAt")
      .sort({ createdAt: -1 });
    
    res.json(reactions);
  } catch (err) {
    console.error("Get reaction details error:", err);
    res.status(500).json({ error: "Failed to fetch reaction details" });
  }
});

// Delete a reaction (admin/teacher only or own reaction)
router.delete("/reactions/:id", authenticateToken, async (req, res) => {
  try {
    const reaction = await Reaction.findById(req.params.id);
    
    if (!reaction) {
      return res.status(404).json({ error: "Reaction not found" });
    }
    
    // Only reaction owner or admin/teacher can delete
    if (reaction.userId.toString() !== req.user.id && req.user.role === "Student") {
      return res.status(403).json({ error: "Not authorized to delete this reaction" });
    }
    
    await Reaction.findByIdAndDelete(req.params.id);
    res.json({ message: "Reaction deleted successfully" });
  } catch (err) {
    console.error("Delete reaction error:", err);
    res.status(500).json({ error: "Failed to delete reaction" });
  }
});

export default router;