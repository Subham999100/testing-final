// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service: Platform Support Case Management
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  QuerySupportTicketsDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  CreateSupportMessageDto,
} from './dto/support-ticket.dto';

const USER_SELECT_SAFE = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
};

const ORGANISATION_SELECT_SAFE = {
  id: true,
  name: true,
  slug: true,
  tier: true,
  contactEmail: true,
};

@Injectable()
export class PlatformSupportService {
  private readonly logger = new Logger(PlatformSupportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * List tickets with full server-side filters, search, pagination, and KPI counts
   */
  async findAll(query: QuerySupportTicketsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.SupportTicketWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.organisationId) {
      where.organisationId = query.organisationId;
    }

    if (query.assignedToUserId) {
      if (query.assignedToUserId === 'unassigned') {
        where.assignedToUserId = null;
      } else if (query.assignedToUserId === 'assigned') {
        where.assignedToUserId = { not: null };
      } else {
        where.assignedToUserId = query.assignedToUserId;
      }
    }

    if (query.search && query.search.trim().length > 0) {
      const term = query.search.trim();
      const asNumber = parseInt(term, 10);
      const isNum = !isNaN(asNumber) && String(asNumber) === term;

      where.OR = [
        { subject: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { organisation: { name: { contains: term, mode: 'insensitive' } } },
        ...(isNum ? [{ ticketNumber: asNumber }] : []),
      ];
    }

    // Determine sort column
    const orderBy: Prisma.SupportTicketOrderByWithRelationInput = {};
    const sortField = query.sortBy || 'updatedAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';

    if (sortField === 'ticketNumber') {
      orderBy.ticketNumber = sortOrder;
    } else if (sortField === 'createdAt') {
      orderBy.createdAt = sortOrder;
    } else if (sortField === 'priority') {
      orderBy.priority = sortOrder;
    } else {
      orderBy.updatedAt = sortOrder;
    }

    const [tickets, total, openCount, inProgressCount, urgentCount, resolvedCount] =
      await Promise.all([
        this.prisma.supportTicket.findMany({
          where,
          skip,
          take: limit,
          orderBy,
          include: {
            organisation: { select: ORGANISATION_SELECT_SAFE },
            createdByUser: { select: USER_SELECT_SAFE },
            assignedToUser: { select: USER_SELECT_SAFE },
            _count: { select: { messages: true } },
          },
        }),
        this.prisma.supportTicket.count({ where }),
        this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.OPEN } }),
        this.prisma.supportTicket.count({ where: { status: SupportTicketStatus.IN_PROGRESS } }),
        this.prisma.supportTicket.count({
          where: {
            priority: SupportTicketPriority.URGENT,
            status: { notIn: [SupportTicketStatus.RESOLVED, SupportTicketStatus.CLOSED] },
          },
        }),
        this.prisma.supportTicket.count({
          where: {
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
        organisationId: t.organisationId,
        organisation: t.organisation,
        createdByUser: t.createdByUser,
        assignedToUser: t.assignedToUser,
        messageCount: t._count.messages,
        resolvedAt: t.resolvedAt,
        closedAt: t.closedAt,
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
        urgent: urgentCount,
        resolved: resolvedCount,
      },
    };
  }

  /**
   * Get single ticket with full conversation thread
   */
  async findOne(id: string) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: {
        organisation: { select: ORGANISATION_SELECT_SAFE },
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: USER_SELECT_SAFE },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket '${id}' not found`);
    }

    return ticket;
  }

  /**
   * Create a new support ticket (from platform or on behalf of org)
   */
  async create(
    dto: CreateSupportTicketDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.organisationId) {
      const org = await this.prisma.organisation.findUnique({
        where: { id: dto.organisationId },
        select: { id: true, name: true },
      });
      if (!org) {
        throw new BadRequestException(`Organisation '${dto.organisationId}' not found`);
      }
    }

    if (dto.assignedToUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToUserId },
        select: { id: true, role: true },
      });
      if (
        !assignee ||
        (assignee.role !== UserRole.PLATFORM_ADMIN &&
          assignee.role !== UserRole.PLATFORM_SUPER_ADMIN)
      ) {
        throw new BadRequestException('Assigned user must be a valid platform administrator');
      }
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        subject: dto.subject,
        description: dto.description,
        organisationId: dto.organisationId || null,
        createdByUserId: actor.userId,
        assignedToUserId: dto.assignedToUserId || null,
        priority: dto.priority || SupportTicketPriority.MEDIUM,
        category: dto.category || SupportTicketCategory.TECHNICAL,
        status: SupportTicketStatus.OPEN,
      },
      include: {
        organisation: { select: ORGANISATION_SELECT_SAFE },
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SUPPORT_TICKET_CREATED',
      entityType: 'SupportTicket',
      entityId: ticket.id,
      organisationId: ticket.organisationId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        priority: ticket.priority,
        category: ticket.category,
      },
      ipAddress,
      userAgent,
    });

    return ticket;
  }

  /**
   * Append a message / reply to the ticket
   */
  async addMessage(
    ticketId: string,
    dto: CreateSupportMessageDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, organisationId: true, ticketNumber: true, status: true },
    });

    if (!ticket) {
      throw new NotFoundException(`Support ticket '${ticketId}' not found`);
    }

    const [message] = await this.prisma.$transaction([
      this.prisma.supportMessage.create({
        data: {
          ticketId,
          authorId: actor.userId,
          body: dto.body,
          isInternal: dto.isInternal || false,
        },
        include: {
          author: { select: USER_SELECT_SAFE },
        },
      }),
      this.prisma.supportTicket.update({
        where: { id: ticketId },
        data: {
          updatedAt: new Date(),
          // If ticket was resolved/closed and a reply is added, keep in progress
          status:
            ticket.status === SupportTicketStatus.RESOLVED ||
            ticket.status === SupportTicketStatus.CLOSED
              ? SupportTicketStatus.IN_PROGRESS
              : ticket.status,
        },
      }),
    ]);

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SUPPORT_TICKET_REPLIED',
      entityType: 'SupportTicket',
      entityId: ticketId,
      organisationId: ticket.organisationId,
      metadata: {
        ticketNumber: ticket.ticketNumber,
        isInternal: dto.isInternal,
        messageLength: dto.body.length,
      },
      ipAddress,
      userAgent,
    });

    return message;
  }

  /**
   * Update general ticket properties (subject, description, priority, category)
   */
  async update(
    id: string,
    dto: UpdateSupportTicketDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, organisationId: true, ticketNumber: true, priority: true },
    });

    if (!existing) {
      throw new NotFoundException(`Support ticket '${id}' not found`);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        category: dto.category,
      },
      include: {
        organisation: { select: ORGANISATION_SELECT_SAFE },
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SUPPORT_TICKET_UPDATED',
      entityType: 'SupportTicket',
      entityId: id,
      organisationId: existing.organisationId,
      metadata: {
        ticketNumber: existing.ticketNumber,
        changes: {
          subject: dto.subject ? true : undefined,
          priority: dto.priority,
          category: dto.category,
        },
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Update status (e.g. In Progress, Waiting For User, Resolved, Closed)
   */
  async updateStatus(
    id: string,
    dto: UpdateTicketStatusDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, status: true, organisationId: true, ticketNumber: true },
    });

    if (!existing) {
      throw new NotFoundException(`Support ticket '${id}' not found`);
    }

    const isResolved = dto.status === SupportTicketStatus.RESOLVED;
    const isClosed = dto.status === SupportTicketStatus.CLOSED;
    const isOpenOrInProgress =
      dto.status === SupportTicketStatus.OPEN ||
      dto.status === SupportTicketStatus.IN_PROGRESS;

    const data: Prisma.SupportTicketUpdateInput = {
      status: dto.status,
      resolutionNotes: dto.resolutionNotes !== undefined ? dto.resolutionNotes : undefined,
    };

    if (isResolved) {
      data.resolvedAt = new Date();
    } else if (isOpenOrInProgress) {
      data.resolvedAt = null;
      data.closedAt = null;
    }

    if (isClosed) {
      data.closedAt = new Date();
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        organisation: { select: ORGANISATION_SELECT_SAFE },
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
      },
    });

    const actionName =
      dto.status === SupportTicketStatus.RESOLVED
        ? 'SUPPORT_TICKET_RESOLVED'
        : dto.status === SupportTicketStatus.CLOSED
          ? 'SUPPORT_TICKET_CLOSED'
          : 'SUPPORT_TICKET_STATUS_CHANGED';

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: actionName,
      entityType: 'SupportTicket',
      entityId: id,
      organisationId: existing.organisationId,
      metadata: {
        ticketNumber: existing.ticketNumber,
        previousStatus: existing.status,
        newStatus: dto.status,
        resolutionNotes: dto.resolutionNotes,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Assign or unassign ticket to a platform staff member
   */
  async assignTicket(
    id: string,
    dto: AssignTicketDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.supportTicket.findUnique({
      where: { id },
      select: { id: true, organisationId: true, ticketNumber: true, assignedToUserId: true },
    });

    if (!existing) {
      throw new NotFoundException(`Support ticket '${id}' not found`);
    }

    if (dto.assignedToUserId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToUserId },
        select: { id: true, role: true },
      });
      if (
        !assignee ||
        (assignee.role !== UserRole.PLATFORM_ADMIN &&
          assignee.role !== UserRole.PLATFORM_SUPER_ADMIN)
      ) {
        throw new BadRequestException('Assigned user must be a valid platform administrator');
      }
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id },
      data: {
        assignedToUserId: dto.assignedToUserId || null,
        // Auto-advance to IN_PROGRESS if ticket was OPEN and an assignee is assigned
        ...(existing.assignedToUserId === null && dto.assignedToUserId
          ? { status: SupportTicketStatus.IN_PROGRESS }
          : {}),
      },
      include: {
        organisation: { select: ORGANISATION_SELECT_SAFE },
        createdByUser: { select: USER_SELECT_SAFE },
        assignedToUser: { select: USER_SELECT_SAFE },
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SUPPORT_TICKET_ASSIGNED',
      entityType: 'SupportTicket',
      entityId: id,
      organisationId: existing.organisationId,
      metadata: {
        ticketNumber: existing.ticketNumber,
        assignedToUserId: dto.assignedToUserId,
      },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
