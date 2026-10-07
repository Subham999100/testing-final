// ============================================================
// Clyptus Job Portal - Platform Verification Page
// Integration Tests for Queue, Filtering, and Inspection
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { Verification } from './Verification';
import { OrganisationApplicationService } from '../../services/organisation-application.service';

vi.mock('../../services/organisation-application.service', () => ({
  OrganisationApplicationService: {
    getApplications: vi.fn(),
    getApplicationById: vi.fn(),
    fetchDocumentBlob: vi.fn(),
    requestInformation: vi.fn(),
    rejectApplication: vi.fn(),
    approveApplication: vi.fn(),
  },
}));

vi.mock('../../store/auth.store', () => ({
  useAuthStore: (selector: any) =>
    selector({ user: { userId: 'plat_admin_1', role: 'PLATFORM_SUPER_ADMIN' } }),
}));

describe('Platform Verification Page', () => {
  let queryClient: QueryClient;

  const mockApplications = [
    {
      id: 'app_test_1',
      applicationNumber: 101,
      name: 'Stark Industries',
      slug: 'stark-industries',
      domain: 'stark.com',
      contactEmail: 'contact@stark.com',
      ownerName: 'Tony Stark',
      ownerEmail: 'tony@stark.com',
      ownerPhone: '+1-555-0101',
      selectedPlan: {
        id: 'plan_growth',
        name: 'Growth Plan',
        code: 'GROWTH',
        tokenAmount: 5000,
        priceCents: 39900,
        currency: 'USD',
      },
      paymentMethod: 'INVOICE',
      paymentReference: 'INV-2026-001',
      paymentStatus: 'PENDING' as const,
      status: 'PENDING_REVIEW' as const,
      documentsCount: 2,
      submittedAt: '2026-10-06T10:00:00.000Z',
      reviewedAt: null,
      createdOrganisationId: null,
    },
    {
      id: 'app_test_2',
      applicationNumber: 102,
      name: 'Wayne Enterprises',
      slug: 'wayne-enterprises',
      domain: 'wayne.corp',
      contactEmail: 'ops@wayne.corp',
      ownerName: 'Bruce Wayne',
      ownerEmail: 'bruce@wayne.corp',
      ownerPhone: '+1-555-0102',
      selectedPlan: {
        id: 'plan_enterprise',
        name: 'Enterprise Plan',
        code: 'ENTERPRISE',
        tokenAmount: 25000,
        priceCents: 149900,
        currency: 'USD',
      },
      paymentMethod: 'WIRE_TRANSFER',
      paymentReference: 'WT-998877',
      paymentStatus: 'VERIFIED' as const,
      status: 'APPROVED' as const,
      documentsCount: 3,
      submittedAt: '2026-10-05T09:00:00.000Z',
      reviewedAt: '2026-10-06T08:00:00.000Z',
      createdOrganisationId: 'org_wayne_id',
    },
  ];

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
          <Verification />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders application verification queue table with items', async () => {
    (OrganisationApplicationService.getApplications as any).mockResolvedValueOnce({
      data: mockApplications,
      meta: { total: 2, page: 1, limit: 15, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Organisation Applications')).toBeTruthy();
      expect(screen.getByText('Stark Industries')).toBeTruthy();
      expect(screen.getByText('Wayne Enterprises')).toBeTruthy();
      expect(screen.getByText('Tony Stark')).toBeTruthy();
      expect(screen.getByText('Bruce Wayne')).toBeTruthy();
    });

    // Check status pill tabs
    expect(screen.getByRole('button', { name: 'Pending Review' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Approved' })).toBeTruthy();

    // Check plan info
    expect(screen.getByText('Growth Plan')).toBeTruthy();
    expect(screen.getByText('5,000 tokens')).toBeTruthy();
  });

  it('handles empty state when no applications exist', async () => {
    (OrganisationApplicationService.getApplications as any).mockResolvedValueOnce({
      data: [],
      meta: { total: 0, page: 1, limit: 15, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('No organisation applications found')).toBeTruthy();
    });
  });

  it('filters applications when status pill is clicked', async () => {
    (OrganisationApplicationService.getApplications as any).mockResolvedValue({
      data: [mockApplications[0]],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Stark Industries')).toBeTruthy();
    });

    // Click "Pending Review" pill button
    const pendingReviewFilter = screen.getByRole('button', { name: 'Pending Review' });
    fireEvent.click(pendingReviewFilter);

    await waitFor(() => {
      expect(OrganisationApplicationService.getApplications).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING_REVIEW',
        }),
      );
    });
  });

  it('opens detail modal when Review button is clicked', async () => {
    (OrganisationApplicationService.getApplications as any).mockResolvedValueOnce({
      data: [mockApplications[0]],
      meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
    });

    (OrganisationApplicationService.getApplicationById as any).mockResolvedValueOnce({
      ...mockApplications[0],
      contactPhone: '+1-555-0101',
      industry: 'Defense & Technology',
      companySize: '1000-5000',
      website: 'https://stark.com',
      address: '10880 Wilshire Blvd, Los Angeles, CA',
      ownerFirstName: 'Tony',
      ownerLastName: 'Stark',
      ownerDesignation: 'Chief Technology Officer',
      rejectionReason: null,
      requestedInfoNotes: null,
      applicantResponseNotes: null,
      documents: [],
      reviewHistory: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Stark Industries')).toBeTruthy();
    });

    const reviewButton = screen.getByRole('button', { name: 'Review' });
    fireEvent.click(reviewButton);

    // Modal should load and display company details
    await waitFor(() => {
      expect(screen.getByText('Defense & Technology')).toBeTruthy();
      expect(screen.getByText('Chief Technology Officer')).toBeTruthy();
      expect(screen.getByRole('button', { name: /Approve & Provision/i })).toBeTruthy();
    });
  });
});
