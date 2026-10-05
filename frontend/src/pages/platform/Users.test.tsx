// ============================================================
// Platform Users Page — Integration Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Users } from './Users';
import { PlatformService } from '../../services/platform.service';

vi.mock('../../services/platform.service', () => ({
  PlatformService: {
    read: vi.fn(),
    write: vi.fn(),
    transferSuperAdmin: vi.fn(),
  },
}));

vi.mock('../../store/auth.store', () => ({
  useAuthStore: (selector: any) => selector({ user: { userId: 'plat_super_1', role: 'PLATFORM_SUPER_ADMIN' } }),
}));

describe('Platform Users Page (Organisation Super Admins)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Users />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders table columns and organisation super admin data', async () => {
    (PlatformService.read as any).mockResolvedValueOnce({
      data: [
        {
          id: 'org_acme',
          name: 'Acme Corporation',
          status: 'ACTIVE',
          superAdmin: {
            id: 'usr_super_1',
            email: 'admin@acme.com',
            name: 'John Acme',
            isActive: true,
            status: 'ACTIVE',
          },
        },
        {
          id: 'org_wayne',
          name: 'Wayne Enterprises',
          status: 'ACTIVE',
          superAdmin: {
            id: 'usr_super_2',
            email: 'bruce@wayne.com',
            name: 'Bruce Wayne',
            isActive: true,
            status: 'ACTIVE',
          },
        },
      ],
      meta: { total: 2, page: 1, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Organisation Super Admins')).toBeTruthy();
      expect(screen.getByText('Acme Corporation')).toBeTruthy();
      expect(screen.getByText('admin@acme.com')).toBeTruthy();
      expect(screen.getByText('Wayne Enterprises')).toBeTruthy();
      expect(screen.getByText('bruce@wayne.com')).toBeTruthy();
    });

    // Check headers
    expect(screen.getByRole('columnheader', { name: 'Organisation' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Super Admin Email' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeTruthy();
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeTruthy();

    // Check Transfer button opens modal
    const transferButtons = screen.getAllByRole('button', { name: 'Transfer' });
    expect(transferButtons.length).toBe(2);

    fireEvent.click(transferButtons[0]);

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Transfer Organisation Super Admin' })).toBeTruthy();
      expect(screen.getByDisplayValue('admin@acme.com')).toBeTruthy();
    });
  });

  it('disables Transfer button when an organisation has no Super Admin', async () => {
    (PlatformService.read as any).mockResolvedValueOnce({
      data: [
        {
          id: 'org_empty',
          name: 'Empty Org',
          status: 'ACTIVE',
          superAdmin: null,
        },
      ],
      meta: { total: 1, page: 1, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Empty Org')).toBeTruthy();
      expect(screen.getByText('No Super Admin')).toBeTruthy();
    });

    const transferBtn = screen.getByRole('button', { name: 'Transfer' }) as HTMLButtonElement;
    expect(transferBtn.disabled).toBe(true);
  });
});
