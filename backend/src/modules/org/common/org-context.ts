// ============================================================
// ORGANISATION PORTAL
// Request context, guard and decorators.
// Pipeline: JwtAuthGuard (existing, DB session) → OrgGuard
// (membership + org status + permissions resolved from the DB,
// never from the request) → service-level resource scoping.
// ============================================================

import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrganisationStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrgPermission, OrgRole, effectivePermissions, isOrgRole } from './org-permissions';

export interface OrgContext {
  userId: string;
  sessionId?: string;
  organisationId: string;
  organisationName: string;
  role: OrgRole;
  permissions: OrgPermission[];
  email: string;
  firstName: string;
  lastName: string;
  mustChangePassword?: boolean;
  ip?: string;
  userAgent?: string;
}

export const ORG_PERMS_KEY = 'org_permissions_any';
export const ALLOW_PASSWORD_CHANGE_KEY = 'allow_password_change_route';

/** Route requires ANY of the listed permissions (use several keys for read.all / read.assigned pairs). */
export const OrgPerms = (...permissions: OrgPermission[]) => SetMetadata(ORG_PERMS_KEY, permissions);

/** Allows users who must change password to access specific endpoints (e.g. /org/auth/me, /org/auth/change-password, /org/auth/logout). */
export const AllowPasswordChange = () => SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true);

export const Org = createParamDecorator((_data: unknown, ctx: ExecutionContext): OrgContext => {
  return ctx.switchToHttp().getRequest().orgContext as OrgContext;
});

export function can(ctx: OrgContext, permission: OrgPermission): boolean {
  return ctx.permissions.includes(permission);
}

export function assertCan(ctx: OrgContext, permission: OrgPermission): void {
  if (!can(ctx, permission)) throw new ForbiddenException(`Missing permission: ${permission}`);
}

export function isOwner(ctx: OrgContext): boolean {
  return ctx.role === UserRole.ORGANISATION_SUPER_ADMIN;
}

/** Loads membership for a user id; shared by the HTTP guard and the realtime gateway. */
export async function resolveOrgContext(
  prisma: PrismaService,
  user: { userId: string; role: UserRole; organisationId?: string | null; email: string; firstName: string; lastName: string; sessionId?: string },
): Promise<OrgContext> {
  if (!isOrgRole(user.role)) throw new ForbiddenException('This area is for organisation members only');
  const [profile, dbUser] = await Promise.all([
    prisma.orgMemberProfile.findUnique({ where: { userId: user.userId } }),
    prisma.user.findUnique({ where: { id: user.userId }, select: { mustChangePassword: true } }),
  ]);
  if (!profile || profile.status !== 'ACTIVE' || !user.organisationId || profile.organisationId !== user.organisationId) {
    throw new ForbiddenException('Your organisation membership is not active');
  }
  const org = await prisma.organisation.findUnique({
    where: { id: profile.organisationId },
    select: { id: true, name: true, status: true },
  });
  if (!org || org.status === OrganisationStatus.SUSPENDED || org.status === OrganisationStatus.ARCHIVED) {
    throw new ForbiddenException('Your organisation is not active. Contact platform support.');
  }
  return {
    userId: user.userId,
    sessionId: user.sessionId,
    organisationId: org.id,
    organisationName: org.name,
    role: user.role,
    permissions: effectivePermissions(user.role, profile.permissions),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    mustChangePassword: dbUser?.mustChangePassword ?? false,
  };
}

@Injectable()
export class OrgGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user as AuthenticatedUser;
    if (!user) throw new UnauthorizedException('Authentication required');

    const orgContext = await resolveOrgContext(this.prisma, user);
    orgContext.ip = req.ip || req.socket?.remoteAddress;
    const ua = req.headers['user-agent'];
    orgContext.userAgent = typeof ua === 'string' ? ua : undefined;
    req.orgContext = orgContext;

    // Password change requirement enforcement:
    // When mustChangePassword is true, only routes marked with @AllowPasswordChange() may be accessed.
    const allowPasswordChange = this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (orgContext.mustChangePassword && !allowPasswordChange) {
      throw new ForbiddenException('Password change required before accessing organisation workspace');
    }

    const required = this.reflector.getAllAndOverride<OrgPermission[]>(ORG_PERMS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (required?.length && !required.some((p) => orgContext.permissions.includes(p))) {
      throw new ForbiddenException(`Missing permission: ${required.join(' or ')}`);
    }
    return true;
  }
}
