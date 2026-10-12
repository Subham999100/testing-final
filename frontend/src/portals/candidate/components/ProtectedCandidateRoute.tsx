// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: ProtectedCandidateRoute Guard
// Enforces authenticated candidate access to candidate workspace
// ============================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCandidateToken } from '../lib/api';
import { useCandidateAuth } from '../lib/session';
import { PageSkeleton } from '@/portals/org/ui/ui';

interface ProtectedCandidateRouteProps {
  children?: React.ReactNode;
}

export const ProtectedCandidateRoute: React.FC<ProtectedCandidateRouteProps> = ({ children }) => {
  const token = getCandidateToken();
  const { isAuthenticated, isLoading } = useCandidateAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isLoading) {
    return (
      <div className="candidate-portal min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children ? <>{children}</> : null;
};
