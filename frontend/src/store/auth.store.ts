// ============================================================
// Clyptus Job Portal - Platform Super Admin Session Store
// ============================================================

import { create } from 'zustand';
import { UserRole } from '../types/platform.types';

export interface UserSession {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  token: string;
}

interface AuthState {
  user: UserSession | null;
  notificationsCount: number;
  loginAsSuperAdmin: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    userId: 'usr_super_admin_001',
    email: 'superadmin@clyptus.platform',
    firstName: 'Devendra',
    lastName: 'Vance',
    role: 'PLATFORM_SUPER_ADMIN',
    token: 'jwt_mock_superadmin_token_2026',
  },
  notificationsCount: 3,
  loginAsSuperAdmin: () =>
    set({
      user: {
        userId: 'usr_super_admin_001',
        email: 'superadmin@clyptus.platform',
        firstName: 'Devendra',
        lastName: 'Vance',
        role: 'PLATFORM_SUPER_ADMIN',
        token: 'jwt_mock_superadmin_token_2026',
      },
    }),
  logout: () => set({ user: null }),
}));
