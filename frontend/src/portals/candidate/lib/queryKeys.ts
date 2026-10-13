// ============================================================
// Clyptus Job Portal - Candidate Portal Query Keys
// Deterministic React Query cache keys for the candidate domain
// ============================================================

import { CandidateJobQueryParams } from './types';

export const candidateQueryKeys = {
  me: ['candidate', 'me'] as const,
  profile: ['candidate', 'profile'] as const,
  resume: ['candidate', 'resume'] as const,
  onboarding: ['candidate', 'onboarding'] as const,
  parseStatus: ['candidate', 'resume', 'parseStatus'] as const,

  jobs: {
    all: ['candidate', 'jobs'] as const,
    list: (params?: CandidateJobQueryParams) => ['candidate', 'jobs', 'list', params ?? {}] as const,
    detail: (id: string) => ['candidate', 'jobs', 'detail', id] as const,
  },

  applications: {
    all: ['candidate', 'applications'] as const,
    list: ['candidate', 'applications', 'list'] as const,
    detail: (id: string) => ['candidate', 'applications', 'detail', id] as const,
  },
};
