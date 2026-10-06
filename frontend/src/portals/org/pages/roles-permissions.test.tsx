// ============================================================
// Organisation Super Admin — Roles & Permissions Page Unit Tests
// Tests the simplified Recruiter Access UX:
// Select Recruiter → Feature Matrix → Select/Unselect → Save Changes
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { RolesPermissionsPage } from './roles-permissions';
import { api } from '../lib/api';

vi.mock('../lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    page: vi.fn(),
  },
  errorMessage: (e: any) => e?.message || 'Error occurred',
}));

let mockUserRole = 'ORGANISATION_SUPER_ADMIN';
let mockHasManagePerm = true;

vi.mock('../lib/session', () => ({
  usePermissions: () => ({
    me: {
      user: { firstName: 'GovAdmin', lastName: 'User', role: mockUserRole, email: 'gov@acme.com' },
      organisation: { name: 'Acme Corp', tier: 'ENTERPRISE' },
    },
    can: (p: string) => {
      if (p === 'recruiters.permissions.manage') return mockHasManagePerm;
      return true;
    },
    role: mockUserRole,
  }),
  ROLE_LABEL: {
    ORGANISATION_SUPER_ADMIN: 'Org Super Admin',
    ORGANISATION_ADMIN: 'Org Admin',
    RECRUITER: 'Recruiter',
  },
}));

const MOCK_CATALOG = {
  catalog: [
    { key: 'org.profile.read', group: 'Organisation', label: 'View organisation profile' },
    { key: 'jobs.read.assigned', group: 'Jobs', label: 'View assigned jobs' },
    { key: 'jobs.create', group: 'Jobs', label: 'Create jobs' },
    { key: 'jobs.publish', group: 'Jobs', label: 'Publish jobs' },
    { key: 'offers.read', group: 'Offers', label: 'View offers' },
    { key: 'offers.send', group: 'Offers', label: 'Send offers & record responses' },
  ],
  ceilings: {
    ORGANISATION_SUPER_ADMIN: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
    ORGANISATION_ADMIN: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
    RECRUITER: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
  },
  defaults: {
    ORGANISATION_SUPER_ADMIN: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
    ORGANISATION_ADMIN: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
    RECRUITER: ['org.profile.read', 'jobs.read.assigned', 'jobs.create', 'offers.read'],
  },
  grantable: {
    ORGANISATION_ADMIN: [],
    RECRUITER: [
      'org.profile.read',
      'jobs.read.assigned',
      'jobs.create',
      'jobs.publish',
      'offers.read',
      'offers.send',
    ],
  },
};

const MOCK_RECRUITERS = [
  {
    id: 'rec-1',
    name: 'Alice Recruiter',
    email: 'alice@acme.com',
    role: 'RECRUITER',
    status: 'ACTIVE',
    title: 'Senior Recruiter',
    joinedAt: '2026-01-15T00:00:00Z',
    tokensRemaining: 150,
    openJobs: 3,
    openApplications: 12,
    canManage: true,
  },
  {
    id: 'rec-2',
    name: 'Bob Talent',
    email: 'bob@acme.com',
    role: 'RECRUITER',
    status: 'ACTIVE',
    title: 'Associate Recruiter',
    joinedAt: '2026-02-01T00:00:00Z',
    tokensRemaining: 80,
    openJobs: 1,
    openApplications: 4,
    canManage: true,
  },
];

describe('RolesPermissionsPage — Simplified Recruiter Access UX', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    mockUserRole = 'ORGANISATION_SUPER_ADMIN';
    mockHasManagePerm = true;
    vi.clearAllMocks();

    (api.get as any).mockImplementation((url: string) => {
      if (url === '/org/permissions/catalog') {
        return Promise.resolve(MOCK_CATALOG);
      }
      if (url === '/org/members/rec-1') {
        return Promise.resolve({
          id: 'rec-1',
          name: 'Alice Recruiter',
          email: 'alice@acme.com',
          role: 'RECRUITER',
          status: 'ACTIVE',
          title: 'Senior Recruiter',
          permissions: ['org.profile.read', 'jobs.read.assigned', 'jobs.create', 'offers.read'],
        });
      }
      if (url === '/org/members/rec-2') {
        return Promise.resolve({
          id: 'rec-2',
          name: 'Bob Talent',
          email: 'bob@acme.com',
          role: 'RECRUITER',
          status: 'ACTIVE',
          title: 'Associate Recruiter',
          permissions: ['org.profile.read', 'jobs.read.assigned'],
        });
      }
      return Promise.resolve(null);
    });

    (api.page as any).mockImplementation((url: string) => {
      if (url === '/org/members') {
        return Promise.resolve({
          data: MOCK_RECRUITERS,
          meta: { total: 2, page: 1, limit: 50, totalPages: 1 },
        });
      }
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 50, totalPages: 1 } });
    });

    (api.put as any).mockResolvedValue({
      id: 'rec-1',
      name: 'Alice Recruiter',
      permissions: [
        'org.profile.read',
        'jobs.read.assigned',
        'jobs.create',
        'offers.read',
        'jobs.publish',
      ],
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('renders recruiter directory and automatically selects first recruiter with their feature matrix', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RolesPermissionsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Page title and governance overview
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Roles & Permissions' })).toBeTruthy();
      expect(screen.getByText('Organisation Super Admin Overview')).toBeTruthy();
      expect(screen.getByText(/Permission Boundaries/)).toBeTruthy();
    });

    // Recruiter directory
    await waitFor(() => {
      expect(screen.getByText('Alice Recruiter')).toBeTruthy();
      expect(screen.getByText('Bob Talent')).toBeTruthy();
    });

    // Feature matrix for Alice Recruiter
    expect(await screen.findByText('Feature Access Matrix')).toBeTruthy();
    expect(await screen.findByText('Publish jobs')).toBeTruthy();
    expect(await screen.findByText('View assigned jobs')).toBeTruthy();
  });

  it('allows checking a feature locally without making an API call, then saves on button click', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RolesPermissionsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    // Find the "Publish jobs" checkbox
    const publishCheckbox = (await screen.findByLabelText(/Publish jobs/i)) as HTMLInputElement;
    expect(publishCheckbox.checked).toBe(false);

    // Save button should initially be disabled because there are no changes
    const saveButton = screen.getAllByRole('button', { name: /Save Changes/i })[0] as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    // Click checkbox to select "Publish jobs"
    fireEvent.click(publishCheckbox);
    expect(publishCheckbox.checked).toBe(true);

    // Verify NO API call was dispatched on checkbox click
    expect(api.put).not.toHaveBeenCalled();

    // Verify dirty state indicator and enabled Save button
    expect(screen.getAllByText('Unsaved Changes').length).toBeGreaterThan(0);
    expect(saveButton.disabled).toBe(false);

    // Click "Save Changes"
    fireEvent.click(saveButton);

    // Verify PUT request was dispatched with complete permissions array
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        '/org/members/rec-1/permissions',
        expect.objectContaining({
          permissions: expect.arrayContaining([
            'org.profile.read',
            'jobs.read.assigned',
            'jobs.create',
            'offers.read',
            'jobs.publish',
          ]),
        }),
      );
    });
  });

  it('allows resetting unsaved changes without calling the API', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RolesPermissionsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    const publishCheckbox = (await screen.findByLabelText(/Publish jobs/i)) as HTMLInputElement;
    expect(publishCheckbox.checked).toBe(false);

    // Toggle on
    fireEvent.click(publishCheckbox);
    expect(publishCheckbox.checked).toBe(true);

    // Cancel button appears
    const cancelButton = screen.getAllByRole('button', { name: /Cancel/i })[0];
    fireEvent.click(cancelButton);

    // Reverts back to false, no API call
    expect(publishCheckbox.checked).toBe(false);
    expect(api.put).not.toHaveBeenCalled();
  });

  it('switches between recruiters and loads respective feature sets', async () => {
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RolesPermissionsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Bob Talent')).toBeTruthy();
    });

    // Click Bob Talent
    fireEvent.click(screen.getByText('Bob Talent'));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/org/members/rec-2');
    });
  });

  it('displays read-only notice and disables feature checkboxes when lacking manage permission', async () => {
    mockHasManagePerm = false;

    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RolesPermissionsPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/Read-Only Mode:/)).toBeTruthy();
    });

    const publishCheckbox = (await screen.findByLabelText(/Publish jobs/i)) as HTMLInputElement;
    expect(publishCheckbox.disabled).toBe(true);
  });
});
