// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Tests: CreateOrganisationModal with Recruiter Limit
// ============================================================

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  CreateOrganisationModal,
  CreateOrganisationFormData,
} from './CreateOrganisationModal';

describe('CreateOrganisationModal (with Recruiter Limit & Super Admin)', () => {
  afterEach(() => {
    cleanup();
  });
  it('renders Step 1 with all organisation fields including Recruiter Limit', () => {
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText('Create Tenant Organisation')).toBeTruthy();
    expect(screen.getByText('Step 1 of 2: Organisation Details')).toBeTruthy();
    expect(screen.getByPlaceholderText('Acme Inc')).toBeTruthy();
    expect(screen.getByPlaceholderText('acme-inc')).toBeTruthy();
    expect(screen.getByPlaceholderText('acme.com')).toBeTruthy();
    expect(screen.getByPlaceholderText('hr@acme.com')).toBeTruthy();
    expect(screen.getByText('Plan Tier')).toBeTruthy();
    expect(screen.getByText('Initial Token Allocation')).toBeTruthy();
    expect(screen.getByText(/Recruiter Limit/i)).toBeTruthy();
  });

  it('validates required fields in Step 1 before allowing transition to Step 2', () => {
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Organisation name is required')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Acme Inc'), {
      target: { value: 'Stark Industries' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('URL slug is required')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'stark-industries' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Contact email is required')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Please enter a valid contact email address')).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'hr@stark.com' },
    });
    fireEvent.click(screen.getByText('Next'));

    expect(screen.getByText('Step 2 of 2: Organisation Super Admin')).toBeTruthy();
  });

  it('submits exact backend contract payload with recruiterLimit upon Step 2 completion', () => {
    const onSubmit = vi.fn();
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Step 1
    fireEvent.change(screen.getByPlaceholderText('Acme Inc'), {
      target: { value: 'Cyberdyne Systems' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'cyberdyne-systems' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme.com'), {
      target: { value: 'cyberdyne.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'ops@cyberdyne.com' },
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 2
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Miles Dyson' },
    });
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'miles@cyberdyne.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), {
      target: { value: 'CyberSecret123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'CyberSecret123!' },
    });

    fireEvent.click(screen.getByText('Create Organisation'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload: CreateOrganisationFormData = onSubmit.mock.calls[0][0];

    expect(payload).toEqual({
      name: 'Cyberdyne Systems',
      slug: 'cyberdyne-systems',
      domain: 'cyberdyne.com',
      contactEmail: 'ops@cyberdyne.com',
      tier: 'STANDARD',
      industry: 'Technology',
      initialTokenAllocation: 1000,
      recruiterLimit: 25,
      superAdminName: 'Miles Dyson',
      superAdminEmail: 'miles@cyberdyne.com',
      superAdminPassword: 'CyberSecret123!',
      superAdminPasswordConfirmation: 'CyberSecret123!',
    });
  });
});
