// ============================================================
// Clyptus Job Portal - Organisation Team Provisioning Spec
// Tests for New User-Provisioning Model & Recruiter Limits
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../../../integrations/email/email.service';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { OrgContext } from '../common/org-context';
import { ALL_ORG_PERMISSIONS, ROLE_DEFAULTS } from '../common/org-permissions';
import { TeamService } from './team.service';

describe('TeamService - Organisation Provisioning & Recruiter Limit Rules', () => {
  let service: TeamService;
  let prisma: any;
  let events: any;
  let auditService: any;

  const testOrgId = 'org-acme-123';

  const superAdminCtx: OrgContext = {
    userId: 'usr-super-admin',
    email: 'superadmin@acme.com',
    firstName: 'Super',
    lastName: 'Admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_SUPER_ADMIN,
    permissions: [...ALL_ORG_PERMISSIONS],
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  const orgAdminCtx: OrgContext = {
    userId: 'usr-org-admin',
    email: 'admin@acme.com',
    firstName: 'Org',
    lastName: 'Admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_ADMIN,
    permissions: [...ROLE_DEFAULTS.ORGANISATION_ADMIN],
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  const recruiterCtx: OrgContext = {
    userId: 'usr-recruiter',
    email: 'recruiter@acme.com',
    firstName: 'Jane',
    lastName: 'Recruiter',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.RECRUITER,
    permissions: [...ROLE_DEFAULTS.RECRUITER],
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(async () => {
    prisma = {
      organisation: {
        findUnique: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      orgMemberProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      platformSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn(),
      $transaction: jest.fn().mockImplementation((cb) => {
        if (typeof cb === 'function') {
          return cb(prisma);
        }
        return Promise.all(cb);
      }),
    };

    events = {
      audit: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      emitToUser: jest.fn(),
      disconnectUser: jest.fn(),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: OrgEventsService, useValue: events },
        { provide: OrgTokenService, useValue: { reclaim: jest.fn() } },
        { provide: EmailService, useValue: { send: jest.fn() } },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<TeamService>(TeamService);
  });

  describe('Rule 3 & 5: Organisation Super Admin creates exactly ONE Organisation Admin', () => {
    it('allows Organisation Super Admin to create an Organisation Admin', async () => {
      prisma.user.findFirst.mockResolvedValue(null); // No existing admin
      prisma.user.findUnique.mockResolvedValue(null); // Email free
      prisma.user.create.mockResolvedValue({
        id: 'usr-new-admin',
        firstName: 'Alice',
        lastName: 'Admin',
        email: 'alice@acme.com',
        role: UserRole.ORGANISATION_ADMIN,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
      });

      const result = await service.createAdmin(superAdminCtx, {
        name: 'Alice Admin',
        email: 'alice@acme.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe('usr-new-admin');
      expect(result.role).toBe(UserRole.ORGANISATION_ADMIN);
      expect(result.mustChangePassword).toBe(true);
      expect((result as any).password).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();

      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'alice@acme.com',
            role: UserRole.ORGANISATION_ADMIN,
            organisationId: testOrgId,
            isActive: true,
            mustChangePassword: true,
          }),
        }),
      );

      // Verify password was hashed with bcrypt
      const createCall = prisma.user.create.mock.calls[0][0];
      const isHashValid = await bcrypt.compare('Password@123', createCall.data.passwordHash);
      expect(isHashValid).toBe(true);

      // Audit log check
      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'ORGANISATION_ADMIN_CREATED',
        'USER',
        'usr-new-admin',
        expect.objectContaining({
          email: 'alice@acme.com',
          role: UserRole.ORGANISATION_ADMIN,
        }),
      );
    });

    it('rejects creation when an active Organisation Admin already exists (409 Conflict)', async () => {
      // Simulate existing active admin in this organisation
      prisma.user.findFirst.mockResolvedValue({
        id: 'usr-existing-admin',
        role: UserRole.ORGANISATION_ADMIN,
        isActive: true,
      });

      await expect(
        service.createAdmin(superAdminCtx, {
          name: 'Second Admin',
          email: 'second@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createAdmin(superAdminCtx, {
          name: 'Second Admin',
          email: 'second@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow('Organisation already has an Organisation Admin');
    });

    it('rejects creation when passwords do not match', async () => {
      await expect(
        service.createAdmin(superAdminCtx, {
          name: 'Alice Admin',
          email: 'alice@acme.com',
          password: 'Password@123',
          confirmPassword: 'MismatchPassword',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('blocks an Organisation Admin or Recruiter from creating an Organisation Admin', async () => {
      await expect(
        service.createAdmin(orgAdminCtx, {
          name: 'Peer Admin',
          email: 'peer@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.createAdmin(recruiterCtx, {
          name: 'Peer Admin',
          email: 'peer@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Rule 1 & 6: Recruiter Creation & Recruiter Limit Enforcement', () => {
    it('allows Organisation Super Admin to create a recruiter below the limit', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: testOrgId, maxRecruiters: 25 }]);
      prisma.user.count.mockResolvedValue(5); // 5 current recruiters
      prisma.user.create.mockResolvedValue({
        id: 'usr-recruiter-1',
        firstName: 'Bob',
        lastName: 'Recruiter',
        email: 'bob@acme.com',
        role: UserRole.RECRUITER,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
      });

      const result = await service.createRecruiter(superAdminCtx, {
        name: 'Bob Recruiter',
        email: 'bob@acme.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.RECRUITER);
      expect(result.mustChangePassword).toBe(true);
      expect((result as any).password).toBeUndefined();

      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'RECRUITER_CREATED',
        'USER',
        'usr-recruiter-1',
        expect.objectContaining({ email: 'bob@acme.com', role: UserRole.RECRUITER }),
      );
    });

    it('allows Organisation Admin to create a recruiter below the limit', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: testOrgId, maxRecruiters: 25 }]);
      prisma.user.count.mockResolvedValue(10);
      prisma.user.create.mockResolvedValue({
        id: 'usr-recruiter-2',
        firstName: 'Carol',
        lastName: 'Recruiter',
        email: 'carol@acme.com',
        role: UserRole.RECRUITER,
        isActive: true,
        mustChangePassword: true,
        createdAt: new Date(),
      });

      const result = await service.createRecruiter(orgAdminCtx, {
        name: 'Carol Recruiter',
        email: 'carol@acme.com',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });

      expect(result).toBeDefined();
      expect(result.role).toBe(UserRole.RECRUITER);
    });

    it('strictly rejects recruiter creation when recruiterLimit is reached (409 Conflict)', async () => {
      prisma.$queryRaw.mockResolvedValue([{ id: testOrgId, maxRecruiters: 25 }]);
      prisma.user.count.mockResolvedValue(25); // Limit reached!

      await expect(
        service.createRecruiter(superAdminCtx, {
          name: 'Overflow Recruiter',
          email: 'overflow@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(ConflictException);

      await expect(
        service.createRecruiter(superAdminCtx, {
          name: 'Overflow Recruiter',
          email: 'overflow@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow('Recruiter limit reached. Maximum allowed: 25');
    });

    it('blocks Recruiters from creating other recruiters', async () => {
      await expect(
        service.createRecruiter(recruiterCtx, {
          name: 'Another Recruiter',
          email: 'another@acme.com',
          password: 'Password@123',
          confirmPassword: 'Password@123',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Recruiter Usage and Password Reset', () => {
    it('returns accurate recruiter usage from backend data', async () => {
      prisma.organisation.findUnique.mockResolvedValue({ id: testOrgId, recruiterLimit: 25 });
      prisma.user.count.mockResolvedValue(18);

      const usage = await service.getRecruiterUsage(superAdminCtx);
      expect(usage).toEqual({
        limit: 25,
        used: 18,
        available: 7,
      });
    });

    it('allows authorized admin to reset recruiter password with audit trail', async () => {
      const targetUserId = 'usr-target-recruiter';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: targetUserId,
        organisationId: testOrgId,
        user: { id: targetUserId, email: 'target@acme.com', role: UserRole.RECRUITER },
      });
      prisma.user.update.mockResolvedValue({});

      const result = await service.resetMemberPassword(superAdminCtx, targetUserId, {
        password: 'NewPassword@123',
        confirmPassword: 'NewPassword@123',
      });

      expect(result.message).toBe('Password reset successfully');
      expect(result.mustChangePassword).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetUserId },
          data: expect.objectContaining({ mustChangePassword: true }),
        }),
      );

      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'RECRUITER_PASSWORD_RESET',
        'USER',
        targetUserId,
        expect.objectContaining({ email: 'target@acme.com', role: UserRole.RECRUITER }),
      );
    });

    it('audits RECRUITER_SUSPENDED and RECRUITER_REACTIVATED', async () => {
      const targetUserId = 'usr-target-recruiter';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: targetUserId,
        organisationId: testOrgId,
        status: 'ACTIVE',
        user: { id: targetUserId, email: 'target@acme.com', role: UserRole.RECRUITER },
      });

      await service.suspend(superAdminCtx, targetUserId);
      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'RECRUITER_SUSPENDED',
        'ORG_MEMBER',
        targetUserId,
        expect.objectContaining({ email: 'target@acme.com', role: UserRole.RECRUITER }),
      );

      // Reactivate
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: targetUserId,
        organisationId: testOrgId,
        status: 'SUSPENDED',
        user: { id: targetUserId, email: 'target@acme.com', role: UserRole.RECRUITER },
      });
      prisma.organisation.findUnique.mockResolvedValue({ id: testOrgId, recruiterLimit: 25 });
      prisma.orgMemberProfile.count.mockResolvedValue(5);

      await service.reactivate(superAdminCtx, targetUserId);
      expect(events.audit).toHaveBeenCalledWith(
        superAdminCtx,
        'RECRUITER_REACTIVATED',
        'ORG_MEMBER',
        targetUserId,
        expect.objectContaining({ email: 'target@acme.com', role: UserRole.RECRUITER }),
      );
    });
  });
});
