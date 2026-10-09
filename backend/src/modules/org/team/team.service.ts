// ============================================================
// ORGANISATION PORTAL
// Members, permission matrix and invitations.
// Escalation rules live in org-permissions.ts (validateGrant).
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../../../integrations/email/email.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrgContext, assertCan } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import {
  ORG_PERMISSION_CATALOG,
  ROLE_CEILINGS,
  ROLE_DEFAULTS,
  canManageRole,
  effectivePermissions,
  grantableFor,
  isOrgRole,
  validateGrant,
} from '../common/org-permissions';
import { OrgTokenService } from '../common/org-token.service';
import * as bcrypt from 'bcryptjs';
import { pageResult, paging, userSummaries } from '../common/org-helpers';
import { hashToken } from '../auth/org-auth.service';
import {
  CreateAdminDto,
  CreateInvitationDto,
  CreateRecruiterDto,
  InvitationQueryDto,
  MemberQueryDto,
  ResetMemberPasswordDto,
} from './dto';

const INVITE_TTL_DAYS = Number(process.env.ORG_INVITE_TTL_DAYS) || 7;

@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
    private readonly email: EmailService,
    private readonly auditService: AuditService,
  ) {}

  // ---------------- members ----------------

  async listMembers(ctx: OrgContext, q: MemberQueryDto) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.OrgMemberProfileWhereInput = { organisationId: ctx.organisationId };
    where.status = (q.status as Prisma.OrgMemberProfileWhereInput['status']) ?? { not: 'REMOVED' };
    const userWhere: Prisma.UserWhereInput = {};
    if (q.role) userWhere.role = q.role as UserRole;
    if (q.search) {
      userWhere.OR = [
        { firstName: { contains: q.search, mode: 'insensitive' } },
        { lastName: { contains: q.search, mode: 'insensitive' } },
        { email: { contains: q.search, mode: 'insensitive' } },
      ];
    }
    if (Object.keys(userWhere).length) where.user = userWhere;

    const [total, profiles] = await Promise.all([
      this.prisma.orgMemberProfile.count({ where }),
      this.prisma.orgMemberProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { joinedAt: 'desc' },
        include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true } } },
      }),
    ]);
    const ids = profiles.map((p) => p.userId);
    const [allocations, jobs, apps] = await Promise.all([
      this.prisma.tokenAllocation.findMany({ where: { organisationId: ctx.organisationId, userId: { in: ids } } }),
      this.prisma.job.groupBy({
        by: ['createdById'],
        where: { organisationId: ctx.organisationId, createdById: { in: ids }, status: { in: ['PUBLISHED', 'PAUSED', 'IN_REVIEW', 'DRAFT'] } },
        _count: { _all: true },
      }),
      this.prisma.application.groupBy({
        by: ['assignedToId'],
        where: { organisationId: ctx.organisationId, assignedToId: { in: ids }, stage: { notIn: ['HIRED', 'REJECTED', 'WITHDRAWN'] } },
        _count: { _all: true },
      }),
    ]);
    const alloc = new Map(allocations.map((a) => [a.userId, a.allocated - a.consumed]));
    const jobCount = new Map(jobs.map((j) => [j.createdById, j._count._all]));
    const appCount = new Map(apps.map((a) => [a.assignedToId, a._count._all]));

    return pageResult(
      profiles.map((p) => ({
        id: p.userId,
        email: p.user.email,
        name: `${p.user.firstName} ${p.user.lastName}`,
        role: p.user.role,
        status: p.status,
        title: p.title,
        joinedAt: p.joinedAt,
        tokensRemaining: alloc.get(p.userId) ?? 0,
        openJobs: jobCount.get(p.userId) ?? 0,
        openApplications: appCount.get(p.userId) ?? 0,
        canManage: p.userId !== ctx.userId && canManageRole(ctx.role, ctx.permissions, p.user.role),
      })),
      total,
      page,
      limit,
    );
  }

  /** Lightweight list for assignment pickers (any active member may see colleagues' names). */
  async memberOptions(ctx: OrgContext) {
    const profiles = await this.prisma.orgMemberProfile.findMany({
      where: { organisationId: ctx.organisationId, status: 'ACTIVE' },
      include: { user: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    return profiles.map((p) => ({ id: p.userId, name: `${p.user.firstName} ${p.user.lastName}`, role: p.user.role }));
  }

  private async getProfile(ctx: OrgContext, userId: string) {
    const profile = await this.prisma.orgMemberProfile.findUnique({
      where: { userId },
      include: { user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true } } },
    });
    if (!profile || profile.organisationId !== ctx.organisationId) throw new NotFoundException('Member not found');
    return profile;
  }

  async getMember(ctx: OrgContext, userId: string) {
    const p = await this.getProfile(ctx, userId);
    const role = p.user.role;
    const [allocation, activity] = await Promise.all([
      this.prisma.tokenAllocation.findUnique({ where: { organisationId_userId: { organisationId: ctx.organisationId, userId } } }),
      this.prisma.auditLog.findMany({
        where: { organisationId: ctx.organisationId, actorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 15,
        select: { id: true, action: true, entityType: true, entityId: true, createdAt: true },
      }),
    ]);
    const manageable = userId !== ctx.userId && canManageRole(ctx.role, ctx.permissions, role);
    return {
      id: p.userId,
      email: p.user.email,
      name: `${p.user.firstName} ${p.user.lastName}`,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      role,
      status: p.status,
      title: p.title,
      timezone: p.timezone,
      joinedAt: p.joinedAt,
      permissions: effectivePermissions(role, p.permissions),
      ceiling: isOrgRole(role) ? ROLE_CEILINGS[role] : [],
      grantable: manageable && isOrgRole(role) ? grantableFor(ctx.permissions, role) : [],
      canManage: manageable,
      tokens: allocation
        ? { allocated: allocation.allocated, consumed: allocation.consumed, remaining: allocation.allocated - allocation.consumed }
        : { allocated: 0, consumed: 0, remaining: 0 },
      recentActivity: activity,
    };
  }

  permissionCatalog(ctx: OrgContext) {
    return {
      catalog: ORG_PERMISSION_CATALOG,
      ceilings: ROLE_CEILINGS,
      defaults: ROLE_DEFAULTS,
      grantable: {
        ORGANISATION_ADMIN: canManageRole(ctx.role, ctx.permissions, UserRole.ORGANISATION_ADMIN)
          ? grantableFor(ctx.permissions, UserRole.ORGANISATION_ADMIN)
          : [],
        RECRUITER: canManageRole(ctx.role, ctx.permissions, UserRole.RECRUITER)
          ? grantableFor(ctx.permissions, UserRole.RECRUITER)
          : [],
      },
    };
  }

  async updatePermissions(ctx: OrgContext, userId: string, requested: string[]) {
    const p = await this.getProfile(ctx, userId);
    const unique = [...new Set(requested)];
    const error = validateGrant({
      actorId: ctx.userId,
      actorRole: ctx.role,
      actorPermissions: ctx.permissions,
      targetId: userId,
      targetRole: p.user.role,
      requested: unique,
    });
    if (error) throw new ForbiddenException(error);
    const before = effectivePermissions(p.user.role, p.permissions);
    await this.prisma.orgMemberProfile.update({ where: { userId }, data: { permissions: unique } });
    await this.events.audit(ctx, 'MEMBER_PERMISSIONS_UPDATED', 'ORG_MEMBER', userId, {
      added: unique.filter((k) => !before.includes(k as never)),
      removed: before.filter((k) => !unique.includes(k)),
    });
    this.events.emit(ctx.organisationId, 'member.updated', { userId });
    this.events.emitToUser(userId, 'me.updated', {});
    return this.getMember(ctx, userId);
  }

  private assertManageable(ctx: OrgContext, userId: string, role: UserRole) {
    if (userId === ctx.userId) throw new BadRequestException('You cannot change your own membership status');
    if (role === UserRole.ORGANISATION_SUPER_ADMIN) {
      throw new ForbiddenException('Organisation Super Admins can only be changed by the platform team');
    }
    if (!canManageRole(ctx.role, ctx.permissions, role)) throw new ForbiddenException('You cannot manage this member');
  }

  private async revokeSessions(userId: string) {
    await this.prisma.platformSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    this.events.disconnectUser(userId);
  }

  async suspend(ctx: OrgContext, userId: string) {
    const p = await this.getProfile(ctx, userId);
    this.assertManageable(ctx, userId, p.user.role);
    if (p.status !== 'ACTIVE') throw new BadRequestException('Only active members can be suspended');
    await this.prisma.$transaction([
      this.prisma.orgMemberProfile.update({ where: { userId }, data: { status: 'SUSPENDED' } }),
      this.prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
    ]);
    await this.revokeSessions(userId);
    await this.events.audit(
      ctx,
      p.user.role === UserRole.RECRUITER ? 'RECRUITER_SUSPENDED' : 'MEMBER_SUSPENDED',
      'ORG_MEMBER',
      userId,
      { email: p.user.email, role: p.user.role },
    );
    this.events.emit(ctx.organisationId, 'member.updated', { userId });
    return { id: userId, status: 'SUSPENDED' };
  }

  async reactivate(ctx: OrgContext, userId: string) {
    const p = await this.getProfile(ctx, userId);
    this.assertManageable(ctx, userId, p.user.role);
    if (p.status !== 'SUSPENDED') throw new BadRequestException('Only suspended members can be reactivated');
    if (p.user.role === UserRole.RECRUITER) await this.assertRecruiterSeat(ctx.organisationId, 0);
    await this.prisma.$transaction([
      this.prisma.orgMemberProfile.update({ where: { userId }, data: { status: 'ACTIVE' } }),
      this.prisma.user.update({ where: { id: userId }, data: { isActive: true } }),
    ]);
    await this.events.audit(
      ctx,
      p.user.role === UserRole.RECRUITER ? 'RECRUITER_REACTIVATED' : 'MEMBER_REACTIVATED',
      'ORG_MEMBER',
      userId,
      { email: p.user.email, role: p.user.role },
    );
    this.events.emit(ctx.organisationId, 'member.updated', { userId });
    return { id: userId, status: 'ACTIVE' };
  }

  async remove(ctx: OrgContext, userId: string) {
    const p = await this.getProfile(ctx, userId);
    this.assertManageable(ctx, userId, p.user.role);
    if (p.status === 'REMOVED') throw new BadRequestException('Member already removed');
    await this.prisma.$transaction([
      this.prisma.orgMemberProfile.update({ where: { userId }, data: { status: 'REMOVED', permissions: [] } }),
      this.prisma.user.update({ where: { id: userId }, data: { isActive: false } }),
      this.prisma.jobAssignment.deleteMany({ where: { organisationId: ctx.organisationId, userId } }),
    ]);
    await this.revokeSessions(userId);
    await this.tokens.reclaim(ctx, userId);
    await this.events.audit(ctx, 'MEMBER_REMOVED', 'ORG_MEMBER', userId, { email: p.user.email });
    this.events.emit(ctx.organisationId, 'member.updated', { userId });
    return { id: userId, status: 'REMOVED' };
  }

  private async assertRecruiterSeat(organisationId: string, pendingInvites: number) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
      select: { recruiterLimit: true },
    });
    const limit = org?.recruiterLimit ?? 25;
    const active = await this.prisma.orgMemberProfile.count({
      where: { organisationId, status: 'ACTIVE', user: { role: UserRole.RECRUITER } },
    });
    if (active + pendingInvites >= limit) {
      throw new ConflictException(`Recruiter seat limit reached (${limit}). Contact the platform team to raise it.`);
    }
  }

  // ---------------- admin & recruiter direct provisioning ----------------

  async getAdmin(ctx: OrgContext) {
    const admin = await this.prisma.user.findFirst({
      where: {
        organisationId: ctx.organisationId,
        role: UserRole.ORGANISATION_ADMIN,
        isActive: true,
      },
      include: {
        orgMemberProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!admin) return null;
    return {
      id: admin.id,
      name: `${admin.firstName} ${admin.lastName}`.trim(),
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      status: admin.orgMemberProfile?.status || 'ACTIVE',
      mustChangePassword: admin.mustChangePassword,
      createdAt: admin.createdAt,
    };
  }

  async createAdmin(ctx: OrgContext, dto: CreateAdminDto) {
    assertCan(ctx, 'org_admins.manage');

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.toLowerCase().trim();
    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';

    const admin = await this.prisma.$transaction(async (tx) => {
      // Invariant: Exactly one active Organisation Admin per organisation
      const existingAdmin = await tx.user.findFirst({
        where: {
          organisationId: ctx.organisationId,
          role: UserRole.ORGANISATION_ADMIN,
          isActive: true,
        },
      });

      if (existingAdmin) {
        throw new ConflictException('Organisation already has an Organisation Admin');
      }

      // Check global email uniqueness
      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException(`A user with email '${dto.email}' already exists`);
      }

      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: UserRole.ORGANISATION_ADMIN,
          organisationId: ctx.organisationId,
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: true,
          orgMemberProfile: {
            create: {
              organisationId: ctx.organisationId,
              permissions: ROLE_DEFAULTS.ORGANISATION_ADMIN,
              invitedById: ctx.userId,
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      return user;
    });

    await this.events.audit(ctx, 'ORGANISATION_ADMIN_CREATED', 'USER', admin.id, {
      email: admin.email,
      role: admin.role,
      name: `${admin.firstName} ${admin.lastName}`.trim(),
    });

    this.events.emit(ctx.organisationId, 'member.updated', { userId: admin.id });

    return {
      id: admin.id,
      name: `${admin.firstName} ${admin.lastName}`.trim(),
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      mustChangePassword: admin.mustChangePassword,
      createdAt: admin.createdAt,
    };
  }

  async getRecruiterUsage(ctx: OrgContext) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: ctx.organisationId },
      select: { recruiterLimit: true },
    });
    if (!org) {
      throw new NotFoundException('Organisation not found');
    }

    const limit = org.recruiterLimit ?? 25;
    const used = await this.prisma.user.count({
      where: {
        organisationId: ctx.organisationId,
        role: UserRole.RECRUITER,
        isActive: true,
      },
    });

    return {
      limit,
      used,
      available: Math.max(0, limit - used),
    };
  }

  async createRecruiter(ctx: OrgContext, dto: CreateRecruiterDto) {
    assertCan(ctx, 'recruiters.manage');

    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const email = dto.email.toLowerCase().trim();
    const nameParts = dto.name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';

    const recruiter = await this.prisma.$transaction(async (tx) => {
      // Row lock the organisation row to prevent race conditions during concurrent recruiter creation
      const [org] = await tx.$queryRaw<Array<{ id: string; maxRecruiters: number }>>`
        SELECT id, "maxRecruiters" FROM "organisations" WHERE id = ${ctx.organisationId} FOR UPDATE
      `;
      if (!org) {
        throw new NotFoundException('Organisation not found');
      }

      const limit = org.maxRecruiters ?? 25;

      const currentRecruiters = await tx.user.count({
        where: {
          organisationId: ctx.organisationId,
          role: UserRole.RECRUITER,
          isActive: true,
        },
      });

      if (currentRecruiters >= limit) {
        throw new ConflictException(`Recruiter limit reached. Maximum allowed: ${limit}`);
      }

      const existingUser = await tx.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        throw new ConflictException(`A user with email '${dto.email}' already exists`);
      }

      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: UserRole.RECRUITER,
          organisationId: ctx.organisationId,
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: true,
          orgMemberProfile: {
            create: {
              organisationId: ctx.organisationId,
              permissions: ROLE_DEFAULTS.RECRUITER,
              invitedById: ctx.userId,
            },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          role: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
        },
      });

      return user;
    });

    await this.events.audit(ctx, 'RECRUITER_CREATED', 'USER', recruiter.id, {
      email: recruiter.email,
      role: recruiter.role,
      name: `${recruiter.firstName} ${recruiter.lastName}`.trim(),
    });

    this.events.emit(ctx.organisationId, 'member.updated', { userId: recruiter.id });

    return {
      id: recruiter.id,
      name: `${recruiter.firstName} ${recruiter.lastName}`.trim(),
      firstName: recruiter.firstName,
      lastName: recruiter.lastName,
      email: recruiter.email,
      role: recruiter.role,
      isActive: recruiter.isActive,
      mustChangePassword: recruiter.mustChangePassword,
      createdAt: recruiter.createdAt,
    };
  }

  async resetMemberPassword(ctx: OrgContext, userId: string, dto: ResetMemberPasswordDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const p = await this.getProfile(ctx, userId);
    this.assertManageable(ctx, userId, p.user.role);

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
    });

    await this.revokeSessions(userId);

    const action = p.user.role === UserRole.RECRUITER ? 'RECRUITER_PASSWORD_RESET' : 'MEMBER_PASSWORD_RESET';
    await this.events.audit(ctx, action, 'USER', userId, {
      email: p.user.email,
      role: p.user.role,
    });

    return { message: 'Password reset successfully', mustChangePassword: true };
  }

  // ---------------- invitations ----------------

  private inviteUrl(token: string) {
    const base = process.env.APP_URL || this.config.get<string>('corsOrigin') || 'http://localhost:5173';
    return `${base.replace(/\/$/, '')}/org/accept-invite?token=${encodeURIComponent(token)}`;
  }

  private async sendInvite(organisationName: string, email: string, role: string, token: string) {
    const url = this.inviteUrl(token);
    const roleLabel = role.replace(/_/g, ' ').toLowerCase();
    await this.email.sendMail({
      to: email,
      subject: `You're invited to join ${organisationName} on Clyptus`,
      html: `<p>You have been invited to join <b>${organisationName.replace(/[<>&]/g, '')}</b> as ${roleLabel}.</p><p><a href="${url}">Accept invitation</a> (expires in ${INVITE_TTL_DAYS} days)</p>`,
    });
    // The URL is only returned outside production so local testing works without an email provider.
    return process.env.NODE_ENV === 'production' ? undefined : url;
  }

  private newToken() {
    const token = crypto.randomBytes(32).toString('base64url');
    return { token, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) };
  }

  private async expireStale(organisationId?: string) {
    await this.prisma.orgInvitation.updateMany({
      where: { ...(organisationId ? { organisationId } : {}), status: 'PENDING', expiresAt: { lt: new Date() } },
      data: { status: 'EXPIRED' },
    });
  }

  async listInvitations(ctx: OrgContext, q: InvitationQueryDto) {
    await this.expireStale(ctx.organisationId);
    const { page, limit, skip } = paging(q);
    const where: Prisma.OrgInvitationWhereInput = { organisationId: ctx.organisationId };
    if (q.status) where.status = q.status as Prisma.OrgInvitationWhereInput['status'];
    if (q.search) where.email = { contains: q.search, mode: 'insensitive' };
    const [total, rows] = await Promise.all([
      this.prisma.orgInvitation.count({ where }),
      this.prisma.orgInvitation.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.invitedById));
    return pageResult(
      rows.map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role,
        status: r.status,
        permissions: r.permissions,
        expiresAt: r.expiresAt,
        createdAt: r.createdAt,
        invitedBy: users.get(r.invitedById)?.name ?? '—',
        canManage: canManageRole(ctx.role, ctx.permissions, r.role),
      })),
      total,
      page,
      limit,
    );
  }

  async createInvitation(ctx: OrgContext, dto: CreateInvitationDto) {
    assertCan(ctx, 'invitations.manage');
    const role = dto.role as UserRole;
    if (!canManageRole(ctx.role, ctx.permissions, role)) throw new ForbiddenException('You cannot invite members with this role');
    const permissions = dto.permissions
      ? [...new Set(dto.permissions)]
      : ROLE_DEFAULTS[dto.role].filter((k) => ctx.permissions.includes(k));
    const error = validateGrant({
      actorId: ctx.userId,
      actorRole: ctx.role,
      actorPermissions: ctx.permissions,
      targetId: null,
      targetRole: role,
      requested: permissions,
    });
    if (error) throw new ForbiddenException(error);

    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException('A user with this email already exists');
    }
    await this.expireStale(ctx.organisationId);
    const pendingSame = await this.prisma.orgInvitation.findFirst({
      where: { organisationId: ctx.organisationId, email: dto.email, status: 'PENDING' },
    });
    if (pendingSame) throw new ConflictException('This email already has a pending invitation — resend it instead');
    if (role === UserRole.RECRUITER) {
      const pending = await this.prisma.orgInvitation.count({
        where: { organisationId: ctx.organisationId, status: 'PENDING', role: UserRole.RECRUITER },
      });
      await this.assertRecruiterSeat(ctx.organisationId, pending);
    }

    const { token, tokenHash, expiresAt } = this.newToken();
    const invitation = await this.prisma.orgInvitation.create({
      data: { organisationId: ctx.organisationId, email: dto.email, role, permissions, tokenHash, expiresAt, invitedById: ctx.userId },
    });
    const inviteUrl = await this.sendInvite(ctx.organisationName, dto.email, role, token);
    await this.events.audit(ctx, 'INVITATION_CREATED', 'ORG_INVITATION', invitation.id, { email: dto.email, role, permissions });
    return { id: invitation.id, email: invitation.email, role, status: invitation.status, expiresAt, inviteUrl };
  }

  private async getInvitation(ctx: OrgContext, id: string) {
    const inv = await this.prisma.orgInvitation.findFirst({ where: { id, organisationId: ctx.organisationId } });
    if (!inv) throw new NotFoundException('Invitation not found');
    if (!canManageRole(ctx.role, ctx.permissions, inv.role)) throw new ForbiddenException('You cannot manage this invitation');
    return inv;
  }

  async resendInvitation(ctx: OrgContext, id: string) {
    const inv = await this.getInvitation(ctx, id);
    if (inv.status !== 'PENDING' && inv.status !== 'EXPIRED') throw new BadRequestException(`Cannot resend a ${inv.status.toLowerCase()} invitation`);
    const { token, tokenHash, expiresAt } = this.newToken(); // rotating the token invalidates the old link
    await this.prisma.orgInvitation.update({ where: { id }, data: { tokenHash, expiresAt, status: 'PENDING' } });
    const inviteUrl = await this.sendInvite(ctx.organisationName, inv.email, inv.role, token);
    await this.events.audit(ctx, 'INVITATION_RESENT', 'ORG_INVITATION', id, { email: inv.email });
    return { id, status: 'PENDING', expiresAt, inviteUrl };
  }

  async cancelInvitation(ctx: OrgContext, id: string) {
    const inv = await this.getInvitation(ctx, id);
    if (inv.status !== 'PENDING') throw new BadRequestException('Only pending invitations can be cancelled');
    await this.prisma.orgInvitation.update({ where: { id }, data: { status: 'CANCELLED' } });
    await this.events.audit(ctx, 'INVITATION_CANCELLED', 'ORG_INVITATION', id, { email: inv.email });
    return { id, status: 'CANCELLED' };
  }

  /** Platform staff invite the first Org Super Admin of an organisation. */
  async createOwnerInvitation(actor: AuthenticatedUser, organisationId: string, email: string) {
    const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) throw new NotFoundException('Organisation not found');
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('A user with this email already exists');
    await this.expireStale(organisationId);
    await this.prisma.orgInvitation.updateMany({
      where: { organisationId, email, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
    const { token, tokenHash, expiresAt } = this.newToken();
    const invitation = await this.prisma.orgInvitation.create({
      data: {
        organisationId,
        email,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        permissions: ROLE_DEFAULTS.ORGANISATION_SUPER_ADMIN,
        tokenHash,
        expiresAt,
        invitedById: actor.userId,
      },
    });
    const inviteUrl = await this.sendInvite(org.name, email, UserRole.ORGANISATION_SUPER_ADMIN, token);
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORG_OWNER_INVITED',
      entityType: 'ORG_INVITATION',
      entityId: invitation.id,
      organisationId,
      metadata: { email },
    });
    return { id: invitation.id, email, expiresAt, inviteUrl };
  }
}
