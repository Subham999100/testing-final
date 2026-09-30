// ============================================================
// Clyptus Job Portal - Platform Session Store
// Manages authenticated platform user context (Super Admin or Platform Admin)
//
// IMPORTANT: This store calls real backend endpoints.
// - login() → POST /platform/auth/login (validates credentials, creates session)
// - logout() → POST /platform/auth/logout (revokes session server-side)
// - initAuth() → GET /platform/auth/me (validates session on app reload)
// The JWT is stored in localStorage under 'clyptus_token'.
// The backend's JwtAuthGuard validates every request against the session DB.
// ============================================================

import { create } from 'zustand';
import { UserRole } from '../types/platform.types';
import { apiClient } from '../services/api';

export interface UserSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  token: string;
}

interface AuthState {
  user: UserSession | null;
  isInitializing: boolean;
  isLoggingIn: boolean;
  loginError: string | null;
  notificationsCount: number;
  initAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearLoginError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isInitializing: true,
  isLoggingIn: false,
  loginError: null,
  notificationsCount: 0,

  initAuth: async () => {
    const token = localStorage.getItem('clyptus_token');
    if (!token) {
      set({ user: null, isInitializing: false });
      return;
    }

    try {
      const res: any = await apiClient.get('/platform/auth/me');
      const data = res.data || res;

      set({
        user: {
          userId: data.id || data.userId,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          role: data.role,
          permissions: data.permissions || [],
          token,
        },
        isInitializing: false,
      });
    } catch {
      // Invalid/expired/revoked session
      localStorage.removeItem('clyptus_token');
      set({ user: null, isInitializing: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoggingIn: true, loginError: null });
    try {
      const res: any = await apiClient.post('/platform/auth/login', { email, password });
      const data = res.data || res;

      // Store the JWT so the request interceptor in api.ts attaches it
      localStorage.setItem('clyptus_token', data.accessToken);

      set({
        user: {
          userId: data.user.id || data.user.userId,
          email: data.user.email,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          role: data.user.role,
          permissions: data.user.permissions || [],
          token: data.accessToken,
        },
        isLoggingIn: false,
        loginError: null,
      });
    } catch (err: any) {
      localStorage.removeItem('clyptus_token');
      set({
        user: null,
        isLoggingIn: false,
        loginError: err?.message || 'Invalid credentials',
      });
      throw err;
    }
  },

  logout: async () => {
    try {
      // Revoke session server-side — JwtAuthGuard will block the token immediately
      await apiClient.post('/platform/auth/logout');
    } catch {
      // Even if the network call fails, clear the local session
    } finally {
      localStorage.removeItem('clyptus_token');
      set({ user: null, loginError: null, notificationsCount: 0 });
    }
  },

  clearLoginError: () => set({ loginError: null }),
}));
