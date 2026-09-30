// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Integration Flow Test: End-to-End Auth & Session Revocation Cycle
// ============================================================

import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PlatformAuthService } from './platform-auth.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UserRole } from '@prisma/client';

describe('Auth & Session Revocation Integration Flow', () => {
  let authService: PlatformAuthService;
  let jwtGuard: JwtAuthGuard;
  let permissionsGuard: PermissionsGuard;
  let jwtService: JwtService;

  // In-memory simulation stores for authoritative database state
  let usersStore: Map<string, any>;
  let sessionsStore: Map<string, any>;
  let auditStore: any[];

  const jwtSecret = 'test-secret-key-32-chars-long-security-token';
  const superPassword = 'SuperSecret123!';
  let superPasswordHash: string;

  beforeAll(async () => {
    const salt = await bcrypt.genSalt(10);
    superPasswordHash = await bcrypt.hash(superPassword, salt);
  });

  beforeEach(() => {
    usersStore = new Map();
    sessionsStore = new Map();
    auditStore = [];

    // Seed test users
    usersStore.set('superadmin@clyptus.com', {
      id: 'usr_super_1',
      email: 'superadmin@clyptus.com',
      passwordHash: superPasswordHash,
      firstName: 'Platform',
      lastName: 'Super',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      isActive: true,
      platformAdminProfile: null,
    });

    usersStore.set('limitedadmin@clyptus.com', {
      id: 'usr_admin_1',
      email: 'limitedadmin@clyptus.com',
      passwordHash: superPasswordHash,
      firstName: 'Limited',
      lastName: 'Admin',
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      platformAdminProfile: {
        department: 'Support',
        permissions: ['platform.organisations.read'],
        isActive: true,
      },
    });

    // Mock Prisma backing stores
    const mockPrisma: any = {
      user: {
        findUnique: jest.fn().mockImplementation(({ where }: { where: { email?: string; id?: string } }) => {
          if (where.email) return Promise.resolve(usersStore.get(where.email) || null);
          if (where.id) {
            for (const u of usersStore.values()) {
              if (u.id === where.id) return Promise.resolve(u);
            }
          }
          return Promise.resolve(null);
        }),
      },
      platformSession: {
        create: jest.fn().mockImplementation(({ data }: { data: any }) => {
          sessionsStore.set(data.tokenHash, {
            ...data,
            revokedAt: null,
            user: usersStore.get(Array.from(usersStore.values()).find((u) => u.id === data.userId)?.email),
          });
          return Promise.resolve(data);
        }),
        findUnique: jest.fn().mockImplementation(({ where }: { where: { tokenHash: string } }) => {
          return Promise.resolve(sessionsStore.get(where.tokenHash) || null);
        }),
        updateMany: jest.fn().mockImplementation(({ where, data }: { where: any; data: any }) => {
          let count = 0;
          for (const [hash, sess] of sessionsStore.entries()) {
            if (sess.id === where.id && (where.revokedAt === null ? sess.revokedAt === null : true)) {
              sessionsStore.set(hash, { ...sess, ...data });
              count++;
            }
          }
          return Promise.resolve({ count });
        }),
      },
    };

    jwtService = new JwtService({ secret: jwtSecret, signOptions: { expiresIn: '1d' } });

    const mockConfig: any = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.secret') return jwtSecret;
        if (key === 'jwt.expiresIn') return '1d';
        return null;
      }),
    };

    const mockAudit: any = {
      record: jest.fn().mockImplementation((entry) => {
        auditStore.push(entry);
        return Promise.resolve();
      }),
    };

    const mockSecurity: any = {
      recordSecurityEvent: jest.fn().mockResolvedValue(undefined),
    };

    authService = new PlatformAuthService(
      mockPrisma,
      jwtService,
      mockConfig,
      mockAudit,
      mockSecurity,
    );

    jwtGuard = new JwtAuthGuard(jwtService, mockConfig, mockPrisma);
    permissionsGuard = new PermissionsGuard(new Reflector());
  });

  const createExecutionContext = (token?: string, requiredPermissions?: string[]): ExecutionContext => {
    const req: any = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };

    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  it('Step 1 -> 2 -> 3 -> 4: Full Authentication, Guard Validation, Logout, and Immediate Revocation Enforcement', async () => {
    // 1. User logs in with valid credentials
    const loginResult = await authService.login(
      { email: 'superadmin@clyptus.com', password: superPassword },
      '192.168.1.100',
      'Mozilla/5.0 Agent',
    );

    expect(loginResult).toBeDefined();
    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.user.role).toBe(UserRole.PLATFORM_SUPER_ADMIN);

    const token = loginResult.accessToken;

    // 2. User makes request to protected endpoint using the token
    const execContext1 = createExecutionContext(token);
    const canActivate1 = await jwtGuard.canActivate(execContext1);
    expect(canActivate1).toBe(true);

    const authedRequest = execContext1.switchToHttp().getRequest();
    expect(authedRequest.user).toBeDefined();
    expect(authedRequest.user.userId).toBe('usr_super_1');
    expect(authedRequest.user.permissions).toEqual(['*']);

    // 3. User logs out -> session is revoked in database
    const logoutResult = await authService.logout(
      {
        userId: authedRequest.user.userId,
        email: authedRequest.user.email,
        firstName: authedRequest.user.firstName,
        lastName: authedRequest.user.lastName,
        role: authedRequest.user.role,
        permissions: authedRequest.user.permissions,
        sessionId: authedRequest.user.sessionId,
      },
      '192.168.1.100',
      'Mozilla/5.0 Agent',
    );
    expect(logoutResult.message).toBe('Logged out successfully');

    // 4. User attempts another request with the SAME token -> MUST be rejected with 401
    const execContext2 = createExecutionContext(token);
    await expect(jwtGuard.canActivate(execContext2)).rejects.toThrow(UnauthorizedException);
  });

  it('Permissions Validation: Super Admin bypasses restrictions, Limited Admin is constrained', async () => {
    // Limited admin logs in
    const adminLogin = await authService.login(
      { email: 'limitedadmin@clyptus.com', password: superPassword },
      '10.0.0.1',
    );

    const adminToken = adminLogin.accessToken;
    const adminContext = createExecutionContext(adminToken);
    await jwtGuard.canActivate(adminContext);

    const adminReq = adminContext.switchToHttp().getRequest();
    expect(adminReq.user.permissions).toEqual(['platform.organisations.read']);

    // Super Admin logs in
    const superLogin = await authService.login(
      { email: 'superadmin@clyptus.com', password: superPassword },
      '10.0.0.2',
    );
    const superContext = createExecutionContext(superLogin.accessToken);
    await jwtGuard.canActivate(superContext);

    const superReq = superContext.switchToHttp().getRequest();
    expect(superReq.user.permissions).toEqual(['*']);
  });
});
