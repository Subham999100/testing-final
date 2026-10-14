// ============================================================
// Clyptus Job Portal - Candidate Portal
// Component: ProtectedCandidateRoute Guard
// Enforces authenticated candidate access and completed onboarding
// Incomplete onboarding -> redirects to /onboarding
// ============================================================

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { candidateApi, getCandidateToken } from '../lib/api';
import { useCandidateAuth } from '../lib/session';
import { candidateQueryKeys } from '../lib/queryKeys';
import { OnboardingStatusResponse } from '../lib/types';
import { PageSkeleton } from '@/portals/org/ui/ui';

interface ProtectedCandidateRouteProps {
  children?: React.ReactNode;
}

export const ProtectedCandidateRoute: React.FC<ProtectedCandidateRouteProps> = ({ children }) => {
  const token = getCandidateToken();
  const { isAuthenticated, isLoading: isAuthLoading } = useCandidateAuth();
  const location = useLocation();

  const { data: onboarding, isLoading: isOnboardingLoading } = useQuery({
    queryKey: candidateQueryKeys.onboarding,
    queryFn: () => candidateApi.get<OnboardingStatusResponse>('/candidate/onboarding/status'),
    enabled: !!token && isAuthenticated,
    staleTime: 5000,
  });

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (isAuthLoading || (isAuthenticated && isOnboardingLoading)) {
    return (
      <div className="candidate-portal min-h-screen bg-slate-50 p-6 flex flex-col justify-center items-center">
        <PageSkeleton />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // Incomplete onboarding -> force redirect to /onboarding wizard
  if (onboarding && onboarding.onboardingStatus !== 'COMPLETE') {
    return <Navigate to="/onboarding" replace />;
  }

  return children ? <>{children}</> : null;
};
