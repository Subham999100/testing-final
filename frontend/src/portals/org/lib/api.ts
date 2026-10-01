// ============================================================
// Organisation portal — typed API helpers on top of the shared apiClient.
// apiClient already unwraps the HTTP body ({ success, data, meta }) and
// rejects with the backend error object ({ code, message, details }).
// ============================================================

import { apiClient } from '../../../services/api';

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface ApiError {
  code?: string;
  message?: string;
  details?: unknown;
}

type Envelope<T> = { data: T; meta?: PageMeta };
type Params = Record<string, string | number | boolean | undefined | null>;

function clean(params?: Params) {
  if (!params) return undefined;
  return Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
}

export const api = {
  async get<T>(url: string, params?: Params): Promise<T> {
    const res = (await apiClient.get(url, { params: clean(params) })) as unknown as Envelope<T>;
    return res.data;
  },
  async page<T>(url: string, params?: Params): Promise<Page<T>> {
    const res = (await apiClient.get(url, { params: clean(params) })) as unknown as Envelope<T[]>;
    return { data: res.data ?? [], meta: res.meta ?? { page: 1, limit: 20, total: res.data?.length ?? 0, totalPages: 1 } };
  },
  async post<T>(url: string, body?: unknown): Promise<T> {
    return ((await apiClient.post(url, body ?? {})) as unknown as Envelope<T>).data;
  },
  async patch<T>(url: string, body?: unknown): Promise<T> {
    return ((await apiClient.patch(url, body ?? {})) as unknown as Envelope<T>).data;
  },
  async put<T>(url: string, body?: unknown): Promise<T> {
    return ((await apiClient.put(url, body ?? {})) as unknown as Envelope<T>).data;
  },
  async del<T>(url: string): Promise<T> {
    return ((await apiClient.delete(url)) as unknown as Envelope<T>).data;
  },
  async download(url: string, filename: string) {
    const blob = (await apiClient.get(url, { responseType: 'blob', timeout: 60000 })) as unknown as Blob;
    const href = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = href;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
  },
};

export function errorMessage(err: unknown, fallback = 'Something went wrong'): string {
  const e = err as ApiError;
  return e?.message || fallback;
}

export function isAuthError(err: unknown): boolean {
  const code = (err as ApiError)?.code;
  return code === 'Unauthorized';
}

// ---------------- shared types ----------------

export type OrgRole = 'ORGANISATION_SUPER_ADMIN' | 'ORGANISATION_ADMIN' | 'RECRUITER';
export type JobStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED';
export type Stage = 'APPLIED' | 'SCREENING' | 'SHORTLISTED' | 'INTERVIEW' | 'OFFER' | 'HIRED' | 'REJECTED' | 'WITHDRAWN';

export interface Me {
  user: { id: string; email: string; firstName: string; lastName: string; role: OrgRole; title: string | null; timezone: string };
  organisation: { id: string; name: string; slug: string; status: string; tier: string; maxRecruiters: number; logoUrl: string | null };
  permissions: string[];
  unreadNotifications: number;
  tokens: { balance: number; spendable: number } | null;
}

export interface Wallet {
  balance: number;
  lifetimeReceived: number;
  consumed: number;
  allocatedToMembers: number;
  unallocated: number;
  myAllocation: { allocated: number; consumed: number; remaining: number } | null;
  spendable: number;
  costs: Record<string, number>;
  lowBalanceThreshold: number;
  confirmThreshold: number;
}

export interface UserRef {
  id: string;
  name: string;
  email?: string;
}
