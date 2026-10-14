// ============================================================
// Clyptus Job Portal - Candidate Portal
// Video Profile & AI Video Interview Constants
// Shared rules: Min 30s, Max 3min, Max 100MB
// ============================================================

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 180; // 3 minutes
export const MAX_FILE_MB = 100;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024; // 104,857,600 bytes

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'] as const;

export type CandidateVideoMode = 'NONE' | 'PROFILE' | 'INTERVIEW';
export type VideoAnalysisStatus = 'NOT_STARTED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type VideoInterviewStatus = 'NOT_STARTED' | 'SKIPPED' | 'IN_PROGRESS' | 'COMPLETED';

export interface VideoProfileData {
  id: string;
  candidateProfileId: string;
  durationSeconds: number;
  sizeBytes: number;
  mimeType: string;
  analysisStatus: VideoAnalysisStatus;
  consentGivenAt?: string | null;
  thumbnailUrl?: string | null;
  videoStreamUrl?: string;
  createdAt: string;
  updatedAt: string;
  fluencyScore?: number | null;
  communicationScore?: number | null;
  grammarScore?: number | null;
}

export interface VideoProfileResponse {
  id?: string;
  hasVideo: boolean;
  videoMode: CandidateVideoMode;
  videoInterviewStatus: VideoInterviewStatus;
  canRecordProfile: boolean;
  canStartInterview: boolean;
  durationSeconds?: number;
  sizeBytes?: number;
  mimeType?: string;
  analysisStatus?: VideoAnalysisStatus;
  consentGivenAt?: string;
  hasThumbnail?: boolean;
  createdAt?: string;
  updatedAt?: string;
  streamUrl?: string;
  thumbnailUrl?: string;
  modeConflictNote?: string | null;
}
