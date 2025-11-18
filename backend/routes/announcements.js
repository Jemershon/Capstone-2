import express from "express";
import Announcement from "../models/Announcement.js";
import Notification from "../models/Notification.js";
import Class from "../models/Class.js";
import User from "../models/User.js";
import { authenticateToken, requireTeacherOrAdmin } from "../middlewares/auth.js";
import { sendBulkAnnouncementEmails } from "../services/sendgridService.js";

const router = express.Router();

// List announcements (optionally filter by className)
router.get("/", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 50, className } = req.query;
    const pageInt = Math.max(1, parseInt(page, 10) || 1);
    const limitInt = Math.max(1, parseInt(limit, 10) || 50);
    const filter = {};
    if (className) filter.class = className;

    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageInt - 1) * limitInt)
      .limit(limitInt);

    return res.json(announcements);
  } catch (err) {
    console.error('Get announcements error:', err && err.stack ? err.stack : err);
    if (process.env.NODE_ENV !== 'production') {
      return res.status(500).json({ error: 'Failed to fetch announcements', details: err && err.message ? err.message : String(err) });
    }
    return res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// Create announcement (teacher/admin)
router.post("/", authenticateToken, requireTeacherOrAdmin, async (req, res) => {
  try {
    const { teacher, class: className, message, attachments = [], materialRef = null, examId = null } = req.body;
    const sender = req.user.username;

    if (!className || !message) return res.status(400).json({ error: 'class and message are required' });

    // Find class and students
    const cls = await Class.findOne({ name: className });
    const students = cls ? (cls.students || []) : [];

    const announcement = new Announcement({
      teacher: sender,
      teacherName: req.user?.name || sender,
      class: className,
      message,
      attachments,
      materialRef,
      examId
    });

    await announcement.save();

    // Create notifications for every student in the class
    const createdNotifications = [];
    for (const studentUsername of students) {
      try {
        const notif = new Notification({
          recipient: studentUsername,
          sender: sender,
          senderName: req.user?.name || sender,
          type: 'announcement',
          message: message.length > 200 ? message.substring(0, 197) + '...' : message,
          referenceId: announcement._id,
          class: className
        });
        await notif.save();
        createdNotifications.push(notif);

        // Emit socket event to each user room if socket available
        try {
          if (req.app.io) {
            req.app.io.to(`user:${studentUsername}`).emit('new-notification', notif);
          }
        } catch (e) {
          console.debug('Emit new-notification failed for', studentUsername, e.message || e);
        }
      } catch (innerErr) {
        console.error('Failed to create notification for', studentUsername, innerErr);
      }
    }

    // Emit announcement-created to class room so clients can update stream in real-time
    try {
      if (req.app.io) {
        req.app.io.to(`class:${className}`).emit('announcement-created', announcement);
      }
    } catch (e) {
      console.debug('Emit announcement-created failed', e.message || e);
    }

    // Optionally send announcement emails in background
    (async () => {
      try {
        // Fetch student emails
        if (students.length > 0) {
          const users = await User.find({ username: { $in: students } }).select('email username name');
          const announcementUrl = `${process.env.FRONTEND_URL || ''}/classes/${encodeURIComponent(className)}`;
          await sendBulkAnnouncementEmails(users, req.user?.name || sender, className, message, announcementUrl);
        }
      } catch (emailErr) {
        console.error('Failed to send announcement emails:', emailErr);
      }
    })();

    res.status(201).json({ message: 'Announcement posted', announcement, notifications: createdNotifications.length });
  } catch (err) {
    console.error('Create announcement error:', err);
    res.status(500).json({ error: 'Failed to post announcement' });
  }
});

export default router;
