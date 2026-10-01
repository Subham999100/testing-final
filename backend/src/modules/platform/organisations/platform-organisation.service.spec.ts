// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformOrganisationService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformOrganisationService } from './platform-organisation.service';
import { PrismaService } from '../../../database/prisma.service';
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
});

