// ============================================================
// PLATFORM SUPER ADMIN
// Service: Platform Security Operations, Sessions & Incident Resolution
// ============================================================

import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { EmailService } from '../../../integrations/email/email.service';
import { ResolveSecurityEventDto } from './dto/resolve-security-event.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { SecuritySeverity } from '@prisma/client';

@Injectable()
export class PlatformSecurityService {
  private readonly logger = new Logger(PlatformSecurityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Retrieves security events with severity and resolution filters.
   */
  async findSecurityEvents(query: { severity?: SecuritySeverity; isResolved?: boolean; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.severity) where.severity = query.severity;
    if (query.isResolved !== undefined) where.isResolved = query.isResolved;

    const [total, items] = await Promise.all([
      this.prisma.securityEvent.count({ where }),
      this.prisma.securityEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Resolves a security event with resolution documentation.
   */
  async resolveEvent(id: string, dto: ResolveSecurityEventDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const existing = await this.prisma.securityEvent.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Security event ${id} not found`);

    const updated = await this.prisma.securityEvent.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: actor.userId,
        resolutionNotes: dto.resolutionNotes,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SECURITY_EVENT_RESOLVED',
      entityType: 'SECURITY_EVENT',
      entityId: id,
      metadata: { eventType: existing.eventType, resolutionNotes: dto.resolutionNotes },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  /**
   * Lists active platform sessions.
   */
  async findActiveSessions() {
    return this.prisma.platformSession.findMany({
      where: {
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }

  /**
   * Revokes an active platform session.
   */
  async revokeSession(sessionId: string, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const session = await this.prisma.platformSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);

    const updated = await this.prisma.platformSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'SESSION_REVOKED',
      entityType: 'PLATFORM_SESSION',
      entityId: sessionId,
      metadata: { targetUserId: session.userId },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  /**
   * Records a new security event (e.g. failed admin logins, anomalous token requests).
   */
  async recordSecurityEvent(data: {
    eventType: string;
    severity: SecuritySeverity;
    actorId?: string;
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
  }) {
    const event = await this.prisma.securityEvent.create({
      data: {
        eventType: data.eventType,
        severity: data.severity,
        actorId: data.actorId || null,
        ipAddress: data.ipAddress || null,
        userAgent: data.userAgent || null,
        details: data.details || {},
      },
    });

    // Alert for CRITICAL incidents
    if (data.severity === SecuritySeverity.CRITICAL) {
      await this.emailService.sendPlatformSecurityAlert(
        `Critical Security Event: ${data.eventType}`,
        `A critical security incident has been triggered from IP: ${data.ipAddress || 'Unknown'}. Please review immediately.`,
      );
    }

    return event;
  }
}
