// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformTokenService
//
// Coverage:
//   - Atomic credit/debit with ledger entry
//   - Underflow rejection
//   - Missing organisation (404)
//   - Auto-creation of missing balance record
//   - Concurrency simulation: N parallel adjustments must all succeed
//   - Audit record written after each adjustment
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformTokenService } from './platform-token.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TokenTransactionType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

// ---------------------------------------------------------------------------
// Helper: build a prisma mock that threads the same object through $transaction
// ---------------------------------------------------------------------------
function buildPrismaMock() {
  const mock: any = {
    tokenPlan: { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    organisation: { findUnique: jest.fn() },
    // NOTE: findUnique is required here because adjustTokens reads the current
    // balance inside the transaction before computing balanceBefore/After.
    organisationTokenBalance: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    tokenTransaction: { create: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    // Pass the same mock as the tx proxy so service tx.* calls resolve correctly
    $transaction: jest.fn().mockImplementation((cb: (tx: any) => any) => cb(mock)),
  };
  return mock;
}

describe('PlatformTokenService', () => {
  let service: PlatformTokenService;
  let prisma: ReturnType<typeof buildPrismaMock>;
  let auditService: { record: jest.Mock };

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_admin',
    email: 'superadmin@clyptus.platform',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.PLATFORM_SUPER_ADMIN,
  };

  beforeEach(async () => {
    prisma = buildPrismaMock();
    auditService = { record: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformTokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PlatformTokenService>(PlatformTokenService);
  });

  // ---------------------------------------------------------------------------
  // 1. Successful credit with ledger entry and audit
  // ---------------------------------------------------------------------------
  it('should atomically credit tokens, update balance, and write ledger entry', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_acme' });
    // New code reads balance separately inside the transaction
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({
      balance: 500,
      allocatedTokens: 500,
      consumedTokens: 0,
      reservedTokens: 0,
    });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 1500, allocatedTokens: 1500 });
    prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx_ledger_1', balanceBefore: 500, balanceAfter: 1500, amount: 1000 });

    const result = await service.adjustTokens(
      { organisationId: 'org_acme', type: TokenTransactionType.ALLOCATION, amount: 1000, reason: 'Monthly plan grant renewal' },
      mockActor,
    );

    expect(result.ledgerEntry).toBeDefined();
    expect(result.ledgerEntry.id).toBe('tx_ledger_1');
    expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organisationId: 'org_acme', amount: 1000, balanceBefore: 500, balanceAfter: 1500, type: TokenTransactionType.ALLOCATION }),
    });
    // Atomic increment must be used — never a computed static value
    expect(prisma.organisationTokenBalance.update).toHaveBeenCalledWith({
      where: { organisationId: 'org_acme' },
      data: expect.objectContaining({ balance: { increment: 1000 } }),
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TOKEN_ADJUSTMENT_EXECUTED', entityId: 'tx_ledger_1', organisationId: 'org_acme' }),
    );
  });

  // ---------------------------------------------------------------------------
  // 2. Underflow rejection (debit > balance)
  // ---------------------------------------------------------------------------
  it('should reject debit adjustments that would drop balance below zero', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_broke' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({ balance: 100, allocatedTokens: 100, consumedTokens: 0, reservedTokens: 0 });

    await expect(
      service.adjustTokens(
        { organisationId: 'org_broke', type: TokenTransactionType.ADJUSTMENT, amount: -500, reason: 'Manual clawback' },
        mockActor,
      ),
    ).rejects.toThrow(BadRequestException);

    // No balance write and no ledger entry on rejection
    expect(prisma.organisationTokenBalance.update).not.toHaveBeenCalled();
    expect(prisma.tokenTransaction.create).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 3. Unknown organisation throws 404
  // ---------------------------------------------------------------------------
  it('should throw NotFoundException when the organisation does not exist', async () => {
    prisma.organisation.findUnique.mockResolvedValue(null);

    await expect(
      service.adjustTokens(
        { organisationId: 'org_ghost', type: TokenTransactionType.ALLOCATION, amount: 100, reason: 'Attempt' },
        mockActor,
      ),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.organisationTokenBalance.update).not.toHaveBeenCalled();
    expect(prisma.tokenTransaction.create).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // 4. Auto-create balance record for new organisations
  // ---------------------------------------------------------------------------
  it('should auto-create a zero balance record when none exists, then apply adjustment', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_new' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue(null); // triggers create path
    prisma.organisationTokenBalance.create.mockResolvedValue({ balance: 0, allocatedTokens: 0, consumedTokens: 0, reservedTokens: 0 });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 200 });
    prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx_new_org', balanceBefore: 0, balanceAfter: 200, amount: 200 });

    const result = await service.adjustTokens(
      { organisationId: 'org_new', type: TokenTransactionType.ALLOCATION, amount: 200, reason: 'First allocation' },
      mockActor,
    );

    expect(prisma.organisationTokenBalance.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ organisationId: 'org_new', balance: 0 }),
    });
    expect(result.ledgerEntry.balanceBefore).toBe(0);
    expect(result.ledgerEntry.balanceAfter).toBe(200);
  });

  // ---------------------------------------------------------------------------
  // 5. CONSUMPTION debit increments consumedTokens counter
  // ---------------------------------------------------------------------------
  it('should increment consumedTokens on a CONSUMPTION type debit', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_consumer' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({ balance: 1000, allocatedTokens: 1000, consumedTokens: 200, reservedTokens: 0 });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 750 });
    prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx_consume', balanceBefore: 1000, balanceAfter: 750, amount: -250 });

    await service.adjustTokens(
      { organisationId: 'org_consumer', type: TokenTransactionType.CONSUMPTION, amount: -250, reason: 'Job board usage' },
      mockActor,
    );

    expect(prisma.organisationTokenBalance.update).toHaveBeenCalledWith({
      where: { organisationId: 'org_consumer' },
      data: expect.objectContaining({ balance: { increment: -250 }, consumedTokens: { increment: 250 } }),
    });
  });

  // ---------------------------------------------------------------------------
  // 6. CONCURRENCY SIMULATION
  //
  //    Problem being proven: Before the fix, adjustTokens read balance, computed
  //    a new value, and wrote it back. Two concurrent requests would both read
  //    balance=100 and both write 110, losing one increment entirely.
  //
  //    Fix: use Prisma { increment } operator so the database engine serializes
  //    the arithmetic. This test proves:
  //      a) All 50 concurrent requests resolve without error
  //      b) Every single DB update used { increment } — not a static value
  //      c) Exactly 50 ledger entries were written
  //      d) Exactly 50 audit records were emitted
  // ---------------------------------------------------------------------------
  it('should handle 50 concurrent +10 adjustments without losing any increment', async () => {
    const CONCURRENCY = 50;
    const AMOUNT = 10;

    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_concurrent' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({ balance: 100, allocatedTokens: 100, consumedTokens: 0, reservedTokens: 0 });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 110 });

    let txCount = 0;
    prisma.tokenTransaction.create.mockImplementation(() => {
      txCount++;
      return Promise.resolve({ id: `tx_concurrent_${txCount}`, balanceBefore: 100, balanceAfter: 110, amount: AMOUNT });
    });

    // Fire all requests simultaneously — simulating true concurrent HTTP requests
    const tasks = Array.from({ length: CONCURRENCY }, () =>
      service.adjustTokens(
        { organisationId: 'org_concurrent', type: TokenTransactionType.ALLOCATION, amount: AMOUNT, reason: 'Concurrent test' },
        mockActor,
      )
    );
    const results = await Promise.all(tasks);

    // All 50 must succeed without throwing
    expect(results).toHaveLength(CONCURRENCY);
    results.forEach((r) => expect(r.ledgerEntry).toBeDefined());

    // DB update must have been called exactly CONCURRENCY times
    expect(prisma.organisationTokenBalance.update).toHaveBeenCalledTimes(CONCURRENCY);

    // CRITICAL: every call must use { increment } — never a raw computed value.
    // This is the guarantee that prevents the read-modify-write race.
    const updateCalls: any[][] = prisma.organisationTokenBalance.update.mock.calls;
    updateCalls.forEach(([args]) => {
      expect(args.data.balance).toEqual({ increment: AMOUNT });
    });

    // Exactly 50 immutable ledger entries must have been written
    expect(txCount).toBe(CONCURRENCY);
    // Exactly 50 audit records — one per adjustment
    expect(auditService.record).toHaveBeenCalledTimes(CONCURRENCY);
  });

  // ---------------------------------------------------------------------------
  // 7. Zero-amount adjustment edge case
  // ---------------------------------------------------------------------------
  it('should allow a zero-amount adjustment without error', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_zero' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({ balance: 0, allocatedTokens: 0, consumedTokens: 0, reservedTokens: 0 });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 0 });
    prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx_zero', balanceBefore: 0, balanceAfter: 0, amount: 0 });

    await expect(
      service.adjustTokens({ organisationId: 'org_zero', type: TokenTransactionType.ADJUSTMENT, amount: 0, reason: 'No-op' }, mockActor)
    ).resolves.toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // 8. Audit is written for every adjustment direction
  // ---------------------------------------------------------------------------
  it('should write an audit record for every successful adjustment regardless of direction', async () => {
    prisma.organisation.findUnique.mockResolvedValue({ id: 'org_audit' });
    prisma.organisationTokenBalance.findUnique.mockResolvedValue({ balance: 500, allocatedTokens: 500, consumedTokens: 0, reservedTokens: 0 });
    prisma.organisationTokenBalance.update.mockResolvedValue({ balance: 400 });
    prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx_audit_debit', balanceBefore: 500, balanceAfter: 400, amount: -100 });

    await service.adjustTokens(
      { organisationId: 'org_audit', type: TokenTransactionType.ADJUSTMENT, amount: -100, reason: 'Audit trail test' },
      mockActor,
    );

    expect(auditService.record).toHaveBeenCalledTimes(1);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'TOKEN_ADJUSTMENT_EXECUTED', organisationId: 'org_audit', metadata: expect.objectContaining({ amount: -100 }) }),
    );
  });
});
