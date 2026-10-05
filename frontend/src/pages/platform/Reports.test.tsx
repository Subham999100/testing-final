// ============================================================
// Platform Reports Page — Integration Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Reports } from './Reports';
import { PlatformService } from '../../services/platform.service';

vi.mock('../../services/platform.service', () => ({
  PlatformService: {
    getReportsOverview: vi.fn(),
    exportReportsCsv: vi.fn(),
    getOrganisations: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

// Mock Recharts ResponsiveContainer to work in jsdom
vi.mock('recharts', async () => {
  const original = await vi.importActual('recharts');
  return {
    ...original,
    ResponsiveContainer: ({ children }: any) => <div style={{ width: 500, height: 300 }}>{children}</div>,
  };
});

describe('Platform Reports Page', () => {
  let queryClient: QueryClient;

  const sampleOverview = {
    timeframe: '30d',
    organisations: {
      total: 245,
      active: 218,
      suspended: 27,
      pending: 0,
      createdInPeriod: 12,
    },
    users: {
      total: 1240,
      active: 1102,
      byRole: [{ role: 'RECRUITER', count: 1240 }],
    },
    recruiters: {
      total: 1240,
      active: 1102,
    },
    jobs: {
      total: 18920,
      active: 14200,
      draft: 3200,
      closed: 1520,
      createdInPeriod: 450,
    },
    applications: {
      total: 340000,
      appliedInPeriod: 12500,
      byStage: [{ stage: 'APPLIED', count: 200000 }, { stage: 'HIRED', count: 15000 }],
    },
    trends: [
      { month: 'May 2026', organisations: 20, jobs: 150, applications: 1200 },
      { month: 'Jun 2026', organisations: 35, jobs: 220, applications: 2500 },
    ],
    topOrganisations: [
      {
        id: 'org-1',
        name: 'Acme Global Corp',
        slug: 'acme-global',
        status: 'ACTIVE',
        tier: 'ENTERPRISE',
        recruiters: 45,
        jobs: 320,
        applications: 8500,
        createdAt: '2026-01-15T00:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    (PlatformService.getReportsOverview as any).mockResolvedValue(sampleOverview);
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Reports />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders overview cards with exact database aggregates', async () => {
    renderComponent();

    expect(await screen.findByText(sampleOverview.organisations.total.toLocaleString())).toBeTruthy();
    expect(screen.getByText(sampleOverview.recruiters.total.toLocaleString())).toBeTruthy();
    expect(screen.getByText(sampleOverview.jobs.total.toLocaleString())).toBeTruthy();
    expect(screen.getByText(sampleOverview.applications.total.toLocaleString())).toBeTruthy();
  });

  it('renders top organisations table', async () => {
    renderComponent();

    expect(await screen.findByText('Acme Global Corp')).toBeTruthy();
    expect(screen.getByText('acme-global')).toBeTruthy();
    expect(screen.getByText('ENTERPRISE')).toBeTruthy();
  });

  it('triggers CSV export on click', async () => {
    (PlatformService.exportReportsCsv as any).mockResolvedValue(undefined);
    renderComponent();

    const exportBtn = await screen.findByRole('button', { name: /export overview csv/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(PlatformService.exportReportsCsv).toHaveBeenCalledWith({
        timeframe: '30d',
        organisationId: undefined,
        type: 'overview',
      });
    });
  });

  it('renders error state and retry on failure', async () => {
    (PlatformService.getReportsOverview as any).mockRejectedValueOnce(new Error('Reporting DB timeout'));
    renderComponent();

    expect(await screen.findByText('Reporting DB timeout')).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeTruthy();
  });
});
