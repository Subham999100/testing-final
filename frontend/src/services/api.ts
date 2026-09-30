// ============================================================
// Clyptus Job Portal - Platform Super Admin API Client
// ============================================================

import axios, { AxiosInstance } from 'axios';

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach real JWT from localStorage — no dev fallback
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('clyptus_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Format responses and handle errors
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorPayload = error.response?.data?.error || {
      code: 'NETWORK_ERROR',
      message: error.message || 'Failed to connect to platform API server',
    };
    return Promise.reject(errorPayload);
  },
);
