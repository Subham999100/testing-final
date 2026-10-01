import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store';

interface PlatformProtectedRouteProps {
  fallback?: React.ReactNode;
  children?: React.ReactNode;
}

export const PlatformProtectedRoute: React.FC<PlatformProtectedRouteProps> = ({
  fallback,
  children,
}) => {
  const location = useLocation();
  const { user, isHydrating } = useAuthStore();

  if (isHydrating) {
    return (
      <div className="min-h-screen bg-canvas text-ink flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-muted">
          <span className="h-5 w-5 rounded-full border-2 border-brand border-t-transparent animate-spin" />
          Restoring secure platform session...
        </div>
      </div>
    );
  }

  if (!user) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return <Navigate to="/platform" replace state={{ from: location.pathname }} />;
  }

  if (location.pathname === '/platform/access-denied') {
    return children ? <>{children}</> : <Outlet />;
  }

  const isSuperAdmin =
    user.role === 'PLATFORM_SUPER_ADMIN' || (user.role as string) === 'SUPER_ADMIN';
  const isAdmin =
    user.role === 'PLATFORM_ADMIN' || (user.role as string) === 'ADMIN';

  if (!isSuperAdmin && !isAdmin) {
    return <Navigate to="/platform/access-denied" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

