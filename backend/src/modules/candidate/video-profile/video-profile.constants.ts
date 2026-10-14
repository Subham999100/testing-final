// ============================================================
// Clyptus Job Portal - Candidate Portal
// Video Profile & AI Video Interview Constants
// Shared rules: Min 30s, Max 3min, Max 100MB
// ============================================================

export const MIN_SECONDS = 30;
export const MAX_SECONDS = 180; // 3 minutes
export const MIN_DURATION_TOLERANCE_SECONDS = 29.5;
export const MAX_DURATION_TOLERANCE_SECONDS = 181.0;
export const MAX_FILE_MB = 100;
export const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024; // 104,857,600 bytes

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime', // .mov
  'video/x-matroska', // .mkv
] as const;

export const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv'] as const;

export enum CandidateVideoMode {
  NONE = 'NONE',
  PROFILE = 'PROFILE',
  INTERVIEW = 'INTERVIEW',
}

export enum VideoAnalysisStatus {
  NOT_STARTED = 'NOT_STARTED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum VideoInterviewStatus {
  NOT_STARTED = 'NOT_STARTED',
  SKIPPED = 'SKIPPED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}
