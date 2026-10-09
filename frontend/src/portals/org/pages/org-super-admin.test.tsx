// ============================================================
// Organisation Super Admin — Governance Navigation & Dashboard Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { getNav, ORG_SUPER_ADMIN_NAV } from '../layout/nav';
import { DashboardPage } from './dashboard';
import { RecruitersPage, RolesPermissionsPage } from './team';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    page: vi.fn(),
  },
  errorMessage: (e: any) => e?.message || 'Error occurred',
}));

let mockUserRole = 'ORGANISATION_SUPER_ADMIN';

vi.mock('../lib/session', () => ({
  usePermissions: () => ({
    me: {
      user: { firstName: 'GovAdmin', lastName: 'User', role: mockUserRole, email: 'gov@acme.com' },
      organisation: { name: 'Acme Corp', tier: 'ENTERPRISE' },
    },
    can: () => true,
    role: mockUserRole,
  }),
  useWallet: () => ({
    data: {
      balance: 5000,
      unallocated: 3500,
      allocatedToMembers: 1500,
      consumed: 800,
      lifetimeReceived: 5800,
      lowBalanceThreshold: 500,
      costs: {},
    },
    isLoading: false,
  }),
  ROLE_LABEL: {
    ORGANISATION_SUPER_ADMIN: 'Org Super Admin',
    ORGANISATION_ADMIN: 'Org Admin',
    RECRUITER: 'Recruiter',
  },
}));

describe('Organisation Super Admin Governance Structure', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockUserRole = 'ORGANISATION_SUPER_ADMIN';
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Approved Navigation Structure', () => {
    it('returns approved governance navigation for ORGANISATION_SUPER_ADMIN', () => {
      const nav = getNav('ORGANISATION_SUPER_ADMIN');
      expect(nav).toHaveLength(5);

      const [gov, tokens, audit, admin, help] = nav;

      // Section 1: GOVERNANCE & PEOPLE
      expect(gov.title).toBe('Governance & People');
      expect(gov.items.map((i) => i.label)).toEqual(['Dashboard', 'Recruiters', 'Roles & Permissions']);
      expect(gov.items.map((i) => i.path)).toEqual(['/org', '/org/recruiters', '/org/roles-permissions']);

      // Section 2: TOKENS & BILLING
      expect(tokens.title).toBe('Tokens & Billing');
      expect(tokens.items.map((i) => i.label)).toEqual([
        'Credits Allocation',
        'Billing & Token Purchases',
        'Recruitment Analytics',
      ]);
      expect(tokens.items.map((i) => i.path)).toEqual([
        '/org/credits-allocation',
        '/org/billing',
        '/org/analytics',
      ]);

      // Section 3: AUDIT
      expect(audit.title).toBe('Audit');
      expect(audit.items.map((i) => i.label)).toEqual(['Audit Logs']);
      expect(audit.items[0].path).toBe('/org/audit');

      // Section 4: ADMINISTRATION
      expect(admin.title).toBe('Administration');
      expect(admin.items.map((i) => i.label)).toEqual(['Organisation Settings']);
      expect(admin.items[0].path).toBe('/org/organisation');

      // Section 5: HELP
      expect(help.title).toBe('Help');
      expect(help.items.map((i) => i.label)).toEqual(['Support']);
      expect(help.items[0].path).toBe('/org/support');
    });

    it('verifies all removed items are excluded from ORGANISATION_SUPER_ADMIN navigation', () => {
      const nav = getNav('ORGANISATION_SUPER_ADMIN');
      const allLabels = nav.flatMap((s) => s.items.map((i) => i.label.toLowerCase()));

      const removed = [
        'invitations',
        'applications',
        'interviews',
        'offers',
        'messages',
        'tasks',
        'members',
        'ai tools',
        'security',
        'jobs',
        'candidates',
      ];

      for (const item of removed) {
        expect(allLabels).not.toContain(item);
      }
    });

    it('preserves standard recruiter navigation for RECRUITER role', () => {
      const nav = getNav('RECRUITER');
      const hiringSection = nav.find((s) => s.title === 'Hiring');
      expect(hiringSection).toBeTruthy();
      const labels = hiringSection!.items.map((i) => i.label);
      expect(labels).toContain('Jobs');
      expect(labels).toContain('Candidates');
      expect(labels).toContain('Applications');
    });
  });

  describe('Governance-focused Dashboard', () => {
    it('renders governance KPIs and oversight cards without recruiter pipeline', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/org/dashboard') {
          return Promise.resolve({
            jobs: { PUBLISHED: 4, DRAFT: 1 },
            funnel: [],
            applicationsTotal: 25,
            interviews: { upcoming: 3, feedbackDue: 0 },
            offers: {},
            hires: 2,
            members: { orgAdmins: 1, recruiters: 8, suspended: 0 },
            tokens: { balance: 5000, spendable: 5000, allocatedToMembers: 1500, myAllocation: null },
            openTasks: 0,
            alerts: [],
            recentActivity: [
              { id: '1', action: 'RECRUITER_CREATED', entityType: 'ORG_MEMBER', createdAt: new Date().toISOString(), actor: 'GovAdmin' },
            ],
          });
        }
        if (url === '/org/recruiters/usage') {
          return Promise.resolve({ limit: 25, used: 8, available: 17 });
        }
        if (url.startsWith('/org/analytics/team')) {
          return Promise.resolve({
            range: { from: null, to: null },
            members: [
              { userId: 'u1', name: 'Alice Recruiter', role: 'RECRUITER', jobsCreated: 3, stageMoves: 12, interviewsScheduled: 5, offersCreated: 2, hires: 1 },
            ],
          });
        }
        return Promise.resolve(null);
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <DashboardPage />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Welcome back, GovAdmin')).toBeTruthy();
        expect(screen.getByText(/Governance, resource allocation, and recruiter oversight/)).toBeTruthy();
      });

      // Emphasized KPI cards
      expect(screen.getByText('Active Recruiters')).toBeTruthy();
      expect(screen.getByText('Available Organisation Credits')).toBeTruthy();
      expect(screen.getByText('Total Credits Consumed')).toBeTruthy();
      expect(screen.getByText('Audit Log Entries')).toBeTruthy();

      // Recruiter Capacity and Credit Allocation cards
      expect(screen.getByText('Recruiter Capacity & Governance')).toBeTruthy();
      expect(screen.getByText('Credit Allocation & Ledger')).toBeTruthy();
      expect(screen.getByText('Recruitment Analytics')).toBeTruthy();
      expect(screen.getByText('Recent Audit Activity')).toBeTruthy();

      // Quick governance shortcuts
      expect(screen.getByText('Organisation Settings')).toBeTruthy();
      expect(screen.getAllByText('Roles & Permissions').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Billing & Purchases')).toBeTruthy();
      expect(screen.getByText('Support')).toBeTruthy();

      // Does NOT show recruiter creation actions as primary workflow
      expect(screen.queryByText('New job')).toBeNull();
      expect(screen.queryByText('Add candidate')).toBeNull();
      expect(screen.queryByText('Hiring funnel')).toBeNull();
    });
  });

  describe('RecruitersPage Component', () => {
    it('renders recruiter oversight and capacity management', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/org/recruiters/usage') {
          return Promise.resolve({ limit: 25, used: 10, available: 15 });
        }
        return Promise.resolve(null);
      });

      (api.page as any).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 20 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <RecruitersPage />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByText('Recruiters')).toBeTruthy();
        expect(screen.getByText('Recruiter Capacity & Seats')).toBeTruthy();
        expect(screen.getByText('10 / 25 Seats')).toBeTruthy();
        expect(screen.getByText('15')).toBeTruthy();
      });

      const createBtn = screen.getByRole('button', { name: /Create Recruiter/i });
      expect((createBtn as HTMLButtonElement).disabled).toBe(false);
    });
  });

  describe('RolesPermissionsPage Component', () => {
    it('renders role definitions and permission matrix', async () => {
      (api.get as any).mockImplementation((url: string) => {
        if (url === '/org/permissions/catalog') {
          return Promise.resolve({
            catalog: [
              { key: 'jobs.read.all', group: 'Jobs', label: 'View all jobs' },
              { key: 'candidates.read', group: 'Candidates', label: 'View candidates' },
            ],
            ceilings: {
              RECRUITER: ['jobs.read.all', 'candidates.read'],
              ORGANISATION_ADMIN: ['jobs.read.all', 'candidates.read'],
            },
            defaults: {
              RECRUITER: ['jobs.read.all'],
              ORGANISATION_ADMIN: ['jobs.read.all', 'candidates.read'],
            },
            grantable: {},
          });
        }
        return Promise.resolve(null);
      });

      (api.page as any).mockResolvedValue({
        data: [],
        meta: { total: 0, page: 1, limit: 10 },
      });

      render(
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <RolesPermissionsPage />
          </BrowserRouter>
        </QueryClientProvider>,
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Roles & Permissions' })).toBeTruthy();
        expect(screen.getByText('Organisation Super Admin Overview')).toBeTruthy();
        expect(screen.getByText('Permission Boundaries')).toBeTruthy();
      });
    });
  });
});
