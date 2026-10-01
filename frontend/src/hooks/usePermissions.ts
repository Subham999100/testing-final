// ============================================================
// Clyptus Job Portal - Platform Permission Hook
// Shared between Platform Super Admin & Platform Admin
//
// Logic:
// - PLATFORM_SUPER_ADMIN has unrestricted platform access (root).
// - PLATFORM_ADMIN has access strictly based on assigned permissions.
// ============================================================

import { useAuthStore } from '../store/auth.store';

export const usePermissions = () => {
  const user = useAuthStore((state) => state.user);

  const isSuperAdmin =
    user?.role === 'PLATFORM_SUPER_ADMIN' || (user?.role as string) === 'SUPER_ADMIN';
  const isAdmin =
    user?.role === 'PLATFORM_ADMIN' || (user?.role as string) === 'ADMIN';

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true; // Super admin has root platform access
    const permissions = (user as any).permissions || [];
    return permissions.includes(permission);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.every((p) => hasPermission(p));
  };

  return {
    user,
    role: user?.role,
    isSuperAdmin,
    isAdmin,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};
