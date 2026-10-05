// ============================================================
// ORGANISATION PORTAL
// Service: Organisation Support Case Management
//
// Tenant Isolation:
// Strictly filters all ticket queries and mutations by ctx.organisationId.
// Excludes platform staff internal notes from organisation views.
// ============================================================

import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { OrgContext } from '../common/org-context';
import {
  OrgQuerySupportTicketsDto,
  OrgCreateSupportTicketDto,
  OrgCreateSupportMessageDto,
} from './dto';

const USER_SELECT_SAFE = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
};

@Injectable()
export class OrgSupportService {
  private readonly logger = new Logger(OrgSupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List tickets strictly scoped to the authenticated organisation
   */
  async listTickets(ctx: OrgContext, query: OrgQuerySupportTicketsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 15));
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {
      organisationId: ctx.organisationId,
    };

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      const asNumber = parseInt(term, 10);
      const isNum = !isNaN(asNumber) && String(asNumber) === term;

      where.AND = [
        {
          OR: [
            { subject: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            ...(isNum ? [{ ticketNumber: asNumber }] : []),
          ],
        },
      ];
    }

    const [tickets, total, openCount, inProgressCount, resolvedCount] =
      await Promise.all([
        this.prisma.supportTicket.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
          include: {
            createdByUser: { select: USER_SELECT_SAFE },
            assignedToUser: { select: USER_SELECT_SAFE },
            _count: {
              select: {
                messages: {
                  where: { isInternal: false },
                },
              },
            },
          },
        }),
        this.prisma.supportTicket.count({ where }),
        this.prisma.supportTicket.count({
          where: {
            organisationId: ctx.organisationId,
            status: SupportTicketStatus.OPEN,
          },
        }),
        this.prisma.supportTicket.count({
          where: {
            organisationId: ctx.organisationId,
            status: SupportTicketStatus.IN_PROGRESS,
          },
        }),
        this.prisma.supportTicket.count({
          where: {
            organisationId: ctx.organisationId,
            status: { in: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] },
          },
        }),
      ]);

    return {
      data: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        description: t.description,
        status: t.status,
        priority: t.priority,
        category: t.category,
        resolutionNotes: t.resolutionNotes,
        resolvedAt: t.resolvedAt,
        closedAt: t.closedAt,
        createdByUser: t.createdByUser,
        assignedToUser: t.assignedToUser,
        messageCount: t._count.messages,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        open: openCount,
        inProgress: inProgressCount,
        resolved: resolvedCount,
      },
    };
  }

  /**
   * Get single ticket with message thread (strictly excluding internal staff notes)
   */
  async getTicket(ctx: OrgContext, ticketId: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
        messages: {
          where: { isInternal: false }, // Critical: never expose platform internal notes to organisation!
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: USER_SELECT_SAFE },
          },
        },
      },
    });

    if (!ticket || ticket.organisationId !== ctx.organisationId) {
      throw new NotFoundException('Support ticket not found');
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      category: ticket.category,
      resolutionNotes: ticket.resolutionNotes,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      createdByUser: ticket.createdByUser,
      assignedToUser: ticket.assignedToUser,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        authorId: m.authorId,
        body: m.body,
        createdAt: m.createdAt,
        author: m.author,
      })),
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
    };
  }

  /**
   * Create a support ticket for the authenticated organisation
   */
  async createTicket(ctx: OrgContext, dto: OrgCreateSupportTicketDto) {
    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        category: dto.category || SupportTicketCategory.TECHNICAL,
        priority: dto.priority || SupportTicketPriority.MEDIUM,
        status: SupportTicketStatus.OPEN,
        organisationId: ctx.organisationId, // Derived server-side from OrgContext
        createdByUserId: ctx.userId,         // Derived server-side from OrgContext
      },
      include: {
        createdByUser: { select: USER_SELECT_SAFE },
      },
    });

    await this.auditService.record({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'ORG_SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      organisationId: ctx.organisationId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category,
      },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return ticket;
  }

  /**
   * Post a reply to an organisation ticket (isInternal is always false)
   */
  async addMessage(
    ctx: OrgContext,
    ticketId: string,
    dto: OrgCreateSupportMessageDto,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, organisationId: true, ticketNumber: true, status: true },
    });

    if (!ticket || ticket.organisationId !== ctx.organisationId) {
      throw new NotFoundException('Support ticket not found');
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          authorId: ctx.userId,
          body: dto.body,
          isInternal: false, // Enforced server-side: organisation users can never create internal notes
        },
        include: {
          author: { select: USER_SELECT_SAFE },
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          // If ticket was waiting for user, auto-transition back to IN_PROGRESS upon user reply
          status:
            ticket.status === SupportTicketStatus.WAITING_FOR_USER
              ? SupportTicketStatus.IN_PROGRESS
              : ticket.status,
        },
      }),
    ]);

    await this.auditService.record({
      actorId: ctx.userId,
      actorRole: ctx.role,
      action: 'ORG_SUPPORT_TICKET_REPLIED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      organisationId: ctx.organisationId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        messageLength: dto.body.length,
      },
      ipAddress: ctx.ip,
      userAgent: ctx.userAgent,
    });

    return {
      id: message.id,
      authorId: message.authorId,
      body: message.body,
      createdAt: message.createdAt,
      author: message.author,
    };
  }
}
