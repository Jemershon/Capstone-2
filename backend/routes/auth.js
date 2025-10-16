import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import crypto from "crypto";
import User from "../models/User.js";

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;
    if (!name || !username || !email || !password || !["Student", "Teacher"].includes(role)) {
      return res.status(400).json({ error: "Invalid input data" });
    }
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).json({ error: "Username or email already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, username, email, password: hashedPassword, role });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

// Login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login attempt for username:", username);
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    const user = await User.findOne({ username });
    console.log("User found:", user ? "Yes" : "No");
    if (user) {
      console.log("User role:", user.role);
      console.log("Password match:", await bcrypt.compare(password, user.password));
    }
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id, role: user.role, username: user.username }, process.env.JWT_SECRET || "devsecret123", {
      expiresIn: "1h",
    });
    res.json({ token, user: { role: user.role, username: user.username } });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    console.log("Forgot password request received:", req.body);
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await User.findOne({ email });
    console.log("User found:", !!user);
    if (!user) {
      // Don't reveal if email exists for security
      return res.json({ message: "If an account with that email exists, we've sent password reset instructions." });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpiry = Date.now() + 3600000; // 1 hour
    console.log("Generated reset token");

    // Save token to user
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    await user.save();
    console.log("Token saved to user");


    // Create transporter with explicit timeouts so SMTP problems don't hang requests
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      // timeouts (ms) - keep small to avoid long blocking
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000
    });
    console.log("Transporter created (non-blocking)");

    // Email content
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    // Fire-and-forget sendMail with internal logging to avoid blocking the response.
    // Use then/catch instead of await so the HTTP response is immediate.
    try {
      transporter.sendMail(mailOptions)
        .then(info => console.log('Background email sent:', info && info.messageId ? info.messageId : info))
        .catch(err => console.error('Background email send failed:', err && err.stack ? err.stack : err));
    } catch (bgErr) {
      console.error('Failed to start background sendMail:', bgErr && bgErr.stack ? bgErr.stack : bgErr);
    }

    // Always return success message immediately to avoid account enumeration and client hang
    res.json({ message: "If an account with that email exists, we've sent password reset instructions." });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password reset successfully" });

  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;

// Debug endpoint: POST /api/debug/send-test-email
// Body: { to: 'recipient@example.com' }
// Useful after deployment to verify SMTP works and to inspect error messages in logs.
router.post('/debug/send-test-email', async (req, res) => {
  try {
    const { to } = req.body || {};
    if (!to) return res.status(400).json({ error: 'Missing `to` address in body' });

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
    });

    // Wrap verify in a timeout so the endpoint doesn't hang
    const verifyPromise = transporter.verify().then(() => ({ ok: true })).catch(e => ({ ok: false, error: e && e.message ? e.message : String(e) }));
    const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'verify timeout' }), 7000));
    const verifyResult = await Promise.race([verifyPromise, timeoutPromise]);

    let sendResult = null;
    if (verifyResult.ok) {
      // send with a small timeout wrapper
      try {
        const sendPromise = transporter.sendMail({ from: process.env.EMAIL_USER, to, subject: 'Test Email', text: 'This is a test email from debug endpoint.' }).then(() => ({ ok: true })).catch(e => ({ ok: false, error: e && e.message ? e.message : String(e) }));
        const sendTimeout = new Promise(resolve => setTimeout(() => resolve({ ok: false, error: 'send timeout' }), 7000));
        sendResult = await Promise.race([sendPromise, sendTimeout]);
      } catch (sendErr) {
        sendResult = { ok: false, error: sendErr && sendErr.message ? sendErr.message : String(sendErr) };
      }
    }

    return res.json({ verifyResult, sendResult });
  } catch (err) {
    console.error('Debug send-test-email error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Debug endpoint failed', details: err && err.message ? err.message : String(err) });
  }
});