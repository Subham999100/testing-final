// ============================================================
// Clyptus Job Portal - Organisation Admin & Super Admin Tests
// Service Test: TeamService (Administrative Hierarchy Enforcement)
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { TeamService } from './team.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { EmailService } from '../../../integrations/email/email.service';
import { ConfigService } from '@nestjs/config';
import { ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrgContext } from '../common/org-context';
import { ALL_ORG_PERMISSIONS, ROLE_CEILINGS, ROLE_DEFAULTS } from '../common/org-permissions';

describe('TeamService (Administrative Hierarchy & Role Transitions)', () => {
  let service: TeamService;
  let prisma: any;
  let auditService: any;
  let events: any;
  let tokens: any;
  let email: any;

  const testOrgId = 'org-uuid-111';

  const superAdminCtx: OrgContext = {
    userId: 'user-super-admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_SUPER_ADMIN,
    permissions: [...ALL_ORG_PERMISSIONS],
    email: 'super@acme.com',
    firstName: 'Alice',
    lastName: 'Super',
  };

  const orgAdminCtx: OrgContext = {
    userId: 'user-org-admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_ADMIN,
    permissions: [...ROLE_DEFAULTS.ORGANISATION_ADMIN],
    email: 'admin@acme.com',
    firstName: 'Bob',
    lastName: 'Admin',
  };

  const recruiterCtx: OrgContext = {
    userId: 'user-recruiter',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.RECRUITER,
    permissions: [...ROLE_DEFAULTS.RECRUITER],
    email: 'recruiter@acme.com',
    firstName: 'Charlie',
    lastName: 'Recruiter',
  };

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
      orgMemberProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organisation: {
        findUnique: jest.fn().mockResolvedValue({ id: testOrgId, maxRecruiters: 10 }),
      },
      platformSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orgInvitation: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      tokenAllocation: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    events = {
      audit: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      emitToUser: jest.fn(),
      disconnectUser: jest.fn(),
    };

    tokens = {
      reclaim: jest.fn().mockResolvedValue(undefined),
    };

    email = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: OrgEventsService, useValue: events },
        { provide: OrgTokenService, useValue: tokens },
        { provide: EmailService, useValue: email },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => (key === 'corsOrigin' ? 'http://localhost:5173' : null)),
          },
        },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('updateMemberRole (Promotions & Demotions)', () => {
    it('allows Organisation Super Admin to promote a Recruiter to Organisation Admin', async () => {
      const targetUserId = 'target-user-1';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: targetUserId,
        organisationId: testOrgId,
        permissions: ['jobs.create'],
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'charlie@acme.com',
          firstName: 'Charlie',
          lastName: 'Recruiter',
          role: UserRole.RECRUITER,
          createdAt: new Date(),
        },
      });

      prisma.user.update.mockResolvedValue({ id: targetUserId, role: UserRole.ORGANISATION_ADMIN });
      prisma.orgMemberProfile.update.mockResolvedValue({ id: 'prof-1', permissions: ROLE_DEFAULTS.ORGANISATION_ADMIN });

      const result = await service.updateMemberRole(superAdminCtx, targetUserId, UserRole.ORGANISATION_ADMIN);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: { role: UserRole.ORGANISATION_ADMIN },
        }),
      );
      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetUserId, revokedAt: null },
          data: expect.objectContaining({ revokedAt: expect.any(Date) }),
        }),
      );
      expect(events.disconnectUser).toHaveBeenCalledWith(targetUserId);
      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'MEMBER_ROLE_UPDATED',
        'ORG_MEMBER',
        targetUserId,
        expect.objectContaining({
          previousRole: UserRole.RECRUITER,
          newRole: UserRole.ORGANISATION_ADMIN,
        }),
      );
    });

    it('allows Organisation Super Admin to demote an Organisation Admin to Recruiter', async () => {
      const targetUserId = 'target-user-2';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-2',
        userId: targetUserId,
        organisationId: testOrgId,
        permissions: [...ROLE_DEFAULTS.ORGANISATION_ADMIN],
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'bob@acme.com',
          firstName: 'Bob',
          lastName: 'Admin',
          role: UserRole.ORGANISATION_ADMIN,
          createdAt: new Date(),
        },
      });

      prisma.orgMemberProfile.count.mockResolvedValue(2); // recruiter seat count

      await service.updateMemberRole(superAdminCtx, targetUserId, UserRole.RECRUITER);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: { role: UserRole.RECRUITER },
        }),
      );
      expect(prisma.orgMemberProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetUserId },
          data: expect.objectContaining({
            permissions: expect.arrayContaining(['jobs.create']),
          }),
        }),
      );
      expect(prisma.platformSession.updateMany).toHaveBeenCalled();
    });

    it('blocks an Organisation Admin from changing any member role', async () => {
      const targetUserId = 'target-user-3';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-3',
        userId: targetUserId,
        organisationId: testOrgId,
        permissions: ['jobs.create'],
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'charlie@acme.com',
          firstName: 'Charlie',
          lastName: 'Recruiter',
          role: UserRole.RECRUITER,
          createdAt: new Date(),
        },
      });

      await expect(
        service.updateMemberRole(orgAdminCtx, targetUserId, UserRole.ORGANISATION_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids self-role modification', async () => {
      await expect(
        service.updateMemberRole(superAdminCtx, superAdminCtx.userId, UserRole.ORGANISATION_ADMIN),
      ).rejects.toThrow(BadRequestException);
    });

    it('strictly forbids modifying an Organisation Super Admin role', async () => {
      const anotherSuperAdminId = 'user-super-2';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-super',
        userId: anotherSuperAdminId,
        organisationId: testOrgId,
        permissions: [...ALL_ORG_PERMISSIONS],
        status: 'ACTIVE',
        user: {
          id: anotherSuperAdminId,
          email: 'other@acme.com',
          role: UserRole.ORGANISATION_SUPER_ADMIN,
        },
      });

      await expect(
        service.updateMemberRole(superAdminCtx, anotherSuperAdminId, UserRole.ORGANISATION_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly forbids promoting anyone to Organisation Super Admin from org portal', async () => {
      const targetUserId = 'target-user-4';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-4',
        userId: targetUserId,
        organisationId: testOrgId,
        permissions: ROLE_DEFAULTS.ORGANISATION_ADMIN,
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'admin2@acme.com',
          role: UserRole.ORGANISATION_ADMIN,
        },
      });

      await expect(
        service.updateMemberRole(superAdminCtx, targetUserId, UserRole.ORGANISATION_SUPER_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createInvitation (Administrative Hierarchy)', () => {
    it('allows Organisation Super Admin to invite an Organisation Admin', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.orgInvitation.create.mockResolvedValue({
        id: 'inv-1',
        email: 'newadmin@acme.com',
        role: UserRole.ORGANISATION_ADMIN,
        status: 'PENDING',
        expiresAt: new Date(),
      });

      const result = await service.createInvitation(superAdminCtx, {
        email: 'newadmin@acme.com',
        role: 'ORGANISATION_ADMIN',
      });

      expect(result).toBeDefined();
      expect(result.email).toBe('newadmin@acme.com');
      expect(prisma.orgInvitation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.ORGANISATION_ADMIN,
          }),
        }),
      );
    });

    it('blocks an Organisation Admin from inviting an Organisation Admin', async () => {
      await expect(
        service.createInvitation(orgAdminCtx, {
          email: 'hackadmin@acme.com',
          role: 'ORGANISATION_ADMIN',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('blocks inviting an Organisation Super Admin from org portal', async () => {
      await expect(
        service.createInvitation(superAdminCtx, {
          email: 'newsuper@acme.com',
          role: UserRole.ORGANISATION_SUPER_ADMIN as any,
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('suspend & remove (Privilege Boundary Enforcement)', () => {
    it('allows Organisation Super Admin to suspend an Organisation Admin', async () => {
      const targetUserId = 'target-admin-1';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-admin',
        userId: targetUserId,
        organisationId: testOrgId,
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'targetadmin@acme.com',
          role: UserRole.ORGANISATION_ADMIN,
        },
      });

      await service.suspend(superAdminCtx, targetUserId);

      expect(prisma.orgMemberProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetUserId },
          data: { status: 'SUSPENDED' },
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: { isActive: false },
        }),
      );
      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetUserId, revokedAt: null },
        }),
      );
    });

    it('blocks an Organisation Admin from suspending another Organisation Admin', async () => {
      const targetUserId = 'target-admin-2';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-admin-2',
        userId: targetUserId,
        organisationId: testOrgId,
        status: 'ACTIVE',
        user: {
          id: targetUserId,
          email: 'peeradmin@acme.com',
          role: UserRole.ORGANISATION_ADMIN,
        },
      });

      await expect(service.suspend(orgAdminCtx, targetUserId)).rejects.toThrow(ForbiddenException);
    });
  });
});
