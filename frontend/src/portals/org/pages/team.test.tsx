// ============================================================
// Organisation portal — Team Management & Recruiter Limit UI Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { MembersPage } from './team';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    page: vi.fn(),
  },
  errorMessage: (e: any) => e?.message || 'Error occurred',
}));

vi.mock('../lib/session', () => ({
  usePermissions: () => ({
    can: (perm: string) => true,
    hasRole: (role: string) => true,
  }),
  ROLE_LABEL: {
    ORGANISATION_SUPER_ADMIN: 'Org Super Admin',
    ORGANISATION_ADMIN: 'Org Admin',
    RECRUITER: 'Recruiter',
  },
}));

describe('MembersPage (Organisation Admin & Recruiter Provisioning)', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
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
          <MembersPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('displays recruiter usage and allows recruiter creation when seats are available', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/org/admins') return Promise.resolve(null);
      if (url === '/org/recruiters/usage')
        return Promise.resolve({ limit: 25, used: 18, available: 7 });
      if (url === '/org/permissions/catalog')
        return Promise.resolve({ catalog: [], ceilings: {}, defaults: {}, grantable: {} });
      return Promise.resolve(null);
    });

    (api.page as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Team Management')).toBeTruthy();
      expect(screen.getByText('18 / 25 Seats')).toBeTruthy();
      expect(screen.getByText('7')).toBeTruthy();
    });

    // Create Recruiter button should be enabled
    const createRecruiterBtn = screen.getByRole('button', { name: /Create Recruiter/i });
    expect((createRecruiterBtn as HTMLButtonElement).disabled).toBe(false);

    // Clicking Create Recruiter opens the sheet
    fireEvent.click(createRecruiterBtn);
    expect(screen.getByRole('heading', { name: 'Create Recruiter' })).toBeTruthy();
    expect(screen.getByPlaceholderText('John Smith')).toBeTruthy();
    expect(screen.getByPlaceholderText('recruiter@acme.com')).toBeTruthy();

    // Role dropdown verification
    const roleSelect = screen.getByLabelText('Role') as HTMLSelectElement;
    expect(roleSelect).toBeTruthy();
    expect(roleSelect.value).toBe('RECRUITER');
    expect(screen.getByRole('option', { name: 'Recruiter' })).toBeTruthy();

    // Password visibility controls verification
    const passwordInput = screen.getByPlaceholderText('Min 8 characters') as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText('Repeat password') as HTMLInputElement;

    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    const togglePasswordBtn = screen.getByRole('button', { name: 'Show password' }) as HTMLButtonElement;
    const toggleConfirmBtn = screen.getByRole('button', { name: 'Show confirm password' }) as HTMLButtonElement;

    // Must be type="button" so they do not submit the form
    expect(togglePasswordBtn.type).toBe('button');
    expect(toggleConfirmBtn.type).toBe('button');

    // Toggle initial password visibility independently
    fireEvent.click(togglePasswordBtn);
    expect(passwordInput.type).toBe('text');
    expect(confirmPasswordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(passwordInput.type).toBe('password');

    // Toggle confirm password visibility independently
    fireEvent.click(toggleConfirmBtn);
    expect(passwordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide confirm password' }));
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('disables Create Recruiter and displays warning when limit is reached (25/25)', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/org/admins') return Promise.resolve(null);
      if (url === '/org/recruiters/usage')
        return Promise.resolve({ limit: 25, used: 25, available: 0 });
      if (url === '/org/permissions/catalog')
        return Promise.resolve({ catalog: [], ceilings: {}, defaults: {}, grantable: {} });
      return Promise.resolve(null);
    });

    (api.page as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('25 / 25 Seats')).toBeTruthy();
      expect(screen.getByText(/Recruiter seat limit reached \(25\/25\)/i)).toBeTruthy();
    });

    const createRecruiterBtn = screen.getByRole('button', { name: /Create Recruiter/i });
    expect((createRecruiterBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('displays active Organisation Admin and disables Create Org Admin button', async () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/org/admins')
        return Promise.resolve({
          id: 'admin-1',
          name: 'Alice Cooper',
          email: 'alice@acme.com',
          role: 'ORGANISATION_ADMIN',
          status: 'ACTIVE',
          isActive: true,
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
        });
      if (url === '/org/recruiters/usage')
        return Promise.resolve({ limit: 25, used: 5, available: 20 });
      if (url === '/org/permissions/catalog')
        return Promise.resolve({ catalog: [], ceilings: {}, defaults: {}, grantable: {} });
      return Promise.resolve(null);
    });

    (api.page as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Alice Cooper')).toBeTruthy();
      expect(screen.getByText('alice@acme.com')).toBeTruthy();
    });

    // Exactly one admin rule: Create Org Admin button should be disabled
    const createAdminBtn = screen.getByRole('button', { name: /Create Org Admin/i });
    expect((createAdminBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('confirms that the invitation UI and management are removed', () => {
    (api.get as any).mockImplementation((url: string) => {
      if (url === '/org/admins') return Promise.resolve(null);
      if (url === '/org/recruiters/usage')
        return Promise.resolve({ limit: 25, used: 0, available: 25 });
      if (url === '/org/permissions/catalog')
        return Promise.resolve({ catalog: [], ceilings: {}, defaults: {}, grantable: {} });
      return Promise.resolve(null);
    });

    (api.page as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 20 },
    });

    renderComponent();

    expect(screen.queryByText('Invite member')).toBeNull();
    expect(screen.queryByText('Send invitation')).toBeNull();
    expect(screen.queryByText('Invitations')).toBeNull();
  });
});
