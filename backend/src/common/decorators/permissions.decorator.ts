// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Permissions Decorator - Restricts Route Access by Fine-Grained Permissions
// ============================================================

import { SetMetadata } from '@nestjs/common';
import { PlatformPermissionKey } from '../constants/permissions.constant';

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (...permissions: (PlatformPermissionKey | string)[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
