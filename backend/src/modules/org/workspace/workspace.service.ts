// ============================================================
// ORGANISATION PORTAL — Organisation profile, workflow settings,
// integrations (secrets encrypted at rest, never returned) and the
// member's own profile / password.
// ============================================================

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, assertCan } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { ChangePasswordDto, UpdateProfileDto } from '../team/dto';
import { INTEGRATION_PROVIDERS, UpdateOrganisationDto, UpdateSettingsDto, UpsertIntegrationDto } from './dto';

function secretKey(): Buffer {
  const configured = process.env.ORG_SECRETS_KEY;
  if (!configured && process.env.NODE_ENV === 'production') {
    throw new Error('ORG_SECRETS_KEY must be set in production to store integration secrets');
  }
  return crypto.createHash('sha256').update(configured || `dev-only:${process.env.JWT_SECRET || 'clyptus'}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secretKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), enc]).toString('base64');
}

export function decryptSecret(payload: string): string {
  const raw = Buffer.from(payload, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', secretKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
  ) {}

  // ---------------- organisation ----------------

  async organisation(ctx: OrgContext) {
    const org = await this.prisma.organisation.findUnique({ where: { id: ctx.organisationId }, include: { metadata: true } });
    const [members, recruiters] = await Promise.all([
      this.prisma.orgMemberProfile.count({ where: { organisationId: ctx.organisationId, status: 'ACTIVE' } }),
      this.prisma.orgMemberProfile.count({ where: { organisationId: ctx.organisationId, status: 'ACTIVE', user: { role: 'RECRUITER' } } }),
    ]);
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      createdAt: org.createdAt,
      metadata: {
        industry: org.metadata?.industry ?? null,
        companySize: org.metadata?.companySize ?? null,
        website: org.metadata?.website ?? null,
        logoUrl: org.metadata?.logoUrl ?? null,
        address: org.metadata?.address ?? null,
      },
      platformLimits: { tier: org.tier, maxRecruiters: org.maxRecruiters, recruitersUsed: recruiters, activeMembers: members },
    };
  }

  async updateOrganisation(ctx: OrgContext, dto: UpdateOrganisationDto) {
    const meta = { industry: dto.industry, companySize: dto.companySize, website: dto.website, logoUrl: dto.logoUrl, address: dto.address };
    await this.prisma.organisation.update({
      where: { id: ctx.organisationId },
      data: {
        name: dto.name?.trim(),
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        metadata: { upsert: { create: meta, update: meta } },
      },
    });
    await this.events.audit(ctx, 'ORGANISATION_PROFILE_UPDATED', 'ORGANISATION', ctx.organisationId, { fields: Object.keys(dto) });
    return this.organisation(ctx);
  }

  // ---------------- settings ----------------

  async settings(ctx: OrgContext) {
    return this.prisma.orgSettings.upsert({
      where: { organisationId: ctx.organisationId },
      create: { organisationId: ctx.organisationId },
      update: {},
    });
  }

  async updateSettings(ctx: OrgContext, dto: UpdateSettingsDto) {
    if (dto.messageOversight !== undefined) assertCan(ctx, 'org.security.manage');
    if (dto.aiEnabled !== undefined) assertCan(ctx, 'ai.govern');
    const workflowKeys: (keyof UpdateSettingsDto)[] = [
      'jobApprovalRequired',
      'offerApprovalRequired',
      'rejectReasonRequired',
      'lowBalanceThreshold',
      'tokenConfirmThreshold',
    ];
    if (workflowKeys.some((k) => dto[k] !== undefined)) assertCan(ctx, 'org.settings.update');
    const before = await this.settings(ctx);
    const updated = await this.prisma.orgSettings.update({
      where: { organisationId: ctx.organisationId },
      data: { ...dto, updatedById: ctx.userId },
    });
    const changes = Object.fromEntries(
      Object.keys(dto).map((k) => [k, { from: before[k as keyof typeof before], to: updated[k as keyof typeof updated] }]),
    );
    await this.events.audit(ctx, 'ORG_SETTINGS_UPDATED', 'ORG_SETTINGS', updated.id, changes);
    return updated;
  }

  // ---------------- integrations ----------------

  async integrations(ctx: OrgContext) {
    const rows = await this.prisma.orgIntegration.findMany({ where: { organisationId: ctx.organisationId } });
    return INTEGRATION_PROVIDERS.map((provider) => {
      const row = rows.find((r) => r.provider === provider);
      return row
        ? { provider, connected: true, label: row.label, enabled: row.enabled, secret: `••••${row.secretLast4}`, updatedAt: row.updatedAt }
        : { provider, connected: false, label: null, enabled: false, secret: null, updatedAt: null };
    });
  }

  async upsertIntegration(ctx: OrgContext, provider: string, dto: UpsertIntegrationDto) {
    const secret = dto.secret.trim();
    const data = {
      label: dto.label.trim(),
      encryptedSecret: encryptSecret(secret),
      secretLast4: secret.slice(-4),
      enabled: true,
      updatedById: ctx.userId,
    };
    await this.prisma.orgIntegration.upsert({
      where: { organisationId_provider: { organisationId: ctx.organisationId, provider } },
      create: { organisationId: ctx.organisationId, provider, ...data },
      update: data,
    });
    await this.events.audit(ctx, 'INTEGRATION_SAVED', 'ORG_INTEGRATION', provider, { label: data.label });
    return this.integrations(ctx);
  }

  async toggleIntegration(ctx: OrgContext, provider: string, enabled: boolean) {
    const res = await this.prisma.orgIntegration.updateMany({
      where: { organisationId: ctx.organisationId, provider },
      data: { enabled, updatedById: ctx.userId },
    });
    if (!res.count) throw new NotFoundException('Integration not connected');
    await this.events.audit(ctx, enabled ? 'INTEGRATION_ENABLED' : 'INTEGRATION_DISABLED', 'ORG_INTEGRATION', provider);
    return this.integrations(ctx);
  }

  async removeIntegration(ctx: OrgContext, provider: string) {
    await this.prisma.orgIntegration.deleteMany({ where: { organisationId: ctx.organisationId, provider } });
    await this.events.audit(ctx, 'INTEGRATION_REMOVED', 'ORG_INTEGRATION', provider);
    return this.integrations(ctx);
  }

  // ---------------- own profile ----------------

  async profile(ctx: OrgContext) {
    const p = await this.prisma.orgMemberProfile.findUnique({ where: { userId: ctx.userId } });
    return {
      id: ctx.userId,
      email: ctx.email,
      firstName: ctx.firstName,
      lastName: ctx.lastName,
      role: ctx.role,
      title: p?.title ?? null,
      timezone: p?.timezone ?? 'UTC',
      joinedAt: p?.joinedAt,
    };
  }

  async updateProfile(ctx: OrgContext, dto: UpdateProfileDto) {
    if (dto.timezone) {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: dto.timezone });
      } catch {
        throw new BadRequestException('Unknown timezone');
      }
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: ctx.userId }, data: { firstName: dto.firstName?.trim(), lastName: dto.lastName?.trim() } }),
      this.prisma.orgMemberProfile.update({ where: { userId: ctx.userId }, data: { title: dto.title, timezone: dto.timezone } }),
    ]);
    await this.events.audit(ctx, 'PROFILE_UPDATED', 'ORG_MEMBER', ctx.userId, { fields: Object.keys(dto) });
    return this.profile({ ...ctx, firstName: dto.firstName ?? ctx.firstName, lastName: dto.lastName ?? ctx.lastName });
  }

  async changePassword(ctx: OrgContext, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: ctx.userId } });
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) throw new ForbiddenException('Current password is incorrect');
    if (dto.currentPassword === dto.newPassword) throw new BadRequestException('Choose a new password');
    await this.prisma.user.update({ where: { id: ctx.userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 12) } });
    // Sign out every other session.
    await this.prisma.platformSession.updateMany({
      where: { userId: ctx.userId, revokedAt: null, id: { not: ctx.sessionId } },
      data: { revokedAt: new Date() },
    });
    await this.events.audit(ctx, 'PASSWORD_CHANGED', 'ORG_MEMBER', ctx.userId);
    return { changed: true };
  }
}
