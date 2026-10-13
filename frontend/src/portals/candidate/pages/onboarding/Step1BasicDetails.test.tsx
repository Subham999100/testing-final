import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { Step1BasicDetails } from './Step1BasicDetails';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Step1BasicDetails Component (RTL & Accessibility)', () => {
  const baseInitialData = {
    email: 'candidate@example.com',
    phone: '9876543210',
    location: 'Bengaluru',
    isFresher: true,
  };

  it('renders a single "Full Name" input and does NOT render separate first/last name inputs', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <Step1BasicDetails
        initialData={{ ...baseInitialData, fullName: 'Hema' }}
        onSave={onSave}
        isLoading={false}
      />,
    );

    // Only one Full Name input
    const fullNameInput = screen.getByLabelText(/full name/i);
    expect(fullNameInput).toBeTruthy();
    expect(screen.queryByLabelText(/first name/i)).toBeNull();
    expect(screen.queryByLabelText(/last name/i)).toBeNull();
  });

  it('submits successfully with a single-word name "Hema"', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <Step1BasicDetails
        initialData={baseInitialData}
        onSave={onSave}
        isLoading={false}
      />,
    );

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: 'Hema' } });

    const submitBtn = screen.getByRole('button', { name: /save & continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Hema',
        phone: '9876543210',
        location: 'Bengaluru',
        isFresher: true,
      }),
    );
  });

  it('submits successfully with a multi-word name "Hema Sriram Ganti"', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <Step1BasicDetails
        initialData={baseInitialData}
        onSave={onSave}
        isLoading={false}
      />,
    );

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: 'Hema Sriram Ganti' } });

    const submitBtn = screen.getByRole('button', { name: /save & continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1);
    });

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        fullName: 'Hema Sriram Ganti',
        phone: '9876543210',
        location: 'Bengaluru',
      }),
    );
  });

  it('shows inline validation error and does not call onSave when Full Name is empty', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <Step1BasicDetails
        initialData={{ ...baseInitialData, fullName: '' }}
        onSave={onSave}
        isLoading={false}
      />,
    );

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: '' } });

    const submitBtn = screen.getByRole('button', { name: /save & continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsg = screen.getByText(/full name must be at least 2 characters/i);
      expect(errorMsg).toBeTruthy();
    });

    expect(onSave).not.toHaveBeenCalled();
    expect(fullNameInput.getAttribute('aria-invalid')).toBe('true');
    expect(fullNameInput.getAttribute('aria-describedby')).toBe('fullName-error');
  });

  it('displays accessible serverFieldErrors when backend returns a field error', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <Step1BasicDetails
        initialData={baseInitialData}
        onSave={onSave}
        isLoading={false}
        serverFieldErrors={{
          fullName: 'Full name cannot exceed 200 characters',
        }}
      />,
    );

    const errorMsg = screen.getByText('Full name cannot exceed 200 characters');
    expect(errorMsg).toBeTruthy();
    expect(errorMsg.getAttribute('role')).toBe('alert');

    const fullNameInput = screen.getByLabelText(/full name/i);
    expect(fullNameInput.getAttribute('aria-invalid')).toBe('true');
    expect(fullNameInput.getAttribute('aria-describedby')).toBe('fullName-error');
  });
});
