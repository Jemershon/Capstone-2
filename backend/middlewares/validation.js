// Backend validation middleware
// Comprehensive input validation and sanitization

import validator from 'validator';

/**
 * Sanitize string input to prevent XSS
 */
const sanitize = (input) => {
  if (typeof input !== 'string') return input;
  return validator.escape(input).trim();
};

/**
 * Validate and sanitize email
 */
export const validateEmail = (req, res, next) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }
  
  const sanitizedEmail = validator.normalizeEmail(email);
  
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  
  if (sanitizedEmail.length > 255) {
    return res.status(400).json({ error: 'Email is too long' });
  }
  
  req.body.email = sanitizedEmail;
  next();
};

/**
 * Validate password strength
 */
export const validatePassword = (req, res, next) => {
  const { password } = req.body;
  
  if (!password) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }
  
  if (password.length > 128) {
    return res.status(400).json({ error: 'Password is too long' });
  }
  
  // Check for uppercase, lowercase, and number
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return res.status(400).json({ 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    });
  }
  
  next();
};

/**
 * Validate username
 */
export const validateUsername = (req, res, next) => {
  let { username } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }
  
  username = sanitize(username);
  
  if (username.length < 3) {
    return res.status(400).json({ error: 'Username must be at least 3 characters long' });
  }
  
  if (username.length > 50) {
    return res.status(400).json({ error: 'Username is too long (max 50 characters)' });
  }
  
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return res.status(400).json({ error: 'Username can only contain letters, numbers, hyphens, and underscores' });
  }
  
  req.body.username = username;
  next();
};

/**
 * Validate text fields (class names, descriptions, etc.)
 */
export const validateTextField = (fieldName, options = {}) => {
  const { minLength = 1, maxLength = 500, required = true } = options;
  
  return (req, res, next) => {
    let value = req.body[fieldName];
    
    if (required && (!value || value.trim() === '')) {
      return res.status(400).json({ error: `${fieldName} is required` });
    }
    
    if (!required && !value) {
      return next();
    }
    
    value = sanitize(value);
    
    if (value.length < minLength) {
      return res.status(400).json({ error: `${fieldName} must be at least ${minLength} characters` });
    }
    
    if (value.length > maxLength) {
      return res.status(400).json({ error: `${fieldName} must not exceed ${maxLength} characters` });
    }
    
    req.body[fieldName] = value;
    next();
  };
};

/**
 * Validate class code
 */
export const validateClassCode = (req, res, next) => {
  let { classCode } = req.body;
  
  if (!classCode) {
    return res.status(400).json({ error: 'Class code is required' });
  }
  
  classCode = sanitize(classCode);
  
  if (classCode.length < 4 || classCode.length > 20) {
    return res.status(400).json({ error: 'Class code must be between 4-20 characters' });
  }
  
  if (!/^[a-zA-Z0-9-]+$/.test(classCode)) {
    return res.status(400).json({ error: 'Class code can only contain letters, numbers, and hyphens' });
  }
  
  req.body.classCode = classCode;
  next();
};

/**
 * Rate limiting for password reset
 */
const resetAttempts = new Map(); // Store: email -> { count, lastAttempt }

export const rateLimitPasswordReset = (req, res, next) => {
  const { email } = req.body;
  const now = Date.now();
  const hourInMs = 60 * 60 * 1000;
  
  const attempts = resetAttempts.get(email) || { count: 0, lastAttempt: now };
  
  // Reset counter if more than an hour has passed
  if (now - attempts.lastAttempt > hourInMs) {
    attempts.count = 0;
    attempts.lastAttempt = now;
  }
  
  // Check if exceeded limit (3 attempts per hour)
  if (attempts.count >= 3) {
    const timeLeft = Math.ceil((hourInMs - (now - attempts.lastAttempt)) / 60000);
    return res.status(429).json({ 
      error: `Too many password reset attempts. Please try again in ${timeLeft} minutes.` 
    });
  }
  
  // Increment counter
  attempts.count++;
  attempts.lastAttempt = now;
  resetAttempts.set(email, attempts);
  
  next();
};

/**
 * Validate MongoDB ObjectId
 */
export const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const id = req.params[paramName] || req.body[paramName];
    
    if (!id) {
      return res.status(400).json({ error: `${paramName} is required` });
    }
    
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({ error: `Invalid ${paramName} format` });
    }
    
    next();
  };
};

/**
 * Sanitize all string inputs in request body
 */
export const sanitizeBody = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitize(req.body[key]);
      }
    });
  }
  next();
};

/**
 * Validate file upload
 */
export const validateFileUpload = (req, res, next) => {
  if (!req.file && !req.files) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  const file = req.file || (req.files && req.files[0]);
  const maxSize = 25 * 1024 * 1024; // 25MB
  
  if (file.size > maxSize) {
    return res.status(413).json({ error: 'File size exceeds 25MB limit' });
  }
  
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return res.status(400).json({ error: 'Invalid file type. Only PDF, images, and Office documents are allowed.' });
  }
  
  // Check for suspicious filenames
  if (file.originalname.includes('..') || file.originalname.includes('/') || file.originalname.includes('\\')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  
  next();
};

export default {
  validateEmail,
  validatePassword,
  validateUsername,
  validateTextField,
  validateClassCode,
  rateLimitPasswordReset,
  validateObjectId,
  sanitizeBody,
  validateFileUpload
};
