import express from "express";
import Comment from "../models/Comment.js";
import { authenticateToken } from "../middlewares/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Get comments for a specific item (assignment, announcement, etc.)
router.get("/comments", authenticateToken, async (req, res) => {
  try {
    const { referenceType, referenceId, page = 1, limit = 50 } = req.query;
    
    if (!referenceType || !referenceId) {
      return res.status(400).json({ error: "Required fields: referenceType, referenceId" });
    }
    
    // Fetch all comments (both top-level and replies) for this reference
    const allComments = await Comment.find({ 
      referenceType, 
      referenceId 
    })
    .sort({ createdAt: -1 }); // Latest first
    
    // Separate top-level comments and replies
    const topLevelComments = allComments.filter(c => !c.parentComment);
    const replies = allComments.filter(c => c.parentComment);
    
    // Attach replies to their parent comments
    const commentsWithReplies = topLevelComments.map(comment => {
      const commentReplies = replies
        .filter(r => r.parentComment.toString() === comment._id.toString())
        .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest reply first
      
      return {
        ...comment.toObject(),
        replies: commentReplies
      };
    });
    
    res.json(commentsWithReplies);
  } catch (err) {
    console.error("Get comments error:", err);
    res.status(500).json({ error: "Failed to fetch comments" });
  }
});

// Add a comment
router.post("/comments", authenticateToken, async (req, res) => {
  try {
    const { content, referenceType, referenceId, class: className, parentComment } = req.body;
    
    if (!content || !referenceType || !referenceId || !className) {
      return res.status(400).json({ error: "Required fields: content, referenceType, referenceId, class" });
    }
    
    const comment = new Comment({
      content,
      author: req.user.username,
      authorName: req.user.name || req.user.username,
      authorRole: req.user.role,
      referenceType,
      referenceId,
      class: className,
      parentComment: parentComment || null, // Support for replies
    });
    
    await comment.save();
    
    // Notify the original post creator or parent comment author
    try {
      let recipientUsername = null;
      
      // If this is a reply to a comment, notify the parent comment author
      if (parentComment) {
        const parentCommentDoc = await Comment.findById(parentComment);
        if (parentCommentDoc && parentCommentDoc.author !== req.user.username) {
          recipientUsername = parentCommentDoc.author;
          
          const notification = new Notification({
            recipient: recipientUsername,
            sender: req.user.username,
            senderName: req.user.name || req.user.username,
            type: 'reply',
            message: `${req.user.name || req.user.username} replied to your comment: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            referenceId: referenceId,
            class: className
          });
          await notification.save();
          
          if (req.app.io) {
            req.app.io.to(`user:${recipientUsername}`).emit('new-notification', notification);
          }
          console.log(`✅ Notified ${recipientUsername} about reply from ${req.user.username}`);
        }
      } else {
        // Notify the original post creator about the comment
        let postCreator = null;
        
        if (referenceType === 'exam') {
          const Exam = req.app.models.Exam;
          const exam = await Exam.findById(referenceId);
          if (exam) postCreator = exam.createdBy;
        } else if (referenceType === 'announcement') {
          const Announcement = req.app.models.Announcement;
          const announcement = await Announcement.findById(referenceId);
          if (announcement) postCreator = announcement.createdBy;
        } else if (referenceType === 'material') {
          const Material = req.app.models.Material;
          const material = await Material.findById(referenceId);
          if (material) postCreator = material.createdBy;
        }
        
        if (postCreator && postCreator !== req.user.username) {
          const notification = new Notification({
            recipient: postCreator,
            sender: req.user.username,
            senderName: req.user.name || req.user.username,
            type: 'comment',
            message: `${req.user.name || req.user.username} commented on your ${referenceType}: "${content.substring(0, 50)}${content.length > 50 ? '...' : ''}"`,
            referenceId: referenceId,
            class: className
          });
          await notification.save();
          
          if (req.app.io) {
            req.app.io.to(`user:${postCreator}`).emit('new-notification', notification);
          }
          console.log(`✅ Notified ${postCreator} about comment from ${req.user.username}`);
        }
      }
    } catch (notifError) {
      console.log("Comment notification failed, but continuing:", notifError.message);
    }
    
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