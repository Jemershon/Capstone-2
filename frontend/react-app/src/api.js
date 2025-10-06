import axios from 'axios';

// Read the raw API base value from env (support Vite and older react env var)
const rawApiBase = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL)
  ? import.meta.env.VITE_API_URL
  : (typeof process !== 'undefined' && process.env && process.env.REACT_APP_API_URL)
    ? process.env.REACT_APP_API_URL
    : 'http://localhost:4000';

// Normalize the API base to an absolute URL. Browsers treat values without a
// protocol as relative paths (which causes the current origin to be prepended).
// If the provided value already includes a protocol, keep it. If it looks like
// localhost or 127.x, use http://; otherwise default to https://.
function normalizeApiBase(raw) {
  if (!raw) return raw;
  const trimmed = raw.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/,'');
  if (/^(localhost|127\.|0\.0\.0\.0)/i.test(trimmed)) return `http://${trimmed.replace(/\/+$/,'')}`;
  // default to https for other hosts
  return `https://${trimmed.replace(/\/+$/,'')}`;
}

export const API_BASE_URL = normalizeApiBase(rawApiBase);

// Debug API URL during initialization (show raw and normalized)
console.log('🔌 API_BASE_URL raw value:', rawApiBase);
console.log('🔌 API_BASE_URL normalized to:', API_BASE_URL);

// Set axios default base URL to the normalized API base so that any plain
// axios requests (or third-party libs using axios) will target the correct
// backend origin. Also provide a pre-configured apiClient for callers that
// prefer an instance.
try {
  if (API_BASE_URL) {
    axios.defaults.baseURL = API_BASE_URL;
  }
} catch (e) {
  // Non-fatal — log for visibility
  console.warn('Could not set axios default baseURL:', e);
}

export const apiClient = axios.create({ baseURL: API_BASE_URL });

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

// API Functions for exams
export const updateExam = async (examId, examData) => {
  try {
    const response = await axios.put(
      `${API_BASE_URL}/api/exams/${examId}`,
      examData,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error updating exam:', error.response?.data || error.message);
    throw error;
  }
};

export const deleteExam = async (examId) => {
  try {
    const response = await axios.delete(
      `${API_BASE_URL}/api/exams/${examId}`,
      { headers: { Authorization: `Bearer ${getAuthToken()}` } }
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting exam:', error.response?.data || error.message);
    throw error;
  }
};

