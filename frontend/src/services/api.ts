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

// Attach isolated JWT from localStorage based on portal context
apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const isOrgRequest = url.startsWith('/org') || url.startsWith('org');
  const token = isOrgRequest
    ? localStorage.getItem('clyptus_org_token')
    : localStorage.getItem('clyptus_platform_token');

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
