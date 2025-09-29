import express from "express";
import { authenticateToken } from "../middlewares/auth.js";
import Notification from "../models/Notification.js";
import { sendNotificationToUser, broadcastNotification } from "../socket.js";

const router = express.Router();

// Send a test notification to yourself
router.post("/test-notification", authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }
    
    // Create a new notification
    const notification = new Notification({
      recipient: req.user.username,
      sender: req.user.username,
      type: "announcement",
      message: message,
      read: false,
      class: "Test",
    });
    
    await notification.save();
    
    // Send real-time notification
    if (global.io) {
      sendNotificationToUser(global.io, req.user.username, notification);
    }
    
    res.status(201).json({
      success: true,
      message: "Test notification sent",
      notification
    });
  } catch (err) {
    console.error("Error creating test notification:", err);
    res.status(500).json({ error: "Failed to send notification" });
  }
});

export default router;