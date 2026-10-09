// ============================================================
// Unit tests: job / ATS / interview / offer state machines,
// token allocation & consumption math, AI match explanation.
// ============================================================

import { explainMatch, extractSkills } from '../money/ai.service';
import {
  ATS_TRANSITIONS,
  canMoveStage,
  checkAllocation,
  checkConsumption,
  nextInterviewStatus,
  nextJobStatus,
  nextOfferStatus,
} from './org-workflows';

describe('job lifecycle', () => {
  it('publishes drafts directly when approval is off', () => {
    expect(nextJobStatus('DRAFT', 'publish', false, false)).toBe('PUBLISHED');
    expect(nextJobStatus('DRAFT', 'submit', false, false)).toBeNull();
  });

  it('requires review when approval is on (unless the actor can approve)', () => {
    expect(nextJobStatus('DRAFT', 'publish', true, false)).toBeNull();
    expect(nextJobStatus('DRAFT', 'submit', true, false)).toBe('IN_REVIEW');
    expect(nextJobStatus('IN_REVIEW', 'approve', true, true)).toBe('PUBLISHED');
    expect(nextJobStatus('IN_REVIEW', 'reject', true, true)).toBe('DRAFT');
    expect(nextJobStatus('DRAFT', 'publish', true, true)).toBe('PUBLISHED');
  });

  it('supports pause/resume/close/reopen/archive', () => {
    expect(nextJobStatus('PUBLISHED', 'pause', false, false)).toBe('PAUSED');
    expect(nextJobStatus('PAUSED', 'resume', false, false)).toBe('PUBLISHED');
    expect(nextJobStatus('PAUSED', 'close', false, false)).toBe('CLOSED');
    expect(nextJobStatus('CLOSED', 'reopen', false, false)).toBe('PUBLISHED');
    expect(nextJobStatus('CLOSED', 'archive', false, false)).toBe('ARCHIVED');
    expect(nextJobStatus('PUBLISHED', 'archive', false, false)).toBeNull();
    expect(nextJobStatus('ARCHIVED', 'reopen', false, false)).toBeNull();
  });
});

describe('ATS transitions', () => {
  it('allows the happy path', () => {
    expect(canMoveStage('APPLIED', 'SCREENING')).toBe(true);
    expect(canMoveStage('SCREENING', 'SHORTLISTED')).toBe(true);
    expect(canMoveStage('SHORTLISTED', 'INTERVIEW')).toBe(true);
    expect(canMoveStage('INTERVIEW', 'OFFER')).toBe(true);
    expect(canMoveStage('OFFER', 'HIRED')).toBe(true);
  });

  it('blocks skipping ahead and leaving terminal stages', () => {
    expect(canMoveStage('APPLIED', 'HIRED')).toBe(false);
    expect(canMoveStage('APPLIED', 'OFFER')).toBe(false);
    expect(ATS_TRANSITIONS.HIRED).toEqual([]);
    expect(ATS_TRANSITIONS.WITHDRAWN).toEqual([]);
  });

  it('allows rejecting from any open stage and reconsidering a rejection', () => {
    ['APPLIED', 'SCREENING', 'SHORTLISTED', 'INTERVIEW', 'OFFER'].forEach((s) =>
      expect(canMoveStage(s as never, 'REJECTED')).toBe(true),
    );
    expect(canMoveStage('REJECTED', 'SCREENING')).toBe(true);
  });
});

describe('interview & offer state machines', () => {
  it('interviews only change from SCHEDULED', () => {
    expect(nextInterviewStatus('SCHEDULED', 'complete')).toBe('FEEDBACK_PENDING');
    expect(nextInterviewStatus('SCHEDULED', 'cancel')).toBe('CANCELLED');
    expect(nextInterviewStatus('CANCELLED', 'complete')).toBeNull();
  });

  it('offers follow the approval chain', () => {
    expect(nextOfferStatus('DRAFT', 'submit', true)).toBe('PENDING_APPROVAL');
    expect(nextOfferStatus('DRAFT', 'submit', false)).toBe('APPROVED');
    expect(nextOfferStatus('PENDING_APPROVAL', 'approve', true)).toBe('APPROVED');
    expect(nextOfferStatus('APPROVED', 'send', true)).toBe('SENT');
    expect(nextOfferStatus('SENT', 'accept', true)).toBe('ACCEPTED');
    expect(nextOfferStatus('DRAFT', 'send', true)).toBeNull();
    expect(nextOfferStatus('ACCEPTED', 'withdraw', true)).toBeNull();
  });
});

describe('token math', () => {
  const base = { walletBalance: 1000, outstandingAllocations: 600, actorRemaining: 0, targetRemaining: 0 };

  it('owners allocate only from the unallocated pool', () => {
    expect(checkAllocation({ ...base, actorIsOwner: true, amount: 400 })).toBeNull();
    expect(checkAllocation({ ...base, actorIsOwner: true, amount: 401 })).toMatch(/400/);
  });

  it('admins allocate only from their own allocation', () => {
    expect(checkAllocation({ ...base, actorIsOwner: false, actorRemaining: 50, amount: 50 })).toBeNull();
    expect(checkAllocation({ ...base, actorIsOwner: false, actorRemaining: 50, amount: 51 })).not.toBeNull();
  });

  it('cannot take back more than the member has left', () => {
    expect(checkAllocation({ ...base, actorIsOwner: true, targetRemaining: 10, amount: -11 })).not.toBeNull();
    expect(checkAllocation({ ...base, actorIsOwner: true, targetRemaining: 10, amount: -10 })).toBeNull();
    expect(checkAllocation({ ...base, actorIsOwner: true, amount: 0 })).not.toBeNull();
    expect(checkAllocation({ ...base, actorIsOwner: true, amount: 1.5 })).not.toBeNull();
  });

  it('owners cannot spend tokens allocated to members; members cannot overspend', () => {
    expect(checkConsumption({ ...base, actorIsOwner: true, amount: 400 })).toBeNull();
    expect(checkConsumption({ ...base, actorIsOwner: true, amount: 401 })).not.toBeNull();
    expect(checkConsumption({ ...base, actorIsOwner: false, actorRemaining: 5, amount: 6 })).not.toBeNull();
    expect(checkConsumption({ ...base, actorIsOwner: false, actorRemaining: 5, amount: 5 })).toBeNull();
    expect(checkConsumption({ ...base, walletBalance: 3, actorIsOwner: false, actorRemaining: 5, amount: 5 })).not.toBeNull();
  });
});

describe('AI match explanation', () => {
  const job = {
    title: 'Senior React Developer',
    requiredSkills: ['React', 'TypeScript'],
    preferredSkills: ['GraphQL'],
    experienceMin: 3,
    experienceMax: 8,
    location: 'Bengaluru',
    workMode: 'ONSITE',
  };

  it('scores only job-relevant factors and explains each', () => {
    const r = explainMatch(job, { headline: 'React developer', skills: ['react', 'typescript'], experienceYears: 5, location: 'Bengaluru, India' });
    expect(r.factors.map((f) => f.factor)).toEqual(['Required skills', 'Preferred skills', 'Experience', 'Title relevance', 'Location']);
    expect(r.factors.reduce((s, f) => s + f.weight, 0)).toBe(100);
    expect(r.score).toBeGreaterThan(80);
  });

  it('scores a weak match low', () => {
    const r = explainMatch(job, { headline: 'Accountant', skills: ['excel'], experienceYears: 1, location: 'Paris' });
    expect(r.score).toBeLessThan(30);
  });

  it('extracts skills and years from resume text', () => {
    const r = extractSkills('I have 6+ years with React and Node.js, some C# and SQL.', ['react', 'node.js', 'c#', 'sql', 'java']);
    expect(r.skills.sort()).toEqual(['c#', 'node.js', 'react', 'sql']);
    expect(r.years).toBe(6);
  });
});
