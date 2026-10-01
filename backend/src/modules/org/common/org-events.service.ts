// ============================================================
// ORGANISATION PORTAL
// Side effects shared by every org module: audit trail (existing
// AuditService), in-app notifications and realtime events.
// ============================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { OrgContext } from './org-context';
import { OrgPermission, effectivePermissions } from './org-permissions';
import { OrgRealtimeGateway } from './org-realtime.gateway';

export const NOTIFICATION_TYPES = [
  'job.approval',
  'job.decision',
  'job.assigned',
  'application.assigned',
  'application.stage',
  'interview.assigned',
  'offer.approval',
  'offer.decision',
  'invitation.accepted',
  'tokens.low_balance',
  'tokens.allocated',
  'payment',
  'task.assigned',
  'announcement',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
}

@Injectable()
export class OrgEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly realtime: OrgRealtimeGateway,
  ) {}

  audit(ctx: OrgContext, action: string, entityType: string, entityId: string, metadata?: Record<string, unknown>) {
    return this.auditService.record({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action,
      entityType,
      entityId,
      organisationId: ctx.organisationId,
      metadata: metadata as Record<string, any>,
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });
  }

  emit(organisationId: string, event: string, payload: Record<string, unknown> = {}) {
    this.realtime.toOrg(organisationId, event, payload);
  }

  emitToUser(userId: string, event: string, payload: Record<string, unknown> = {}) {
    this.realtime.toUser(userId, event, payload);
  }

  disconnectUser(userId: string) {
    this.realtime.disconnectUser(userId);
  }

  /** Creates in-app notifications, skipping muted types and the acting user. */
  async notify(organisationId: string, userIds: (string | null | undefined)[], n: NotificationInput, exceptUserId?: string) {
    const ids = [...new Set(userIds.filter(Boolean) as string[])].filter((id) => id !== exceptUserId);
    if (!ids.length) return;
    const profiles = await this.prisma.orgMemberProfile.findMany({
      where: { organisationId, userId: { in: ids }, status: 'ACTIVE' },
      select: { userId: true, mutedNotificationTypes: true },
    });
    const recipients = profiles.filter((p) => !p.mutedNotificationTypes.includes(n.type)).map((p) => p.userId);
    if (!recipients.length) return;
    await this.prisma.orgNotification.createMany({
      data: recipients.map((userId) => ({
        organisationId,
        userId,
        type: n.type,
        title: n.title.slice(0, 200),
        body: n.body?.slice(0, 1000),
        link: n.link,
      })),
    });
    recipients.forEach((userId) => this.realtime.toUser(userId, 'notification.created', { type: n.type }));
  }

  /** Active members whose effective permissions include `permission`. */
  async membersWithPermission(organisationId: string, permission: OrgPermission): Promise<string[]> {
    const profiles = await this.prisma.orgMemberProfile.findMany({
      where: { organisationId, status: 'ACTIVE', user: { isActive: true } },
      select: { userId: true, permissions: true, user: { select: { role: true } } },
    });
    return profiles
      .filter((p) => effectivePermissions(p.user.role, p.permissions).includes(permission))
      .map((p) => p.userId);
  }
}
