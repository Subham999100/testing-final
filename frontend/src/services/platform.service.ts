// ============================================================
// Clyptus Job Portal - Platform Super Admin Service
// Connects UI with /api/v1/platform/* backend endpoints
// Production requests return real API data or explicit errors.
// ============================================================

import { apiClient } from './api';
import {
  PlatformDashboardSummary,
  Organisation,
  PlatformAdminUser,
  TokenPlan,
  TokenTransaction,
  AuditLogItem,
  SecurityEvent,
  PlatformSetting,
} from '../types/platform.types';
export const PlatformService = {
  async read(path: string, params?: Record<string, unknown>): Promise<any> {
    const response: any = await apiClient.get(`/platform/${path}`, { params });
    return response.meta ? response : (response.data ?? response);
  },
  async write(path: string, body: unknown = {}, method: 'post' | 'patch' = 'post'): Promise<any> {
    if (path === 'organisations' && method === 'post') {
      const p = body as any;
      const sanitized = {
        ...p,
        ...(p?.superAdminPassword ? { superAdminPassword: '[REDACTED]' } : {}),
        ...(p?.superAdminPasswordConfirmation ? { superAdminPasswordConfirmation: '[REDACTED]' } : {}),
      };
      console.log('[PlatformService.write] Path:', path, 'Payload keys:', Object.keys(p || {}));
      console.log('[PlatformService.write] Sanitized payload:', sanitized);
    }
    const response: any = await apiClient[method](`/platform/${path}`, body);
    return response.data ?? response;
  },
  // ------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------
  async getDashboardSummary(): Promise<PlatformDashboardSummary> {
    try {
      const res: any = await apiClient.get('/platform/dashboard');
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  // ------------------------------------------------------------
  // ORGANISATIONS
  // ------------------------------------------------------------
  async getOrganisations(params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    tier?: string;
  }): Promise<{ data: Organisation[]; meta: { total: number; totalPages: number; page: number } }> {
    try {
      const res: any = await apiClient.get('/platform/organisations', { params });
      return res.data ? res : { data: res, meta: { total: res.length, totalPages: 1, page: 1 } };
    } catch (failure) {
      throw failure;
    }
  },

  async getOrganisationById(id: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.get(`/platform/organisations/${id}`);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async createOrganisation(payload: any): Promise<Organisation> {
    try {
      const sanitized = {
        ...payload,
        ...(payload?.superAdminPassword ? { superAdminPassword: '[REDACTED]' } : {}),
        ...(payload?.superAdminPasswordConfirmation
          ? { superAdminPasswordConfirmation: '[REDACTED]' }
          : {}),
      };
      console.log('[PlatformService.createOrganisation] Payload keys:', Object.keys(payload || {}));
      console.log('[PlatformService.createOrganisation] Sanitized payload:', sanitized);

      const res: any = await apiClient.post('/platform/organisations', payload);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async suspendOrganisation(id: string, reason: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.post(`/platform/organisations/${id}/suspend`, { reason });
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async activateOrganisation(id: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.post(`/platform/organisations/${id}/activate`);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  // ------------------------------------------------------------
  // PLATFORM ADMINS
  // ------------------------------------------------------------
  async getAdmins(): Promise<{ data: PlatformAdminUser[] }> {
    try {
      const res: any = await apiClient.get('/platform/admins');
      return res.data ? res : { data: res };
    } catch (failure) {
      throw failure;
    }
  },

  async createAdmin(payload: any): Promise<PlatformAdminUser> {
    try {
      const res: any = await apiClient.post('/platform/admins', payload);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async toggleAdminStatus(id: string, isActive: boolean): Promise<PlatformAdminUser> {
    try {
      const res: any = await apiClient.patch(`/platform/admins/${id}/status`, { isActive });
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  // ------------------------------------------------------------
  // TOKEN PLANS & LEDGER
  // ------------------------------------------------------------
  async getTokenPlans(): Promise<TokenPlan[]> {
    try {
      const res: any = await apiClient.get('/platform/token-plans');
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async createTokenPlan(payload: any): Promise<TokenPlan> {
    try {
      const res: any = await apiClient.post('/platform/token-plans', payload);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async getTokenTransactions(params?: any): Promise<{ data: TokenTransaction[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/token-transactions', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch (failure) {
      throw failure;
    }
  },

  async adjustTokens(payload: {
    organisationId: string;
    type: string;
    amount: number;
    reason: string;
    referenceId?: string;
  }) {
    try {
      const res: any = await apiClient.post('/platform/tokens/adjust', payload);
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  // ------------------------------------------------------------
  // ANALYTICS, AUDIT & SECURITY
  // ------------------------------------------------------------
  async getAnalytics(timeframe = '30d') {
    try {
      const res: any = await apiClient.get('/platform/analytics', { params: { timeframe } });
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async getAuditLogs(params?: any): Promise<{ data: AuditLogItem[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/audit-logs', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch (failure) {
      throw failure;
    }
  },

  async getSecurityEvents(params?: any): Promise<{ data: SecurityEvent[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/security/events', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch (failure) {
      throw failure;
    }
  },

  async resolveSecurityEvent(id: string, resolutionNotes: string) {
    try {
      const res: any = await apiClient.post(`/platform/security/events/${id}/resolve`, {
        resolutionNotes,
      });
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async getSettings(): Promise<PlatformSetting[]> {
    try {
      const res: any = await apiClient.get('/platform/settings');
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async updateSetting(key: string, value: any): Promise<PlatformSetting> {
    try {
      const res: any = await apiClient.patch(`/platform/settings/${key}`, { value });
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },

  async getMonitoringOverview() {
    try {
      const res: any = await apiClient.get('/platform/monitoring');
      return res.data || res;
    } catch (failure) {
      throw failure;
    }
  },
};

