// ============================================================
// Clyptus Job Portal - Candidate Portal Session Management
// Token Storage: clyptus_candidate_token stored in localStorage
//
// SECURITY NOTE (XSS Risk Mitigation):
// Storing JWT bearer tokens in localStorage allows persistent candidate
// sessions across browser restarts, but exposes the token to potential
// script access if an XSS vulnerability exists. In production environments
// where sensitive personal candidate data is processed, consider pairing
// with HttpOnly secure refresh cookies and strict CSP headers.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect } from 'react';
import { candidateApi, clearCandidateToken, getCandidateToken, setCandidateToken } from './api';
import { candidateQueryKeys } from './queryKeys';
import {
  CandidateAuthResult,
  CandidateLoginRequest,
  CandidateMeResult,
  CandidateRegisterRequest,
} from './types';

export function useCandidateMe() {
  const token = getCandidateToken();

  return useQuery({
    queryKey: candidateQueryKeys.me,
    queryFn: () => candidateApi.get<CandidateMeResult>('/candidate/auth/me'),
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error: any) => {
      // Do not retry on 401/403 auth failures
      if (error?.status === 401 || error?.status === 403) return false;
      return failureCount < 2;
    },
  });
}

export function useCandidateAuth() {
  const queryClient = useQueryClient();
  const token = getCandidateToken();
  const { data: me, isLoading, error, refetch } = useCandidateMe();

  const login = useCallback(
    async (credentials: CandidateLoginRequest): Promise<CandidateAuthResult> => {
      const result = await candidateApi.post<CandidateAuthResult>(
        '/candidate/auth/login',
        credentials,
      );
      setCandidateToken(result.accessToken);
      // Pre-seed me query in cache
      queryClient.setQueryData(candidateQueryKeys.me, {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
        createdAt: result.user.createdAt || new Date().toISOString(),
        profile: result.profile,
      } as CandidateMeResult);
      return result;
    },
    [queryClient],
  );

  const register = useCallback(
    async (payload: CandidateRegisterRequest): Promise<CandidateAuthResult> => {
      const result = await candidateApi.post<CandidateAuthResult>(
        '/candidate/auth/register',
        payload,
      );
      setCandidateToken(result.accessToken);
      queryClient.setQueryData(candidateQueryKeys.me, {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        role: result.user.role,
        isEmailVerified: result.user.isEmailVerified,
        createdAt: result.user.createdAt || new Date().toISOString(),
        profile: result.profile,
      } as CandidateMeResult);
      return result;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    try {
      if (getCandidateToken()) {
        await candidateApi.post('/candidate/auth/logout');
      }
    } catch {
      // Ignore server logout errors; client logout must proceed
    } finally {
      clearCandidateToken();
      queryClient.removeQueries({ queryKey: candidateQueryKeys.me });
      queryClient.removeQueries({ queryKey: candidateQueryKeys.applications.all });
      queryClient.removeQueries({ queryKey: candidateQueryKeys.profile });
      queryClient.removeQueries({ queryKey: candidateQueryKeys.resume });
      window.location.assign('/login');
    }
  }, [queryClient]);

  // Listen for session expired events
  useEffect(() => {
    const handleExpired = () => {
      clearCandidateToken();
      queryClient.removeQueries({ queryKey: candidateQueryKeys.me });
    };
    window.addEventListener('clyptus:candidate-session-expired', handleExpired);
    return () => {
      window.removeEventListener('clyptus:candidate-session-expired', handleExpired);
    };
  }, [queryClient]);

  const isAuthenticated = Boolean(token && me && !error);

  return {
    user: me,
    profile: me?.profile ?? null,
    isAuthenticated,
    isLoading: !!token && isLoading,
    login,
    register,
    logout,
    refetchMe: refetch,
  };
}
