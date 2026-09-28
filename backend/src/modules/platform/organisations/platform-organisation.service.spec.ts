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
        },
        mockActor,
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should successfully create organisation and record audit log', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);
    const createdMock = {
      id: 'org_new_1',
      name: 'Innovatech Corp',
      slug: 'innovatech',
      contactEmail: 'talent@innovatech.io',
      status: OrganisationStatus.ACTIVE,
    };
    prisma.organisation.create.mockResolvedValue(createdMock);

    const result = await service.create(
      {
        name: 'Innovatech Corp',
        slug: 'innovatech',
        contactEmail: 'talent@innovatech.io',
        initialTokenAllocation: 1000,
      },
      mockActor,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('org_new_1');
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
});
