/// <reference types="vite/client" />
import axios from 'axios';

// Determine base URL dynamically based on environment
const defaultBaseUrl = 'https://digital-twin-verse-app.onrender.com';

// Create an Axios instance
const api = axios.create({
  baseURL: (import.meta.env.VITE_API_URL || defaultBaseUrl) + '/api/offer-letters',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token if needed
api.interceptors.request.use((config) => {
  let token = localStorage.getItem('token');
  if (!token) {
    try {
      const dtUser = JSON.parse(localStorage.getItem('dt_user') || '{}');
      if (dtUser && dtUser.token) token = dtUser.token;
    } catch (e) {
      // ignore parse error
    }
  }
  
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
