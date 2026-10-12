// ============================================================
// Clyptus Job Portal - Candidate Portal
// Dedicated Axios API Client
// Strict token isolation: clyptus_candidate_token in localStorage
// ============================================================

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiError } from './types';

export const CANDIDATE_TOKEN_KEY = 'clyptus_candidate_token';

export function getCandidateToken(): string | null {
  try {
    return localStorage.getItem(CANDIDATE_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setCandidateToken(token: string): void {
  try {
    localStorage.setItem(CANDIDATE_TOKEN_KEY, token);
  } catch {
    // Storage may be unavailable in restricted environments
  }
}

export function clearCandidateToken(): void {
  try {
    localStorage.removeItem(CANDIDATE_TOKEN_KEY);
  } catch {
    // Storage may be unavailable
  }
}

export const candidateAxios: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request interceptor: attach Bearer token from clyptus_candidate_token
candidateAxios.interceptors.request.use((config) => {
  const token = getCandidateToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: unwrap success envelope and handle 401 session expiry
candidateAxios.interceptors.response.use(
  (response) => {
    const body = response.data;
    // Unwrap standard NestJS ApiResponse envelope { success: true, data: T }
    if (body && typeof body === 'object' && 'success' in body && 'data' in body) {
      return body.data;
    }
    return body;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      clearCandidateToken();
      window.dispatchEvent(new CustomEvent('clyptus:candidate-session-expired'));
    }

    const serverError = error.response?.data?.error;
    const errorPayload: ApiError = {
      code: serverError?.code || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      message: serverError?.message || error.message || 'An unexpected error occurred',
      details: serverError?.details,
      status,
    };

    return Promise.reject(errorPayload);
  },
);

type Params = Record<string, string | number | boolean | undefined | null>;

function cleanParams(params?: Params) {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

export const candidateApi = {
  async get<T>(url: string, params?: Params, config?: AxiosRequestConfig): Promise<T> {
    const res = (await candidateAxios.get(url, {
      ...config,
      params: cleanParams(params),
    })) as unknown as T;
    return res;
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = (await candidateAxios.post(url, data, config)) as unknown as T;
    return res;
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = (await candidateAxios.patch(url, data, config)) as unknown as T;
    return res;
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const res = (await candidateAxios.put(url, data, config)) as unknown as T;
    return res;
  },

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const res = (await candidateAxios.delete(url, config)) as unknown as T;
    return res;
  },

  async upload<T>(url: string, formData: FormData, onProgress?: (percent: number) => void): Promise<T> {
    const res = (await candidateAxios.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percent);
        }
      },
    })) as unknown as T;
    return res;
  },

  async downloadBlob(url: string, filename: string): Promise<void> {
    const token = getCandidateToken();
    const response = await axios.get(url, {
      baseURL: import.meta.env.VITE_API_URL || '/api/v1',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      responseType: 'blob',
      timeout: 30000,
    });
    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    const blob = new Blob([response.data], { type: contentType });
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};
