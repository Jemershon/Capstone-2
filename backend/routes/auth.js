import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
// removed nodemailer; use SendGrid API for email delivery
import axios from 'axios';
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


    // Email content
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const mailHtml = `
        <h2>Password Reset Request</h2>
        <p>You requested a password reset for your account.</p>
        <p>Click the link below to reset your password:</p>
        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `;

    // Try SendGrid API if configured (non-blocking). If not configured, just log the reset URL so devs can use it.
    (async () => {
      if (process.env.SENDGRID_API_KEY) {
        try {
          await axios.post('https://api.sendgrid.com/v3/mail/send', {
            personalizations: [{ to: [{ email }], subject: 'Password Reset Request' }],
            from: { email: process.env.EMAIL_USER },
            content: [{ type: 'text/html', value: mailHtml }]
          }, { headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 7000 });
          console.log('Background email sent via SendGrid to', email);
        } catch (sgErr) {
          console.error('SendGrid send failed:', sgErr && sgErr.response ? sgErr.response.data : sgErr && sgErr.message ? sgErr.message : sgErr);
        }
      } else {
        console.log('No mail provider configured; reset URL for', email, resetUrl);
      }
    })();

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

// Request OTP via email
// Body: { email }
router.post('/request-reset-otp', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal existence
      return res.json({ message: 'If an account with that email exists, an OTP was sent.' });
    }

    // Generate 6-digit OTP
    const otp = ('' + Math.floor(100000 + Math.random() * 900000));
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    const otpHash = await bcrypt.hash(otp, 10);

    user.resetOTPHash = otpHash;
    user.resetOTPExpiry = otpExpiry;
    user.resetOTPAttempts = 0;
    await user.save();

    const mailHtml = `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`;

    // Send via SendGrid API if configured; otherwise log OTP to server (dev)
    (async () => {
      if (process.env.SENDGRID_API_KEY) {
        try {
          await axios.post('https://api.sendgrid.com/v3/mail/send', {
            personalizations: [{ to: [{ email: user.email }], subject: 'Your verification code' }],
            from: { email: process.env.EMAIL_USER },
            content: [{ type: 'text/html', value: mailHtml }]
          }, { headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 7000 });
          console.log('OTP email sent via SendGrid to', user.email);
        } catch (sgErr) {
          console.error('SendGrid send failed for OTP:', sgErr && sgErr.response ? sgErr.response.data : sgErr && sgErr.message ? sgErr.message : sgErr);
        }
      } else {
        console.log('DEV OTP for', user.email, otp);
      }
    })();

    return res.json({ message: 'If an account with that email exists, an OTP was sent.' });
  } catch (err) {
    console.error('request-reset-otp error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to request OTP' });
  }
});

// Verify OTP and reset password
// Body: { email, otp, newPassword }
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body || {};
    if (!email || !otp || !newPassword) return res.status(400).json({ error: 'Email, OTP and new password are required' });

    const user = await User.findOne({ email });
    if (!user || !user.resetOTPHash || !user.resetOTPExpiry) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    if (Date.now() > user.resetOTPExpiry) {
      // Clear expired OTP
      user.resetOTPHash = undefined; user.resetOTPExpiry = undefined; user.resetOTPAttempts = 0;
      await user.save();
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // Enforce attempt limit
    if ((user.resetOTPAttempts || 0) >= 5) {
      return res.status(429).json({ error: 'Too many attempts. Try again later.' });
    }

    const match = await bcrypt.compare(otp, user.resetOTPHash);
    if (!match) {
      user.resetOTPAttempts = (user.resetOTPAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    // OTP valid -> reset password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    // clear OTP and reset tokens
    user.resetOTPHash = undefined; user.resetOTPExpiry = undefined; user.resetOTPAttempts = 0;
    user.resetToken = undefined; user.resetTokenExpiry = undefined;
    await user.save();

    return res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error('verify-reset-otp error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Failed to verify OTP' });
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
    // Try SendGrid API (if configured) or log when not available
    let verifyResult = { ok: false, error: 'no smtp provider' };
    let sendResult = null;
    if (process.env.SENDGRID_API_KEY) {
      try {
        const r = await axios.post('https://api.sendgrid.com/v3/mail/send', {
          personalizations: [{ to: [{ email: to }] }],
          from: { email: process.env.EMAIL_USER },
          subject: 'Test Email',
          content: [{ type: 'text/plain', value: 'This is a test email from debug endpoint via SendGrid.' }]
        }, { headers: { Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 7000 });
        sendResult = { ok: true, via: 'sendgrid', status: r.status };
      } catch (sgErr) {
        if (sgErr && sgErr.response) {
          sendResult = { ok: false, via: 'sendgrid', status: sgErr.response.status, body: sgErr.response.data };
        } else {
          sendResult = { ok: false, via: 'sendgrid', error: sgErr && sgErr.message ? sgErr.message : String(sgErr) };
        }
      }
    } else {
      console.log('No mail provider configured on host; debug endpoint will not send mail. Requested to:', to);
      sendResult = { ok: false, error: 'no-mail-provider' };
    }

    return res.json({ verifyResult, sendResult });
  } catch (err) {
    console.error('Debug send-test-email error:', err && err.stack ? err.stack : err);
    return res.status(500).json({ error: 'Debug endpoint failed', details: err && err.message ? err.message : String(err) });
  }
});