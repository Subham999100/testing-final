// ============================================================
// Clyptus Job Portal - Protected Route Component
// Restricts access to authenticated Platform Admin & Super Admin users
// ============================================================

import React, { useEffect } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { Loader2 } from 'lucide-react';

export const ProtectedRoute: React.FC = () => {
  const { user, isInitializing, initAuth } = useAuthStore();
  const location = useLocation();

  useEffect(() => {
    initAuth();
  }, [initAuth]);

  if (isInitializing) {
    return (
      <div className="min-h-screen w-full bg-[#080d1a] flex flex-col items-center justify-center text-slate-200">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm text-slate-400 font-mono">Authenticating secure platform session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/platform/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};
