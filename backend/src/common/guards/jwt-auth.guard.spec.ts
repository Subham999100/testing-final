// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: JwtAuthGuard (Session, Identity & Revocation Verification)
// ============================================================

import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRole } from '@prisma/client';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let jwtService: any;
  let configService: any;
  let prisma: any;

  const validToken = 'valid.jwt.token';
  const validTokenHash = crypto.createHash('sha256').update(validToken).digest('hex');

  beforeEach(() => {
    jwtService = {
      verify: jest.fn(),
    };

    configService = {
      get: jest.fn().mockReturnValue('super-secret-jwt-key-replace-in-production-min-32-chars-long'),
    };

    prisma = {
      platformSession: {
        findUnique: jest.fn(),
      },
    };

    guard = new JwtAuthGuard(jwtService, configService, prisma);
  });

  const createMockContext = (authHeader?: string): { context: ExecutionContext; request: any } => {
    const request: any = {
      headers: authHeader ? { authorization: authHeader } : {},
    };

    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;

    return { context, request };
  };

  it('should throw UnauthorizedException when authorization header is missing', async () => {
    const { context } = createMockContext();
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header format is not Bearer token', async () => {
    const { context } = createMockContext('Basic 12345');
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when token signature or expiry fails', async () => {
    jwtService.verify.mockImplementation(() => {
      throw new Error('jwt expired');
    });

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when session does not exist in database', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_1', sessionId: 'sess_1' });
    prisma.platformSession.findUnique.mockResolvedValue(null);

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    expect(prisma.platformSession.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: validTokenHash },
      include: expect.any(Object),
    });
  });

  it('should throw UnauthorizedException when session has been revoked', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_1', sessionId: 'sess_1' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_1',
      tokenHash: validTokenHash,
      revokedAt: new Date(), // Revoked session
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr_1',
        email: 'admin@clyptus.platform',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
      },
    });

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when session has expired in database', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_1', sessionId: 'sess_1' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_1',
      tokenHash: validTokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() - 1000), // Already expired
      user: {
        id: 'usr_1',
        email: 'admin@clyptus.platform',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
      },
    });

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when user account is deactivated', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_1', sessionId: 'sess_1' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_1',
      tokenHash: validTokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr_1',
        email: 'admin@clyptus.platform',
        role: UserRole.PLATFORM_ADMIN,
        isActive: false, // Inactive user
      },
    });

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when platform admin profile is deactivated', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_1', sessionId: 'sess_1' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_1',
      tokenHash: validTokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr_1',
        email: 'admin@clyptus.platform',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        platformAdminProfile: {
          isActive: false, // Inactive profile
          permissions: [],
        },
      },
    });

    const { context } = createMockContext(`Bearer ${validToken}`);
    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow Super Admin and assign wildcard root permissions', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_super', sessionId: 'sess_super' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_super',
      tokenHash: validTokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr_super',
        email: 'superadmin@clyptus.platform',
        firstName: 'Platform',
        lastName: 'Super',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        isActive: true,
        platformAdminProfile: null,
      },
    });

    const { context, request } = createMockContext(`Bearer ${validToken}`);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toBeDefined();
    expect(request.user.role).toBe(UserRole.PLATFORM_SUPER_ADMIN);
    expect(request.user.permissions).toEqual(['*']);
    expect(request.user.sessionId).toBe('sess_super');
  });

  it('should allow Platform Admin and attach assigned permissions', async () => {
    jwtService.verify.mockReturnValue({ sub: 'usr_admin', sessionId: 'sess_admin' });
    prisma.platformSession.findUnique.mockResolvedValue({
      id: 'sess_admin',
      tokenHash: validTokenHash,
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100000),
      user: {
        id: 'usr_admin',
        email: 'ops@clyptus.platform',
        firstName: 'Ops',
        lastName: 'Admin',
        role: UserRole.PLATFORM_ADMIN,
        isActive: true,
        platformAdminProfile: {
          isActive: true,
          permissions: ['platform.organisations.read', 'platform.audit.read'],
        },
      },
    });

    const { context, request } = createMockContext(`Bearer ${validToken}`);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user.role).toBe(UserRole.PLATFORM_ADMIN);
    expect(request.user.permissions).toEqual(['platform.organisations.read', 'platform.audit.read']);
  });
});
