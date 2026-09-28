// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Authenticated User Identity Contract
// ============================================================

import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions?: string[];
  organisationId?: string | null;
}
