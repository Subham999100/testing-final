// ============================================================
// ORGANISATION PORTAL
// State machines for jobs, ATS stages, interviews and offers,
// plus platform-owned token costs. Pure functions (unit tested).
// ============================================================

import { ApplicationStage, InterviewStatus, JobStatus, OfferStatus } from '@prisma/client';
import { OrgPermission } from './org-permissions';

// ---------- Token costs (platform-owned pricing) ----------
export const TOKEN_COSTS = {
  JOB_PUBLISH: 50,
  RESUME_VIEW: 2,
  AI_MATCH: 5,
  AI_RESUME_PARSE: 5,
  AI_JD_IMPROVE: 10,
  AI_INTERVIEW_QUESTIONS: 10,
} as const;

export type TokenFeature = keyof typeof TOKEN_COSTS;

// ---------- Jobs ----------
export const JOB_ACTIONS = ['submit', 'publish', 'approve', 'reject', 'pause', 'resume', 'close', 'reopen', 'archive'] as const;
export type JobAction = (typeof JOB_ACTIONS)[number];

export const JOB_ACTION_PERMISSION: Record<JobAction, OrgPermission> = {
  submit: 'jobs.update',
  publish: 'jobs.publish',
  approve: 'jobs.approve',
  reject: 'jobs.approve',
  pause: 'jobs.update',
  resume: 'jobs.publish',
  close: 'jobs.update',
  reopen: 'jobs.publish',
  archive: 'jobs.archive',
};

/**
 * @param approvalRequired org setting
 * @param canApprove actor holds jobs.approve (may publish a draft directly)
 */
export function nextJobStatus(
  current: JobStatus,
  action: JobAction,
  approvalRequired: boolean,
  canApprove: boolean,
): JobStatus | null {
  switch (action) {
    case 'submit':
      return current === 'DRAFT' && approvalRequired ? 'IN_REVIEW' : null;
    case 'publish':
      return current === 'DRAFT' && (!approvalRequired || canApprove) ? 'PUBLISHED' : null;
    case 'approve':
      return current === 'IN_REVIEW' ? 'PUBLISHED' : null;
    case 'reject':
      return current === 'IN_REVIEW' ? 'DRAFT' : null;
    case 'pause':
      return current === 'PUBLISHED' ? 'PAUSED' : null;
    case 'resume':
      return current === 'PAUSED' ? 'PUBLISHED' : null;
    case 'close':
      return current === 'PUBLISHED' || current === 'PAUSED' ? 'CLOSED' : null;
    case 'reopen':
      return current === 'CLOSED' ? 'PUBLISHED' : null;
    case 'archive':
      return current === 'DRAFT' || current === 'CLOSED' ? 'ARCHIVED' : null;
    default:
      return null;
  }
}

export const JOB_EDITABLE: JobStatus[] = ['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'PAUSED'];

// ---------- ATS ----------
export const ATS_STAGES: ApplicationStage[] = [
  'APPLIED',
  'SCREENING',
  'SHORTLISTED',
  'INTERVIEW',
  'OFFER',
  'HIRED',
  'REJECTED',
  'WITHDRAWN',
];

export const ATS_TRANSITIONS: Record<ApplicationStage, ApplicationStage[]> = {
  APPLIED: ['SCREENING', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SCREENING: ['APPLIED', 'SHORTLISTED', 'REJECTED', 'WITHDRAWN'],
  SHORTLISTED: ['SCREENING', 'INTERVIEW', 'REJECTED', 'WITHDRAWN'],
  INTERVIEW: ['SHORTLISTED', 'OFFER', 'REJECTED', 'WITHDRAWN'],
  OFFER: ['INTERVIEW', 'HIRED', 'REJECTED', 'WITHDRAWN'],
  HIRED: [],
  REJECTED: ['SCREENING'],
  WITHDRAWN: [],
};

export function canMoveStage(from: ApplicationStage, to: ApplicationStage): boolean {
  return ATS_TRANSITIONS[from]?.includes(to) ?? false;
}

// ---------- Interviews ----------
export const INTERVIEW_ACTIONS = ['complete', 'cancel', 'no_show'] as const;
export type InterviewAction = (typeof INTERVIEW_ACTIONS)[number];

export function nextInterviewStatus(current: InterviewStatus, action: InterviewAction): InterviewStatus | null {
  if (current !== 'SCHEDULED') return null;
  if (action === 'complete') return 'FEEDBACK_PENDING';
  if (action === 'cancel') return 'CANCELLED';
  if (action === 'no_show') return 'NO_SHOW';
  return null;
}

// ---------- Offers ----------
export const OFFER_ACTIONS = ['submit', 'approve', 'reject', 'send', 'accept', 'decline', 'expire', 'withdraw'] as const;
export type OfferAction = (typeof OFFER_ACTIONS)[number];

export const OFFER_ACTION_PERMISSION: Record<OfferAction, OrgPermission> = {
  submit: 'offers.create',
  approve: 'offers.approve',
  reject: 'offers.approve',
  send: 'offers.send',
  accept: 'offers.send',
  decline: 'offers.send',
  expire: 'offers.send',
  withdraw: 'offers.create',
};

export function nextOfferStatus(current: OfferStatus, action: OfferAction, approvalRequired: boolean): OfferStatus | null {
  switch (action) {
    case 'submit':
      return current === 'DRAFT' ? (approvalRequired ? 'PENDING_APPROVAL' : 'APPROVED') : null;
    case 'approve':
      return current === 'PENDING_APPROVAL' ? 'APPROVED' : null;
    case 'reject':
      return current === 'PENDING_APPROVAL' ? 'DRAFT' : null;
    case 'send':
      return current === 'APPROVED' ? 'SENT' : null;
    case 'accept':
      return current === 'SENT' ? 'ACCEPTED' : null;
    case 'decline':
      return current === 'SENT' ? 'REJECTED' : null;
    case 'expire':
      return current === 'SENT' ? 'EXPIRED' : null;
    case 'withdraw':
      return ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'].includes(current) ? 'WITHDRAWN' : null;
    default:
      return null;
  }
}

// ---------- Token allocation math ----------
export interface AllocationCheck {
  actorIsOwner: boolean; // Org Super Admin allocates from the unallocated org pool
  walletBalance: number;
  outstandingAllocations: number; // sum(allocated - consumed) across members
  actorRemaining: number; // allocator's own remaining allocation (Org Admin)
  targetRemaining: number;
  amount: number; // positive = allocate, negative = take back
}

export function checkAllocation(c: AllocationCheck): string | null {
  if (!Number.isInteger(c.amount) || c.amount === 0) return 'Amount must be a non-zero whole number';
  if (c.amount > 0) {
    const pool = c.actorIsOwner ? c.walletBalance - c.outstandingAllocations : c.actorRemaining;
    if (c.amount > pool) return `Only ${Math.max(pool, 0)} tokens are available to allocate`;
    return null;
  }
  if (-c.amount > c.targetRemaining) return `Member only has ${c.targetRemaining} unused tokens to take back`;
  return null;
}

/** Can a member spend `amount`? Owners spend the unallocated pool, others their allocation. */
export function checkConsumption(c: {
  actorIsOwner: boolean;
  walletBalance: number;
  outstandingAllocations: number;
  actorRemaining: number;
  amount: number;
}): string | null {
  if (c.amount <= 0) return null;
  if (c.amount > c.walletBalance) return 'Insufficient organisation token balance';
  if (c.actorIsOwner) {
    if (c.walletBalance - c.outstandingAllocations < c.amount) {
      return 'Insufficient unallocated tokens (the rest is allocated to members)';
    }
    return null;
  }
  if (c.actorRemaining < c.amount) return `Insufficient allocated tokens (you have ${c.actorRemaining})`;
  return null;
}
