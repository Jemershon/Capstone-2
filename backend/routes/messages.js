import express from "express";
import Message from "../models/Message.js";
import User from "../models/User.js";
import Class from "../models/Class.js";
import { authenticateToken } from "../middlewares/auth.js";

const router = express.Router();

// Get messages for a conversation
router.get("/messages", authenticateToken, async (req, res) => {
  try {
    const { class: className, otherUser } = req.query;
    const username = req.user.username;
    
    if (!className || !otherUser) {
      return res.status(400).json({ error: "Class and otherUser are required" });
    }
    
    // Verify user is in the class
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    const isInClass = cls.students.includes(username) || cls.teacher === username;
    if (!isInClass) {
      return res.status(403).json({ error: "You are not in this class" });
    }
    
    // Get messages between the two users
    const messages = await Message.find({
      class: className,
      $or: [
        { sender: username, recipient: otherUser },
        { sender: otherUser, recipient: username }
      ]
    }).sort({ createdAt: 1 });
    
    res.json(messages);
  } catch (err) {
    console.error("Get messages error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// Send a message
router.post("/messages", authenticateToken, async (req, res) => {
  try {
    const { class: className, recipient, content } = req.body;
    const sender = req.user.username;
    
    if (!className || !recipient || !content) {
      return res.status(400).json({ error: "Class, recipient, and content are required" });
    }
    
    // Verify both users are in the class
    const cls = await Class.findOne({ name: className });
    if (!cls) {
      return res.status(404).json({ error: "Class not found" });
    }
    
    const senderInClass = cls.students.includes(sender) || cls.teacher === sender;
    const recipientInClass = cls.students.includes(recipient) || cls.teacher === recipient;
    
    if (!senderInClass || !recipientInClass) {
      return res.status(403).json({ error: "Both users must be in the class" });
    }
    
    // Get user names
    const senderUser = await User.findOne({ username: sender });
    const recipientUser = await User.findOne({ username: recipient });
    
    const message = new Message({
      class: className,
      sender,
      senderName: senderUser?.name || sender,
      recipient,
      recipientName: recipientUser?.name || recipient,
      content,
      read: false
    });
    
    await message.save();
    
    // Emit socket event if available
    if (req.app.io) {
      req.app.io.to(`class:${className}`).emit('new-message', message);
    }
    
    res.status(201).json({ message: "Message sent successfully", data: message });
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Mark messages as read
router.patch("/messages/read", authenticateToken, async (req, res) => {
  try {
    const { class: className, sender } = req.body;
    const recipient = req.user.username;
    
    if (!className || !sender) {
      return res.status(400).json({ error: "Class and sender are required" });
    }
    
    await Message.updateMany(
      { class: className, sender, recipient, read: false },
      { read: true, readAt: new Date() }
    );
    
    res.json({ message: "Messages marked as read" });
  } catch (err) {
    console.error("Mark messages read error:", err);
    res.status(500).json({ error: "Failed to mark messages as read" });
  }
});

// Get unread message count
router.get("/messages/unread-count", authenticateToken, async (req, res) => {
  try {
    const { class: className } = req.query;
    const username = req.user.username;
    
    const filter = { recipient: username, read: false };
    if (className) {
      filter.class = className;
    }
    
    const count = await Message.countDocuments(filter);
    res.json({ count });
  } catch (err) {
    console.error("Get unread count error:", err);
    res.status(500).json({ error: "Failed to get unread count" });
  }
});

export default router;
