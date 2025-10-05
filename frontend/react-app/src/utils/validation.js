// Input Validation Utility Functions
// Use these across your application for consistent validation

/**
 * Email validation
 * @param {string} email - Email address to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateEmail = (email) => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  if (email.length > 255) {
    return { isValid: false, error: 'Email is too long' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Password strength validation
 * @param {string} password - Password to validate
 * @returns {object} - { isValid: boolean, error: string, strength: string }
 */
export const validatePassword = (password) => {
  if (!password) {
    return { isValid: false, error: 'Password is required', strength: 'none' };
  }
  
  if (password.length < 8) {
    return { isValid: false, error: 'Password must be at least 8 characters', strength: 'weak' };
  }
  
  if (password.length > 128) {
    return { isValid: false, error: 'Password is too long (max 128 characters)', strength: 'none' };
  }
  
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  let strength = 'weak';
  let strengthScore = 0;
  
  if (hasUpperCase) strengthScore++;
  if (hasLowerCase) strengthScore++;
  if (hasNumber) strengthScore++;
  if (hasSpecialChar) strengthScore++;
  if (password.length >= 12) strengthScore++;
  
  if (strengthScore >= 4) strength = 'strong';
  else if (strengthScore >= 3) strength = 'medium';
  
  if (!hasUpperCase || !hasLowerCase || !hasNumber) {
    return {
      isValid: false,
      error: 'Password must contain uppercase, lowercase, and numbers',
      strength
    };
  }
  
  return { isValid: true, error: '', strength };
};

/**
 * Username validation
 * @param {string} username - Username to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateUsername = (username) => {
  if (!username || username.trim() === '') {
    return { isValid: false, error: 'Username is required' };
  }
  
  if (username.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters' };
  }
  
  if (username.length > 50) {
    return { isValid: false, error: 'Username is too long (max 50 characters)' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Sanitize input to prevent XSS
 * @param {string} input - Input string to sanitize
 * @returns {string} - Sanitized string
 */
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateFile = (file, options = {}) => {
  const {
    maxSize = 25 * 1024 * 1024, // 25MB default
    allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.ppt', '.pptx', '.doc', '.docx']
  } = options;
  
  if (!file) {
    return { isValid: false, error: 'No file selected' };
  }
  
  // Check file size
  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
    return { isValid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  
  // Check file type
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Invalid file type. Please upload PDF, images, or Office documents.' };
  }
  
  // Check file extension
  const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
  if (!allowedExtensions.includes(fileExtension)) {
    return { isValid: false, error: `File extension ${fileExtension} is not allowed` };
  }
  
  // Check for suspicious filenames
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return { isValid: false, error: 'Invalid filename' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Validate class code
 * @param {string} code - Class code to validate
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateClassCode = (code) => {
  if (!code || code.trim() === '') {
    return { isValid: false, error: 'Class code is required' };
  }
  
  if (code.length < 4 || code.length > 20) {
    return { isValid: false, error: 'Class code must be between 4-20 characters' };
  }
  
  const codeRegex = /^[a-zA-Z0-9-]+$/;
  if (!codeRegex.test(code)) {
    return { isValid: false, error: 'Class code can only contain letters, numbers, and hyphens' };
  }
  
  return { isValid: true, error: '' };
};

/**
 * Validate text input (general purpose)
 * @param {string} text - Text to validate
 * @param {object} options - Validation options
 * @returns {object} - { isValid: boolean, error: string }
 */
export const validateText = (text, options = {}) => {
  const {
    fieldName = 'Field',
    minLength = 1,
    maxLength = 500,
    required = true
  } = options;
  
  if (required && (!text || text.trim() === '')) {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  if (!required && !text) {
    return { isValid: true, error: '' };
  }
  
  if (text.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  
  if (text.length > maxLength) {
    return { isValid: false, error: `${fieldName} must not exceed ${maxLength} characters` };
  }
  
  return { isValid: true, error: '' };
};
