// ============================================================
// Clyptus Job Portal - Platform Verification Detail Modal
// Unit & Integration Tests: Inspection, Actions (Approve, Reject, Request Info), & 409 Conflict Handling
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VerificationDetailModal } from './VerificationDetailModal';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

vi.mock('../../../services/organisation-application.service', () => ({
  OrganisationApplicationService: {
    getApplicationById: vi.fn(),
    fetchDocumentBlob: vi.fn(),
    requestInformation: vi.fn(),
    rejectApplication: vi.fn(),
    approveApplication: vi.fn(),
  },
}));

describe('VerificationDetailModal & Review Actions', () => {
  let queryClient: QueryClient;

  const mockDetail = {
    id: 'app_full_1',
    applicationNumber: 1042,
    name: 'Wayne Enterprises',
    slug: 'wayne-enterprises',
    domain: 'wayne.corp',
    contactEmail: 'ops@wayne.corp',
    contactPhone: '+1 800 555 0199',
    industry: 'Conglomerate',
    companySize: '500-1000',
    website: 'https://wayne.corp',
    address: '1007 Mountain Drive, Gotham',
    ownerName: 'Bruce Wayne',
    ownerFirstName: 'Bruce',
    ownerLastName: 'Wayne',
    ownerEmail: 'bruce@wayne.corp',
    ownerPhone: '+1 800 555 0198',
    ownerDesignation: 'CEO',
    selectedPlan: {
      id: 'plan_ent',
      name: 'Enterprise Plan',
      code: 'ENTERPRISE',
      tokenAmount: 25000,
      priceCents: 149900,
      currency: 'USD',
    },
    paymentMethod: 'WIRE_TRANSFER',
    paymentReference: 'WIRE-9988-GOTHAM',
    paymentStatus: 'PENDING' as const,
    status: 'PENDING_REVIEW' as const,
    rejectionReason: null,
    requestedInfoNotes: null,
    applicantResponseNotes: null,
    documentsCount: 1,
    submittedAt: '2026-10-06T10:00:00.000Z',
    reviewedAt: null,
    createdOrganisationId: null,
    documents: [
      {
        id: 'doc_1',
        type: 'REGISTRATION_CERTIFICATE' as const,
        fileName: 'certificate_of_incorporation.pdf',
        mimeType: 'application/pdf',
        fileSize: 245000,
        createdAt: '2026-10-06T10:05:00.000Z',
      },
    ],
    reviewHistory: [
      {
        id: 'rev_1',
        action: 'SUBMITTED' as const,
        actorRole: 'APPLICANT',
        notes: null,
        createdAt: '2026-10-06T10:00:00.000Z',
      },
    ],
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = (props?: Partial<React.ComponentProps<typeof VerificationDetailModal>>) =>
    render(
      <QueryClientProvider client={queryClient}>
        <VerificationDetailModal
          applicationId="app_full_1"
          onClose={vi.fn()}
          onRefreshQueue={vi.fn()}
          {...props}
        />
      </QueryClientProvider>,
    );

  it('renders application details and navigation tabs correctly', async () => {
    (OrganisationApplicationService.getApplicationById as any).mockResolvedValueOnce(mockDetail);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Application Inspection' })).toBeTruthy();
      expect(screen.getAllByText('Wayne Enterprises')[0]).toBeTruthy();
      expect(screen.getByText('1007 Mountain Drive, Gotham')).toBeTruthy();
      expect(screen.getByText('Bruce Wayne')).toBeTruthy();
      expect(screen.getByText('Enterprise Plan')).toBeTruthy();
      expect(screen.getByText('WIRE-9988-GOTHAM')).toBeTruthy();
    });

    // Check action buttons
    expect(screen.getByRole('button', { name: /Request Information/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Reject/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Approve & Provision/i })).toBeTruthy();
  });

  it('switches to Documents tab and renders document item', async () => {
    (OrganisationApplicationService.getApplicationById as any).mockResolvedValueOnce(mockDetail);

    renderComponent();

    await waitFor(() => {
      expect(screen.getAllByText('Wayne Enterprises')[0]).toBeTruthy();
    });

    // Switch to Documents tab
    const docsTab = screen.getByRole('button', { name: /Documents \(1\)/i });
    fireEvent.click(docsTab);

    await waitFor(() => {
      expect(screen.getByText('certificate_of_incorporation.pdf')).toBeTruthy();
      expect(screen.getByText(/REGISTRATION CERTIFICATE/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Preview/i })).toBeTruthy();
    });
  });

  it('opens and confirms Approve Application dialog', async () => {
    (OrganisationApplicationService.getApplicationById as any).mockResolvedValueOnce(mockDetail);
    (OrganisationApplicationService.approveApplication as any).mockResolvedValueOnce({
      applicationId: 'app_full_1',
      status: 'APPROVED',
      organisationId: 'org_wayne_new',
      organisationName: 'Wayne Enterprises',
      message: 'Organisation provisioned successfully',
    });

    const onRefreshQueue = vi.fn();
    renderComponent({ onRefreshQueue });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve & Provision/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Approve & Provision/i }));

    // Dialog appears
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Approve & Provision Organisation' })).toBeTruthy();
    });

    // Click confirm inside dialog
    const confirmApproveBtn = screen.getByRole('button', { name: 'Confirm Approval & Provision' });
    fireEvent.click(confirmApproveBtn);

    await waitFor(() => {
      expect(OrganisationApplicationService.approveApplication).toHaveBeenCalledWith('app_full_1');
      expect(onRefreshQueue).toHaveBeenCalled();
    });
  });

  it('handles HTTP 409 conflict during Approve action and shows refresh notice', async () => {
    (OrganisationApplicationService.getApplicationById as any).mockResolvedValueOnce(mockDetail);
    const conflictError: any = new Error('Application status has already been updated');
    conflictError.status = 409;
    (OrganisationApplicationService.approveApplication as any).mockRejectedValueOnce(conflictError);

    const onRefreshQueue = vi.fn();
    renderComponent({ onRefreshQueue });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Approve & Provision/i })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Approve & Provision/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Confirm Approval & Provision' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Confirm Approval & Provision' }));

    // Should display 409 notice
    await waitFor(() => {
      expect(
        screen.getByText('This application was updated by another administrator. Refresh to see the latest status.'),
      ).toBeTruthy();
    });
  });
});
