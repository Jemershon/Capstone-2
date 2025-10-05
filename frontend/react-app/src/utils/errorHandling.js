// Error Handling Utility Functions
// Centralized error handling for consistent user experience

/**
 * Parse API error responses
 * @param {Error} error - Error object from axios or fetch
 * @returns {string} - User-friendly error message
 */
export const parseError = (error) => {
  // Network errors
  if (!error.response) {
    if (error.message === 'Network Error') {
      return '🌐 Connection lost. Please check your internet connection.';
    }
    return '❌ Unable to reach the server. Please try again.';
  }
  
  // HTTP error responses
  const status = error.response.status;
  const data = error.response.data;
  
  switch (status) {
    case 400:
      return data?.error || '⚠️ Invalid request. Please check your input.';
    case 401:
      return '🔒 Session expired. Please login again.';
    case 403:
      return "🚫 You don't have permission to perform this action.";
    case 404:
      return '🔍 Requested resource not found.';
    case 409:
      return data?.error || '⚠️ This item already exists.';
    case 413:
      return '📦 File too large. Please upload a smaller file.';
    case 429:
      return '⏱️ Too many requests. Please wait and try again.';
    case 500:
      return '⚙️ Server error. Our team has been notified.';
    case 503:
      return '🔧 Service temporarily unavailable. Please try again later.';
    default:
      return data?.error || data?.message || '❌ Something went wrong. Please try again.';
  }
};

/**
 * Handle authentication errors
 * @param {Error} error - Error object
 * @param {Function} navigate - React Router navigate function
 */
export const handleAuthError = (error, navigate) => {
  if (error.response?.status === 401) {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    
    // Redirect to login
    navigate('/', { 
      state: { 
        message: 'Your session has expired. Please login again.',
        from: window.location.pathname 
      }
    });
  }
};

/**
 * Log errors for debugging (can be extended to send to error tracking service)
 * @param {Error} error - Error object
 * @param {string} context - Context where error occurred
 */
export const logError = (error, context = '') => {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    context,
    message: error.message,
    stack: error.stack,
    response: error.response?.data,
    status: error.response?.status
  };
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, errorInfo);
  }
  
  // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  // Example: Sentry.captureException(error, { extra: errorInfo });
};

/**
 * Show user-friendly error notification
 * @param {Error} error - Error object
 * @param {Function} setError - State setter for error message
 * @param {Function} setShowToast - State setter for toast visibility
 * @param {string} context - Context where error occurred
 */
export const showError = (error, setError, setShowToast, context = '') => {
  const errorMessage = parseError(error);
  setError(errorMessage);
  setShowToast(true);
  logError(error, context);
};

/**
 * Retry failed requests with exponential backoff
 * @param {Function} requestFn - Async function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Initial delay in ms
 * @returns {Promise} - Result of the request
 */
export const retryRequest = async (requestFn, maxRetries = 3, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await requestFn();
    } catch (error) {
      const isLastAttempt = i === maxRetries - 1;
      const isNetworkError = !error.response;
      
      if (isLastAttempt || !isNetworkError) {
        throw error;
      }
      
      // Exponential backoff
      const waitTime = delay * Math.pow(2, i);
      console.log(`⏳ Retry attempt ${i + 1}/${maxRetries} in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

/**
 * Network status checker
 * @returns {boolean} - True if online, false if offline
 */
export const isOnline = () => {
  return navigator.onLine;
};

/**
 * Setup offline/online event listeners
 * @param {Function} onOffline - Callback when going offline
 * @param {Function} onOnline - Callback when coming online
 * @returns {Function} - Cleanup function
 */
export const setupNetworkListeners = (onOffline, onOnline) => {
  const handleOffline = () => {
    console.warn('🌐 Network connection lost');
    onOffline?.();
  };
  
  const handleOnline = () => {
    console.log('✅ Network connection restored');
    onOnline?.();
  };
  
  window.addEventListener('offline', handleOffline);
  window.addEventListener('online', handleOnline);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('offline', handleOffline);
    window.removeEventListener('online', handleOnline);
  };
};

/**
 * Validate response data structure
 * @param {object} response - API response
 * @param {Array} requiredFields - Required fields in response
 * @returns {boolean} - True if valid, throws error if invalid
 */
export const validateResponse = (response, requiredFields = []) => {
  if (!response || !response.data) {
    throw new Error('Invalid response structure');
  }
  
  for (const field of requiredFields) {
    if (!(field in response.data)) {
      throw new Error(`Missing required field: ${field}`);
    }
  }
  
  return true;
};
