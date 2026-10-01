// ============================================================
// Organisation portal — session & permissions.
// Permissions come from /org/auth/me (resolved server-side). They are
// only used to hide or disable UI; the API enforces every rule.
// ============================================================

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { api, Me, Wallet } from './api';
import { qk, STALE } from './queryKeys';

export const TOKEN_KEY = 'clyptus_token';

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export function useMe() {
  return useQuery({
    queryKey: qk.me,
    queryFn: () => api.get<Me>('/org/auth/me'),
    staleTime: STALE.list,
    retry: false,
    enabled: !!getToken(),
  });
}

export function usePermissions() {
  const { data: me } = useMe();
  const set = useMemo(() => new Set(me?.permissions ?? []), [me?.permissions]);
  const can = useCallback((...keys: string[]) => keys.some((k) => set.has(k)), [set]);
  return { me, can, role: me?.user.role };
}

export function useWallet() {
  const { can } = usePermissions();
  return useQuery({
    queryKey: qk.tokens.wallet,
    queryFn: () => api.get<Wallet>('/org/tokens/wallet'),
    staleTime: STALE.list,
    enabled: can('tokens.read'),
  });
}

export async function login(email: string, password: string) {
  const res = await api.post<{ accessToken: string }>('/org/auth/login', { email, password });
  localStorage.setItem(TOKEN_KEY, res.accessToken);
}

export function useLogout() {
  const qc = useQueryClient();
  return useCallback(async () => {
    try {
      await api.post('/org/auth/logout');
    } catch {
      // session may already be gone
    }
    localStorage.removeItem(TOKEN_KEY);
    qc.clear();
    window.location.assign('/org/login');
  }, [qc]);
}

export const ROLE_LABEL: Record<string, string> = {
  ORGANISATION_SUPER_ADMIN: 'Org Super Admin',
  ORGANISATION_ADMIN: 'Org Admin',
  RECRUITER: 'Recruiter',
};
