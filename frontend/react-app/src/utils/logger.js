/**
 * Production-safe logger utility
 * Only logs in development, silent in production
 */

const isDevelopment = import.meta.env.MODE === 'development';

export const logger = {
  log: (...args) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  
  info: (...args) => {
    if (isDevelopment) {
      console.info(...args);
    }
  },
  
  warn: (...args) => {
    // Always show warnings
    console.warn(...args);
  },
  
  error: (...args) => {
    // Always show errors
    console.error(...args);
  },
  
  debug: (...args) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },
  
  // Conditional logging - only if condition is true AND in development
  conditionalLog: (condition, ...args) => {
    if (isDevelopment && condition) {
      console.log(...args);
    }
  }
};

export default logger;
