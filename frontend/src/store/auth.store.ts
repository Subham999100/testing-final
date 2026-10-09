// ============================================================
// Clyptus Job Portal - Shared Platform Authentication Store
// Used by Platform Super Admin and Platform Admin.
// ============================================================

import { create } from "zustand";
import {
  AuthService,
  AuthUser,
  PlatformLoginRole,
} from "../services/auth.service";
import {
  clearPlatformAccessToken,
  getPlatformAccessToken,
  setPlatformAccessToken,
  hasRememberedSession,
  setRememberedSession,
} from "../services/auth-session";

interface AuthState {
  user: AuthUser | null;
  notificationsCount: number;
  isHydrating: boolean;
  isAuthenticating: boolean;
  authError: string | null;
  login: (
    email: string,
    password: string,
    expectedRole?: PlatformLoginRole,
    rememberMe?: boolean,
  ) => Promise<AuthUser>;
  restoreSession: () => Promise<void>;
  logout: () => Promise<void>;
  clearSession: () => void;
  clearAuthError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  notificationsCount: 0,
  isHydrating: Boolean(getPlatformAccessToken() || hasRememberedSession()),
  isAuthenticating: false,
  authError: null,

  login: async (email, password, expectedRole, rememberMe = false) => {
    set({ isAuthenticating: true, authError: null });
    try {
      const result = await AuthService.login(
        email,
        password,
        expectedRole,
        rememberMe,
      );
      setPlatformAccessToken(result.accessToken);
      setRememberedSession(rememberMe);
      set({
        user: result.user,
        isAuthenticating: false,
        isHydrating: false,
        authError: null,
      });
      return result.user;
    } catch (error: any) {
      clearPlatformAccessToken();
      setRememberedSession(false);
      const message =
        error?.message || "Unable to sign in to the Platform Portal";
      set({
        user: null,
        isAuthenticating: false,
        isHydrating: false,
        authError: message,
      });
      throw error;
    }
  },

  restoreSession: async () => {
    const token = getPlatformAccessToken();
    if (!token && !hasRememberedSession()) {
      set({ user: null, isHydrating: false });
      return;
    }

    set({ isHydrating: true });
    try {
      const user = await AuthService.me();
      set({ user, isHydrating: false, authError: null });
    } catch {
      clearPlatformAccessToken();
      setRememberedSession(false);
      set({ user: null, isHydrating: false });
    }
  },

  logout: async () => {
    try {
      if (getPlatformAccessToken() || hasRememberedSession()) {
        await AuthService.logout();
      }
    } catch {
      // Local logout must still complete if the server session already expired/revoked.
    } finally {
      clearPlatformAccessToken();
      setRememberedSession(false);
      set({ user: null, notificationsCount: 0, authError: null });
    }
  },

  clearSession: () => {
    clearPlatformAccessToken();
    setRememberedSession(false);
    set({ user: null, notificationsCount: 0, isHydrating: false });
  },

  clearAuthError: () => set({ authError: null }),
}));
