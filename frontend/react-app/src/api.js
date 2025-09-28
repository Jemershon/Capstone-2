// Determine the API base URL from environment variables or use the default
export const API_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
	? import.meta.env.VITE_API_URL
	: (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
		? process.env.REACT_APP_API_URL
		: 'http://localhost:4000';

// Debug API URL during initialization
console.log('🔌 API_BASE_URL initialized as:', API_BASE_URL);

// Helper functions for working with authentication
export const getAuthToken = () => localStorage.getItem('token');
export const getUsername = () => localStorage.getItem('username');
export const getUserRole = () => localStorage.getItem('userRole');

// Enhanced auth check that validates token existence
export const checkAuth = () => {
  const token = getAuthToken();
  if (!token) {
    return false;
  }
  
  // Basic validation that token exists and has expected format
  try {
    // Check if token is in correct JWT format (header.payload.signature)
    // This doesn't validate the signature, just ensures it has the right structure
    const parts = token.split('.');
    return parts.length === 3;
  } catch (error) {
    console.error('Token validation error:', error);
    return false;
  }
};

// Function to save authentication data
export const setAuthData = (token, username, role) => {
  localStorage.setItem('token', token);
  localStorage.setItem('username', username);
  localStorage.setItem('userRole', role);
};

// Function to clear authentication data on logout
export const clearAuthData = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('userRole');
};

