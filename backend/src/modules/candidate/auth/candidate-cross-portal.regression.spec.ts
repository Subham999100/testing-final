// ============================================================
// Clyptus Job Portal - Candidate Portal
// Regression Test: Cross-Portal Authorization Boundaries
// Ensures strict tenant isolation: Candidate tokens/identities
// MUST NEVER be accepted by Recruiter/Org or Platform endpoints,
// and Recruiter/Platform identities cannot access Candidate endpoints.
// ============================================================

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrgGuard } from '../../org/common/org-context';

describe('Cross-Portal Authorization Regression Tests', () => {
  let reflector: Reflector;
  let rolesGuard: RolesGuard;
  let orgGuard: OrgGuard;
  let mockPrisma: any;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);

    mockPrisma = {
      orgMemberProfile: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
      organisation: { findUnique: jest.fn() },
    };

    orgGuard = new OrgGuard(reflector, mockPrisma);
  });

  const createMockContext = (
    user: Partial<AuthenticatedUser> | null,
    requiredRoles?: UserRole[],
  ): ExecutionContext => {
    const handler = () => {};
    const classRef = class {};

    if (requiredRoles) {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
          headers: {},
        }),
      }),
      getHandler: () => handler,
      getClass: () => classRef,
    } as unknown as ExecutionContext;
  };

  describe('Org Portal Security Boundary (OrgGuard)', () => {
    it('MUST strictly reject a CANDIDATE user attempting to access recruiter or org routes', async () => {
      const candidateUser: AuthenticatedUser = {
        userId: 'cand_user_1',
        sessionId: 'cand_sess_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Candidate',
        role: UserRole.CANDIDATE,
        permissions: [],
        organisationId: null,
      };

      const context = createMockContext(candidateUser);

      await expect(orgGuard.canActivate(context)).rejects.toThrow(
        new ForbiddenException('This area is for organisation members only'),
      );
    });
  });

  describe('Platform Admin Security Boundary (RolesGuard)', () => {
    it('MUST strictly reject a CANDIDATE user attempting to access platform super admin routes', () => {
      const candidateUser: AuthenticatedUser = {
        userId: 'cand_user_1',
        sessionId: 'cand_sess_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Candidate',
        role: UserRole.CANDIDATE,
        permissions: [],
        organisationId: null,
      };

      const context = createMockContext(candidateUser, [
        UserRole.PLATFORM_SUPER_ADMIN,
        UserRole.PLATFORM_ADMIN,
      ]);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Candidate Portal Security Boundary (RolesGuard)', () => {
    it('MUST reject a RECRUITER attempting to access candidate-only routes', () => {
      const recruiterUser: AuthenticatedUser = {
        userId: 'recruiter_user_1',
        sessionId: 'recruiter_sess_1',
        email: 'recruiter@clyptus.org',
        firstName: 'Bob',
        lastName: 'Recruiter',
        role: UserRole.RECRUITER,
        permissions: [],
        organisationId: 'org_123',
      };

      const context = createMockContext(recruiterUser, [UserRole.CANDIDATE]);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('MUST reject a PLATFORM_ADMIN attempting to access candidate-only routes', () => {
      const platformAdmin: AuthenticatedUser = {
        userId: 'admin_user_1',
        sessionId: 'admin_sess_1',
        email: 'admin@clyptus.platform',
        firstName: 'Alice',
        lastName: 'Admin',
        role: UserRole.PLATFORM_ADMIN,
        permissions: ['*'],
      };

      const context = createMockContext(platformAdmin, [UserRole.CANDIDATE]);

      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('MUST allow a legitimate CANDIDATE user to pass through candidate-only routes', () => {
      const candidateUser: AuthenticatedUser = {
        userId: 'cand_user_1',
        sessionId: 'cand_sess_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Candidate',
        role: UserRole.CANDIDATE,
        permissions: [],
        organisationId: null,
      };

      const context = createMockContext(candidateUser, [UserRole.CANDIDATE]);

      expect(rolesGuard.canActivate(context)).toBe(true);
    });
  });
});
