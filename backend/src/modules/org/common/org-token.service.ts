// ============================================================
// ORGANISATION PORTAL
// Token wallet, member allocations and the append-only ledger.
//
// Concurrency rule: every balance mutation first takes a row lock
// on the organisation wallet (SELECT ... FOR UPDATE) inside a DB
// transaction, so checks and writes are serialised per org and a
// balance can never go negative or be double spent.
// Idempotency: every ledger write carries a unique key; replays
// return the original result instead of charging again.
// ============================================================

import {
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, isOwner } from './org-context';
import { OrgEventsService } from './org-events.service';
import { canManageRole, OrgRole } from './org-permissions';
import { TOKEN_COSTS, checkAllocation, checkConsumption } from './org-workflows';
import { pageResult, paging, userSummaries } from './org-helpers';

type Tx = Prisma.TransactionClient;
const TX_OPTIONS = { maxWait: 15000, timeout: 20000 };

export interface Spender {
  organisationId: string;
  userId: string;
  role: OrgRole;
}

export interface ConsumeInput {
  feature: string;
  amount: number;
  idempotencyKey: string;
  referenceId?: string;
  reason?: string;
}

export interface ConsumeResult {
  charged: boolean;
  balanceBefore: number;
  balanceAfter: number;
}

@Injectable()
export class OrgTokenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
  ) {}

  // ---------------- internals ----------------

  private async lockWallet(tx: Tx, organisationId: string): Promise<number> {
    await tx.$executeRaw`
      INSERT INTO "organisation_token_balances" ("id", "organisationId", "updatedAt")
      VALUES (${randomUUID()}, ${organisationId}, NOW())
      ON CONFLICT ("organisationId") DO NOTHING`;
    const rows = await tx.$queryRaw<{ balance: number }[]>`
      SELECT "balance" FROM "organisation_token_balances"
      WHERE "organisationId" = ${organisationId} FOR UPDATE`;
    return rows[0]?.balance ?? 0;
  }

  private async outstanding(tx: Tx | PrismaService, organisationId: string): Promise<number> {
    const rows = await tx.$queryRaw<{ total: number }[]>`
      SELECT COALESCE(SUM("allocated" - "consumed"), 0)::int AS total
      FROM "token_allocations" WHERE "organisationId" = ${organisationId}`;
    return rows[0]?.total ?? 0;
  }

  private insufficient(message: string): HttpException {
    return new HttpException({ message, error: 'INSUFFICIENT_TOKENS' }, HttpStatus.PAYMENT_REQUIRED);
  }

  private async afterBalanceChange(organisationId: string, before: number, after: number) {
    this.events.emit(organisationId, 'token.balance_changed', { balance: after });
    const settings = await this.prisma.orgSettings.findUnique({ where: { organisationId } });
    const threshold = settings?.lowBalanceThreshold ?? 200;
    if (before >= threshold && after < threshold) {
      const owners = await this.events.membersWithPermission(organisationId, 'tokens.purchase');
      await this.events.notify(organisationId, owners, {
        type: 'tokens.low_balance',
        title: 'Token balance is running low',
        body: `Only ${after} tokens remain. Buy more to avoid interruptions.`,
        link: '/org/billing',
      });
    }
  }

  // ---------------- spending ----------------

  /** Charges tokens once per idempotency key. Pass `tx` to join a caller's transaction. */
  async consume(spender: Spender, input: ConsumeInput, tx?: Tx): Promise<ConsumeResult> {
    const { organisationId, userId } = spender;
    const run = async (t: Tx): Promise<ConsumeResult> => {
      const existing = await t.tokenTransaction.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) {
        if (existing.organisationId !== organisationId) throw new ForbiddenException('Invalid idempotency key');
        return { charged: false, balanceBefore: existing.balanceBefore, balanceAfter: existing.balanceAfter };
      }
      const balance = await this.lockWallet(t, organisationId);
      const outstanding = await this.outstanding(t, organisationId);
      const owner = spender.role === UserRole.ORGANISATION_SUPER_ADMIN;
      const alloc = owner
        ? null
        : await t.tokenAllocation.findUnique({ where: { organisationId_userId: { organisationId, userId } } });
      const error = checkConsumption({
        actorIsOwner: owner,
        walletBalance: balance,
        outstandingAllocations: outstanding,
        actorRemaining: alloc ? alloc.allocated - alloc.consumed : 0,
        amount: input.amount,
      });
      if (error) throw this.insufficient(error);

      if (!owner) {
        await t.tokenAllocation.update({ where: { id: alloc.id }, data: { consumed: { increment: input.amount } } });
        await t.memberTokenEntry.create({
          data: {
            organisationId,
            userId,
            actorId: userId,
            type: 'CONSUME',
            amount: input.amount,
            reason: input.reason ?? input.feature,
            referenceId: input.referenceId,
          },
        });
      }
      await t.organisationTokenBalance.update({
        where: { organisationId },
        data: { balance: { decrement: input.amount }, consumedTokens: { increment: input.amount } },
      });
      await t.tokenTransaction.create({
        data: {
          organisationId,
          actorId: userId,
          type: 'CONSUMPTION',
          amount: -input.amount,
          balanceBefore: balance,
          balanceAfter: balance - input.amount,
          referenceId: input.referenceId,
          reason: input.reason ?? input.feature,
          idempotencyKey: input.idempotencyKey,
          metadata: { feature: input.feature, userId, fromAllocation: !owner },
        },
      });
      return { charged: true, balanceBefore: balance, balanceAfter: balance - input.amount };
    };

    const result = tx ? await run(tx) : await this.prisma.$transaction(run, TX_OPTIONS);
    if (result.charged) void this.afterBalanceChange(organisationId, result.balanceBefore, result.balanceAfter);
    return result;
  }

  /** Reserve → (run external work) → commit or release. Used by AI features. */
  async reserve(spender: Spender, feature: string, amount: number, referenceId?: string) {
    const key = randomUUID();
    return this.prisma.$transaction(async (t) => {
      await this.consume(spender, { feature, amount, idempotencyKey: `reserve:${key}`, referenceId, reason: `${feature} (reserved)` }, t);
      return t.tokenReservation.create({
        data: {
          organisationId: spender.organisationId,
          userId: spender.userId,
          feature,
          amount,
          fromAllocation: spender.role !== UserRole.ORGANISATION_SUPER_ADMIN,
          idempotencyKey: key,
          referenceId,
        },
      });
    }, TX_OPTIONS);
  }

  async commit(reservationId: string) {
    await this.prisma.tokenReservation.updateMany({ where: { id: reservationId, status: 'HELD' }, data: { status: 'COMMITTED' } });
  }

  async release(reservationId: string) {
    const result = await this.prisma.$transaction(async (t) => {
      const r = await t.tokenReservation.findUnique({ where: { id: reservationId } });
      if (!r) throw new NotFoundException('Reservation not found');
      const balance = await this.lockWallet(t, r.organisationId);
      const flipped = await t.tokenReservation.updateMany({ where: { id: r.id, status: 'HELD' }, data: { status: 'RELEASED' } });
      if (!flipped.count) return null;
      if (r.fromAllocation) {
        await t.tokenAllocation.update({
          where: { organisationId_userId: { organisationId: r.organisationId, userId: r.userId } },
          data: { consumed: { decrement: r.amount } },
        });
        await t.memberTokenEntry.create({
          data: { organisationId: r.organisationId, userId: r.userId, actorId: r.userId, type: 'REFUND', amount: r.amount, reason: `${r.feature} refund`, referenceId: r.referenceId },
        });
      }
      await t.organisationTokenBalance.update({
        where: { organisationId: r.organisationId },
        data: { balance: { increment: r.amount }, consumedTokens: { decrement: r.amount } },
      });
      await t.tokenTransaction.create({
        data: {
          organisationId: r.organisationId,
          actorId: r.userId,
          type: 'REFUND',
          amount: r.amount,
          balanceBefore: balance,
          balanceAfter: balance + r.amount,
          referenceId: r.referenceId,
          reason: `${r.feature} failed — reservation released`,
          idempotencyKey: `release:${r.id}`,
          metadata: { feature: r.feature, userId: r.userId, fromAllocation: r.fromAllocation },
        },
      });
      return { organisationId: r.organisationId, balanceAfter: balance + r.amount };
    }, TX_OPTIONS);
    if (result) this.events.emit(result.organisationId, 'token.balance_changed', { balance: result.balanceAfter });
  }

  /** Credits purchased tokens. Only called from the verified payment webhook. */
  async credit(tx: Tx, organisationId: string, tokens: number, idempotencyKey: string, referenceId: string, reason: string) {
    const existing = await tx.tokenTransaction.findUnique({ where: { idempotencyKey } });
    if (existing) return { credited: false, balanceAfter: existing.balanceAfter };
    const balance = await this.lockWallet(tx, organisationId);
    await tx.organisationTokenBalance.update({
      where: { organisationId },
      data: { balance: { increment: tokens }, allocatedTokens: { increment: tokens } },
    });
    await tx.tokenTransaction.create({
      data: {
        organisationId,
        type: 'PURCHASE',
        amount: tokens,
        balanceBefore: balance,
        balanceAfter: balance + tokens,
        referenceId,
        reason,
        idempotencyKey,
        metadata: { source: 'razorpay' },
      },
    });
    return { credited: true, balanceAfter: balance + tokens };
  }

  // ---------------- allocations ----------------

  async allocate(ctx: OrgContext, targetUserId: string, amount: number, reason?: string) {
    if (targetUserId === ctx.userId) throw new BadRequestException('You cannot allocate tokens to yourself');
    const target = await this.prisma.orgMemberProfile.findUnique({
      where: { userId: targetUserId },
      include: { user: { select: { role: true, firstName: true, lastName: true } } },
    });
    if (!target || target.organisationId !== ctx.organisationId || target.status !== 'ACTIVE') {
      throw new NotFoundException('Member not found');
    }
    if (!canManageRole(ctx.role, ctx.permissions, target.user.role)) {
      throw new ForbiddenException('You cannot allocate tokens to this member');
    }
    const owner = isOwner(ctx);
    const orgId = ctx.organisationId;

    await this.prisma.$transaction(async (t) => {
      const balance = await this.lockWallet(t, orgId);
      const outstanding = await this.outstanding(t, orgId);
      const targetAlloc = await t.tokenAllocation.upsert({
        where: { organisationId_userId: { organisationId: orgId, userId: targetUserId } },
        create: { organisationId: orgId, userId: targetUserId },
        update: {},
      });
      const actorAlloc = owner
        ? null
        : await t.tokenAllocation.findUnique({ where: { organisationId_userId: { organisationId: orgId, userId: ctx.userId } } });
      const error = checkAllocation({
        actorIsOwner: owner,
        walletBalance: balance,
        outstandingAllocations: outstanding,
        actorRemaining: actorAlloc ? actorAlloc.allocated - actorAlloc.consumed : 0,
        targetRemaining: targetAlloc.allocated - targetAlloc.consumed,
        amount,
      });
      if (error) throw new BadRequestException(error);

      const entry = (userId: string, type: 'ALLOCATE' | 'DEALLOCATE', n: number) =>
        t.memberTokenEntry.create({ data: { organisationId: orgId, userId, actorId: ctx.userId, type, amount: n, reason } });

      if (amount > 0) {
        if (!owner) {
          await t.tokenAllocation.update({ where: { id: actorAlloc.id }, data: { allocated: { decrement: amount } } });
          await entry(ctx.userId, 'DEALLOCATE', amount);
        }
        await t.tokenAllocation.update({ where: { id: targetAlloc.id }, data: { allocated: { increment: amount } } });
        await entry(targetUserId, 'ALLOCATE', amount);
      } else {
        const n = -amount;
        await t.tokenAllocation.update({ where: { id: targetAlloc.id }, data: { allocated: { decrement: n } } });
        await entry(targetUserId, 'DEALLOCATE', n);
        if (!owner) {
          await t.tokenAllocation.upsert({
            where: { organisationId_userId: { organisationId: orgId, userId: ctx.userId } },
            create: { organisationId: orgId, userId: ctx.userId, allocated: n },
            update: { allocated: { increment: n } },
          });
          await entry(ctx.userId, 'ALLOCATE', n);
        }
      }
    }, TX_OPTIONS);

    await this.events.audit(ctx, amount > 0 ? 'TOKENS_ALLOCATED' : 'TOKENS_DEALLOCATED', 'TOKEN_ALLOCATION', targetUserId, {
      amount,
      reason,
      target: `${target.user.firstName} ${target.user.lastName}`,
    });
    this.events.emit(orgId, 'token.balance_changed', {});
    if (amount > 0) {
      await this.events.notify(orgId, [targetUserId], {
        type: 'tokens.allocated',
        title: `${amount} tokens were allocated to you`,
        body: reason,
        link: '/org/tokens',
      });
    }
    return this.wallet(ctx);
  }

  /** Returns a removed member's unused allocation to the pool. */
  async reclaim(ctx: OrgContext, userId: string) {
    await this.prisma.$transaction(async (t) => {
      await this.lockWallet(t, ctx.organisationId);
      const a = await t.tokenAllocation.findUnique({ where: { organisationId_userId: { organisationId: ctx.organisationId, userId } } });
      const remaining = a ? a.allocated - a.consumed : 0;
      if (!a || remaining <= 0) return;
      await t.tokenAllocation.update({ where: { id: a.id }, data: { allocated: a.consumed } });
      await t.memberTokenEntry.create({
        data: { organisationId: ctx.organisationId, userId, actorId: ctx.userId, type: 'DEALLOCATE', amount: remaining, reason: 'Member removed' },
      });
    }, TX_OPTIONS);
  }

  // ---------------- reads ----------------

  async wallet(ctx: OrgContext) {
    const orgId = ctx.organisationId;
    const [bal, outstanding, mine, settings] = await Promise.all([
      this.prisma.organisationTokenBalance.findUnique({ where: { organisationId: orgId } }),
      this.outstanding(this.prisma, orgId),
      this.prisma.tokenAllocation.findUnique({ where: { organisationId_userId: { organisationId: orgId, userId: ctx.userId } } }),
      this.prisma.orgSettings.findUnique({ where: { organisationId: orgId } }),
    ]);
    const balance = bal?.balance ?? 0;
    const owner = isOwner(ctx);
    const myRemaining = owner ? balance - outstanding : mine ? mine.allocated - mine.consumed : 0;
    return {
      balance,
      lifetimeReceived: bal?.allocatedTokens ?? 0,
      consumed: bal?.consumedTokens ?? 0,
      allocatedToMembers: outstanding,
      unallocated: balance - outstanding,
      myAllocation: owner
        ? null
        : { allocated: mine?.allocated ?? 0, consumed: mine?.consumed ?? 0, remaining: myRemaining },
      spendable: Math.max(0, myRemaining),
      costs: TOKEN_COSTS,
      lowBalanceThreshold: settings?.lowBalanceThreshold ?? 200,
      confirmThreshold: settings?.tokenConfirmThreshold ?? 20,
    };
  }

  async allocations(ctx: OrgContext) {
    const profiles = await this.prisma.orgMemberProfile.findMany({
      where: { organisationId: ctx.organisationId, status: 'ACTIVE' },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      orderBy: { joinedAt: 'asc' },
    });
    const allocations = await this.prisma.tokenAllocation.findMany({ where: { organisationId: ctx.organisationId } });
    const byUser = new Map(allocations.map((a) => [a.userId, a]));
    return profiles
      .filter((p) => p.user.role !== UserRole.ORGANISATION_SUPER_ADMIN)
      .map((p) => {
        const a = byUser.get(p.userId);
        return {
          userId: p.userId,
          name: `${p.user.firstName} ${p.user.lastName}`,
          email: p.user.email,
          role: p.user.role,
          allocated: a?.allocated ?? 0,
          consumed: a?.consumed ?? 0,
          remaining: (a?.allocated ?? 0) - (a?.consumed ?? 0),
          canManage: canManageRole(ctx.role, ctx.permissions, p.user.role),
        };
      });
  }

  async ledger(ctx: OrgContext, q: { page?: number; limit?: number; type?: string }) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.TokenTransactionWhereInput = { organisationId: ctx.organisationId };
    if (q.type) where.type = q.type as Prisma.EnumTokenTransactionTypeFilter['equals'];
    const [total, rows] = await Promise.all([
      this.prisma.tokenTransaction.count({ where }),
      this.prisma.tokenTransaction.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.actorId));
    return pageResult(
      rows.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        balanceAfter: r.balanceAfter,
        reason: r.reason,
        referenceId: r.referenceId,
        feature: (r.metadata as Record<string, unknown>)?.feature ?? null,
        actor: r.actorId ? users.get(r.actorId) ?? { id: r.actorId, name: 'Platform', email: '' } : { id: null, name: 'Platform', email: '' },
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    );
  }

  async myLedger(ctx: OrgContext, q: { page?: number; limit?: number }) {
    const { page, limit, skip } = paging(q);
    const where = { organisationId: ctx.organisationId, userId: ctx.userId };
    const [total, rows] = await Promise.all([
      this.prisma.memberTokenEntry.count({ where }),
      this.prisma.memberTokenEntry.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return pageResult(rows, total, page, limit);
  }

  /** Net usage (consumption minus refunds) by feature and by member. */
  async usage(ctx: OrgContext) {
    const orgId = ctx.organisationId;
    const [byFeature, byMember] = await Promise.all([
      this.prisma.$queryRaw<{ feature: string; tokens: number }[]>`
        SELECT COALESCE("metadata"->>'feature', 'OTHER') AS feature, (-SUM("amount"))::int AS tokens
        FROM "token_transactions"
        WHERE "organisationId" = ${orgId} AND "type" IN ('CONSUMPTION', 'REFUND')
        GROUP BY 1 ORDER BY 2 DESC`,
      this.prisma.$queryRaw<{ userId: string; tokens: number }[]>`
        SELECT "metadata"->>'userId' AS "userId", (-SUM("amount"))::int AS tokens
        FROM "token_transactions"
        WHERE "organisationId" = ${orgId} AND "type" IN ('CONSUMPTION', 'REFUND') AND "metadata"->>'userId' IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 50`,
    ]);
    const users = await userSummaries(this.prisma, orgId, byMember.map((m) => m.userId));
    return {
      byFeature,
      byMember: byMember.map((m) => ({ ...m, name: users.get(m.userId)?.name ?? 'Former member' })),
    };
  }
}
