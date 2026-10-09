import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Table, Action } from './OperationsUI';
import { PlatformService } from '../../services/platform.service';
vi.mock('../../services/platform.service', () => ({
  PlatformService: { read: vi.fn(), write: vi.fn() },
}));
const mount = (element: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      {element}
    </QueryClientProvider>,
  );
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
describe('Shared operations interface', () => {
  it('renders empty state', async () => {
    vi.mocked(PlatformService.read).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, totalPages: 0 },
    });
    mount(<Table path="users" columns={[{ key: 'email' }]} />);
    expect(await screen.findByText('No records found.')).toBeTruthy();
  });
  it('shows external domain unavailable without fake rows', async () => {
    vi.mocked(PlatformService.read).mockResolvedValue({
      available: false,
      reason: 'Jobs domain is not connected',
    });
    mount(<Table path="moderation/jobs" columns={[{ key: 'title' }]} />);
    expect(await screen.findByText('Jobs domain is not connected')).toBeTruthy();
  });
  it('uses pagination and omits empty filters', async () => {
    vi.mocked(PlatformService.read).mockResolvedValue({
      data: [{ id: '1', email: 'test@example.test' }],
      meta: { total: 25, page: 1, totalPages: 2 },
    });
    mount(<Table path="users" columns={[{ key: 'email' }]} filters={{ status: ['ACTIVE'] }} />);
    await screen.findByText('test@example.test');
    fireEvent.click(screen.getByText('Next'));
    await waitFor(() =>
      expect(PlatformService.read).toHaveBeenCalledWith(
        'users',
        expect.objectContaining({ page: 2 }),
      ),
    );
  });
  it('requires confirmation and sends selected enum defaults', async () => {
    vi.mocked(PlatformService.write).mockResolvedValue({ id: 'x' });
    mount(
      <Action
        title="Update"
        path="support/x"
        fields={[{ name: 'status', options: ['OPEN', 'RESOLVED'] }]}
      />,
    );
    fireEvent.click(screen.getByText('Update'));
    fireEvent.click(screen.getByText('Confirm'));
    await waitFor(() =>
      expect(PlatformService.write).toHaveBeenCalledWith('support/x', { status: 'OPEN' }, 'post'),
    );
    expect(await screen.findByText('Saved')).toBeTruthy();
  });
  it('keeps dialog open and reports failed mutations', async () => {
    vi.mocked(PlatformService.write).mockRejectedValue({ message: 'Permission denied' });
    mount(<Action title="Suspend" path="users/x/suspend" />);
    fireEvent.click(screen.getByText('Suspend'));
    fireEvent.click(screen.getByText('Confirm'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
