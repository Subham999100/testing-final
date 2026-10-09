// ============================================================
// Platform Support Page — Integration Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Support } from './Support';
import { PlatformService } from '../../services/platform.service';

vi.mock('../../services/platform.service', () => ({
  PlatformService: {
    getSupportTickets: vi.fn(),
    getSupportTicketById: vi.fn(),
    createSupportTicket: vi.fn(),
    addSupportMessage: vi.fn(),
    updateSupportTicketStatus: vi.fn(),
    assignSupportTicket: vi.fn(),
    getOrganisations: vi.fn().mockResolvedValue({ data: [] }),
    getAdmins: vi.fn().mockResolvedValue({ data: [] }),
  },
}));

let mockUser = {
  userId: 'admin-1',
  role: 'PLATFORM_ADMIN',
  permissions: ['platform.support.read', 'platform.support.manage'],
};

vi.mock('../../store/auth.store', () => ({
  useAuthStore: (selector: any) => selector({ user: mockUser }),
}));

describe('Platform Support Page', () => {
  let queryClient: QueryClient;

  const sampleTicket = {
    id: 'tkt-1',
    ticketNumber: 1024,
    subject: 'Recruiter cannot publish job',
    description: 'We are receiving a 500 error when clicking publish.',
    status: 'OPEN',
    priority: 'HIGH',
    category: 'JOB',
    organisation: { id: 'org-1', name: 'Acme Corporation', slug: 'acme' },
    createdByUser: { id: 'u1', firstName: 'John', lastName: 'Doe', email: 'john@acme.com', role: 'RECRUITER' },
    assignedToUser: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [
      {
        id: 'm1',
        ticketId: 'tkt-1',
        authorId: 'u1',
        body: 'Here is the detailed issue reproduction.',
        isInternal: false,
        createdAt: new Date().toISOString(),
        author: { id: 'u1', firstName: 'John', lastName: 'Doe', role: 'RECRUITER' },
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();

    mockUser = {
      userId: 'admin-1',
      role: 'PLATFORM_ADMIN',
      permissions: ['platform.support.read', 'platform.support.manage'],
    };

    (PlatformService.getSupportTickets as any).mockResolvedValue({
      data: [sampleTicket],
      meta: { total: 1, totalPages: 1, page: 1, limit: 15 },
      summary: { open: 24, inProgress: 11, urgent: 3, resolved: 183 },
    });

    (PlatformService.getSupportTicketById as any).mockResolvedValue(sampleTicket);
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Support />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders top summary cards with accurate KPI counts', async () => {
    renderComponent();

    expect(await screen.findByText('24')).toBeTruthy();
    expect(screen.getByText('11')).toBeTruthy();
    expect(screen.getByText('3')).toBeTruthy();
    expect(screen.getByText('183')).toBeTruthy();
  });

  it('renders tickets list table', async () => {
    renderComponent();

    expect(await screen.findByText('#1024')).toBeTruthy();
    expect(screen.getByText('Recruiter cannot publish job')).toBeTruthy();
    expect(screen.getByText('Acme Corporation')).toBeTruthy();
  });

  it('opens ticket details modal when clicking View', async () => {
    renderComponent();

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    expect(await screen.findByText('Issue Description')).toBeTruthy();
    expect(screen.getByText('Here is the detailed issue reproduction.')).toBeTruthy();
  });

  it('disables Send button when reply is empty or whitespace-only, and enables when valid text is typed', async () => {
    renderComponent();

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const textarea = await screen.findByPlaceholderText(/type a message to the user/i);
    const sendBtn = screen.getByRole('button', { name: /send/i }) as HTMLButtonElement;

    // Initially empty -> disabled
    expect(sendBtn.disabled).toBe(true);

    // Whitespace only -> still disabled
    fireEvent.change(textarea, { target: { value: '    ' } });
    expect(sendBtn.disabled).toBe(true);

    // Valid text -> enabled
    fireEvent.change(textarea, { target: { value: 'We are checking the server logs now.' } });
    expect(sendBtn.disabled).toBe(false);

    // Cleared again -> disabled
    fireEvent.change(textarea, { target: { value: '' } });
    expect(sendBtn.disabled).toBe(true);
  });

  it('allows Platform Admin to post a reply, appends to conversation thread, and clears input', async () => {
    const newMessage = {
      id: 'm2',
      ticketId: 'tkt-1',
      authorId: 'admin-1',
      body: 'Investigating this now.',
      isInternal: false,
      createdAt: new Date().toISOString(),
      author: { id: 'admin-1', firstName: 'Platform', lastName: 'Admin', role: 'PLATFORM_ADMIN' },
    };

    (PlatformService.addSupportMessage as any).mockResolvedValue(newMessage);
    (PlatformService.getSupportTicketById as any).mockResolvedValue({
      ...sampleTicket,
      messages: [...sampleTicket.messages, newMessage],
    });

    renderComponent();

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const textarea = (await screen.findByPlaceholderText(/type a message to the user/i)) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'Investigating this now.' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    expect((sendBtn as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(PlatformService.addSupportMessage).toHaveBeenCalledWith('tkt-1', {
        body: 'Investigating this now.',
        isInternal: false,
      });
    });

    // Check that input is cleared and new message appears
    await waitFor(() => {
      expect(textarea.value).toBe('');
      expect(screen.getByText('Investigating this now.')).toBeTruthy();
    });
  });

  it('supports posting an internal note with isInternal: true', async () => {
    const internalMsg = {
      id: 'm3',
      ticketId: 'tkt-1',
      authorId: 'admin-1',
      body: 'Internal note: escalation to DevOps.',
      isInternal: true,
      createdAt: new Date().toISOString(),
      author: { id: 'admin-1', firstName: 'Platform', lastName: 'Admin', role: 'PLATFORM_ADMIN' },
    };

    (PlatformService.addSupportMessage as any).mockResolvedValue(internalMsg);

    renderComponent();

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const internalCheckbox = await screen.findByLabelText(/internal note/i);
    fireEvent.click(internalCheckbox);

    const textarea = await screen.findByPlaceholderText(/add an internal note only visible to platform staff/i);
    fireEvent.change(textarea, { target: { value: 'Internal note: escalation to DevOps.' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(PlatformService.addSupportMessage).toHaveBeenCalledWith('tkt-1', {
        body: 'Internal note: escalation to DevOps.',
        isInternal: true,
      });
    });
  });

  it('displays error message banner in modal when reply API fails', async () => {
    (PlatformService.addSupportMessage as any).mockRejectedValueOnce(
      new Error('Access denied: Missing required permission(s) [platform.support.manage]'),
    );

    renderComponent();

    const viewButton = await screen.findByRole('button', { name: /view/i });
    fireEvent.click(viewButton);

    const textarea = await screen.findByPlaceholderText(/type a message to the user/i);
    fireEvent.change(textarea, { target: { value: 'Test reply message' } });

    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);

    expect(
      await screen.findByText(/access denied: missing required permission\(s\) \[platform\.support\.manage\]/i),
    ).toBeTruthy();

    // Text in textarea remains for the user to retry or fix
    expect((textarea as HTMLTextAreaElement).value).toBe('Test reply message');
  });

  it('renders error state and allows retry on initial load failure', async () => {
    (PlatformService.getSupportTickets as any).mockRejectedValueOnce(new Error('Network failure'));
    renderComponent();

    expect(await screen.findByText('Network failure')).toBeTruthy();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeTruthy();
  });
});
