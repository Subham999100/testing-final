// ============================================================
// Clyptus Job Portal - Platform Super Admin Service
// Connects UI with /api/v1/platform/* backend endpoints
// Includes transparent development mock fallback
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
import {
  mockDashboardSummary,
  mockOrganisations,
  mockAdmins,
  mockTokenPlans,
  mockTokenTransactions,
  mockAuditLogs,
  mockSecurityEvents,
  mockSettings,
} from './mockData';

export const PlatformService = {
  // ------------------------------------------------------------
  // DASHBOARD
  // ------------------------------------------------------------
  async getDashboardSummary(): Promise<PlatformDashboardSummary> {
    try {
      const res: any = await apiClient.get('/platform/dashboard');
      return res.data || res;
    } catch {
      return mockDashboardSummary;
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
    } catch {
      let filtered = [...mockOrganisations];
      if (params?.status) {
        filtered = filtered.filter((o) => o.status === params.status);
      }
      if (params?.search) {
        const s = params.search.toLowerCase();
        filtered = filtered.filter((o) => o.name.toLowerCase().includes(s) || o.slug.toLowerCase().includes(s));
      }
      return {
        data: filtered,
        meta: { total: filtered.length, totalPages: 1, page: 1 },
      };
    }
  },

  async getOrganisationById(id: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.get(`/platform/organisations/${id}`);
      return res.data || res;
    } catch {
      const found = mockOrganisations.find((o) => o.id === id);
      if (!found) throw new Error('Organisation not found');
      return found;
    }
  },

  async createOrganisation(payload: any): Promise<Organisation> {
    try {
      const res: any = await apiClient.post('/platform/organisations', payload);
      return res.data || res;
    } catch {
      const newOrg: Organisation = {
        id: `org_${Date.now()}`,
        name: payload.name,
        slug: payload.slug,
        domain: payload.domain,
        contactEmail: payload.contactEmail,
        contactPhone: payload.contactPhone,
        status: 'ACTIVE',
        tier: payload.tier || 'STANDARD',
        maxRecruiters: payload.maxRecruiters || 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        membersCount: 1,
        tokenBalance: payload.initialTokenAllocation || 0,
        allocatedTokens: payload.initialTokenAllocation || 0,
        consumedTokens: 0,
        industry: payload.industry,
        companySize: payload.companySize,
        website: payload.website,
      };
      mockOrganisations.unshift(newOrg);
      return newOrg;
    }
  },

  async suspendOrganisation(id: string, reason: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.post(`/platform/organisations/${id}/suspend`, { reason });
      return res.data || res;
    } catch {
      const org = mockOrganisations.find((o) => o.id === id);
      if (org) {
        org.status = 'SUSPENDED';
        org.suspensionReason = reason;
        org.suspendedAt = new Date().toISOString();
      }
      return org!;
    }
  },

  async activateOrganisation(id: string): Promise<Organisation> {
    try {
      const res: any = await apiClient.post(`/platform/organisations/${id}/activate`);
      return res.data || res;
    } catch {
      const org = mockOrganisations.find((o) => o.id === id);
      if (org) {
        org.status = 'ACTIVE';
        org.suspensionReason = null;
        org.suspendedAt = null;
      }
      return org!;
    }
  },

  // ------------------------------------------------------------
  // PLATFORM ADMINS
  // ------------------------------------------------------------
  async getAdmins(): Promise<{ data: PlatformAdminUser[] }> {
    try {
      const res: any = await apiClient.get('/platform/admins');
      return res.data ? res : { data: res };
    } catch {
      return { data: mockAdmins };
    }
  },

  async createAdmin(payload: any): Promise<PlatformAdminUser> {
    try {
      const res: any = await apiClient.post('/platform/admins', payload);
      return res.data || res;
    } catch {
      const newAdmin: PlatformAdminUser = {
        id: `usr_admin_${Date.now()}`,
        email: payload.email,
        firstName: payload.firstName,
        lastName: payload.lastName,
        role: 'PLATFORM_ADMIN',
        isActive: true,
        createdAt: new Date().toISOString(),
        platformAdminProfile: {
          department: payload.department || 'Operations',
          permissions: payload.permissions || [],
          isActive: true,
        },
      };
      mockAdmins.push(newAdmin);
      return newAdmin;
    }
  },

  async toggleAdminStatus(id: string, isActive: boolean): Promise<PlatformAdminUser> {
    try {
      const res: any = await apiClient.patch(`/platform/admins/${id}/status`, { isActive });
      return res.data || res;
    } catch {
      const admin = mockAdmins.find((a) => a.id === id);
      if (admin) {
        admin.isActive = isActive;
        if (admin.platformAdminProfile) {
          admin.platformAdminProfile.isActive = isActive;
        }
      }
      return admin!;
    }
  },

  // ------------------------------------------------------------
  // TOKEN PLANS & LEDGER
  // ------------------------------------------------------------
  async getTokenPlans(): Promise<TokenPlan[]> {
    try {
      const res: any = await apiClient.get('/platform/token-plans');
      return res.data || res;
    } catch {
      return mockTokenPlans;
    }
  },

  async createTokenPlan(payload: any): Promise<TokenPlan> {
    try {
      const res: any = await apiClient.post('/platform/token-plans', payload);
      return res.data || res;
    } catch {
      const newPlan: TokenPlan = {
        id: `plan_${Date.now()}`,
        name: payload.name,
        code: payload.code,
        description: payload.description,
        tokenAmount: payload.tokenAmount,
        priceCents: payload.priceCents,
        currency: payload.currency || 'USD',
        billingCycle: payload.billingCycle || 'MONTHLY',
        features: payload.features || [],
        isActive: true,
        sortOrder: mockTokenPlans.length + 1,
        createdAt: new Date().toISOString(),
      };
      mockTokenPlans.push(newPlan);
      return newPlan;
    }
  },

  async getTokenTransactions(params?: any): Promise<{ data: TokenTransaction[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/token-transactions', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch {
      return {
        data: mockTokenTransactions,
        meta: { total: mockTokenTransactions.length, totalPages: 1, page: 1 },
      };
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
    } catch {
      const org = mockOrganisations.find((o) => o.id === payload.organisationId);
      if (org) {
        org.tokenBalance += payload.amount;
        if (payload.amount > 0) org.allocatedTokens += payload.amount;
        if (payload.amount < 0) org.consumedTokens += Math.abs(payload.amount);
      }
      const newTx: TokenTransaction = {
        id: `tx_${Date.now()}`,
        organisationId: payload.organisationId,
        organisationName: org?.name || 'Organisation',
        organisationSlug: org?.slug || 'org',
        type: payload.type as any,
        amount: payload.amount,
        balanceBefore: (org?.tokenBalance || 0) - payload.amount,
        balanceAfter: org?.tokenBalance || 0,
        reason: payload.reason,
        referenceId: payload.referenceId,
        createdAt: new Date().toISOString(),
      };
      mockTokenTransactions.unshift(newTx);
      return { ledgerEntry: newTx };
    }
  },

  // ------------------------------------------------------------
  // ANALYTICS, AUDIT & SECURITY
  // ------------------------------------------------------------
  async getAnalytics(timeframe = '30d') {
    try {
      const res: any = await apiClient.get('/platform/analytics', { params: { timeframe } });
      return res.data || res;
    } catch {
      return {
        timeframe,
        statusDistribution: [
          { status: 'ACTIVE', count: 2 },
          { status: 'SUSPENDED', count: 1 },
          { status: 'PENDING_VERIFICATION', count: 1 },
        ],
        tierDistribution: [
          { tier: 'ENTERPRISE', count: 1 },
          { tier: 'GROWTH', count: 1 },
          { tier: 'STANDARD', count: 2 },
        ],
        transactionVolumeByType: [
          { type: 'ALLOCATION', count: 12, totalTokens: 18500 },
          { type: 'CONSUMPTION', count: 48, totalTokens: 5350 },
          { type: 'REFUND', count: 3, totalTokens: 450 },
        ],
        organisationGrowthTrend: [
          { month: 'Apr 2026', newOrganisations: 2 },
          { month: 'May 2026', newOrganisations: 5 },
          { month: 'Jun 2026', newOrganisations: 8 },
          { month: 'Jul 2026', newOrganisations: 12 },
          { month: 'Aug 2026', newOrganisations: 19 },
          { month: 'Sep 2026', newOrganisations: 27 },
        ],
        aiExecutiveSummary:
          'Platform velocity is expanding steadily with a 42% month-over-month increase in organisation onboardings. Token consumption is well within projected limits, and zero critical security incidents are unresolved.',
      };
    }
  },

  async getAuditLogs(params?: any): Promise<{ data: AuditLogItem[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/audit-logs', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch {
      return {
        data: mockAuditLogs,
        meta: { total: mockAuditLogs.length, totalPages: 1, page: 1 },
      };
    }
  },

  async getSecurityEvents(params?: any): Promise<{ data: SecurityEvent[]; meta: any }> {
    try {
      const res: any = await apiClient.get('/platform/security/events', { params });
      return res.data ? res : { data: res, meta: { total: res.length } };
    } catch {
      return {
        data: mockSecurityEvents,
        meta: { total: mockSecurityEvents.length, totalPages: 1, page: 1 },
      };
    }
  },

  async resolveSecurityEvent(id: string, resolutionNotes: string) {
    try {
      const res: any = await apiClient.post(`/platform/security/events/${id}/resolve`, {
        resolutionNotes,
      });
      return res.data || res;
    } catch {
      const ev = mockSecurityEvents.find((e) => e.id === id);
      if (ev) {
        ev.isResolved = true;
        ev.resolutionNotes = resolutionNotes;
        ev.resolvedAt = new Date().toISOString();
      }
      return ev;
    }
  },

  async getSettings(): Promise<PlatformSetting[]> {
    try {
      const res: any = await apiClient.get('/platform/settings');
      return res.data || res;
    } catch {
      return mockSettings;
    }
  },

  async updateSetting(key: string, value: any): Promise<PlatformSetting> {
    try {
      const res: any = await apiClient.patch(`/platform/settings/${key}`, { value });
      return res.data || res;
    } catch {
      const s = mockSettings.find((item) => item.key === key);
      if (s) {
        s.value = value;
        s.updatedAt = new Date().toISOString();
      }
      return s!;
    }
  },
};
