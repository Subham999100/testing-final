// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: VideoProfileSection & VideoUploadModal
// Tests: Mutual exclusivity rule and duration validation (client-side)
// ============================================================

import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VideoProfileSection } from './VideoProfileSection';
import { VideoUploadModal } from './VideoUploadModal';
import { VideoRecordModal } from './VideoRecordModal';
import { CandidateFullProfile } from '../../../../lib/types';
import * as candidateApiModule from '../../../../lib/api';

// Mock candidateApi
vi.mock('../../../../lib/api', () => ({
  candidateApi: {
    getVideoProfile: vi.fn(),
    uploadVideoProfile: vi.fn(),
    deleteVideoProfile: vi.fn(),
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

const createMockCandidate = (overrides: Partial<CandidateFullProfile> = {}): CandidateFullProfile => ({
  id: 'cand_prof_1',
  userId: 'usr_1',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'Candidate',
  fullName: 'Test Candidate',
  role: 'CANDIDATE',
  isEmailVerified: true,
  phone: '+919876543210',
  headline: 'Software Engineer',
  location: 'Bengaluru',
  experienceYears: 3,
  currentCompany: 'Acme',
  bio: 'Experienced engineer',
  skills: ['React', 'TypeScript'],
  education: [],
  experience: [],
  resume: { hasResume: true, fileName: 'resume.pdf', fileSize: 1024, mimeType: 'application/pdf', uploadedAt: '2026-01-01' },
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  videoMode: 'NONE',
  videoInterviewStatus: 'NOT_STARTED',
  videoProfile: null,
  ...overrides,
});

describe('VideoProfileSection - Mutual Exclusivity Rule', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('enables both Video Profile and AI Video Interview when videoMode is NONE', async () => {
    vi.mocked(candidateApiModule.candidateApi.getVideoProfile).mockResolvedValue({
      hasVideo: false,
      videoMode: 'NONE',
      videoInterviewStatus: 'NOT_STARTED',
      canRecordProfile: true,
      canStartInterview: true,
    });

    const mockProfile = createMockCandidate({
      videoMode: 'NONE',
      videoProfile: null,
    });

    renderWithClient(<VideoProfileSection profile={mockProfile} />);

    // Both action buttons should be enabled
    const recordBtn = screen.getByRole('button', { name: /record video/i }) as HTMLButtonElement;
    const uploadBtn = screen.getByRole('button', { name: /upload file/i }) as HTMLButtonElement;
    const interviewBtn = screen.getByRole('button', { name: /start interview/i }) as HTMLButtonElement;

    expect(recordBtn.disabled).toBe(false);
    expect(uploadBtn.disabled).toBe(false);
    expect(interviewBtn.disabled).toBe(false);

    // No exclusivity warning messages should be displayed
    expect(screen.queryByText(/delete your video profile to take the video interview/i)).toBeNull();
  });

  it('disables Interview card with note when Video Profile exists', async () => {
    vi.mocked(candidateApiModule.candidateApi.getVideoProfile).mockResolvedValue({
      hasVideo: true,
      videoMode: 'PROFILE',
      videoInterviewStatus: 'NOT_STARTED',
      canRecordProfile: true,
      canStartInterview: false,
      durationSeconds: 75,
      createdAt: '2026-10-10T12:00:00Z',
    });

    const mockProfile = createMockCandidate({
      videoMode: 'PROFILE',
      videoProfile: { id: 'vp_1', hasVideo: true, durationSeconds: 75 },
    });

    renderWithClient(<VideoProfileSection profile={mockProfile} />);

    // Interview button should be disabled
    const interviewBtn = screen.getByRole('button', { name: /start interview/i }) as HTMLButtonElement;
    expect(interviewBtn.disabled).toBe(true);

    // Warning note should be displayed
    expect(
      screen.getByText(/delete your video profile to take the video interview instead/i),
    ).toBeTruthy();

    // Replace and Delete buttons should be present for video profile
    expect(screen.getByRole('button', { name: /replace/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /delete/i })).toBeTruthy();
  });

  it('disables Video Profile card with note when Interview is chosen or in progress', async () => {
    vi.mocked(candidateApiModule.candidateApi.getVideoProfile).mockResolvedValue({
      hasVideo: false,
      videoMode: 'INTERVIEW',
      videoInterviewStatus: 'IN_PROGRESS',
      canRecordProfile: false,
      canStartInterview: false,
    });

    const mockProfile = createMockCandidate({
      videoMode: 'INTERVIEW',
      videoInterviewStatus: 'IN_PROGRESS',
      videoProfile: null,
    });

    renderWithClient(<VideoProfileSection profile={mockProfile} />);

    // Record and Upload buttons should be disabled
    const recordBtn = screen.getByRole('button', { name: /record video/i }) as HTMLButtonElement;
    const uploadBtn = screen.getByRole('button', { name: /upload file/i }) as HTMLButtonElement;

    expect(recordBtn.disabled).toBe(true);
    expect(uploadBtn.disabled).toBe(true);

    // Warning note should be displayed
    expect(
      screen.getByText(/reset or complete your ai video interview to record or upload/i),
    ).toBeTruthy();
  });

  it('clicking Delete Video opens the accessible ConfirmDialog', async () => {
    vi.mocked(candidateApiModule.candidateApi.getVideoProfile).mockResolvedValue({
      hasVideo: true,
      videoMode: 'PROFILE',
      videoInterviewStatus: 'NOT_STARTED',
      canRecordProfile: true,
      canStartInterview: false,
      durationSeconds: 60,
    });

    const mockProfile = createMockCandidate({
      videoMode: 'PROFILE',
      videoProfile: { id: 'vp_1', hasVideo: true, durationSeconds: 60 },
    });

    renderWithClient(<VideoProfileSection profile={mockProfile} />);

    const deleteBtn = screen.getByRole('button', { name: /delete/i });
    fireEvent.click(deleteBtn);

    // ConfirmDialog should be visible
    expect(screen.getByRole('dialog', { name: /delete video profile/i })).toBeTruthy();
    expect(
      screen.getByText(/are you sure you want to delete your ai video profile/i),
    ).toBeTruthy();
  });
});

describe('VideoUploadModal - Client Duration and File Validation', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('rejects file larger than MAX_FILE_MB (100 MB)', async () => {
    const handleUpload = vi.fn();

    render(
      <VideoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        onUpload={handleUpload}
      />,
    );

    // Create a 101 MB mock file
    const largeFile = new File([new ArrayBuffer(100)], 'test.mp4', { type: 'video/mp4' });
    Object.defineProperty(largeFile, 'size', { value: 101 * 1024 * 1024 });

    const dropzone = screen.getByText(/click to browse or drag & drop video/i);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [largeFile] },
    });

    await waitFor(() => {
      expect(screen.getByText(/exceeds maximum allowed limit of 100 mb/i)).toBeTruthy();
    });

    expect(handleUpload).not.toHaveBeenCalled();
  });

  it('rejects unsupported file formats', async () => {
    const handleUpload = vi.fn();

    render(
      <VideoUploadModal
        isOpen={true}
        onClose={vi.fn()}
        onUpload={handleUpload}
      />,
    );

    const txtFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });

    const dropzone = screen.getByText(/click to browse or drag & drop video/i);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [txtFile] },
    });

    await waitFor(() => {
      expect(
        screen.getByText(/unsupported file type\. please upload mp4, webm, or mov/i),
      ).toBeTruthy();
    });

    expect(handleUpload).not.toHaveBeenCalled();
  });
});

describe('VideoRecordModal - Recording and Upload UX', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders modal when open and displays record controls', async () => {
    render(
      <VideoRecordModal
        isOpen={true}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(screen.getByText(/record ai video profile/i)).toBeTruthy();
    expect(screen.getByText(/30 seconds minimum · 3 minutes maximum/i)).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <VideoRecordModal
        isOpen={false}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />,
    );

    expect(container.firstChild).toBeNull();
  });
});
