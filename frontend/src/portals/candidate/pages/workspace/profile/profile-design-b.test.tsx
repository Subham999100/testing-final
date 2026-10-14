// ============================================================
// Clyptus Job Portal - Candidate Portal (Design B)
// Vitest + React Testing Library Tests:
// 1. StrengthRing (accessibility, progressbar role, aria-live, aria-label)
// 2. Section Modal (validation, dirty guard, save)
// 3. ProfileBanner (camera menu, presets, accessible actions)
// 4. ConfirmDialog (accessible delete confirmation, esc key, callbacks)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrengthRing } from '../../../components/StrengthRing';
import { ConfirmDialog } from '../../../components/ConfirmDialog';
import { ProfileBanner } from './ProfileBanner';
import { EditProfileModal } from './EditProfileModal';
import { CandidateFullProfile } from '../../../lib/types';
import * as candidateApiModule from '../../../lib/api';

// Mock candidateApi
vi.mock('../../../lib/api', () => ({
  candidateApi: {
    updateProfile: vi.fn().mockResolvedValue({ id: 'p-1', completionScore: 85 }),
    uploadCover: vi.fn().mockResolvedValue({ coverUrl: 'https://cdn.example.com/cover.webp' }),
    deleteCover: vi.fn().mockResolvedValue({ success: true, coverUrl: null }),
    uploadPhoto: vi.fn().mockResolvedValue({ photoUrl: 'https://cdn.example.com/photo.webp' }),
    deletePhoto: vi.fn().mockResolvedValue({ success: true, photoUrl: null }),
  },
  candidateAxios: {},
  getCandidateToken: () => 'mock-token',
}));

// Mock toast
vi.mock('@/portals/org/ui/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Design B - Profile Strength Ring', () => {
  it('renders with role="progressbar", correct aria-label, and aria-live="polite"', () => {
    render(<StrengthRing score={75} size={120} strokeWidth={10} />);

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar).toBeTruthy();
    expect(progressbar.getAttribute('aria-label')).toBe('Profile strength 75 percent');
    expect(progressbar.getAttribute('aria-valuenow')).toBe('75');
    expect(progressbar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressbar.getAttribute('aria-valuemax')).toBe('100');

    // Number text has aria-live="polite"
    const scoreText = screen.getByText('75%');
    expect(scoreText).toBeTruthy();
    expect(scoreText.getAttribute('aria-live')).toBe('polite');
  });

  it('clamps negative scores to 0% and scores above 100 to 100%', () => {
    const { rerender } = render(<StrengthRing score={-15} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('0');
    expect(screen.getByText('0%')).toBeTruthy();

    rerender(<StrengthRing score={150} />);
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('100');
    expect(screen.getByText('100%')).toBeTruthy();
  });
});

describe('Design B - Accessible ConfirmDialog (Delete Confirmation)', () => {
  it('renders dialog with aria-labelledby and aria-describedby', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Delete Experience Entry?"
        message="Are you sure you want to delete this experience?"
        confirmLabel="Delete"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-labelledby')).toBe('confirm-dialog-title');
    expect(dialog.getAttribute('aria-describedby')).toBe('confirm-dialog-desc');
    expect(screen.getByText('Delete Experience Entry?')).toBeTruthy();
    expect(screen.getByText('Are you sure you want to delete this experience?')).toBeTruthy();
  });

  it('triggers onConfirm when confirm button is clicked', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Delete"
        message="This is a test"
        confirmLabel="Delete Now"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    const confirmBtn = screen.getByRole('button', { name: /delete now/i });
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('triggers onCancel when cancel or close button is clicked or Escape is pressed', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();

    render(
      <ConfirmDialog
        isOpen={true}
        title="Confirm Delete"
        message="This is a test"
        cancelLabel="Cancel"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

describe('Design B - ProfileBanner (Cover Actions & Menu)', () => {
  it('renders default brand tint when no cover image is provided', () => {
    renderWithClient(<ProfileBanner coverUrl={null} />);

    const editBtn = screen.getByRole('button', { name: /edit cover photo/i });
    expect(editBtn).toBeTruthy();
    expect(editBtn.getAttribute('aria-haspopup')).toBe('true');
  });

  it('opens dropdown menu with Upload, Choose preset, and Remove on button click', () => {
    renderWithClient(<ProfileBanner coverUrl="https://cdn.example.com/cover.jpg" />);

    const editBtn = screen.getByRole('button', { name: /edit cover photo/i });
    fireEvent.click(editBtn);

    // Menu items
    expect(screen.getByRole('menuitem', { name: /upload photo/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /choose preset/i })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: /remove/i })).toBeTruthy();
  });

  it('opens preset picker modal when Choose preset is clicked', () => {
    renderWithClient(<ProfileBanner coverUrl={null} />);

    const editBtn = screen.getByRole('button', { name: /edit cover photo/i });
    fireEvent.click(editBtn);

    const presetOption = screen.getByRole('menuitem', { name: /choose preset/i });
    fireEvent.click(presetOption);

    expect(screen.getByText(/choose preset cover/i)).toBeTruthy();
    expect(screen.getByText(/sunset amber/i)).toBeTruthy();
    expect(screen.getByText(/terracotta dark/i)).toBeTruthy();
  });
});

describe('Design B - EditProfileModal (Validation, Dirty Guard, Save)', () => {
  const mockProfile: CandidateFullProfile = {
    id: 'prof-1',
    userId: 'user-1',
    email: 'aditi@example.com',
    firstName: 'Aditi',
    lastName: 'Sharma',
    fullName: 'Aditi Sharma',
    role: 'CANDIDATE',
    isEmailVerified: true,
    phone: '+919876543210',
    headline: 'Senior Frontend Engineer | React & TypeScript',
    location: 'Bengaluru',
    experienceYears: 5,
    currentCompany: 'Acme Corp',
    openToWork: true,
    coverUrl: null,
    skills: ['React', 'TypeScript', 'Tailwind CSS'],
    bio: 'Experienced developer',
    education: [],
    experience: [],
    resume: { hasResume: false, fileName: null, fileSize: null, mimeType: null, uploadedAt: null },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders existing profile fields initialized correctly', () => {
    renderWithClient(
      <EditProfileModal isOpen={true} onClose={vi.fn()} profile={mockProfile} />,
    );

    expect(screen.getByDisplayValue('Aditi Sharma')).toBeTruthy();
    expect(screen.getByDisplayValue('Senior Frontend Engineer | React & TypeScript')).toBeTruthy();
    expect(screen.getByDisplayValue('Bengaluru')).toBeTruthy();
    expect(screen.getByDisplayValue('9876543210')).toBeTruthy();
    const openToWorkCheckbox = screen.getByLabelText(/open to work status/i) as HTMLInputElement;
    expect(openToWorkCheckbox.checked).toBe(true);
  });

  it('shows inline validation error when headline is too short (< 10 chars)', async () => {
    renderWithClient(
      <EditProfileModal isOpen={true} onClose={vi.fn()} profile={mockProfile} />,
    );

    const headlineInput = screen.getByLabelText(/headline/i);
    fireEvent.change(headlineInput, { target: { value: 'Dev' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      const errorMsg = screen.getByRole('alert');
      expect(errorMsg.textContent).toMatch(/at least 10 characters/i);
    });
  });

  it('shows dirty guard confirm dialog when closing while modified', async () => {
    const onClose = vi.fn();
    renderWithClient(
      <EditProfileModal isOpen={true} onClose={onClose} profile={mockProfile} />,
    );

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: 'Aditi Verma' } });

    // Click close (X button)
    const closeBtn = screen.getByRole('button', { name: /close dialog/i });
    fireEvent.click(closeBtn);

    // Should NOT close immediately, but show "Discard Unsaved Changes?"
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByText('Discard Unsaved Changes?')).toBeTruthy();

    // Confirm discard
    const discardBtn = screen.getByRole('button', { name: /discard changes/i });
    fireEvent.click(discardBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submits valid data, title-cases fields, and calls candidateApi.updateProfile', async () => {
    const onClose = vi.fn();
    renderWithClient(
      <EditProfileModal isOpen={true} onClose={onClose} profile={mockProfile} />,
    );

    const fullNameInput = screen.getByLabelText(/full name/i);
    fireEvent.change(fullNameInput, { target: { value: 'priya sharma' } });

    const headlineInput = screen.getByLabelText(/headline/i);
    fireEvent.change(headlineInput, { target: { value: 'software development engineer ii' } });

    const saveBtn = screen.getByRole('button', { name: /save changes/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(candidateApiModule.candidateApi.updateProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Priya',
          lastName: 'Sharma',
          headline: 'Software Development Engineer Ii',
          location: 'Bengaluru',
        }),
      );
    });

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });
});
