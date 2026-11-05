// ============================================================
// Clyptus Job Portal - Shared Platform API Client
// ============================================================

import axios, { AxiosInstance } from 'axios';
import {
  clearPlatformAccessToken,
  getPlatformAccessToken,
} from './auth-session';

export const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

apiClient.interceptors.request.use((config) => {
  const url = config.url || '';
  const isOrgRequest = url.startsWith('/org') || url.startsWith('org');
  const isPlatformRequest =
    url.startsWith('/platform') || url.startsWith('platform');

  const token = isOrgRequest
    ? sessionStorage.getItem('clyptus_org_token')
    : isPlatformRequest
      ? getPlatformAccessToken()
      : undefined;

  const existingAuthorization =
    config.headers?.get?.('Authorization') ??
    config.headers?.Authorization;

  if (token && config.headers && !existingAuthorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  //Form Upload Content-Type Restrictions
  if (config.data instanceof FormData) {
    config.headers?.setContentType(false);
  } 

  return config;
});

apiClient.interceptors.response.use(
  (response) => 
    response.config.responseType === 'blob'
    ? response
    : response.data,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isPlatformRequest = url.startsWith('/platform') || url.startsWith('platform');

    if (status === 401 && isPlatformRequest) {
      clearPlatformAccessToken();
      window.dispatchEvent(
        new CustomEvent('clyptus:platform-session-expired')
      );
    }

    const serverError = error.response?.data?.error;
    const errorPayload = {
      ...(serverError || {
        code: status ? `HTTP_${status}` : 'NETWORK_ERROR',
        message: error.message || 'Failed to connect to platform API server',
      }),
      status,
    };

    return Promise.reject(errorPayload);
  },
);
