// ============================================================
// ORGANISATION PORTAL
// Login / logout / me, invitation preview & acceptance.
// Sessions reuse the existing PlatformSession table and the
// existing JwtAuthGuard, which validates them on every request.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrganisationStatus, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { OrgContext } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { ROLE_CEILINGS, isOrgRole } from '../common/org-permissions';
import { OrgTokenService } from '../common/org-token.service';
import { AcceptInvitationDto, ChangePasswordDto, OrgLoginDto } from '../team/dto';

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 10);

function durationToMs(value: string | undefined): number {
  const m = /^(\d+)\s*([smhd])$/.exec((value || '').trim());
  if (!m) return 24 * 60 * 60 * 1000;
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd'];
  return Number(m[1]) * unit;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class OrgAuthService {
  /** Simple per-instance limiter keyed by socket IP and by email (Redis deferred, see ASSUMPTIONS). */
  private readonly attempts = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  private hit(key: string, max: number, windowMs: number) {
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt < now) {
      this.attempts.set(key, { count: 1, resetAt: now + windowMs });
      if (this.attempts.size > 10_000) {
        for (const [k, v] of this.attempts) if (v.resetAt < now) this.attempts.delete(k);
      }
      return;
    }
    entry.count++;
    if (entry.count > max) {
      throw new HttpException(
        { message: 'Too many attempts. Please wait a few minutes and try again.', error: 'RATE_LIMITED' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  async login(dto: OrgLoginDto, ip?: string, userAgent?: string) {
    const email = dto.email.toLowerCase().trim();
    this.hit(`ip:${ip}`, 30, 5 * 60_000);
    this.hit(`email:${email}`, 10, 15 * 60_000);

    const user = await this.prisma.user.findUnique({ where: { email }, include: { orgMemberProfile: true } });
    const passwordOk = await bcrypt.compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    const eligible =
      !!user &&
      isOrgRole(user.role) &&
      user.isActive &&
      !!user.organisationId &&
      user.orgMemberProfile?.status === 'ACTIVE' &&
      user.orgMemberProfile.organisationId === user.organisationId;

    if (!user || !passwordOk || !eligible) {
      if (user) {
        await this.prisma.securityEvent.create({
          data: {
            eventType: 'FAILED_ORG_LOGIN',
            severity: 'MEDIUM',
            actorId: user.id,
            ipAddress: ip,
            userAgent: userAgent?.slice(0, 500),
            details: { email, reason: !passwordOk ? 'bad_password' : 'not_eligible' },
          },
        });
      }
      throw new UnauthorizedException('Invalid credentials');
    }

    const org = await this.prisma.organisation.findUnique({ where: { id: user.organisationId } });
    if (!org || org.status === OrganisationStatus.SUSPENDED || org.status === OrganisationStatus.ARCHIVED) {
      throw new UnauthorizedException('Your organisation is not active. Contact platform support.');
    }

    const sessionId = crypto.randomUUID();
    const accessToken = this.jwt.sign({ sub: user.id, email: user.email, role: user.role, sessionId });
    const expiresAt = new Date(Date.now() + durationToMs(this.config.get<string>('jwt.expiresIn')));
    await this.prisma.platformSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: hashToken(accessToken),
        ipAddress: ip ?? null,
        userAgent: userAgent?.slice(0, 500) ?? null,
        expiresAt,
      },
    });
    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'ORG_LOGIN',
      entityType: 'PLATFORM_SESSION',
      entityId: sessionId,
      organisationId: user.organisationId,
      ipAddress: ip,
      userAgent,
    });
    return { accessToken, expiresAt: expiresAt.toISOString(), requiresPasswordChange: !!user.mustChangePassword };
  }

  async logout(ctx: OrgContext) {
    if (ctx.sessionId) {
      await this.prisma.platformSession.updateMany({
        where: { id: ctx.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await this.events.audit(ctx, 'ORG_LOGOUT', 'PLATFORM_SESSION', ctx.sessionId);
    }
    return { loggedOut: true };
  }

  async changePassword(ctx: OrgContext, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentValid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    if (dto.confirmPassword && dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('New password and confirmation do not match');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: ctx.userId },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
    });

    await this.auditService.record({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'PASSWORD_CHANGED',
      entityType: 'USER',
      entityId: ctx.userId,
      organisationId: ctx.organisationId,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return { success: true, message: 'Password changed successfully' };
  }

  async me(ctx: OrgContext) {
    const [org, profile, unread, wallet] = await Promise.all([
      this.prisma.organisation.findUnique({
        where: { id: ctx.organisationId },
        include: { metadata: { select: { logoUrl: true } } },
      }),
      this.prisma.orgMemberProfile.findUnique({ where: { userId: ctx.userId } }),
      this.prisma.orgNotification.count({ where: { userId: ctx.userId, readAt: null } }),
      ctx.permissions.includes('tokens.read') ? this.tokens.wallet(ctx) : Promise.resolve(null),
    ]);
    return {
      user: {
        id: ctx.userId,
        email: ctx.email,
        firstName: ctx.firstName,
        lastName: ctx.lastName,
        role: ctx.role,
        title: profile?.title ?? null,
        timezone: profile?.timezone ?? 'UTC',
        mustChangePassword: !!ctx.mustChangePassword,
      },
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status,
        tier: org.tier,
        maxRecruiters: org.maxRecruiters,
        logoUrl: org.metadata?.logoUrl ?? null,
      },
      permissions: ctx.permissions,
      unreadNotifications: unread,
      tokens: wallet ? { balance: wallet.balance, spendable: wallet.spendable } : null,
    };
  }

  // ---------------- invitations (public) ----------------

  private async findPendingInvitation(token: string) {
    if (!token || token.length < 20) throw new NotFoundException('Invitation not found');
    const invitation = await this.prisma.orgInvitation.findUnique({ where: { tokenHash: hashToken(token) } });
    if (!invitation || invitation.status !== 'PENDING') throw new NotFoundException('This invitation is no longer valid');
    if (invitation.expiresAt < new Date()) {
      await this.prisma.orgInvitation.update({ where: { id: invitation.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('This invitation has expired. Ask your administrator to resend it.');
    }
    return invitation;
  }

  async previewInvitation(token: string) {
    const invitation = await this.findPendingInvitation(token);
    const org = await this.prisma.organisation.findUnique({ where: { id: invitation.organisationId }, select: { name: true } });
    return { email: invitation.email, role: invitation.role, organisationName: org?.name, expiresAt: invitation.expiresAt };
  }

  async acceptInvitation(dto: AcceptInvitationDto, ip?: string, userAgent?: string) {
    const invitation = await this.findPendingInvitation(dto.token);
    const org = await this.prisma.organisation.findUnique({ where: { id: invitation.organisationId } });
    if (!org || org.status === OrganisationStatus.SUSPENDED || org.status === OrganisationStatus.ARCHIVED) {
      throw new BadRequestException('This organisation is not active');
    }
    const existing = await this.prisma.user.findUnique({ where: { email: invitation.email } });
    if (existing) throw new ConflictException('An account with this email already exists. Contact your administrator.');

    if (invitation.role === UserRole.RECRUITER) {
      const recruiters = await this.prisma.orgMemberProfile.count({
        where: { organisationId: org.id, status: 'ACTIVE', user: { role: UserRole.RECRUITER } },
      });
      if (recruiters >= org.maxRecruiters) {
        throw new BadRequestException('Your organisation has reached its recruiter seat limit');
      }
    }

    const role = invitation.role;
    if (!isOrgRole(role)) throw new BadRequestException('Invalid invitation role');
    const permissions = invitation.permissions.filter((k) => (ROLE_CEILINGS[role] as string[]).includes(k));
    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (t) => {
      const claimed = await t.orgInvitation.updateMany({
        where: { id: invitation.id, status: 'PENDING' },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (!claimed.count) throw new ConflictException('This invitation was already used');
      const created = await t.user.create({
        data: {
          email: invitation.email,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role,
          organisationId: org.id,
          isActive: true,
          isEmailVerified: true,
          orgMemberProfile: {
            create: { organisationId: org.id, permissions, invitedById: invitation.invitedById },
          },
        },
      });
      await t.orgInvitation.update({ where: { id: invitation.id }, data: { acceptedUserId: created.id } });
      return created;
    });

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'INVITATION_ACCEPTED',
      entityType: 'ORG_INVITATION',
      entityId: invitation.id,
      organisationId: org.id,
      metadata: { role },
      ipAddress: ip,
      userAgent,
    });
    await this.events.notify(org.id, [invitation.invitedById], {
      type: 'invitation.accepted',
      title: `${user.firstName} ${user.lastName} joined your organisation`,
      link: `/org/members/${user.id}`,
    });
    this.events.emit(org.id, 'member.updated', { userId: user.id });
    return { accepted: true, email: user.email };
  }
}
