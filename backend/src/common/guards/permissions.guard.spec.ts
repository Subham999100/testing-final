// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Authorization Test: Permissions Guard
//
// Critical Security Checks:
// - PLATFORM_SUPER_ADMIN has unrestricted platform access
// - PLATFORM_ADMIN requires explicit permission granted
// - Non-platform roles (ORGANISATION_ADMIN, RECRUITER, CANDIDATE)
//   are rejected immediately.
// ============================================================

import { PermissionsGuard } from './permissions.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformPermissions } from '../constants/permissions.constant';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  const createMockContext = (user: any): ExecutionContext => {
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow PLATFORM_SUPER_ADMIN regardless of individual permissions', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_CREATE]);

    const context = createMockContext({
      userId: 'usr_super_1',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow PLATFORM_ADMIN if the required permission is assigned', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_READ]);

    const context = createMockContext({
      userId: 'usr_admin_1',
      role: UserRole.PLATFORM_ADMIN,
      permissions: [PlatformPermissions.ORGANISATIONS_READ],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow PLATFORM_ADMIN if any one of multiple required permissions is assigned', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
      PlatformPermissions.REPORTS_READ,
      PlatformPermissions.REPORTS_GENERATE,
      PlatformPermissions.REPORTS_EXPORT,
    ]);

    const context = createMockContext({
      userId: 'usr_admin_2',
      role: UserRole.PLATFORM_ADMIN,
      permissions: [PlatformPermissions.REPORTS_GENERATE],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject PLATFORM_ADMIN if required permission is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_SUSPEND]);

    const context = createMockContext({
      userId: 'usr_admin_1',
      role: UserRole.PLATFORM_ADMIN,
      permissions: [PlatformPermissions.ORGANISATIONS_READ], // Missing suspend
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject ORGANISATION_ADMIN from platform endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_READ]);

    const context = createMockContext({
      userId: 'usr_org_admin',
      role: UserRole.ORGANISATION_ADMIN,
      permissions: ['*'],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject RECRUITER from platform endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_READ]);

    const context = createMockContext({
      userId: 'usr_recruiter',
      role: UserRole.RECRUITER,
      permissions: [],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject CANDIDATE from platform endpoints', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_READ]);

    const context = createMockContext({
      userId: 'usr_candidate',
      role: UserRole.CANDIDATE,
      permissions: [],
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should reject unauthenticated request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([PlatformPermissions.ORGANISATIONS_READ]);

    const context = createMockContext(null);

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
