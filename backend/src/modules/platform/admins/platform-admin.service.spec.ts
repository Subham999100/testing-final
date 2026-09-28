// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformAdminService (Role Hierarchy Enforcement)
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAdminService } from './platform-admin.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformAdminService', () => {
  let service: PlatformAdminService;
  let prisma: any;
  let auditService: any;

  const superAdminActor: AuthenticatedUser = {
    userId: 'usr_super_1',
    email: 'super@clyptus.platform',
    firstName: 'Platform',
    lastName: 'Super',
    role: UserRole.PLATFORM_SUPER_ADMIN,
  };

  const platformAdminActor: AuthenticatedUser = {
    userId: 'usr_admin_1',
    email: 'admin@clyptus.platform',
    firstName: 'Ops',
    lastName: 'Admin',
    role: UserRole.PLATFORM_ADMIN,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PlatformAdminService>(PlatformAdminService);
  });

  it('should STRICTLY forbid a Platform Admin from creating another Platform Admin', async () => {
    await expect(
      service.create(
        {
          email: 'newadmin@clyptus.platform',
          firstName: 'New',
          lastName: 'Admin',
          password: 'Password123!',
          department: 'Support',
        },
        platformAdminActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('should allow Platform Super Admin to create a Platform Admin and audit it', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 'usr_new_admin',
      email: 'newadmin@clyptus.platform',
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
    });

    const result = await service.create(
      {
        email: 'newadmin@clyptus.platform',
        firstName: 'New',
        lastName: 'Admin',
        password: 'Password123!',
        department: 'Support',
      },
      superAdminActor,
    );

    expect(result).toBeDefined();
    expect(result.id).toBe('usr_new_admin');
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PLATFORM_ADMIN_CREATED',
        entityId: 'usr_new_admin',
        actorId: superAdminActor.userId,
      }),
    );
  });
});
