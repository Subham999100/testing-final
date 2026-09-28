// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Roles Decorator - Restricts Route Access by Role
// ============================================================

import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
