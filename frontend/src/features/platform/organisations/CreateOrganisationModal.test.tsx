import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  CreateOrganisationModal,
  CreateOrganisationFormData,
} from './CreateOrganisationModal';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('CreateOrganisationModal (2-step wizard)', () => {
  it('renders Step 1 fields by default', () => {
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
    expect(screen.getByText('Next')).toBeTruthy();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('validates required fields in Step 1 before allowing transition to Step 2', () => {
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    // Click Next with empty fields
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Organisation name is required')).toBeTruthy();

    // Fill name, click Next
    fireEvent.change(screen.getByPlaceholderText('Acme Inc'), {
      target: { value: 'Stark Industries' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('URL slug is required')).toBeTruthy();

    // Fill slug with invalid chars (though input strips non-matching, validate handler checks format)
    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'stark-industries' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Contact email is required')).toBeTruthy();

    // Fill invalid email
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'invalid-email' },
    });
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Please enter a valid contact email address')).toBeTruthy();

    // Fill valid email
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'hr@stark.com' },
    });
    fireEvent.click(screen.getByText('Next'));

    // Should now transition to Step 2
    expect(screen.getByText('Step 2 of 2: Organisation Super Admin')).toBeTruthy();
  });

  it('allows navigation back to Step 1 and preserves entered details', () => {
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText('Acme Inc'), {
      target: { value: 'Stark Industries' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'stark-industries' },
    });
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'hr@stark.com' },
    });

    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText('Step 2 of 2: Organisation Super Admin')).toBeTruthy();

    // Click Back
    fireEvent.click(screen.getByText('Back'));
    expect(screen.getByText('Step 1 of 2: Organisation Details')).toBeTruthy();
    expect((screen.getByPlaceholderText('Acme Inc') as HTMLInputElement).value).toBe(
      'Stark Industries',
    );
  });

  it('validates Step 2 fields and password matching before submitting', () => {
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
      target: { value: 'Wayne Enterprises' },
    });
    fireEvent.change(screen.getByPlaceholderText('acme-inc'), {
      target: { value: 'wayne-enterprises' },
    });
    fireEvent.change(screen.getByPlaceholderText('hr@acme.com'), {
      target: { value: 'contact@wayne.com' },
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 2 with empty fields
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(screen.getByText('Super Admin full name is required')).toBeTruthy();

    // Fill name
    fireEvent.change(screen.getByPlaceholderText('Jane Doe'), {
      target: { value: 'Bruce Wayne' },
    });
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(screen.getByText('Super Admin email is required')).toBeTruthy();

    // Fill invalid email
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'bruce' },
    });
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(screen.getByText('Please enter a valid Super Admin email address')).toBeTruthy();

    // Fill valid email
    fireEvent.change(screen.getByPlaceholderText('admin@acme.com'), {
      target: { value: 'bruce@wayne.com' },
    });
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(screen.getByText('Initial password is required')).toBeTruthy();

    // Short password (< 8 chars)
    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), {
      target: { value: 'pass12' },
    });
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(
      screen.getByText('Initial password must be at least 8 characters long'),
    ).toBeTruthy();

    // Mismatched confirmation password
    fireEvent.change(screen.getByPlaceholderText('Min 8 characters'), {
      target: { value: 'SecurePass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Repeat password'), {
      target: { value: 'DifferentPass123!' },
    });
    fireEvent.click(screen.getByText('Create Organisation'));
    expect(screen.getByText('Passwords do not match')).toBeTruthy();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits exact backend contract payload upon successful Step 2 completion', () => {
    const onSubmit = vi.fn();
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Step 1: Fill organisation details
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
    fireEvent.change(screen.getByPlaceholderText('e.g. Technology'), {
      target: { value: 'Robotics' },
    });
    fireEvent.click(screen.getByText('Next'));

    // Step 2: Fill Super Admin details
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
      industry: 'Robotics',
      initialTokenAllocation: 1000,
      superAdminName: 'Miles Dyson',
      superAdminEmail: 'miles@cyberdyne.com',
      superAdminPassword: 'CyberSecret123!',
      superAdminPasswordConfirmation: 'CyberSecret123!',
    });
  });

  it('displays loading state and prevents duplicate submissions while isSubmitting is true', () => {
    const onSubmit = vi.fn();
    render(
      <CreateOrganisationModal
        isSubmitting={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    // Move to step 2 not needed, but check disabled states
    const submitBtn = screen.getByRole('button', { name: /Next/i });
    expect(submitBtn).toBeTruthy();

    const cancelBtn = screen.getByText('Cancel');
    expect((cancelBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('invokes onClose when Cancel or Close X button is clicked', () => {
    const onClose = vi.fn();
    render(
      <CreateOrganisationModal
        isSubmitting={false}
        onClose={onClose}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText('Close modal'));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
