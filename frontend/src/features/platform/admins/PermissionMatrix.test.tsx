import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { PermissionMatrix } from './PermissionMatrix';
import { FeatureMatrix } from './FeatureMatrix';

describe('Platform Admin Features Search (Bug 4)', () => {
  afterEach(() => {
    cleanup();
  });

  it('filters features by partial matching and case-insensitivity', () => {
    const onChange = vi.fn();
    render(<PermissionMatrix selected={[]} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search permissions…');
    fireEvent.change(searchInput, { target: { value: 'org' } });

    expect(screen.getAllByText('View organizations').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('View support cases').length).toBe(0);
  });

  it('handles leading and trailing whitespace cleanly without breaking matching', () => {
    const onChange = vi.fn();
    render(<PermissionMatrix selected={[]} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search permissions…');
    fireEvent.change(searchInput, { target: { value: '   tokens   ' } });

    expect(screen.getAllByText('View tokens, balances and transactions').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('View organizations').length).toBe(0);
  });

  it('restores full list when search query is cleared', () => {
    const onChange = vi.fn();
    render(<PermissionMatrix selected={[]} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search permissions…');
    fireEvent.change(searchInput, { target: { value: 'support' } });
    expect(screen.getAllByText('View support cases').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('View organizations').length).toBe(0);

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getAllByText('View organizations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('View support cases').length).toBeGreaterThan(0);
  });

  it('displays empty state message when no features match query', () => {
    const onChange = vi.fn();
    render(<PermissionMatrix selected={[]} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search permissions…');
    fireEvent.change(searchInput, { target: { value: 'nonexistentkeyword' } });

    expect(
      screen.getByText('No matching permissions found for "nonexistentkeyword".')
    ).toBeTruthy();
  });

  it('preserves selected permissions state when search query changes', () => {
    const onChange = vi.fn();
    const selected = ['platform.organisations.read'];
    render(<PermissionMatrix selected={selected} onChange={onChange} />);

    const searchInput = screen.getByPlaceholderText('Search permissions…');
    fireEvent.change(searchInput, { target: { value: 'support' } });

    // Changing search should NOT call onChange (selected permissions remain untouched)
    expect(onChange).not.toHaveBeenCalled();
  });

  it('filters features in FeatureMatrix view by partial keyword and group title', () => {
    const mockAdmins = [
      {
        id: 'admin_1',
        email: 'admin1@clyptus.com',
        firstName: 'Alice',
        lastName: 'Admin',
        role: 'PLATFORM_ADMIN' as const,
        isActive: true,
        isEmailVerified: true,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        platformAdminProfile: { department: 'Operations', permissions: [] },
      },
    ];

    render(<FeatureMatrix admins={mockAdmins} />);

    const searchInput = screen.getByPlaceholderText('Filter features or permissions...');
    fireEvent.change(searchInput, { target: { value: '   security   ' } });

    expect(screen.getAllByText('View security events and sessions').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('View organizations').length).toBe(0);
  });
});



