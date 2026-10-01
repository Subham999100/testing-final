// ============================================================
// Unit tests: permission ceilings & escalation rules
// ============================================================

import { UserRole } from '@prisma/client';
import {
  ALL_ORG_PERMISSIONS,
  ROLE_CEILINGS,
  ROLE_DEFAULTS,
  canManageRole,
  effectivePermissions,
  grantableFor,
  validateGrant,
} from './org-permissions';

const OSA = UserRole.ORGANISATION_SUPER_ADMIN;
const OA = UserRole.ORGANISATION_ADMIN;
const REC = UserRole.RECRUITER;

describe('org permission model', () => {
  it('keeps ceilings nested: recruiter ⊆ org admin ⊆ super admin', () => {
    ROLE_CEILINGS[REC].forEach((k) => expect(ROLE_CEILINGS[OA]).toContain(k));
    ROLE_CEILINGS[OA].forEach((k) => expect(ROLE_CEILINGS[OSA]).toContain(k));
  });

  it('keeps defaults within ceilings', () => {
    (Object.keys(ROLE_DEFAULTS) as (keyof typeof ROLE_DEFAULTS)[]).forEach((role) =>
      ROLE_DEFAULTS[role].forEach((k) => expect(ROLE_CEILINGS[role]).toContain(k)),
    );
  });

  it('never lets an org admin buy tokens, manage billing or manage other admins', () => {
    ['tokens.purchase', 'billing.manage', 'org_admins.manage', 'org.security.manage'].forEach((k) =>
      expect(ROLE_CEILINGS[OA]).not.toContain(k),
    );
  });

  it('clips stored grants to the role ceiling', () => {
    expect(effectivePermissions(REC, ['jobs.create', 'tokens.purchase', 'billing.manage'])).toEqual(['jobs.create']);
    expect(effectivePermissions(OSA, [])).toEqual(ALL_ORG_PERMISSIONS);
    expect(effectivePermissions(UserRole.PLATFORM_ADMIN, ['jobs.create'])).toEqual([]);
    expect(effectivePermissions(UserRole.CANDIDATE, ['jobs.create'])).toEqual([]);
  });

  it('only lets super admins manage org admins, and nobody manage super admins', () => {
    expect(canManageRole(OSA, ROLE_CEILINGS[OSA], OA)).toBe(true);
    expect(canManageRole(OA, ROLE_CEILINGS[OA], OA)).toBe(false);
    expect(canManageRole(OA, ROLE_CEILINGS[OA], REC)).toBe(true);
    expect(canManageRole(REC, ROLE_CEILINGS[REC], REC)).toBe(false);
    expect(canManageRole(OSA, ROLE_CEILINGS[OSA], OSA)).toBe(false);
    expect(canManageRole(OSA, ROLE_CEILINGS[OSA], UserRole.PLATFORM_ADMIN)).toBe(false);
  });

  describe('validateGrant', () => {
    const base = { actorId: 'a', targetId: 't' };

    it('allows a valid grant', () => {
      expect(validateGrant({ ...base, actorRole: OA, actorPermissions: ROLE_CEILINGS[OA], targetRole: REC, requested: ['jobs.create'] })).toBeNull();
    });

    it('rejects self-grant', () => {
      expect(
        validateGrant({ actorId: 'a', targetId: 'a', actorRole: OSA, actorPermissions: ROLE_CEILINGS[OSA], targetRole: OA, requested: [] }),
      ).toMatch(/own permissions/);
    });

    it('rejects permissions above the target role ceiling', () => {
      expect(
        validateGrant({ ...base, actorRole: OSA, actorPermissions: ROLE_CEILINGS[OSA], targetRole: REC, requested: ['tokens.purchase'] }),
      ).toMatch(/platform limit/);
    });

    it('rejects granting permissions the actor does not hold', () => {
      const limitedAdmin = ROLE_CEILINGS[OA].filter((k) => k !== 'jobs.publish');
      expect(
        validateGrant({ ...base, actorRole: OA, actorPermissions: limitedAdmin, targetRole: REC, requested: ['jobs.publish'] }),
      ).toMatch(/only grant permissions you hold/);
    });

    it('rejects an org admin managing another org admin', () => {
      expect(validateGrant({ ...base, actorRole: OA, actorPermissions: ROLE_CEILINGS[OA], targetRole: OA, requested: [] })).toMatch(/not allowed/);
    });

    it('rejects unknown keys', () => {
      expect(
        validateGrant({ ...base, actorRole: OSA, actorPermissions: ROLE_CEILINGS[OSA], targetRole: REC, requested: ['platform.admins.create'] }),
      ).toMatch(/Unknown/);
    });

    it('requires recruiters.permissions.manage to edit recruiters', () => {
      const without = ROLE_CEILINGS[OA].filter((k) => k !== 'recruiters.permissions.manage');
      expect(validateGrant({ ...base, actorRole: OA, actorPermissions: without, targetRole: REC, requested: [] })).toMatch(/recruiter permissions/);
    });
  });

  it('lists grantable keys as ceiling ∩ held', () => {
    const held = ['jobs.create', 'tokens.purchase'];
    expect(grantableFor(held, REC)).toEqual(['jobs.create']);
  });
});
