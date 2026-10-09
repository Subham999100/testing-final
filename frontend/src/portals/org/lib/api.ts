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
  async supportList(params?: Params): Promise<OrgSupportTicketsResponse> {
    const res = (await apiClient.get('/org/support', { params: clean(params) })) as any;
    return {
      data: res.data ?? [],
      meta: res.meta ?? { page: 1, limit: 15, total: res.data?.length ?? 0, totalPages: 1 },
      summary: res.summary ?? { open: 0, inProgress: 0, resolved: 0 },
    };
  },
  async supportGet(id: string): Promise<OrgSupportTicket> {
    const res = (await apiClient.get(`/org/support/${id}`)) as any;
    return res.data ?? res;
  },
  async supportCreate(body: { subject: string; description: string; priority?: string; category?: string }): Promise<OrgSupportTicket> {
    const res = (await apiClient.post('/org/support', body)) as any;
    return res.data ?? res;
  },
  async supportMessage(id: string, body: { body: string }): Promise<OrgSupportMessage> {
    const res = (await apiClient.post(`/org/support/${id}/messages`, body)) as any;
    return res.data ?? res;
  },
  async getPermissionCatalog(): Promise<OrgPermissionCatalogResponse> {
    return api.get<OrgPermissionCatalogResponse>('/org/permissions/catalog');
  },
  async getMember(id: string): Promise<OrgMemberPermissionDetail> {
    return api.get<OrgMemberPermissionDetail>(`/org/members/${id}`);
  },
  async updateMemberPermissions(id: string, permissions: string[]): Promise<OrgMemberPermissionDetail> {
    return api.put<OrgMemberPermissionDetail>(`/org/members/${id}/permissions`, { permissions });
  },
};

export const orgApi = api;

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
  user: { id: string; email: string; firstName: string; lastName: string; role: OrgRole; title: string | null; timezone: string; mustChangePassword?: boolean };
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

export interface OrgSupportMessage {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

export interface OrgSupportTicket {
  id: string;
  ticketNumber: number;
  subject: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  createdByUser?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
  messages?: OrgSupportMessage[];
}

export interface OrgSupportTicketsResponse {
  data: OrgSupportTicket[];
  meta: PageMeta;
  summary: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

export interface OrgPermissionItem {
  key: string;
  group: string;
  label: string;
  description?: string;
}

export interface OrgPermissionCatalogResponse {
  catalog: OrgPermissionItem[];
  ceilings: Record<OrgRole, string[]>;
  defaults: Record<OrgRole, string[]>;
  grantable: {
    ORGANISATION_ADMIN?: string[];
    RECRUITER?: string[];
  };
}

export interface OrgMemberPermissionDetail {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: OrgRole;
  status: string;
  title: string | null;
  timezone: string;
  joinedAt: string;
  permissions: string[];
  ceiling: string[];
  grantable: string[];
  canManage: boolean;
  tokens: {
    allocated: number;
    consumed: number;
    remaining: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string | null;
    createdAt: string;
  }>;
}
