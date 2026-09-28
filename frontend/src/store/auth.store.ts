// ============================================================
// Clyptus Job Portal - Platform Session Store
// Manages authenticated platform user context (Super Admin or Platform Admin)
// ============================================================

import { create } from 'zustand';
import { UserRole } from '../types/platform.types';

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
  notificationsCount: number;
  loginAsSuperAdmin: () => void;
  loginAsPlatformAdmin: (permissions?: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: {
    userId: 'usr_super_admin_001',
    email: 'superadmin@clyptus.platform',
    firstName: 'Devendra',
    lastName: 'Vance',
    role: 'PLATFORM_SUPER_ADMIN',
    permissions: ['*'],
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
        permissions: ['*'],
        token: 'jwt_mock_superadmin_token_2026',
      },
    }),
  loginAsPlatformAdmin: (permissions = ['platform.organisations.read', 'platform.audit.read']) =>
    set({
      user: {
        userId: 'usr_admin_ops_001',
        email: 'ops.admin@clyptus.platform',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: 'PLATFORM_ADMIN',
        permissions,
        token: 'jwt_mock_admin_token_2026',
      },
    }),
  logout: () => set({ user: null }),
}));
