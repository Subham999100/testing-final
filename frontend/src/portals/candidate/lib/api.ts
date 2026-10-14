// ============================================================
// Clyptus Job Portal - Candidate Portal
// Dedicated Axios API Client
// Strict token isolation: clyptus_candidate_token in localStorage
// ============================================================

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { ApiError, CandidateNotification, CandidateSavedJob, CandidateFullProfile } from './types';

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
  // When posting FormData, remove Content-Type so browser sets multipart boundary automatically
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
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

    const responseData = error.response?.data;
    const serverError = responseData?.error;
    const resolvedMessage =
      (typeof serverError === 'object' ? serverError?.message : null) ||
      (typeof serverError === 'string' ? serverError : null) ||
      (typeof responseData?.message === 'string' ? responseData.message : null) ||
      (Array.isArray(responseData?.message) ? responseData.message.join(', ') : null) ||
      error.message ||
      'An unexpected error occurred';

    const errorPayload: ApiError = {
      code: (typeof serverError === 'object' ? serverError?.code : null) || (status ? `HTTP_${status}` : 'NETWORK_ERROR'),
      message: resolvedMessage,
      details: (typeof serverError === 'object' ? serverError?.details : null) || responseData?.details,
      status,
      rawMessages: Array.isArray(responseData?.message) ? responseData.message : undefined,
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

  async uploadPhoto(file: Blob | File): Promise<{ photoUrl: string }> {
    const formData = new FormData();
    formData.append('avatar', file, 'avatar.webp');
    return candidateApi.upload<{ photoUrl: string }>('/candidate/profile/photo', formData);
  },

  async deletePhoto(): Promise<{ success: boolean; photoUrl: null }> {
    return candidateApi.delete<{ success: boolean; photoUrl: null }>('/candidate/profile/photo');
  },

  async uploadCover(file: Blob | File): Promise<{ coverUrl: string }> {
    const formData = new FormData();
    formData.append('cover', file, 'cover.webp');
    return candidateApi.upload<{ coverUrl: string }>('/candidate/profile/cover', formData);
  },

  async deleteCover(): Promise<{ success: boolean; coverUrl: null }> {
    return candidateApi.delete<{ success: boolean; coverUrl: null }>('/candidate/profile/cover');
  },

  async updateProfile<T = any>(data: any): Promise<T> {
    return candidateApi.patch<T>('/candidate/profile', data);
  },

  async getVideoProfile<T = any>(): Promise<T> {
    return candidateApi.get<T>('/candidate/video-profile');
  },

  async uploadVideoProfile<T = any>(
    file: Blob | File,
    consent: boolean,
    durationSeconds?: number,
    onUploadProgress?: (progressEvent: any) => void,
  ): Promise<T> {
    const videoFile =
      file instanceof File
        ? file
        : new File([file], 'video-profile.webm', { type: file.type || 'video/webm' });

    const formData = new FormData();
    formData.append('video', videoFile, videoFile.name || 'video-profile.webm');
    formData.append('consent', String(consent));
    formData.append('consentGiven', String(consent));
    if (durationSeconds != null) {
      formData.append('durationSeconds', String(durationSeconds));
      formData.append('clientDurationSeconds', String(durationSeconds));
    }

    return candidateAxios.post('/candidate/video-profile', formData, {
      onUploadProgress,
      timeout: 120000,
    }) as Promise<T>;
  },

  async deleteVideoProfile<T = any>(): Promise<T> {
    return candidateApi.delete<T>('/candidate/video-profile');
  },

  // ============================================================
  // TYPED MOCK DATA LAYER (Backed by localStorage for instant swap)
  // ============================================================

  // 1. SAVED JOBS
  async getSavedJobs(): Promise<CandidateSavedJob[]> {
    try {
      const raw = localStorage.getItem('clyptus_candidate_saved_jobs');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  async toggleSaveJob(job: {
    id: string;
    title: string;
    companyName: string;
    location: string;
    workMode: string;
    salaryMin?: number;
    salaryMax?: number;
    department?: string;
  }): Promise<{ saved: boolean; jobs: CandidateSavedJob[] }> {
    try {
      const current = await candidateApi.getSavedJobs();
      const exists = current.some((j) => j.jobId === job.id);
      let updated: CandidateSavedJob[];
      if (exists) {
        updated = current.filter((j) => j.jobId !== job.id);
      } else {
        const newSaved: CandidateSavedJob = {
          id: `saved-${Date.now()}`,
          jobId: job.id,
          title: job.title,
          companyName: job.companyName,
          location: job.location,
          workMode: job.workMode,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          savedAt: new Date().toISOString(),
          department: job.department,
        };
        updated = [newSaved, ...current];
      }
      localStorage.setItem('clyptus_candidate_saved_jobs', JSON.stringify(updated));
      return { saved: !exists, jobs: updated };
    } catch {
      return { saved: false, jobs: [] };
    }
  },

  async isJobSaved(jobId: string): Promise<boolean> {
    const jobs = await candidateApi.getSavedJobs();
    return jobs.some((j) => j.jobId === jobId);
  },

  // 2. NOTIFICATIONS
  async getNotifications(): Promise<CandidateNotification[]> {
    try {
      const raw = localStorage.getItem('clyptus_candidate_notifications');
      if (raw) return JSON.parse(raw);
      // Seed default initial notifications
      const defaults: CandidateNotification[] = [
        {
          id: 'notif-1',
          title: 'Application Shortlisted',
          message: 'Your application for Senior Frontend Engineer was shortlisted by Acme Corp.',
          type: 'APPLICATION_STATUS',
          read: false,
          createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          link: '/candidate/applications',
        },
        {
          id: 'notif-2',
          title: 'AI Video Profile Recommendation',
          message: 'Add an interactive AI Video Profile to increase interview requests by up to 3x.',
          type: 'PROFILE_TIP',
          read: false,
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
          link: '/candidate/profile',
        },
        {
          id: 'notif-3',
          title: 'New Job Matches',
          message: '3 new jobs match your preferences in Bengaluru (Remote / Hybrid).',
          type: 'JOB_RECOMMENDATION',
          read: true,
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          link: '/jobs',
        },
      ];
      localStorage.setItem('clyptus_candidate_notifications', JSON.stringify(defaults));
      return defaults;
    } catch {
      return [];
    }
  },

  async markNotificationRead(id: string): Promise<CandidateNotification[]> {
    try {
      const list = await candidateApi.getNotifications();
      const updated = list.map((n) => (n.id === id ? { ...n, read: true } : n));
      localStorage.setItem('clyptus_candidate_notifications', JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  async markAllNotificationsRead(): Promise<CandidateNotification[]> {
    try {
      const list = await candidateApi.getNotifications();
      const updated = list.map((n) => ({ ...n, read: true }));
      localStorage.setItem('clyptus_candidate_notifications', JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
  },

  // 3. SHARE PROFILE TOKEN & PUBLIC VIEW
  async getShareProfileConfig(): Promise<{ enabled: boolean; token: string }> {
    try {
      const raw = localStorage.getItem('clyptus_candidate_share_config');
      if (raw) return JSON.parse(raw);
      const generated = {
        enabled: false,
        token: Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8),
      };
      localStorage.setItem('clyptus_candidate_share_config', JSON.stringify(generated));
      return generated;
    } catch {
      return { enabled: false, token: 'public-preview' };
    }
  },

  async toggleShareProfile(enabled: boolean): Promise<{ enabled: boolean; token: string }> {
    const config = await candidateApi.getShareProfileConfig();
    const updated = { ...config, enabled };
    localStorage.setItem('clyptus_candidate_share_config', JSON.stringify(updated));
    return updated;
  },

  async regenerateShareProfileToken(): Promise<{ enabled: boolean; token: string }> {
    const newToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 8);
    const updated = { enabled: true, token: newToken };
    localStorage.setItem('clyptus_candidate_share_config', JSON.stringify(updated));
    return updated;
  },

  // 4. APPLICATION WITHDRAW
  async withdrawApplication(applicationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const raw = localStorage.getItem('clyptus_candidate_withdrawn_apps');
      const withdrawn: string[] = raw ? JSON.parse(raw) : [];
      if (!withdrawn.includes(applicationId)) {
        withdrawn.push(applicationId);
        localStorage.setItem('clyptus_candidate_withdrawn_apps', JSON.stringify(withdrawn));
      }
      return { success: true, message: 'Application withdrawn successfully.' };
    } catch {
      return { success: true, message: 'Application withdrawn.' };
    }
  },

  getWithdrawnApplicationIds(): string[] {
    try {
      const raw = localStorage.getItem('clyptus_candidate_withdrawn_apps');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};



