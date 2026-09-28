// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Oversees platform token economy, token plans, allocation limits,
// and enforces immutable transaction ledger entries.
//
// Security:
// Only platform administrators with token management permissions
// can create/alter plans or adjust organisation balances.
//
// Business Rules:
// 1. Balances must NEVER be modified directly without a ledger record.
// 2. Adjustments are atomic inside a database transaction.
// 3. Negative balances are prevented during debits.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateTokenPlanDto } from './dto/create-token-plan.dto';
import { UpdateTokenPlanDto } from './dto/update-token-plan.dto';
import { AdjustTokensDto } from './dto/adjust-tokens.dto';
import { UpdateAllocationLimitDto } from './dto/update-allocation-limit.dto';
import { QueryTokenTransactionsDto } from './dto/query-token-transactions.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { TokenTransactionType } from '@prisma/client';

@Injectable()
export class PlatformTokenService {
  private readonly logger = new Logger(PlatformTokenService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  // ------------------------------------------------------------
  // TOKEN PLANS
  // ------------------------------------------------------------

  async findAllPlans(includeInactive = true) {
    const where = includeInactive ? {} : { isActive: true };
    return this.prisma.tokenPlan.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findOnePlan(id: string) {
    const plan = await this.prisma.tokenPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException(`Token plan ${id} not found`);
    return plan;
  }

  async createPlan(dto: CreateTokenPlanDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const existing = await this.prisma.tokenPlan.findUnique({
      where: { code: dto.code },
    });
    if (existing) {
      throw new ConflictException(`Token plan with code '${dto.code}' already exists`);
    }

    const plan = await this.prisma.tokenPlan.create({
      data: {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        tokenAmount: dto.tokenAmount,
        priceCents: dto.priceCents,
        currency: dto.currency || 'USD',
        billingCycle: dto.billingCycle,
        features: dto.features || [],
        sortOrder: dto.sortOrder || 0,
        isActive: true,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'TOKEN_PLAN_CREATED',
      entityType: 'TOKEN_PLAN',
      entityId: plan.id,
      metadata: { code: plan.code, amount: plan.tokenAmount, price: plan.priceCents },
      ipAddress: ip,
      userAgent: ua,
    });

    return plan;
  }

  async updatePlan(id: string, dto: UpdateTokenPlanDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const existing = await this.prisma.tokenPlan.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException(`Token plan ${id} not found`);

    const updated = await this.prisma.tokenPlan.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        tokenAmount: dto.tokenAmount,
        priceCents: dto.priceCents,
        currency: dto.currency,
        billingCycle: dto.billingCycle,
        features: dto.features,
        isActive: dto.isActive,
        sortOrder: dto.sortOrder,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'TOKEN_PLAN_UPDATED',
      entityType: 'TOKEN_PLAN',
      entityId: id,
      metadata: { updatedFields: Object.keys(dto) },
      ipAddress: ip,
      userAgent: ua,
    });

    return updated;
  }

  // ------------------------------------------------------------
  // ATOMIC LEDGER ADJUSTMENTS
  // ------------------------------------------------------------

  async adjustTokens(dto: AdjustTokensDto, actor: AuthenticatedUser, ip?: string, ua?: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: dto.organisationId },
      include: { tokenBalance: true },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${dto.organisationId} not found`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // Upsert balance record if none exists
      let currentBalance = org.tokenBalance;
      if (!currentBalance) {
        currentBalance = await tx.organisationTokenBalance.create({
          data: {
            organisationId: org.id,
            balance: 0,
            allocatedTokens: 0,
            consumedTokens: 0,
            reservedTokens: 0,
          },
        });
      }

      const balanceBefore = currentBalance.balance;
      const balanceAfter = balanceBefore + dto.amount;

      if (balanceAfter < 0) {
        throw new BadRequestException(
          `Insufficient token balance: cannot deduct ${Math.abs(dto.amount)} tokens from current balance of ${balanceBefore}`,
        );
      }

      // Update balance
      const updatedBalance = await tx.organisationTokenBalance.update({
        where: { organisationId: org.id },
        data: {
          balance: balanceAfter,
          allocatedTokens:
            dto.amount > 0
              ? { increment: dto.amount }
              : currentBalance.allocatedTokens,
          consumedTokens:
            dto.amount < 0 && dto.type === TokenTransactionType.CONSUMPTION
              ? { increment: Math.abs(dto.amount) }
              : currentBalance.consumedTokens,
        },
      });

      // Insert immutable transaction ledger entry
      const ledgerEntry = await tx.tokenTransaction.create({
        data: {
          organisationId: org.id,
          actorId: actor.userId,
          type: dto.type,
          amount: dto.amount,
          balanceBefore,
          balanceAfter,
          referenceId: dto.referenceId || null,
          reason: dto.reason,
          metadata: { adjustedByRole: actor.role },
        },
      });

      return { updatedBalance, ledgerEntry };
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'TOKEN_ADJUSTMENT_EXECUTED',
      entityType: 'TOKEN_LEDGER',
      entityId: result.ledgerEntry.id,
      organisationId: org.id,
      metadata: {
        type: dto.type,
        amount: dto.amount,
        balanceBefore: result.ledgerEntry.balanceBefore,
        balanceAfter: result.ledgerEntry.balanceAfter,
        reason: dto.reason,
      },
      ipAddress: ip,
      userAgent: ua,
    });

    return result;
  }

  // ------------------------------------------------------------
  // ALLOCATION LIMITS
  // ------------------------------------------------------------

  async updateAllocationLimit(
    organisationId: string,
    dto: UpdateAllocationLimitDto,
    actor: AuthenticatedUser,
    ip?: string,
    ua?: string,
  ) {
    const org = await this.prisma.organisation.findUnique({ where: { id: organisationId } });
    if (!org) throw new NotFoundException(`Organisation ${organisationId} not found`);

    const limit = await this.prisma.tokenAllocationLimit.upsert({
      where: { organisationId },
      create: {
        organisationId,
        monthlyMaxAllocation: dto.monthlyMaxAllocation || 25000,
        singleTxLimit: dto.singleTxLimit || 10000,
        autoRechargeEnabled: dto.autoRechargeEnabled || false,
        autoRechargeThreshold: dto.autoRechargeThreshold || 500,
        autoRechargeAmount: dto.autoRechargeAmount || 2000,
      },
      update: {
        monthlyMaxAllocation: dto.monthlyMaxAllocation,
        singleTxLimit: dto.singleTxLimit,
        autoRechargeEnabled: dto.autoRechargeEnabled,
        autoRechargeThreshold: dto.autoRechargeThreshold,
        autoRechargeAmount: dto.autoRechargeAmount,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ALLOCATION_LIMIT_UPDATED',
      entityType: 'TOKEN_ALLOCATION_LIMIT',
      entityId: limit.id,
      organisationId,
      metadata: dto as Record<string, any>,
      ipAddress: ip,
      userAgent: ua,
    });

    return limit;
  }

  // ------------------------------------------------------------
  // TRANSACTIONS & USAGE OVERVIEW
  // ------------------------------------------------------------

  async findTransactions(query: QueryTokenTransactionsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.organisationId) where.organisationId = query.organisationId;
    if (query.type) where.type = query.type;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.tokenTransaction.count({ where }),
      this.prisma.tokenTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          organisation: {
            select: { id: true, name: true, slug: true },
          },
          actor: {
            select: { id: true, email: true, firstName: true, lastName: true, role: true },
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

  async getPlatformTokenOverview() {
    const balances = await this.prisma.organisationTokenBalance.aggregate({
      _sum: {
        balance: true,
        allocatedTokens: true,
        consumedTokens: true,
        reservedTokens: true,
      },
    });

    const totalTransactions = await this.prisma.tokenTransaction.count();

    const topConsumingOrgs = await this.prisma.organisationTokenBalance.findMany({
      take: 5,
      orderBy: { consumedTokens: 'desc' },
      include: {
        organisation: {
          select: { id: true, name: true, slug: true, status: true },
        },
      },
    });

    return {
      totalActiveTokens: balances._sum.balance || 0,
      totalTokensAllocated: balances._sum.allocatedTokens || 0,
      totalTokensConsumed: balances._sum.consumedTokens || 0,
      totalTokensReserved: balances._sum.reservedTokens || 0,
      totalLedgerTransactions: totalTransactions,
      topConsumingOrganisations: topConsumingOrgs.map((b) => ({
        organisationId: b.organisationId,
        organisationName: b.organisation.name,
        organisationSlug: b.organisation.slug,
        status: b.organisation.status,
        balance: b.balance,
        consumedTokens: b.consumedTokens,
        allocatedTokens: b.allocatedTokens,
      })),
    };
  }
}
