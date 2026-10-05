// ============================================================
// Clyptus Job Portal - Administrative Hierarchy Full Verification
// Test Suite: Platform Super Admin -> Platform Admin -> Organisation
//             -> Organisation Super Admin -> Organisation Admin
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthService } from '../src/modules/platform/auth/platform-auth.service';
import { PlatformAdminService } from '../src/modules/platform/admins/platform-admin.service';
import { PlatformOrganisationService } from '../src/modules/platform/organisations/platform-organisation.service';
import { OrgAuthService } from '../src/modules/org/auth/org-auth.service';
import { TeamService } from '../src/modules/org/team/team.service';
import { OrgMembersController } from '../src/modules/org/team/team.controller';
import { PrismaService } from '../src/database/prisma.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PlatformSecurityService } from '../src/modules/platform/security/platform-security.service';
import { OrgEventsService } from '../src/modules/org/common/org-events.service';
import { OrgTokenService } from '../src/modules/org/common/org-token.service';
import { EmailService } from '../src/integrations/email/email.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UserRole, OrganisationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { OrgContext, resolveOrgContext } from '../src/modules/org/common/org-context';
import { ALL_ORG_PERMISSIONS, ROLE_DEFAULTS } from '../src/modules/org/common/org-permissions';
import { PlatformPermissions } from '../src/common/constants/permissions.constant';

describe('Administrative Hierarchy Full Verification', () => {
  let platformAuthService: PlatformAuthService;
  let platformAdminService: PlatformAdminService;
  let platformOrgService: PlatformOrganisationService;
  let orgAuthService: OrgAuthService;
  let teamService: TeamService;
  let orgMembersController: OrgMembersController;
  let prisma: any;
  let auditService: any;
  let jwtService: any;

  const testOrgId = 'org-uuid-enterprise-1';

  beforeEach(async () => {
    prisma = {
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') return cb(prisma);
        return Promise.all(cb);
      }),
      user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organisation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      platformSession: {
        create: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      orgMemberProfile: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      orgInvitation: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        count: jest.fn().mockResolvedValue(0),
      },
      tokenTransaction: {
        create: jest.fn(),
      },
      tokenAllocation: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      auditLog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      securityEvent: {
        create: jest.fn().mockResolvedValue({}),
      },
      notification: {
        count: jest.fn().mockResolvedValue(0),
      },
      orgNotification: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
      verify: jest.fn(),
    };

    const mockEvents = {
      audit: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      emitToUser: jest.fn(),
      disconnectUser: jest.fn(),
    };

    const mockTokens = {
      wallet: jest.fn().mockResolvedValue({ balance: 500, spendable: 500 }),
      reclaim: jest.fn().mockResolvedValue(undefined),
    };

    const mockEmail = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };

    const mockSecurity = {
      recordSecurityEvent: jest.fn().mockResolvedValue(undefined),
    };

    const mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.secret') return 'test-secret';
        if (key === 'jwt.expiresIn') return '1d';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgMembersController],
      providers: [
        PlatformAuthService,
        PlatformAdminService,
        PlatformOrganisationService,
        OrgAuthService,
        TeamService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: mockConfig },
        { provide: PlatformSecurityService, useValue: mockSecurity },
        { provide: OrgEventsService, useValue: mockEvents },
        { provide: OrgTokenService, useValue: mockTokens },
        { provide: EmailService, useValue: mockEmail },
      ],
    }).compile();

    platformAuthService = module.get<PlatformAuthService>(PlatformAuthService);
    platformAdminService = module.get<PlatformAdminService>(PlatformAdminService);
    platformOrgService = module.get<PlatformOrganisationService>(PlatformOrganisationService);
    orgAuthService = module.get<OrgAuthService>(OrgAuthService);
    teamService = module.get<TeamService>(TeamService);
    orgMembersController = module.get<OrgMembersController>(OrgMembersController);
  });

  // ============================================================
  // LEVEL 1: PLATFORM SUPER ADMIN
  // ============================================================
  describe('Level 1: Platform Super Admin Authentication & Authority', () => {
    it('authenticates Platform Super Admin and returns wildcard permissions', async () => {
      const passwordHash = await bcrypt.hash('CorrectPass123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'psa-1',
        email: 'superadmin@clyptus.platform',
        passwordHash,
        firstName: 'Platform',
        lastName: 'SuperAdmin',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        isActive: true,
      });

      const res = await platformAuthService.login({
        email: 'superadmin@clyptus.platform',
        password: 'CorrectPass123!',
      });

      expect(res.accessToken).toBe('mock.jwt.token');
      expect(res.user.role).toBe(UserRole.PLATFORM_SUPER_ADMIN);
      expect(res.user.permissions).toEqual(['*']);
      expect(prisma.platformSession.create).toHaveBeenCalled();
    });

    it('creates a delegated Platform Admin with restricted permissions', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'pa-1',
        email: 'admin@clyptus.platform',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
      });

      const caller = {
        userId: 'psa-1',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        email: 'super@clyptus.platform',
        firstName: 'Platform',
        lastName: 'Super',
      };

      const result = await platformAdminService.create(
        {
          email: 'admin@clyptus.platform',
          firstName: 'Support',
          lastName: 'Admin',
          password: 'Password123!',
          department: 'Support',
          permissions: [PlatformPermissions.ORGANISATIONS_READ],
        },
        caller,
      );

      expect(result.id).toBe('pa-1');
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.PLATFORM_ADMIN,
          }),
        }),
      );
    });

    it('provisions a new Organisation with an initial Organisation Super Admin', async () => {
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);

      const createdOrg = { id: testOrgId, name: 'Stark Industries', slug: 'stark-ind' };
      const createdSuperAdmin = {
        id: 'osa-1',
        email: 'tony@stark.com',
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        mustChangePassword: true,
      };

      prisma.organisation.create.mockResolvedValue(createdOrg);
      prisma.user.create.mockResolvedValue(createdSuperAdmin);

      const caller = {
        userId: 'psa-1',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        email: 'super@clyptus.platform',
        firstName: 'Platform',
        lastName: 'Super',
      };

      const result = await platformOrgService.create(
        {
          name: 'Stark Industries',
          slug: 'stark-ind',
          contactEmail: 'contact@stark.com',
          superAdminName: 'Tony Stark',
          superAdminEmail: 'tony@stark.com',
          superAdminPassword: 'InitialPassword123!',
          superAdminPasswordConfirmation: 'InitialPassword123!',
          initialTokenAllocation: 1000,
        },
        caller,
      );

      expect(result.organisation).toBeDefined();
      expect(result.superAdmin.role).toBe(UserRole.ORGANISATION_SUPER_ADMIN);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.ORGANISATION_SUPER_ADMIN,
            mustChangePassword: true,
          }),
        }),
      );
    });
  });

  // ============================================================
  // LEVEL 2: PLATFORM ADMIN BOUNDARY
  // ============================================================
  describe('Level 2: Platform Admin Boundary Enforcement', () => {
    it('strictly forbids a Platform Admin from creating other Platform Admins', async () => {
      const platformAdminCaller = {
        userId: 'pa-1',
        role: UserRole.PLATFORM_ADMIN,
        email: 'admin@clyptus.platform',
        firstName: 'Ops',
        lastName: 'Admin',
      };

      await expect(
        platformAdminService.create(
          {
            email: 'another@clyptus.platform',
            firstName: 'Unauthorized',
            lastName: 'Attempt',
            password: 'Password123!',
          },
          platformAdminCaller,
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // LEVEL 3: ORGANISATION SUPER ADMIN
  // ============================================================
  describe('Level 3: Organisation Super Admin Operations & Capabilities', () => {
    it('authenticates Organisation Super Admin and grants full org access', async () => {
      const passwordHash = await bcrypt.hash('SecretPass123!', 10);
      prisma.user.findUnique.mockResolvedValue({
        id: 'osa-1',
        email: 'tony@stark.com',
        passwordHash,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        isActive: true,
        organisationId: testOrgId,
        mustChangePassword: false,
        orgMemberProfile: {
          status: 'ACTIVE',
          organisationId: testOrgId,
          permissions: [...ALL_ORG_PERMISSIONS],
        },
      });

      prisma.organisation.findUnique.mockResolvedValue({
        id: testOrgId,
        status: OrganisationStatus.ACTIVE,
      });

      const res = await orgAuthService.login({
        email: 'tony@stark.com',
        password: 'SecretPass123!',
      });

      expect(res.accessToken).toBe('mock.jwt.token');
      expect(prisma.platformSession.create).toHaveBeenCalled();
    });

    it('returns full capabilities matrix for Organisation Super Admin', () => {
      const ctx: OrgContext = {
        userId: 'osa-1',
        organisationId: testOrgId,
        organisationName: 'Stark Industries',
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        permissions: [...ALL_ORG_PERMISSIONS],
        email: 'tony@stark.com',
        firstName: 'Tony',
        lastName: 'Stark',
      };

      const caps = orgMembersController.superAdminCapabilities(ctx);
      expect(caps.fullOrgAccess).toBe(true);
      expect(caps.canManageOrgAdmins).toBe(true);
      expect(caps.canPurchaseTokens).toBe(true);
      expect(caps.canManageBilling).toBe(true);
    });

    it('allows Organisation Super Admin to invite an Organisation Admin', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.orgInvitation.create.mockResolvedValue({
        id: 'inv-admin',
        email: 'rhodey@stark.com',
        role: UserRole.ORGANISATION_ADMIN,
        status: 'PENDING',
        expiresAt: new Date(),
      });

      const ctx: OrgContext = {
        userId: 'osa-1',
        organisationId: testOrgId,
        organisationName: 'Stark Industries',
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        permissions: [...ALL_ORG_PERMISSIONS],
        email: 'tony@stark.com',
        firstName: 'Tony',
        lastName: 'Stark',
      };

      const result = await teamService.createInvitation(ctx, {
        email: 'rhodey@stark.com',
        role: 'ORGANISATION_ADMIN',
      });

      expect(result.role).toBe(UserRole.ORGANISATION_ADMIN);
      expect(prisma.orgInvitation.create).toHaveBeenCalled();
    });

    it('allows Organisation Super Admin to promote a member to Organisation Admin and revokes old sessions', async () => {
      const targetId = 'member-1';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-1',
        userId: targetId,
        organisationId: testOrgId,
        permissions: ['jobs.create'],
        status: 'ACTIVE',
        user: {
          id: targetId,
          email: 'peter@stark.com',
          firstName: 'Peter',
          lastName: 'Parker',
          role: UserRole.RECRUITER,
          createdAt: new Date(),
        },
      });

      const ctx: OrgContext = {
        userId: 'osa-1',
        organisationId: testOrgId,
        organisationName: 'Stark Industries',
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        permissions: [...ALL_ORG_PERMISSIONS],
        email: 'tony@stark.com',
        firstName: 'Tony',
        lastName: 'Stark',
      };

      await teamService.updateMemberRole(ctx, targetId, UserRole.ORGANISATION_ADMIN);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: targetId },
          data: { role: UserRole.ORGANISATION_ADMIN },
        }),
      );
      // Confirms session revocation for immediate security context refresh
      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: targetId, revokedAt: null },
        }),
      );
    });
  });

  // ============================================================
  // LEVEL 4: ORGANISATION ADMIN BOUNDARY
  // ============================================================
  describe('Level 4: Organisation Admin Capability & Boundary Enforcement', () => {
    const orgAdminCtx: OrgContext = {
      userId: 'oa-1',
      organisationId: testOrgId,
      organisationName: 'Stark Industries',
      role: UserRole.ORGANISATION_ADMIN,
      permissions: [...ROLE_DEFAULTS.ORGANISATION_ADMIN],
      email: 'rhodey@stark.com',
      firstName: 'James',
      lastName: 'Rhodes',
    };

    it('returns restricted capabilities for Organisation Admin', () => {
      const caps = orgMembersController.adminCapabilities(orgAdminCtx);
      expect(caps.fullOrgAccess).toBe(false);
      expect(caps.canManageOrgAdmins).toBe(false);
      expect(caps.canPurchaseTokens).toBe(false);
      expect(caps.canManageBilling).toBe(false);
      expect(caps.canManageRecruiters).toBe(true);
    });

    it('strictly blocks an Organisation Admin from inviting another Organisation Admin', async () => {
      await expect(
        teamService.createInvitation(orgAdminCtx, {
          email: 'anotheradmin@stark.com',
          role: 'ORGANISATION_ADMIN',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly blocks an Organisation Admin from promoting anyone to Organisation Admin', async () => {
      const targetId = 'member-2';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-2',
        userId: targetId,
        organisationId: testOrgId,
        permissions: ['jobs.create'],
        status: 'ACTIVE',
        user: {
          id: targetId,
          email: 'target@stark.com',
          role: UserRole.RECRUITER,
        },
      });

      await expect(
        teamService.updateMemberRole(orgAdminCtx, targetId, UserRole.ORGANISATION_ADMIN),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly blocks an Organisation Admin from modifying an Organisation Super Admin', async () => {
      const superAdminTargetId = 'osa-1';
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        id: 'prof-super',
        userId: superAdminTargetId,
        organisationId: testOrgId,
        permissions: [...ALL_ORG_PERMISSIONS],
        status: 'ACTIVE',
        user: {
          id: superAdminTargetId,
          email: 'tony@stark.com',
          role: UserRole.ORGANISATION_SUPER_ADMIN,
        },
      });

      await expect(
        teamService.updateMemberRole(orgAdminCtx, superAdminTargetId, UserRole.RECRUITER),
      ).rejects.toThrow(ForbiddenException);
    });

    it('strictly blocks cross-tenant access when route orgId does not match authenticated context', () => {
      expect(() =>
        orgMembersController.getAdminData(orgAdminCtx, 'foreign-organisation-id'),
      ).toThrow(ForbiddenException);
    });
  });

  // ============================================================
  // SECURITY & INACTIVITY PROTECTIONS
  // ============================================================
  describe('Security Protections: Inactive Accounts & Suspended Organisations', () => {
    it('blocks login when an account is deactivated', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'deactivated-user',
        email: 'inactive@acme.com',
        passwordHash: await bcrypt.hash('Pass123!', 10),
        isActive: false,
        role: UserRole.ORGANISATION_ADMIN,
      });

      await expect(
        orgAuthService.login({ email: 'inactive@acme.com', password: 'Pass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('blocks login when organisation is suspended', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-suspended-org',
        email: 'user@suspended.com',
        passwordHash: await bcrypt.hash('Pass123!', 10),
        isActive: true,
        organisationId: 'suspended-org-id',
        role: UserRole.ORGANISATION_ADMIN,
        orgMemberProfile: {
          status: 'ACTIVE',
          organisationId: 'suspended-org-id',
        },
      });

      prisma.organisation.findUnique.mockResolvedValue({
        id: 'suspended-org-id',
        status: OrganisationStatus.SUSPENDED,
      });

      await expect(
        orgAuthService.login({ email: 'user@suspended.com', password: 'Pass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('blocks login when organisation is pending verification', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-pending-org',
        email: 'user@pending.com',
        passwordHash: await bcrypt.hash('Pass123!', 10),
        isActive: true,
        organisationId: 'pending-org-id',
        role: UserRole.ORGANISATION_ADMIN,
        orgMemberProfile: {
          status: 'ACTIVE',
          organisationId: 'pending-org-id',
        },
      });

      prisma.organisation.findUnique.mockResolvedValue({
        id: 'pending-org-id',
        status: OrganisationStatus.PENDING_VERIFICATION,
      });

      await expect(
        orgAuthService.login({ email: 'user@pending.com', password: 'Pass123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('resolveOrgContext throws ForbiddenException if organisation is not ACTIVE', async () => {
      prisma.orgMemberProfile.findUnique.mockResolvedValue({
        status: 'ACTIVE',
        organisationId: 'archived-org-id',
        permissions: [],
      });
      prisma.user.findUnique.mockResolvedValue({ mustChangePassword: false });
      prisma.organisation.findUnique.mockResolvedValue({
        id: 'archived-org-id',
        status: OrganisationStatus.ARCHIVED,
      });

      await expect(
        resolveOrgContext(prisma, {
          userId: 'u1',
          role: UserRole.ORGANISATION_ADMIN,
          organisationId: 'archived-org-id',
          email: 'u@test.com',
          firstName: 'U',
          lastName: 'T',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
