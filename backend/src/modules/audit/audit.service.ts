// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Centralized Audit Logging Service
//
// Security & Compliance:
// - Centralizes all platform-level audit trails.
// - Sanitizes metadata to strictly filter out secrets, tokens,
//   and credentials before persisting.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

export interface AuditRecordDto {
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  organisationId?: string | null;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditQueryDto {
  page?: number;
  limit?: number;
  actorId?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  organisationId?: string;
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  // Blacklist of sensitive keys that MUST never be recorded into audit metadata
  private readonly SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'token',
    'accesstoken',
    'refreshtoken',
    'secret',
    'jwtsecret',
    'apikey',
    'razorpaysecret',
    'stripesecret',
    'cvv',
    'creditcard',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Central entrypoint to record an immutable audit log entry.
   */
  async record(dto: AuditRecordDto): Promise<void> {
    try {
      const sanitizedMeta = this.sanitizeMetadata(dto.metadata || {});

      await this.prisma.auditLog.create({
        data: {
          actorId: dto.actorId || null,
          actorRole: dto.actorRole || 'SYSTEM',
          action: dto.action,
          entityType: dto.entityType,
          entityId: dto.entityId,
          organisationId: dto.organisationId || null,
          metadata: sanitizedMeta,
          ipAddress: dto.ipAddress || null,
          userAgent: dto.userAgent ? dto.userAgent.substring(0, 500) : null,
        },
      });

      this.logger.log(
        `[AUDIT] Action: ${dto.action} on ${dto.entityType}:${dto.entityId} by ${dto.actorRole || 'SYSTEM'} (${dto.actorId || 'anon'})`,
      );
    } catch (err) {
      // Never allow audit logging failure to crash primary business flow, but log critical warning
      this.logger.error(`Failed to record audit log: ${(err as Error).message}`, (err as Error).stack);
    }
  }

  /**
   * Retrieves paginated audit logs for the Platform Super Admin portal.
   */
  async findAuditLogs(query: AuditQueryDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.organisationId) where.organisationId = query.organisationId;

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
            },
          },
          organisation: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
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
   * Recursively strip out sensitive fields before persisting.
   */
  private sanitizeMetadata(data: Record<string, any>): Record<string, any> {
    if (!data || typeof data !== 'object') {
      return {};
    }

    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase().replace(/[-_]/g, '');
      if (this.SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = this.sanitizeMetadata(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
