// ============================================================
// Clyptus Job Portal - Organisation Application Wizard
// Unit and Integration Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { OrganisationApplicationWizard } from './OrganisationApplicationWizard';
import { OrganisationApplicationService } from '../../../services/organisation-application.service';

vi.mock('../../../services/organisation-application.service', () => ({
  OrganisationApplicationService: {
    getPublicPlans: vi.fn(),
    submitApplication: vi.fn(),
    uploadDocument: vi.fn(),
    getApplicationStatus: vi.fn(),
  },
}));

describe('OrganisationApplicationWizard', () => {
  let queryClient: QueryClient;

  const mockPlans = [
    {
      id: 'plan_starter',
      name: 'Starter Tier',
      code: 'STARTER',
      description: 'Ideal for early-stage companies',
      tokenAmount: 1000,
      priceCents: 9900,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      features: ['Up to 5 job postings', 'Email support'],
      sortOrder: 1,
    },
    {
      id: 'plan_growth',
      name: 'Growth Tier',
      code: 'GROWTH',
      description: 'Accelerated talent acquisition',
      tokenAmount: 5000,
      priceCents: 39900,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      features: ['Unlimited postings', 'Priority verification'],
      sortOrder: 2,
    },
  ];

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.clearAllMocks();
    (OrganisationApplicationService.getPublicPlans as any).mockResolvedValue(mockPlans);
  });

  afterEach(() => {
    cleanup();
  });

  const renderComponent = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <OrganisationApplicationWizard />
        </BrowserRouter>
      </QueryClientProvider>,
    );

  it('renders Step 1 (Organisation Information) initially', () => {
    renderComponent();

    expect(screen.getByText('Organisation Details')).toBeTruthy();
    expect(screen.getByPlaceholderText('Acme Corporation Ltd.')).toBeTruthy();
    expect(screen.getByPlaceholderText('acme-corp')).toBeTruthy();
    expect(screen.getByPlaceholderText('acme.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('admin@acme.com')).toBeTruthy();
  });

  it('validates Step 1 required fields before allowing progression to Step 2', async () => {
    renderComponent();

    // Click Continue without filling required fields
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(screen.getByText('Organisation name is required')).toBeTruthy();

    // Fill valid values
    fireEvent.change(screen.getByPlaceholderText('Acme Corporation Ltd.'), {
      target: { value: 'Initech Global' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-corp'), {
      target: { value: 'initech-global' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'hello@initech.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Should now be on Step 2
    await waitFor(() => {
      expect(screen.getByText('Authorised Representative')).toBeTruthy();
      expect(screen.getByPlaceholderText('Jane')).toBeTruthy();
      expect(screen.getByPlaceholderText('Doe')).toBeTruthy();
    });
  });

  it('validates Step 2 fields and progresses to Step 3 (Plan & Payment)', async () => {
    renderComponent();

    // Fill Step 1
    fireEvent.change(screen.getByPlaceholderText('Acme Corporation Ltd.'), {
      target: { value: 'Initech Global' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-corp'), {
      target: { value: 'initech-global' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'hello@initech.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Try Step 2 empty
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Jane')).toBeTruthy();
    });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    expect(screen.getByText('Representative first name is required')).toBeTruthy();

    // Fill Step 2
    fireEvent.change(screen.getByPlaceholderText('Jane'), {
      target: { value: 'Peter' },
    });
    fireEvent.change(screen.getByPlaceholderText('Doe'), {
      target: { value: 'Gibbons' },
    });
    fireEvent.change(screen.getByPlaceholderText('jane.doe@acme.com'), {
      target: { value: 'peter@initech.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Should load plans and show Step 3
    await waitFor(() => {
      expect(screen.getByText('Plan & Payment')).toBeTruthy();
      expect(screen.getByText('Starter Tier')).toBeTruthy();
      expect(screen.getByText('Growth Tier')).toBeTruthy();
    });
  });

  it('allows plan selection and moves to Step 4 (Documents) and Step 5 (Review)', async () => {
    renderComponent();

    // Step 1
    fireEvent.change(screen.getByPlaceholderText('Acme Corporation Ltd.'), { target: { value: 'Initech' } });
    fireEvent.change(screen.getByPlaceholderText('acme-corp'), { target: { value: 'initech' } });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), { target: { value: 'admin@initech.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 2
    await waitFor(() => expect(screen.getByPlaceholderText('Jane')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Peter' } });
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Gibbons' } });
    fireEvent.change(screen.getByPlaceholderText('jane.doe@acme.com'), { target: { value: 'admin@initech.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 3
    await waitFor(() => expect(screen.getByText('Starter Tier')).toBeTruthy());
    // Growth Tier card click
    fireEvent.click(screen.getByText('Growth Tier'));
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 4: Documents
    await waitFor(() => {
      expect(screen.getByText('Required Organisation Documents')).toBeTruthy();
    });
    // Can continue without optional documents
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 5: Review
    await waitFor(() => {
      expect(screen.getByText(/Review & Confirm Application/i)).toBeTruthy();
      expect(screen.getAllByText('Initech')[0]).toBeTruthy();
      expect(screen.getAllByText('admin@initech.com')[0]).toBeTruthy();
    });
  });

  it('submits application and displays confirmation screen with application number', async () => {
    (OrganisationApplicationService.submitApplication as any).mockResolvedValueOnce({
      applicationId: 'app_12345',
      applicationNumber: 1042,
      continuationToken: 'sec_continuation_jwt_token',
      status: 'PENDING_REVIEW',
      message: 'Application submitted successfully',
    });

    renderComponent();

    // Fill Step 1
    fireEvent.change(screen.getByPlaceholderText('Acme Corporation Ltd.'), { target: { value: 'Cyberdyne Systems' } });
    fireEvent.change(screen.getByPlaceholderText('acme-corp'), { target: { value: 'cyberdyne' } });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), { target: { value: 'ops@cyberdyne.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Fill Step 2
    await waitFor(() => expect(screen.getByPlaceholderText('Jane')).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText('Jane'), { target: { value: 'Miles' } });
    fireEvent.change(screen.getByPlaceholderText('Doe'), { target: { value: 'Dyson' } });
    fireEvent.change(screen.getByPlaceholderText('jane.doe@acme.com'), { target: { value: 'miles@cyberdyne.com' } });
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 3
    await waitFor(() => expect(screen.getByText('Starter Tier')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 4
    await waitFor(() => expect(screen.getByText('Required Organisation Documents')).toBeTruthy());
    fireEvent.click(screen.getByRole('button', { name: /Continue/i }));

    // Step 5
    await waitFor(() => expect(screen.getByText(/Review & Confirm Application/i)).toBeTruthy());
    const submitBtn = screen.getByRole('button', { name: /Submit Application/i });
    expect(submitBtn).toBeTruthy();

    fireEvent.click(submitBtn);

    // Confirmation page
    await waitFor(() => {
      expect(screen.getByText(/Application Submitted/i)).toBeTruthy();
      expect(screen.getByText(/1042/)).toBeTruthy();
      expect(screen.getByText(/PENDING REVIEW/i)).toBeTruthy();
      expect(screen.getByText(/queued for Platform Administrator review/i)).toBeTruthy();
    });

    expect(OrganisationApplicationService.submitApplication).toHaveBeenCalledTimes(1);
    expect(OrganisationApplicationService.submitApplication).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Cyberdyne Systems',
        slug: 'cyberdyne',
        contactEmail: 'ops@cyberdyne.com',
        ownerFirstName: 'Miles',
        ownerLastName: 'Dyson',
        ownerEmail: 'miles@cyberdyne.com',
      }),
    );
  });
});
