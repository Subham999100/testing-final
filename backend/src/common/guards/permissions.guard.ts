// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Permissions Guard - Enforces Fine-Grained Authorization
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      throw new ForbiddenException('Access denied: Authentication context missing');
    }

    // Platform Super Admin possesses all platform permissions implicitly
    if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
      return true;
    }

    // Platform Admin must have explicit permissions
    if (user.role === UserRole.PLATFORM_ADMIN) {
      const userPermissions = user.permissions || [];
      const hasAny = requiredPermissions.some((perm) =>
        userPermissions.includes(perm),
      );

      if (!hasAny) {
        throw new ForbiddenException(
          `Access denied: Missing required permission(s) [${requiredPermissions.join(', ')}]`,
        );
      }
      return true;
    }

    // All non-platform roles are strictly blocked from platform operations
    throw new ForbiddenException(
      'Access denied: You do not have platform-level administration privileges',
    );
  }
}
