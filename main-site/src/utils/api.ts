import axios from 'axios';

// Create an Axios instance
const api = axios.create({
  // Use VITE_API_URL if defined, otherwise fallback to local backend on port 5000
  baseURL: (import.meta.env.VITE_API_URL || 'http://localhost:3000') + '/api/offer-letters',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token if needed
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // You can handle global error logging here
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
