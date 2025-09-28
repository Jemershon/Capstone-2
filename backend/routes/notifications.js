import express from "express";
import Notification from "../models/Notification.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Get notifications for current user
router.get("/notifications", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    
    const query = { 
      recipient: req.user.username 
    };
    
    if (unreadOnly === 'true') {
      query.read = false;
    }
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const count = await Notification.countDocuments({ 
      recipient: req.user.username,
      read: false 
    });
    
    res.json({
      notifications,
      unreadCount: count
    });
  } catch (err) {
    console.error("Get notifications error:", err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Mark notification as read
router.put("/notifications/:id/read", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Ensure user can only mark their own notifications
    if (notification.recipient !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to update this notification" });
    }
    
    notification.read = true;
    await notification.save();
    
    res.json({ message: "Notification marked as read" });
  } catch (err) {
    console.error("Mark notification read error:", err);
    res.status(500).json({ error: "Failed to update notification" });
  }
});

// Mark all notifications as read
router.put("/notifications/read-all", authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.username, read: false },
      { read: true }
    );
    
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    console.error("Mark all notifications read error:", err);
    res.status(500).json({ error: "Failed to update notifications" });
  }
});

// Delete a notification
router.delete("/notifications/:id", authenticateToken, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }
    
    // Ensure user can only delete their own notifications
    if (notification.recipient !== req.user.username) {
      return res.status(403).json({ error: "Not authorized to delete this notification" });
    }
    
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: "Notification deleted" });
  } catch (err) {
    console.error("Delete notification error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;