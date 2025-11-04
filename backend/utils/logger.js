/**
 * Backend logger utility
 * Respects NODE_ENV and LOG_LEVEL environment variables
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const logLevel = (process.env.LOG_LEVEL || 'warn').toLowerCase();

const levels = { 
  error: 0, 
  warn: 1, 
  info: 2, 
  debug: 3 
};

const currentLevel = levels[logLevel] ?? 1;

export const logger = {
  error: (...args) => {
    // Always log errors
    console.error('[ERROR]', ...args);
  },
  
  warn: (...args) => {
    if (currentLevel >= 1) {
      console.warn('[WARN]', ...args);
    }
  },
  
  info: (...args) => {
    if (currentLevel >= 2) {
      console.info('[INFO]', ...args);
    }
  },
  
  debug: (...args) => {
    if (currentLevel >= 3) {
      console.debug('[DEBUG]', ...args);
    }
  },
  
  // Development-only logging
  dev: (...args) => {
    if (isDevelopment) {
      console.log('[DEV]', ...args);
    }
  },
  
  // Production-only logging
  prod: (...args) => {
    if (!isDevelopment) {
      console.log('[PROD]', ...args);
    }
  }
};

export default logger;
