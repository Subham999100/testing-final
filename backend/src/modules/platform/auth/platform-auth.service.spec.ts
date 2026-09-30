// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: PlatformAuthService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PlatformAuthService } from './platform-auth.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PlatformSecurityService } from '../security/platform-security.service';
import { UserRole } from '@prisma/client';

describe('PlatformAuthService', () => {
  let service: PlatformAuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let auditService: any;
  let securityService: any;

  const rawPassword = 'ValidPassword123!';
  let passwordHash: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    passwordHash = await bcrypt.hash(rawPassword, salt);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      platformSession: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.expiresIn') return '1d';
        return null;
      }),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    securityService = {
      recordSecurityEvent: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
        { provide: PlatformSecurityService, useValue: securityService },
      ],
    }).compile();

    service = module.get<PlatformAuthService>(PlatformAuthService);
  });

  it('should successfully authenticate Super Admin and create session', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_super_1',
      email: 'super@clyptus.platform',
      passwordHash,
      firstName: 'Platform',
      lastName: 'Super',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      isActive: true,
      platformAdminProfile: null,
    });

    const result = await service.login({
      email: 'super@clyptus.platform',
      password: rawPassword,
    });

    expect(result).toBeDefined();
    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.user.role).toBe(UserRole.PLATFORM_SUPER_ADMIN);
    expect(result.user.permissions).toEqual(['*']);
    expect(prisma.platformSession.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'PLATFORM_LOGIN',
        actorId: 'usr_super_1',
      }),
    );
  });

  it('should successfully authenticate Platform Admin with assigned permissions', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_admin_1',
      email: 'admin@clyptus.platform',
      passwordHash,
      firstName: 'Ops',
      lastName: 'Admin',
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      platformAdminProfile: {
        isActive: true,
        department: 'Operations',
        permissions: ['platform.organisations.read'],
      },
    });

    const result = await service.login({
      email: 'admin@clyptus.platform',
      password: rawPassword,
    });

    expect(result.accessToken).toBe('mock.jwt.token');
    expect(result.user.role).toBe(UserRole.PLATFORM_ADMIN);
    expect(result.user.permissions).toEqual(['platform.organisations.read']);
  });

  it('should reject login for nonexistent user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'unknown@clyptus.platform', password: rawPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject login with wrong password and record security event', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_super_1',
      email: 'super@clyptus.platform',
      passwordHash,
      role: UserRole.PLATFORM_SUPER_ADMIN,
      isActive: true,
    });

    await expect(
      service.login({ email: 'super@clyptus.platform', password: 'WrongPassword999!' }),
    ).rejects.toThrow(UnauthorizedException);

    expect(securityService.recordSecurityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'FAILED_ADMIN_LOGIN',
        actorId: 'usr_super_1',
      }),
    );
  });

  it('should reject non-platform roles from platform login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_cand_1',
      email: 'candidate@external.com',
      passwordHash,
      role: UserRole.CANDIDATE,
      isActive: true,
    });

    await expect(
      service.login({ email: 'candidate@external.com', password: rawPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject deactivated user account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_admin_1',
      email: 'admin@clyptus.platform',
      passwordHash,
      role: UserRole.PLATFORM_ADMIN,
      isActive: false, // Inactive root account
    });

    await expect(
      service.login({ email: 'admin@clyptus.platform', password: rawPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should reject admin with deactivated platform profile', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_admin_1',
      email: 'admin@clyptus.platform',
      passwordHash,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      platformAdminProfile: {
        isActive: false, // Inactive profile
        permissions: [],
      },
    });

    await expect(
      service.login({ email: 'admin@clyptus.platform', password: rawPassword }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('should successfully revoke session on logout', async () => {
    const actor = {
      userId: 'usr_super_1',
      sessionId: 'sess_123',
      email: 'super@clyptus.platform',
      firstName: 'Platform',
      lastName: 'Super',
      role: UserRole.PLATFORM_SUPER_ADMIN,
    };

    const res = await service.logout(actor);
    expect(res.message).toBe('Logged out successfully');
    expect(prisma.platformSession.updateMany).toHaveBeenCalledWith({
      where: { id: 'sess_123', revokedAt: null },
      data: expect.objectContaining({ revokedAt: expect.any(Date) }),
    });
  });
});
