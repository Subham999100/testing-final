// ============================================================
// ORGANISATION PORTAL
// Permission catalogue, platform-defined role ceilings, defaults,
// and the grant rules that prevent privilege escalation.
// Pure functions only: unit tested in org-permissions.spec.ts.
// ============================================================

import { UserRole } from '@prisma/client';

export const ORG_PERMISSION_CATALOG = [
  { key: 'org.profile.read', group: 'Organisation', label: 'View organisation profile' },
  { key: 'org.profile.update', group: 'Organisation', label: 'Update organisation profile' },
  { key: 'org.settings.update', group: 'Organisation', label: 'Update workflow settings' },
  { key: 'org.security.manage', group: 'Organisation', label: 'Manage security & sessions' },
  { key: 'org.integrations.manage', group: 'Organisation', label: 'Manage integrations' },
  { key: 'members.read', group: 'Team', label: 'View members' },
  { key: 'org_admins.manage', group: 'Team', label: 'Manage organisation admins' },
  { key: 'recruiters.manage', group: 'Team', label: 'Invite, suspend & remove recruiters' },
  { key: 'recruiters.permissions.manage', group: 'Team', label: 'Edit recruiter permissions' },
  { key: 'invitations.manage', group: 'Team', label: 'Manage invitations' },
  { key: 'jobs.read.all', group: 'Jobs', label: 'View all jobs' },
  { key: 'jobs.read.assigned', group: 'Jobs', label: 'View own & assigned jobs' },
  { key: 'jobs.create', group: 'Jobs', label: 'Create jobs' },
  { key: 'jobs.update', group: 'Jobs', label: 'Edit jobs' },
  { key: 'jobs.publish', group: 'Jobs', label: 'Publish jobs' },
  { key: 'jobs.approve', group: 'Jobs', label: 'Approve jobs' },
  { key: 'jobs.assign', group: 'Jobs', label: 'Assign recruiters to jobs' },
  { key: 'jobs.archive', group: 'Jobs', label: 'Archive jobs' },
  { key: 'candidates.read', group: 'Candidates', label: 'View candidates' },
  { key: 'candidates.search', group: 'Candidates', label: 'Search talent pool' },
  { key: 'candidates.resume.view', group: 'Candidates', label: 'Unlock resumes & contact details' },
  { key: 'candidates.notes.write', group: 'Candidates', label: 'Write candidate notes' },
  { key: 'candidates.save', group: 'Candidates', label: 'Add & save candidates' },
  { key: 'applications.read.all', group: 'Applications', label: 'View all applications' },
  { key: 'applications.read.assigned', group: 'Applications', label: 'View applications on my jobs' },
  { key: 'applications.assign', group: 'Applications', label: 'Assign applications' },
  { key: 'applications.transition', group: 'Applications', label: 'Add & withdraw applications' },
  { key: 'ats.stages.configure', group: 'ATS', label: 'Configure pipeline rules' },
  { key: 'ats.move', group: 'ATS', label: 'Move candidates between stages' },
  { key: 'ats.bulk', group: 'ATS', label: 'Bulk move / reject' },
  { key: 'interviews.read', group: 'Interviews', label: 'View interviews' },
  { key: 'interviews.schedule', group: 'Interviews', label: 'Schedule interviews' },
  { key: 'interviews.assign_interviewer', group: 'Interviews', label: 'Assign interviewers' },
  { key: 'interviews.feedback.write', group: 'Interviews', label: 'Submit interview feedback' },
  { key: 'offers.read', group: 'Offers', label: 'View offers' },
  { key: 'offers.create', group: 'Offers', label: 'Create offers' },
  { key: 'offers.approve', group: 'Offers', label: 'Approve offers' },
  { key: 'offers.send', group: 'Offers', label: 'Send offers & record responses' },
  { key: 'messages.use', group: 'Messaging', label: 'Message candidates' },
  { key: 'messages.oversee', group: 'Messaging', label: 'Oversee all messages (policy permitting)' },
  { key: 'tokens.read', group: 'Tokens & Billing', label: 'View token balances' },
  { key: 'tokens.allocate', group: 'Tokens & Billing', label: 'Allocate tokens to members' },
  { key: 'tokens.purchase', group: 'Tokens & Billing', label: 'Buy tokens' },
  { key: 'billing.read', group: 'Tokens & Billing', label: 'View payments & invoices' },
  { key: 'billing.manage', group: 'Tokens & Billing', label: 'Manage billing' },
  { key: 'analytics.org', group: 'Analytics', label: 'Organisation analytics' },
  { key: 'analytics.recruiter', group: 'Analytics', label: 'Recruiter analytics' },
  { key: 'reports.export.self', group: 'Analytics', label: 'Download own recruiter reports' },
  { key: 'analytics.self', group: 'Analytics', label: 'Own analytics' },
  { key: 'analytics.export', group: 'Analytics', label: 'Export analytics' },
  { key: 'ai.use', group: 'AI', label: 'Use AI tools' },
  { key: 'ai.govern', group: 'AI', label: 'Enable / disable AI features' },
  { key: 'audit.read.org', group: 'Audit', label: 'View organisation audit log' },
  { key: 'audit.read.self', group: 'Audit', label: 'View own audit log' },
  { key: 'audit.export', group: 'Audit', label: 'Export audit log' },
  { key: 'notifications.announce', group: 'Other', label: 'Send announcements' },
  { key: 'exports.run', group: 'Other', label: 'Run data exports' },
  { key: 'tasks.use', group: 'Other', label: 'Use tasks' },
  { key: 'support.read', group: 'Support', label: 'View support tickets' },
  { key: 'support.create', group: 'Support', label: 'Create support tickets' },
  { key: 'support.reply', group: 'Support', label: 'Reply to support tickets' },
] as const;

export type OrgPermission = (typeof ORG_PERMISSION_CATALOG)[number]['key'];

export const ALL_ORG_PERMISSIONS: OrgPermission[] = ORG_PERMISSION_CATALOG.map((p) => p.key);

export const ORG_ROLES = [
  UserRole.ORGANISATION_SUPER_ADMIN,
  UserRole.ORGANISATION_ADMIN,
  UserRole.RECRUITER,
] as const;

export type OrgRole = (typeof ORG_ROLES)[number];

export function isOrgRole(role: UserRole | string): role is OrgRole {
  return (ORG_ROLES as readonly string[]).includes(role);
}

const ORG_ADMIN_EXCLUDED: OrgPermission[] = [
  'org_admins.manage',
  'org.profile.update',
  'org.security.manage',
  'org.integrations.manage',
  'tokens.purchase',
  'billing.read',
  'billing.manage',
  'messages.oversee',
  'ai.govern',
  'audit.export',
];

const RECRUITER_CEILING: OrgPermission[] = [
  'org.profile.read',
  'jobs.read.assigned',
  'jobs.create',
  'jobs.update',
  'jobs.publish',
  'candidates.read',
  'candidates.search',
  'candidates.resume.view',
  'candidates.notes.write',
  'candidates.save',
  'applications.read.assigned',
  'applications.transition',
  'ats.move',
  'ats.bulk',
  'interviews.read',
  'interviews.schedule',
  'interviews.assign_interviewer',
  'interviews.feedback.write',
  'offers.read',
  'offers.create',
  'offers.send',
  'messages.use',
  'tokens.read',
  'analytics.self',
  'reports.export.self',
  'ai.use',
  'audit.read.self',
  'tasks.use',
];

/** Platform-defined maximum permission set per org role. */
export const ROLE_CEILINGS: Record<OrgRole, OrgPermission[]> = {
  ORGANISATION_SUPER_ADMIN: ALL_ORG_PERMISSIONS,
  ORGANISATION_ADMIN: ALL_ORG_PERMISSIONS.filter((k) => !ORG_ADMIN_EXCLUDED.includes(k)),
  RECRUITER: RECRUITER_CEILING,
};

/** Default grant for newly invited members (always within the ceiling). */
export const ROLE_DEFAULTS: Record<OrgRole, OrgPermission[]> = {
  ORGANISATION_SUPER_ADMIN: ALL_ORG_PERMISSIONS,
  ORGANISATION_ADMIN: ROLE_CEILINGS.ORGANISATION_ADMIN,
  RECRUITER: RECRUITER_CEILING.filter((k) => k !== 'jobs.publish' && k !== 'offers.send'),
};

/** Stored grants are always clipped to the role ceiling. Org Super Admin holds its full ceiling. */
export function effectivePermissions(role: UserRole | string, stored: string[]): OrgPermission[] {
  if (!isOrgRole(role)) return [];
  const ceiling = ROLE_CEILINGS[role];
  if (role === UserRole.ORGANISATION_SUPER_ADMIN) return [...ceiling];
  return ceiling.filter((k) => stored.includes(k));
}

/** Who may manage members of the target role. Nobody manages an Org Super Admin from the portal. */
export function canManageRole(
  actorRole: OrgRole,
  actorPermissions: readonly string[],
  targetRole: UserRole | string,
): boolean {
  if (targetRole === UserRole.ORGANISATION_ADMIN) {
    return actorRole === UserRole.ORGANISATION_SUPER_ADMIN && actorPermissions.includes('org_admins.manage');
  }
  if (targetRole === UserRole.RECRUITER) {
    return (
      (actorRole === UserRole.ORGANISATION_SUPER_ADMIN || actorRole === UserRole.ORGANISATION_ADMIN) &&
      actorPermissions.includes('recruiters.manage')
    );
  }
  return false;
}

export interface GrantRequest {
  actorId: string;
  actorRole: OrgRole;
  actorPermissions: readonly string[];
  targetId: string | null; // null for invitations (no user yet)
  targetRole: UserRole | string;
  requested: readonly string[];
}

/** Returns an error message when the grant would escalate privileges, otherwise null. */
export function validateGrant(req: GrantRequest): string | null {
  if (req.targetId && req.targetId === req.actorId) return 'You cannot change your own permissions';
  if (!isOrgRole(req.targetRole) || !canManageRole(req.actorRole, req.actorPermissions, req.targetRole)) {
    return 'You are not allowed to manage members with this role';
  }
  if (
    req.targetRole === UserRole.RECRUITER &&
    !req.actorPermissions.includes('recruiters.permissions.manage')
  ) {
    return 'You are not allowed to change recruiter permissions';
  }
  const unknown = req.requested.filter((k) => !(ALL_ORG_PERMISSIONS as string[]).includes(k));
  if (unknown.length) return `Unknown permission(s): ${unknown.join(', ')}`;
  const ceiling = ROLE_CEILINGS[req.targetRole] as string[];
  const aboveCeiling = req.requested.filter((k) => !ceiling.includes(k));
  if (aboveCeiling.length) return `Above the platform limit for this role: ${aboveCeiling.join(', ')}`;
  const notHeld = req.requested.filter((k) => !req.actorPermissions.includes(k));
  if (notHeld.length) return `You can only grant permissions you hold: ${notHeld.join(', ')}`;
  return null;
}

/** Keys the actor could grant to a member of the target role. */
export function grantableFor(actorPermissions: readonly string[], targetRole: OrgRole): OrgPermission[] {
  return ROLE_CEILINGS[targetRole].filter((k) => actorPermissions.includes(k));
}
