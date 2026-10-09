// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformOrganisationService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOrganisationService } from './platform-organisation.service';
import { PrismaService } from '../../../database/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../integrations/email/email.service';
import { AuditService } from '../../audit/audit.service';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { OrganisationStatus, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformOrganisationService', () => {
  let service: PlatformOrganisationService;
  let prisma: any;
  let auditService: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_admin_id',
    email: 'superadmin@clyptus.platform',
    firstName: 'Platform',
    lastName: 'SuperAdmin',
    role: UserRole.PLATFORM_SUPER_ADMIN,
  };

  beforeEach(async () => {
    prisma = {
      organisation: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      platformSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      tokenTransaction: {
        create: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformOrganisationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(true) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    }).compile();

    service = module.get<PlatformOrganisationService>(PlatformOrganisationService);
  });

  it('should prevent creating an organisation with duplicate slug', async () => {
    prisma.organisation.findUnique.mockResolvedValueOnce({ id: 'org_1', slug: 'existing-org' });

    await expect(
      service.create(
        {
          name: 'Duplicate Org',
          slug: 'existing-org',
          contactEmail: 'info@duplicate.com',
          superAdminName: 'Test Admin',
          superAdminEmail: 'admin@duplicate.com',
          superAdminPassword: 'Password@123',
          superAdminPasswordConfirmation: 'Password@123',
        },
        mockActor,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should successfully create organisation+superAdmin and record audit log', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue(null);
    const orgMock = {
      id: 'org_new_1',
      name: 'Innovatech Corp',
      slug: 'innovatech',
      contactEmail: 'talent@innovatech.io',
      domain: null,
      status: 'ACTIVE',
      tier: 'STANDARD',
      tokenBalance: { balance: 1000 },
      createdAt: new Date(),
    };
    const userMock = {
      id: 'usr_new_1',
      email: 'admin@innovatech.io',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'ORGANISATION_SUPER_ADMIN',
    };
    prisma.organisation.create.mockResolvedValue(orgMock);
    prisma.user.create.mockResolvedValue(userMock);
    prisma.tokenTransaction.create.mockResolvedValue({});

    const result = await service.create(
      {
        name: 'Innovatech Corp',
        slug: 'innovatech',
        contactEmail: 'talent@innovatech.io',
        initialTokenAllocation: 1000,
        superAdminName: 'Jane Smith',
        superAdminEmail: 'admin@innovatech.io',
        superAdminPassword: 'Password@123',
        superAdminPasswordConfirmation: 'Password@123',
      },
      mockActor,
    );

    expect(result).toBeDefined();
    expect(result.organisation.id).toBe('org_new_1');
    expect(result.superAdmin.email).toBe('admin@innovatech.io');
    expect(result.superAdmin.role).toBe('ORGANISATION_SUPER_ADMIN');
    expect((result as any).temporaryPassword).toBeUndefined();
    expect((result as any).superAdminPassword).toBeUndefined();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORGANISATION_CREATED',
        entityId: 'org_new_1',
        actorId: mockActor.userId,
      }),
    );
  });

  it('should suspend an active organisation with mandatory reason and create audit record', async () => {
    const existingOrg = {
      id: 'org_to_suspend',
      name: 'Breach Corp',
      status: OrganisationStatus.ACTIVE,
    };
    prisma.organisation.findUnique.mockResolvedValue(existingOrg);
    prisma.organisation.update.mockResolvedValue({
      ...existingOrg,
      status: OrganisationStatus.SUSPENDED,
      suspensionReason: 'Terms violation - spamming job postings',
      suspendedById: mockActor.userId,
    });

    const result = await service.suspend(
      'org_to_suspend',
      { reason: 'Terms violation - spamming job postings' },
      mockActor,
    );

    expect(result.status).toBe(OrganisationStatus.SUSPENDED);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORGANISATION_SUSPENDED',
        entityId: 'org_to_suspend',
        metadata: expect.objectContaining({
          reason: 'Terms violation - spamming job postings',
        }),
      }),
    );
  });

  it('should throw BadRequestException if suspending an already suspended organisation', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_already_suspended',
      status: OrganisationStatus.SUSPENDED,
    });

    await expect(
      service.suspend(
        'org_already_suspended',
        { reason: 'Another reason here' },
        mockActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('should successfully reset Super Admin password, update hash, and record audit log', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_123',
      name: 'Acme Corp',
    });
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'usr_super_1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@acme.com',
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        organisationId: 'org_123',
      },
    ]);
    prisma.user.update.mockResolvedValue({});

    const result = await service.resetSuperAdminPassword('org_123', mockActor);

    expect(result).toBeDefined();
    expect(result.superAdmin.email).toBe('jane@acme.com');
    expect(result.superAdmin.role).toBe(UserRole.ORGANISATION_SUPER_ADMIN);
    expect(typeof result.temporaryPassword).toBe('string');
    expect(result.temporaryPassword.length).toBeGreaterThanOrEqual(12);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'usr_super_1' },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
        }),
      }),
    );

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'ORGANISATION_SUPER_ADMIN_PASSWORD_RESET',
        entityId: 'usr_super_1',
        organisationId: 'org_123',
        actorId: mockActor.userId,
      }),
    );
  });

  it('should throw NotFoundException if organisation does not exist when resetting password', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);

    await expect(service.resetSuperAdminPassword('nonexistent_org', mockActor)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw NotFoundException if no Super Admin exists for the organisation', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_empty', name: 'Empty Org' });
    prisma.user.findMany.mockResolvedValue([]);

    await expect(service.resetSuperAdminPassword('org_empty', mockActor)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should persist recruiterLimit when creating an organisation', async () => {
    prisma.organisation.create.mockResolvedValue({
      id: 'org_limit_1',
      name: 'Limit Corp',
      slug: 'limit-corp',
      recruiterLimit: 30,
      status: 'ACTIVE',
      metadata: null,
      tokenBalance: { balance: 0 },
      createdAt: new Date(),
    });
    prisma.user.create.mockResolvedValue({
      id: 'usr_lim_1',
      email: 'admin@limit.corp',
      role: 'ORGANISATION_SUPER_ADMIN',
    });

    await service.create(
      {
        name: 'Limit Corp',
        slug: 'limit-corp',
        contactEmail: 'talent@limit.corp',
        recruiterLimit: 30,
        superAdminName: 'Sam Limit',
        superAdminEmail: 'admin@limit.corp',
        superAdminPassword: 'Password@123',
        superAdminPasswordConfirmation: 'Password@123',
      },
      mockActor,
    );

    expect(prisma.organisation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recruiterLimit: 30,
        }),
      }),
    );
  });

  it('should record RECRUITER_LIMIT_UPDATED audit log when recruiterLimit is updated', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_edit_1',
      name: 'Edit Corp',
      recruiterLimit: 25,
      metadata: null,
    });
    prisma.organisation.update.mockResolvedValue({
      id: 'org_edit_1',
      recruiterLimit: 50,
      metadata: null,
    });

    await service.update('org_edit_1', { recruiterLimit: 50 }, mockActor);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'RECRUITER_LIMIT_UPDATED',
        entityId: 'org_edit_1',
        metadata: {
          previousLimit: 25,
          newLimit: 50,
        },
      }),
    );
  });

  it('should return recruiterLimit, recruitersUsed, and recruitersAvailable in findOne', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_usage_1',
      name: 'Usage Corp',
      recruiterLimit: 20,
      _count: { users: 15, tokenTransactions: 2 },
      metadata: null,
      tokenBalance: null,
      allocationLimit: null,
    });
    prisma.auditLog.findMany.mockResolvedValue([]);
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.count.mockResolvedValue(12); // 12 active recruiters

    const result = await service.findOne('org_usage_1');

    expect(result.recruiterLimit).toBe(20);
    expect(result.recruitersUsed).toBe(12);
    expect(result.recruitersAvailable).toBe(8);
  });

  describe('transferSuperAdminCredentials', () => {
    const orgId = 'org_acme_1';
    const existingSuperAdmin = {
      id: 'usr_super_123',
      email: 'admin@acme.com',
      role: UserRole.ORGANISATION_SUPER_ADMIN,
      organisationId: orgId,
      firstName: 'John',
      lastName: 'Acme',
    };

    it('should successfully transfer Organisation Super Admin credentials while preserving user ID and org data', async () => {
      prisma.organisation.findUnique.mockResolvedValue({
        id: orgId,
        name: 'Acme Corporation',
      });
      prisma.user.findMany.mockResolvedValue([existingSuperAdmin]);
      prisma.user.findUnique.mockResolvedValue(null); // new email is not taken
      prisma.user.update.mockResolvedValue({
        ...existingSuperAdmin,
        email: 'newadmin@acme.com',
        mustChangePassword: true,
      });

      const result = await service.transferSuperAdminCredentials(
        orgId,
        {
          newEmail: 'newadmin@acme.com',
          newPassword: 'NewPassword123!',
          confirmPassword: 'NewPassword123!',
        },
        mockActor,
        '127.0.0.1',
        'test-agent',
      );

      // 1. Same user ID
      expect(result.data.userId).toBe(existingSuperAdmin.id);
      // 2. Same organisation ID
      expect(result.data.organisationId).toBe(orgId);
      // 3. Same role
      expect(result.data.role).toBe(UserRole.ORGANISATION_SUPER_ADMIN);
      // 4. New email saved
      expect(result.data.email).toBe('newadmin@acme.com');
      // 5. mustChangePassword is true
      expect(result.data.mustChangePassword).toBe(true);
      // 6. Password or passwordHash is never returned
      expect((result as any).password).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();
      expect((result.data as any).password).toBeUndefined();
      expect((result.data as any).passwordHash).toBeUndefined();

      // 7. Prisma user.update called with hashed password (not plaintext)
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: existingSuperAdmin.id },
          data: expect.objectContaining({
            email: 'newadmin@acme.com',
            mustChangePassword: true,
            passwordHash: expect.not.stringContaining('NewPassword123!'),
          }),
        }),
      );

      // 8. Old sessions are invalidated (revokedAt is set)
      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith({
        where: { userId: existingSuperAdmin.id, revokedAt: null },
        data: expect.objectContaining({ revokedAt: expect.any(Date) }),
      });

      // 9. Audit log created without passwords
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockActor.userId,
          action: 'ORGANISATION_SUPER_ADMIN_CREDENTIALS_TRANSFERRED',
          entityType: 'USER',
          entityId: existingSuperAdmin.id,
          organisationId: orgId,
          metadata: {
            organisationName: 'Acme Corporation',
            superAdminId: existingSuperAdmin.id,
            oldEmail: 'admin@acme.com',
            newEmail: 'newadmin@acme.com',
            targetRole: UserRole.ORGANISATION_SUPER_ADMIN,
          },
        }),
      );

      const auditCall = auditService.record.mock.calls.find(
        (c: any[]) => c[0].action === 'ORGANISATION_SUPER_ADMIN_CREDENTIALS_TRANSFERRED',
      );
      expect(JSON.stringify(auditCall)).not.toContain('NewPassword123!');
    });

    it('should reject when password and confirmPassword do not match', async () => {
      await expect(
        service.transferSuperAdminCredentials(
          orgId,
          {
            newEmail: 'newadmin@acme.com',
            newPassword: 'Password123!',
            confirmPassword: 'MismatchPassword123!',
          },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject when organisation is not found', async () => {
      prisma.organisation.findUnique.mockResolvedValue(null);

      await expect(
        service.transferSuperAdminCredentials(
          'non_existent_org',
          {
            newEmail: 'newadmin@acme.com',
            newPassword: 'Password123!',
            confirmPassword: 'Password123!',
          },
          mockActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when organisation has no Super Admin', async () => {
      prisma.organisation.findUnique.mockResolvedValue({ id: orgId, name: 'Acme' });
      prisma.user.findMany.mockResolvedValue([]);

      await expect(
        service.transferSuperAdminCredentials(
          orgId,
          {
            newEmail: 'newadmin@acme.com',
            newPassword: 'Password123!',
            confirmPassword: 'Password123!',
          },
          mockActor,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject when new email is already registered to another user', async () => {
      prisma.organisation.findUnique.mockResolvedValue({ id: orgId, name: 'Acme' });
      prisma.user.findMany.mockResolvedValue([existingSuperAdmin]);
      prisma.user.findUnique.mockResolvedValue({
        id: 'different_user_456',
        email: 'taken@acme.com',
      });

      await expect(
        service.transferSuperAdminCredentials(
          orgId,
          {
            newEmail: 'taken@acme.com',
            newPassword: 'Password123!',
            confirmPassword: 'Password123!',
          },
          mockActor,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});

