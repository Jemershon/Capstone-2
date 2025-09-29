import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import { createNotification, createMultipleNotifications } from "../utils/notificationUtils.js";
// Import User model
import User from "../models/User.js";

const router = express.Router();

// Test route to send a notification to yourself (for testing real-time functionality)
router.post("/test/send-notification", authenticateToken, async (req, res) => {
  try {
    const { message, type = "announcement" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    const notificationData = {
      recipient: req.user.username,
      sender: req.user.username,
      type: type,
      message: message || "Test notification",
      class: "Test",
      read: false
    };
    
    // Create notification using our utility function
    const notification = await createNotification(notificationData);
    
    res.status(201).json({
      success: true,
      message: "Test notification sent",
      notification
    });
  } catch (err) {
    console.error("Test notification error:", err);
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// Test route to broadcast notification to all users (admin only)
router.post("/test/broadcast-notification", authenticateToken, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== "Admin") {
      return res.status(403).json({ error: "Only admins can broadcast notifications" });
    }
    
    const { message, type = "announcement" } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Get all users
    const users = await User.find({}, { username: 1 });
    const usernames = users.map(user => user.username);
    
    // Create notification for all users
    const baseNotificationData = {
      sender: req.user.username,
      type: type,
      message: message,
      class: "System",
      read: false
    };
    
    // Send to all users
    const notifications = await createMultipleNotifications(usernames, baseNotificationData);
    
    res.status(201).json({
      success: true,
      message: `Notification broadcast to ${notifications.length} users`,
      count: notifications.length
    });
  } catch (err) {
    console.error("Broadcast notification error:", err);
    res.status(500).json({ error: "Failed to broadcast notification" });
  }
});

export default router;