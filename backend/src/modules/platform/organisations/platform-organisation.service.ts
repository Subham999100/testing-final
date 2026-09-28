// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Handles platform-level organisation management (creation, oversight,
// activation, suspension, and metadata updates).
//
// Security:
// Only authenticated platform administrators with appropriate permissions
// can execute these operations. Never trust client-provided actor identity.
//
// Integration:
// Organisation module will consume organisation status changes generated here.
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { SuspendOrganisationDto } from './dto/suspend-organisation.dto';
import { QueryOrganisationDto } from './dto/query-organisation.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { OrganisationStatus, TokenTransactionType } from '@prisma/client';

@Injectable()
export class PlatformOrganisationService {
  private readonly logger = new Logger(PlatformOrganisationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves a paginated, filterable list of all platform organisations.
   */
  async findAll(query: QueryOrganisationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    orderBy[sortField] = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.organisation.count({ where }),
      this.prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          metadata: true,
          tokenBalance: true,
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    const transformedItems = items.map((org) => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt,
      tier: org.tier,
      maxRecruiters: org.maxRecruiters,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membersCount: org._count.users,
      tokenBalance: org.tokenBalance?.balance || 0,
      allocatedTokens: org.tokenBalance?.allocatedTokens || 0,
      consumedTokens: org.tokenBalance?.consumedTokens || 0,
      industry: org.metadata?.industry || null,
      companySize: org.metadata?.companySize || null,
      website: org.metadata?.website || null,
    }));

    return {
      data: transformedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single organisation details including balance, metadata, and activity.
   */
  async findOne(id: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id },
      include: {
        metadata: true,
        tokenBalance: true,
        allocationLimit: true,
        _count: {
          select: { users: true, tokenTransactions: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    // Fetch recent activity audit logs
    const recentActivity = await this.prisma.auditLog.findMany({
      where: { organisationId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        actorRole: true,
        createdAt: true,
      },
    });

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt,
      tier: org.tier,
      maxRecruiters: org.maxRecruiters,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membersCount: org._count.users,
      totalTransactions: org._count.tokenTransactions,
      metadata: org.metadata,
      tokenBalance: org.tokenBalance,
      allocationLimit: org.allocationLimit,
      recentActivity,
    };
  }

  /**
   * Creates a new organisation at platform level with initial ledger balances.
   */
  async create(dto: CreateOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    // Check slug and domain uniqueness
    const existingSlug = await this.prisma.organisation.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Organisation with slug '${dto.slug}' already exists`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.organisation.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException(`Organisation with domain '${dto.domain}' already exists`);
      }
    }

    const initialTokens = dto.initialTokenAllocation || 0;

    const created = await this.prisma.$transaction(async (tx) => {
      const org = await tx.organisation.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          domain: dto.domain || null,
          contactEmail: dto.contactEmail,
          contactPhone: dto.contactPhone || null,
          status: OrganisationStatus.ACTIVE,
          tier: dto.tier || 'STANDARD',
          maxRecruiters: dto.maxRecruiters || 5,
          metadata: {
            create: {
              industry: dto.industry || null,
              companySize: dto.companySize || null,
              website: dto.website || null,
            },
          },
          tokenBalance: {
            create: {
              balance: initialTokens,
              allocatedTokens: initialTokens,
              consumedTokens: 0,
              reservedTokens: 0,
            },
          },
          allocationLimit: {
            create: {
              monthlyMaxAllocation: 25000,
              singleTxLimit: 10000,
            },
          },
        },
        include: {
          metadata: true,
          tokenBalance: true,
        },
      });

      // Record initial allocation ledger entry if tokens provided
      if (initialTokens > 0) {
        await tx.tokenTransaction.create({
          data: {
            organisationId: org.id,
            actorId: actor.userId,
            type: TokenTransactionType.ALLOCATION,
            amount: initialTokens,
            balanceBefore: 0,
            balanceAfter: initialTokens,
            reason: 'Initial platform allocation upon organisation creation',
            metadata: { createdByPlatformSuperAdmin: true },
          },
        });
      }

      return org;
    });

    // Record Central Audit Log
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_CREATED',
      entityType: 'ORGANISATION',
      entityId: created.id,
      organisationId: created.id,
      metadata: { name: created.name, slug: created.slug, initialTokens },
      ipAddress,
      userAgent,
    });

    return created;
  }

  /**
   * Updates organisation details and metadata.
   */
  async update(id: string, dto: UpdateOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({
      where: { id },
      include: { metadata: true },
    });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: {
        name: dto.name,
        domain: dto.domain,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        tier: dto.tier,
        maxRecruiters: dto.maxRecruiters,
        metadata: {
          upsert: {
            create: {
              industry: dto.industry,
              companySize: dto.companySize,
              website: dto.website,
            },
            update: {
              industry: dto.industry,
              companySize: dto.companySize,
              website: dto.website,
            },
          },
        },
      },
      include: { metadata: true },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_UPDATED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: { updatedFields: Object.keys(dto) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Suspends an organisation.
   * Destructive operation: enforces mandatory reason, records actor, timestamp, and audit trail.
   */
  async suspend(id: string, dto: SuspendOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    if (existing.status === OrganisationStatus.SUSPENDED) {
      throw new BadRequestException('Organisation is already suspended');
    }

    const suspended = await this.prisma.organisation.update({
      where: { id },
      data: {
        status: OrganisationStatus.SUSPENDED,
        suspensionReason: dto.reason,
        suspendedAt: new Date(),
        suspendedById: actor.userId,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_SUSPENDED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: {
        organisationName: existing.name,
        reason: dto.reason,
        previousStatus: existing.status,
      },
      ipAddress,
      userAgent,
    });

    return suspended;
  }

  /**
   * Activates a suspended organisation.
   */
  async activate(id: string, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    if (existing.status === OrganisationStatus.ACTIVE) {
      throw new BadRequestException('Organisation is already active');
    }

    const activated = await this.prisma.organisation.update({
      where: { id },
      data: {
        status: OrganisationStatus.ACTIVE,
        suspensionReason: null,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_ACTIVATED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: {
        organisationName: existing.name,
        previousStatus: existing.status,
      },
      ipAddress,
      userAgent,
    });

    return activated;
  }

  /**
   * Archives/Deletes an organisation where permitted.
   */
  async remove(id: string, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    const archived = await this.prisma.organisation.update({
      where: { id },
      data: { status: OrganisationStatus.ARCHIVED },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_ARCHIVED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: { organisationName: existing.name },
      ipAddress,
      userAgent,
    });

    return archived;
  }
}
