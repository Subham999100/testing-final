// ============================================================
// Organisation portal — Support Page UI Integration Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { SupportPage } from './support';
import { orgApi } from '../lib/api';

vi.mock('../lib/api', () => ({
  orgApi: {
    supportList: vi.fn(),
    supportGet: vi.fn(),
    supportCreate: vi.fn(),
    supportMessage: vi.fn(),
  },
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
  errorMessage: (e: any) => e?.message || 'Error occurred',
}));

vi.mock('../lib/session', () => ({
  usePermissions: () => ({
    can: (perm: string) => ['support.read', 'support.create', 'support.reply'].includes(perm),
    hasRole: (role: string) => true,
  }),
}));

vi.mock('../ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SupportPage (Organisation Support & Platform Communication)', () => {
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
          <SupportPage />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders support header, summary KPI cards, and empty state when no tickets exist', async () => {
    (orgApi.supportList as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 0, resolved: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Support' })).toBeTruthy();
      expect(screen.getAllByText(/Need help\? Create a ticket and our platform team will get back to you/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('Open').length).toBeGreaterThan(0);
      expect(screen.getAllByText('In Progress').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Resolved').length).toBeGreaterThan(0);
      expect(screen.getByText('No support tickets yet.')).toBeTruthy();
    });

    // Create your first ticket button should be present
    expect(screen.getByRole('button', { name: 'Create your first ticket' })).toBeTruthy();
  });

  it('renders ticket table rows with priority and status badges', async () => {
    (orgApi.supportList as any).mockResolvedValue({
      data: [
        {
          id: 'ticket-1',
          ticketNumber: 1024,
          subject: 'Recruiter cannot publish job',
          description: 'Getting an unexpected 500 error when clicking publish button.',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          category: 'JOB',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 1, resolved: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('#1024').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Recruiter cannot publish job').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HIGH').length).toBeGreaterThan(0);
      expect(screen.getAllByText('IN_PROGRESS').length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: 'View' }).length).toBeGreaterThan(0);
    });
  });

  it('opens Create Support Ticket modal and validates required fields', async () => {
    (orgApi.supportList as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 0, resolved: 0 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create your first ticket' })).toBeTruthy();
    });

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: 'Create your first ticket' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Support Ticket' })).toBeTruthy();
      expect(screen.getByPlaceholderText('e.g. Recruiter cannot publish a job')).toBeTruthy();
      expect(screen.getByPlaceholderText('Describe the issue in detail...')).toBeTruthy();
    });

    // Attempt submitting without fields
    const submitBtn = screen.getByRole('button', { name: 'Submit Ticket' });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Subject is required')).toBeTruthy();
    });
  });

  it('successfully creates a ticket via API when form is valid', async () => {
    (orgApi.supportList as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 0, resolved: 0 },
    });

    (orgApi.supportCreate as any).mockResolvedValue({
      id: 'new-ticket-uuid',
      ticketNumber: 1025,
      subject: 'Billing inquiry',
      category: 'PAYMENT',
      priority: 'MEDIUM',
      description: 'Invoice not received.',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    (orgApi.supportGet as any).mockResolvedValue({
      id: 'new-ticket-uuid',
      ticketNumber: 1025,
      subject: 'Billing inquiry',
      category: 'PAYMENT',
      priority: 'MEDIUM',
      description: 'Invoice not received.',
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create your first ticket' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create your first ticket' }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Create Support Ticket' })).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText('e.g. Recruiter cannot publish a job'), {
      target: { value: 'Billing inquiry' },
    });
    fireEvent.change(screen.getByPlaceholderText('Describe the issue in detail...'), {
      target: { value: 'Invoice not received for last cycle.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }));

    await waitFor(() => {
      expect(orgApi.supportCreate).toHaveBeenCalledWith({
        subject: 'Billing inquiry',
        category: 'JOB',
        priority: 'MEDIUM',
        description: 'Invoice not received for last cycle.',
      });
    });
  });

  it('views ticket details, reads messages, and sends a reply', async () => {
    (orgApi.supportList as any).mockResolvedValue({
      data: [
        {
          id: 'ticket-1',
          ticketNumber: 1024,
          subject: 'Recruiter cannot publish job',
          description: 'Getting an unexpected 500 error when clicking publish button.',
          status: 'IN_PROGRESS',
          priority: 'HIGH',
          category: 'JOB',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 1, resolved: 0 },
    });

    (orgApi.supportGet as any).mockResolvedValue({
      id: 'ticket-1',
      ticketNumber: 1024,
      subject: 'Recruiter cannot publish job',
      description: 'Getting an unexpected 500 error when clicking publish button.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      category: 'JOB',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdByUser: {
        id: 'u1',
        email: 'admin@acme.com',
        firstName: 'Acme',
        lastName: 'Admin',
        role: 'ORGANISATION_ADMIN',
      },
      messages: [
        {
          id: 'msg-1',
          body: 'We are investigating the issue.',
          isInternal: false,
          createdAt: new Date().toISOString(),
          author: {
            id: 'staff-1',
            email: 'support@clyptus.platform',
            firstName: 'Support',
            lastName: 'Agent',
            role: 'PLATFORM_SUPER_ADMIN',
          },
        },
      ],
    });

    (orgApi.supportMessage as any).mockResolvedValue({
      id: 'msg-2',
      body: 'Thank you for the update!',
      createdAt: new Date().toISOString(),
      author: {
        id: 'u1',
        email: 'admin@acme.com',
        firstName: 'Acme',
        lastName: 'Admin',
        role: 'ORGANISATION_ADMIN',
      },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('#1024')[0]).toBeTruthy();
    });

    // Click View
    fireEvent.click(screen.getAllByRole('button', { name: 'View' })[0]);

    await waitFor(() => {
      expect(screen.getByText('We are investigating the issue.')).toBeTruthy();
      expect(screen.getByText('Platform Support')).toBeTruthy();
      expect(screen.getByPlaceholderText('Write your message to Platform Support...')).toBeTruthy();
    });

    // Send reply
    fireEvent.change(screen.getByPlaceholderText('Write your message to Platform Support...'), {
      target: { value: 'Thank you for the update!' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));

    await waitFor(() => {
      expect(orgApi.supportMessage).toHaveBeenCalledWith('ticket-1', {
        body: 'Thank you for the update!',
      });
    });
  });

  it('shows error state with retry button when tickets fail to load', async () => {
    (orgApi.supportList as any).mockRejectedValueOnce(new Error('Network error'));

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Unable to load support tickets.')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeTruthy();
    });

    // Mock resolved for retry
    (orgApi.supportList as any).mockResolvedValue({
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
      summary: { open: 0, inProgress: 0, resolved: 0 },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => {
      expect(screen.getByText('No support tickets yet.')).toBeTruthy();
    });
  });
});
