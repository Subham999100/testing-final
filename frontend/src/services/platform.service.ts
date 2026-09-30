// ============================================================
// Clyptus Job Portal - Platform Super Admin Service
// Connects UI with /api/v1/platform/* backend endpoints
//
// IMPORTANT: No mock data fallbacks exist here. API rejections propagate
// to the UI layer so that real 401, 403, and 500 errors are never hidden.
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
  // ------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------
  async getDashboardSummary(): Promise<PlatformDashboardSummary> {
    const res: any = await apiClient.get('/platform/dashboard');
    return res.data || res;
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
    const res: any = await apiClient.get('/platform/organisations', { params });
    return { data: res.data || [], meta: res.meta || { total: res.data?.length || 0, totalPages: 1, page: 1 } };
  },

  async getOrganisationById(id: string): Promise<Organisation> {
    const res: any = await apiClient.get(`/platform/organisations/${id}`);
    return res.data || res;
  },

  async createOrganisation(payload: any): Promise<Organisation> {
    const res: any = await apiClient.post('/platform/organisations', payload);
    return res.data || res;
  },

  async suspendOrganisation(id: string, reason: string): Promise<Organisation> {
    const res: any = await apiClient.post(`/platform/organisations/${id}/suspend`, { reason });
    return res.data || res;
  },

  async activateOrganisation(id: string): Promise<Organisation> {
    const res: any = await apiClient.post(`/platform/organisations/${id}/activate`);
    return res.data || res;
  },

  // ------------------------------------------------------------
  // PLATFORM ADMINS
  // ------------------------------------------------------------
  async getAdmins(): Promise<{ data: PlatformAdminUser[] }> {
    const res: any = await apiClient.get('/platform/admins');
    return { data: res.data || res };
  },

  async createAdmin(payload: any): Promise<PlatformAdminUser> {
    const res: any = await apiClient.post('/platform/admins', payload);
    return res.data || res;
  },

  async toggleAdminStatus(id: string, isActive: boolean): Promise<PlatformAdminUser> {
    const res: any = await apiClient.patch(`/platform/admins/${id}/status`, { isActive });
    return res.data || res;
  },

  // ------------------------------------------------------------
  // TOKEN PLANS & LEDGER
  // ------------------------------------------------------------
  async getTokenPlans(): Promise<TokenPlan[]> {
    const res: any = await apiClient.get('/platform/token-plans');
    return res.data || res;
  },

  async createTokenPlan(payload: any): Promise<TokenPlan> {
    const res: any = await apiClient.post('/platform/token-plans', payload);
    return res.data || res;
  },

  async getTokenTransactions(params?: any): Promise<{ data: TokenTransaction[]; meta: any }> {
    const res: any = await apiClient.get('/platform/token-transactions', { params });
    return { data: res.data || [], meta: res.meta || { total: res.data?.length || 0 } };
  },

  async adjustTokens(payload: {
    organisationId: string;
    type: string;
    amount: number;
    reason: string;
    referenceId?: string;
  }) {
    const res: any = await apiClient.post('/platform/tokens/adjust', payload);
    return res.data || res;
  },

  // ------------------------------------------------------------
  // ANALYTICS, AUDIT & SECURITY
  // ------------------------------------------------------------
  async getAnalytics(timeframe = '30d') {
    const res: any = await apiClient.get('/platform/analytics', { params: { timeframe } });
    return res.data || res;
  },

  async getAuditLogs(params?: any): Promise<{ data: AuditLogItem[]; meta: any }> {
    const res: any = await apiClient.get('/platform/audit-logs', { params });
    return { data: res.data || [], meta: res.meta || { total: res.data?.length || 0 } };
  },

  async getSecurityEvents(params?: any): Promise<{ data: SecurityEvent[]; meta: any }> {
    const res: any = await apiClient.get('/platform/security/events', { params });
    return { data: res.data || [], meta: res.meta || { total: res.data?.length || 0 } };
  },

  async resolveSecurityEvent(id: string, resolutionNotes: string) {
    const res: any = await apiClient.post(`/platform/security/events/${id}/resolve`, { resolutionNotes });
    return res.data || res;
  },

  async getSettings(): Promise<PlatformSetting[]> {
    const res: any = await apiClient.get('/platform/settings');
    return res.data || res;
  },

  async updateSetting(key: string, value: any): Promise<PlatformSetting> {
    const res: any = await apiClient.patch(`/platform/settings/${key}`, { value });
    return res.data || res;
  },
};
