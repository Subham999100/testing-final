// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service: Platform Notifications Service
// Manages real-time alert delivery for administrative actions,
// organization support tickets, system security, and governance.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { QueryNotificationDto } from './dto/query-notification.dto';

export interface CreatePlatformNotificationDto {
  userId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
  metadata?: Record<string, any> | null;
}

@Injectable()
export class PlatformNotificationService {
  private readonly logger = new Logger(PlatformNotificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Persists a notification for platform administrators
   */
  async createNotification(dto: CreatePlatformNotificationDto) {
    try {
      const record = await this.prisma.platformNotification.create({
        data: {
          userId: dto.userId || null,
          type: dto.type,
          title: dto.title,
          message: dto.message,
          link: dto.link || null,
          severity: dto.severity || 'INFO',
          metadata: dto.metadata ? (dto.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });

      this.logger.log(`[NOTIFICATION] Created: [${dto.severity || 'INFO'}] ${dto.title}`);
      return record;
    } catch (err) {
      this.logger.error(`Failed to create platform notification: ${(err as Error).message}`);
      return null;
    }
  }

  /**
   * List notifications for platform administrators with unread counts and filters
   */
  async findAll(userId: string, query: QueryNotificationDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.PlatformNotificationWhereInput = {
      OR: [{ userId: null }, { userId }],
    };

    if (query.unread === 'true') {
      where.readAt = null;
    } else if (query.unread === 'false') {
      where.readAt = { not: null };
    }

    if (query.type && query.type !== 'all') {
      where.type = query.type;
    }

    if (query.severity && query.severity !== 'all') {
      where.severity = query.severity.toUpperCase();
    }

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { message: { contains: term, mode: 'insensitive' } },
            { type: { contains: term, mode: 'insensitive' } },
          ],
        },
      ];
    }

    const [rows, total, unreadCount] = await Promise.all([
      this.prisma.platformNotification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.platformNotification.count({ where }),
      this.prisma.platformNotification.count({
        where: {
          OR: [{ userId: null }, { userId }],
          readAt: null,
        },
      }),
    ]);

    return {
      data: rows,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      unread: unreadCount,
    };
  }

  /**
   * Get unread count quickly for header badge polling
   */
  async getUnreadCount(userId: string) {
    const unread = await this.prisma.platformNotification.count({
      where: {
        OR: [{ userId: null }, { userId }],
        readAt: null,
      },
    });
    return { unread };
  }

  /**
   * Mark a single notification as read
   */
  async markRead(id: string) {
    const existing = await this.prisma.platformNotification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.platformNotification.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return { id: updated.id, read: true };
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllRead(userId: string) {
    const res = await this.prisma.platformNotification.updateMany({
      where: {
        OR: [{ userId: null }, { userId }],
        readAt: null,
      },
      data: { readAt: new Date() },
    });

    return { updated: res.count };
  }

  /**
   * Delete a notification
   */
  async deleteNotification(id: string) {
    const existing = await this.prisma.platformNotification.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException('Notification not found');
    }

    await this.prisma.platformNotification.delete({ where: { id } });
    return { id, deleted: true };
  }

  /**
   * Triggered when an organisation raises a support ticket
   */
  async notifyTicketRaised(ticket: {
    id: string;
    ticketNumber: number;
    subject: string;
    priority: string;
    category: string;
    organisationId?: string | null;
  }, orgName?: string) {
    const priority = ticket.priority || 'MEDIUM';
    const severity: 'INFO' | 'WARNING' | 'URGENT' =
      priority === 'URGENT' ? 'URGENT' : priority === 'HIGH' ? 'WARNING' : 'INFO';

    const source = orgName ? `Organisation "${orgName}"` : 'An organisation';

    await this.createNotification({
      type: 'TICKET_RAISED',
      title: `New Support Ticket #${ticket.ticketNumber} Raised`,
      message: `${source} raised ticket #${ticket.ticketNumber}: "${ticket.subject}" [Priority: ${priority}, Category: ${ticket.category}]`,
      link: `/platform/support?ticketId=${ticket.id}`,
      severity,
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        priority,
        category: ticket.category,
        organisationId: ticket.organisationId,
      },
    });
  }

  /**
   * Triggered when a new reply/message is added to a ticket
   */
  async notifyTicketReplied(ticket: {
    id: string;
    ticketNumber: number;
    subject: string;
  }, author: { firstName?: string; lastName?: string; email?: string; role?: string }, bodyText: string) {
    const name = author.firstName ? `${author.firstName} ${author.lastName || ''}`.trim() : author.email || 'User';
    const preview = bodyText.length > 80 ? `${bodyText.substring(0, 80)}...` : bodyText;

    await this.createNotification({
      type: 'TICKET_UPDATED',
      title: `Reply on Ticket #${ticket.ticketNumber}`,
      message: `${name} (${author.role || 'Member'}) replied on Ticket #${ticket.ticketNumber}: "${preview}"`,
      link: `/platform/support?ticketId=${ticket.id}`,
      severity: 'INFO',
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
      },
    });
  }

  /**
   * Triggered on important admin actions (organisations, settings, admins, tokens)
   */
  async notifyAdminAction(info: {
    actorRole?: string;
    actorEmail?: string;
    action: string;
    entityType: string;
    entityId: string;
    details?: string;
    link?: string;
    severity?: 'INFO' | 'SUCCESS' | 'WARNING' | 'URGENT';
    metadata?: Record<string, any>;
  }) {
    const title = this.formatActionTitle(info.action, info.entityType);
    const message = info.details || `Admin action ${info.action} executed on ${info.entityType} (${info.entityId}) by ${info.actorEmail || info.actorRole || 'Admin'}.`;

    await this.createNotification({
      type: 'ADMIN_ACTION',
      title,
      message,
      link: info.link || this.getDefaultLinkForEntity(info.entityType, info.entityId),
      severity: info.severity || 'INFO',
      metadata: info.metadata,
    });
  }

  private formatActionTitle(action: string, entityType: string): string {
    const cleaned = action
      .replace(/^(PLATFORM_|ORG_)/, '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
    return `${entityType}: ${cleaned}`;
  }

  private getDefaultLinkForEntity(entityType: string, entityId: string): string {
    switch (entityType.toLowerCase()) {
      case 'organisation':
        return `/platform/organisations`;
      case 'supportticket':
        return `/platform/support?ticketId=${entityId}`;
      case 'platformadminprofile':
      case 'user':
        return `/platform/admins`;
      case 'tokentransaction':
      case 'tokenplan':
        return `/platform/tokens`;
      case 'platformsetting':
        return `/platform/settings`;
      default:
        return `/platform/audit-logs`;
    }
  }
}
