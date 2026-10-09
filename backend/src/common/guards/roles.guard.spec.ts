// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Authorization Test: Roles Guard
// ============================================================

import { RolesGuard } from './roles.guard';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
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

  it('should allow access when user role matches one of the required roles', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PLATFORM_SUPER_ADMIN]);

    const context = createMockContext({
      userId: 'usr_super',
      role: UserRole.PLATFORM_SUPER_ADMIN,
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should forbid access when user role is not in the required roles list', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([UserRole.PLATFORM_SUPER_ADMIN]);

    const context = createMockContext({
      userId: 'usr_admin',
      role: UserRole.PLATFORM_ADMIN,
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
