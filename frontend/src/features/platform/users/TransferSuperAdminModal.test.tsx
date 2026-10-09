// ============================================================
// Transfer Organisation Super Admin Modal — Frontend Tests
// ============================================================

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { TransferSuperAdminModal } from './TransferSuperAdminModal';

describe('TransferSuperAdminModal', () => {
  const mockOrg = {
    id: 'org_acme_1',
    name: 'Acme Corporation',
    superAdmin: {
      id: 'usr_super_123',
      email: 'admin@acme.com',
      name: 'John Acme',
    },
  };

  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();
  const mockOnSubmitTransfer = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  const renderModal = (props?: Partial<React.ComponentProps<typeof TransferSuperAdminModal>>) =>
    render(
      <TransferSuperAdminModal
        organisation={mockOrg}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        onSubmitTransfer={mockOnSubmitTransfer}
        {...props}
      />,
    );

  it('renders modal with organization name and read-only current email', () => {
    renderModal();

    expect(screen.getByRole('heading', { name: 'Transfer Organisation Super Admin' })).toBeTruthy();
    expect(screen.getByDisplayValue('Acme Corporation')).toBeTruthy();

    const currentEmailInput = screen.getByLabelText('Current Email') as HTMLInputElement;
    expect(currentEmailInput.value).toBe('admin@acme.com');
    expect(currentEmailInput.readOnly).toBe(true);
    expect(currentEmailInput.disabled).toBe(true);
  });

  it('keeps password inputs masked as password by default and reveals with eye icon', () => {
    renderModal();

    const newPasswordInput = screen.getByLabelText('New Password *') as HTMLInputElement;
    const confirmPasswordInput = screen.getByLabelText('Confirm Password *') as HTMLInputElement;

    // Both masked by default
    expect(newPasswordInput.type).toBe('password');
    expect(confirmPasswordInput.type).toBe('password');

    // Toggle new password
    const toggleNewBtn = screen.getByRole('button', { name: 'Show new password' });
    fireEvent.click(toggleNewBtn);
    expect(newPasswordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide new password' })).toBeTruthy();

    // Toggle back
    fireEvent.click(screen.getByRole('button', { name: 'Hide new password' }));
    expect(newPasswordInput.type).toBe('password');

    // Toggle confirm password
    const toggleConfirmBtn = screen.getByRole('button', { name: 'Show confirm password' });
    fireEvent.click(toggleConfirmBtn);
    expect(confirmPasswordInput.type).toBe('text');
    expect(screen.getByRole('button', { name: 'Hide confirm password' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Hide confirm password' }));
    expect(confirmPasswordInput.type).toBe('password');
  });

  it('validates required fields, email format, and password length', async () => {
    renderModal();

    const submitBtn = screen.getByRole('button', { name: 'Transfer' });

    // Submit empty
    fireEvent.click(submitBtn);
    expect(screen.getByText('New email is required')).toBeTruthy();
    expect(mockOnSubmitTransfer).not.toHaveBeenCalled();

    // Invalid email
    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'not-an-email' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('Please enter a valid new email address')).toBeTruthy();

    // Valid email, empty password
    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'newadmin@acme.com' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('New password is required')).toBeTruthy();

    // Short password (< 8 chars)
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'short' } });
    fireEvent.click(submitBtn);
    expect(screen.getByText('New password must be at least 8 characters long')).toBeTruthy();
  });

  it('rejects submission when passwords do not match', async () => {
    renderModal();

    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'newadmin@acme.com' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'DifferentPassword123!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

    expect(screen.getByText('Passwords do not match')).toBeTruthy();
    expect(mockOnSubmitTransfer).not.toHaveBeenCalled();
  });

  it('submits valid form and handles successful transfer', async () => {
    mockOnSubmitTransfer.mockResolvedValueOnce({
      message: 'Organisation Super Admin credentials updated successfully',
      data: {
        userId: 'usr_super_123',
        email: 'newadmin@acme.com',
        organisationId: 'org_acme_1',
        mustChangePassword: true,
      },
    });

    renderModal();

    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'newadmin@acme.com' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'NewPassword123!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

    await waitFor(() => {
      expect(mockOnSubmitTransfer).toHaveBeenCalledWith('org_acme_1', {
        newEmail: 'newadmin@acme.com',
        newPassword: 'NewPassword123!',
        confirmPassword: 'NewPassword123!',
      });
      expect(screen.getByText('Organisation Super Admin credentials updated successfully.')).toBeTruthy();
    });
  });

  it('displays backend error message on failure', async () => {
    mockOnSubmitTransfer.mockRejectedValueOnce(
      new Error("Email 'taken@acme.com' is already registered to another user"),
    );

    renderModal();

    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'taken@acme.com' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'NewPassword123!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'NewPassword123!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

    await waitFor(() => {
      expect(screen.getByText("Email 'taken@acme.com' is already registered to another user")).toBeTruthy();
    });
  });

  it('never logs passwords to console during execution', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    mockOnSubmitTransfer.mockResolvedValueOnce({});

    renderModal();

    fireEvent.change(screen.getByLabelText('New Email *'), { target: { value: 'newadmin@acme.com' } });
    fireEvent.change(screen.getByLabelText('New Password *'), { target: { value: 'SecretPassword999!' } });
    fireEvent.change(screen.getByLabelText('Confirm Password *'), { target: { value: 'SecretPassword999!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Transfer' }));

    await waitFor(() => {
      expect(mockOnSubmitTransfer).toHaveBeenCalled();
    });

    for (const call of consoleSpy.mock.calls) {
      expect(JSON.stringify(call)).not.toContain('SecretPassword999!');
    }
    consoleSpy.mockRestore();
  });
});
