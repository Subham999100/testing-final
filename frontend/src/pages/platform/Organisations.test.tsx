import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { Organisations } from './Organisations';
import { PlatformService } from '../../services/platform.service';
import { usePermissions } from '../../hooks/usePermissions';

vi.mock('../../services/platform.service', () => ({
  PlatformService: {
    read: vi.fn(),
    write: vi.fn(),
    createOrganisation: vi.fn(),
  },
}));

vi.mock('../../hooks/usePermissions', () => ({
  usePermissions: vi.fn(),
}));

const mount = (element: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{element}</MemoryRouter>
    </QueryClientProvider>,
  );

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Organisations Page', () => {
  it('opens CreateOrganisationModal and submits all 11 fields to PlatformService.createOrganisation', async () => {
    vi.mocked(usePermissions).mockReturnValue({
      hasPermission: (perm: string) => perm === 'platform.organisations.create',
      role: 'PLATFORM_SUPER_ADMIN',
      permissions: ['platform.organisations.create'],
    } as any);

    vi.mocked(PlatformService.read).mockResolvedValue({
      data: [],
      meta: { total: 0, totalPages: 1, page: 1 },
    });

    vi.mocked(PlatformService.createOrganisation).mockResolvedValue({
      id: 'org-123',
      name: 'Stark Industries',
      slug: 'stark-industries',
      status: 'ACTIVE',
    } as any);

    mount(<Organisations />);

    // 1. Verify "Create organization" button is present and click it
    const createBtn = screen.getByRole('button', { name: 'Create organization' });
    expect(createBtn).toBeTruthy();
    fireEvent.click(createBtn);

    // 2. Verify CreateOrganisationModal wizard Step 1 opened
    expect(screen.getByText('Step 1 of 2: Organisation Details')).toBeTruthy();

    // 3. Fill Step 1 fields
    fireEvent.change(screen.getByPlaceholderText('Acme Inc'), {
      target: { value: 'Stark Industries' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'stark-industries' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme.com'), {
      target: { value: 'stark.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'hr@stark.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Technology'), {
      target: { value: 'Aerospace' },
    });

    // Advance to Step 2
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 2: Organisation Super Admin')).toBeTruthy();

    // 4. Fill Step 2 fields
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Tony Stark' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'tony@stark.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), {
      target: { value: 'JarvisPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'JarvisPass123!' },
    });

    // 5. Submit
    fireEvent.click(screen.getByRole('button', { name: 'Create Organisation' }));

    // 6. Verify PlatformService.createOrganisation called with exact 11 fields
    await waitFor(() => {
      expect(PlatformService.createOrganisation).toHaveBeenCalledTimes(1);
    });

    expect(PlatformService.createOrganisation).toHaveBeenCalledWith({
      name: 'Stark Industries',
      slug: 'stark-industries',
      domain: 'stark.com',
      contactEmail: 'hr@stark.com',
      tier: 'STANDARD',
      industry: 'Aerospace',
      initialTokenAllocation: 1000,
      superAdminName: 'Tony Stark',
      superAdminEmail: 'tony@stark.com',
      superAdminPassword: 'JarvisPass123!',
      superAdminPasswordConfirmation: 'JarvisPass123!',
    });
  });
});
