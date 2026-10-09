// ============================================================
// Clyptus Job Portal - Platform Token Concurrency Integration Test
// Real Database-Backed Concurrency Proof against PostgreSQL
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlatformTokenService } from './platform-token.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { TokenTransactionType, UserRole, OrganisationStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformTokenService (Real PostgreSQL Concurrency Integration)', () => {
  let service: PlatformTokenService;
  let prisma: PrismaService;

  const testOrgId = 'test-org-concurrency-uuid-12345';
  const testOrgSlug = 'test-org-concurrency';
  const testActor: AuthenticatedUser = {
    userId: 'test-admin-actor-uuid',
    email: 'admin@concurrency.test',
    firstName: 'Concurrent',
    lastName: 'Tester',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    permissions: ['*'],
  };

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();

    const mockAuditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformTokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<PlatformTokenService>(PlatformTokenService);

    // Clean up any stale test data
    await prisma.tokenTransaction.deleteMany({ where: { organisationId: testOrgId } });
    await prisma.organisationTokenBalance.deleteMany({ where: { organisationId: testOrgId } });
    await prisma.organisation.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testActor.userId } });

    // Seed test actor user in PostgreSQL
    await prisma.user.create({
      data: {
        id: testActor.userId,
        email: testActor.email,
        passwordHash: 'dummy_hash_for_test',
        firstName: testActor.firstName,
        lastName: testActor.lastName,
        role: UserRole.PLATFORM_SUPER_ADMIN,
        isActive: true,
      },
    });

    // Seed test organisation in PostgreSQL
    await prisma.organisation.create({
      data: {
        id: testOrgId,
        name: 'Concurrency Test Org',
        slug: testOrgSlug,
        contactEmail: 'concurrency@test.clyptus',
        status: OrganisationStatus.ACTIVE,
        tier: 'GROWTH',
      },
    });

    // Seed initial balance = 100
    await prisma.organisationTokenBalance.create({
      data: {
        organisationId: testOrgId,
        balance: 100,
        allocatedTokens: 100,
        consumedTokens: 0,
        reservedTokens: 0,
      },
    });
  });

  afterAll(async () => {
    // Teardown
    await prisma.tokenTransaction.deleteMany({ where: { organisationId: testOrgId } });
    await prisma.organisationTokenBalance.deleteMany({ where: { organisationId: testOrgId } });
    await prisma.organisation.deleteMany({ where: { id: testOrgId } });
    await prisma.user.deleteMany({ where: { id: testActor.userId } });
    await prisma.$disconnect();
  });

  it('Concurrent Credit: 50 concurrent +10 adjustments on PostgreSQL must result in exact balance of 600', async () => {
    const CONCURRENCY = 50;
    const CREDIT_AMOUNT = 10;

    const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
      service.adjustTokens(
        {
          organisationId: testOrgId,
          type: TokenTransactionType.ADJUSTMENT,
          amount: CREDIT_AMOUNT,
          reason: `Concurrent credit batch ${i + 1}`,
        },
        testActor,
        '127.0.0.1',
        'Jest-Integration-Tester',
      ),
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(CONCURRENCY);

    // Verify directly against PostgreSQL row
    const balanceRecord = await prisma.organisationTokenBalance.findUnique({
      where: { organisationId: testOrgId },
    });

    expect(balanceRecord).toBeDefined();
    expect(balanceRecord!.balance).toBe(100 + CONCURRENCY * CREDIT_AMOUNT); // 100 + 500 = 600
    expect(balanceRecord!.allocatedTokens).toBe(100 + CONCURRENCY * CREDIT_AMOUNT);

    // Verify 50 ledger transaction records exist in PostgreSQL
    const transactions = await prisma.tokenTransaction.findMany({
      where: { organisationId: testOrgId, type: TokenTransactionType.ADJUSTMENT },
    });
    expect(transactions).toHaveLength(CONCURRENCY);

    const totalCredited = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    expect(totalCredited).toBe(CONCURRENCY * CREDIT_AMOUNT);
  });

  it('Concurrent Debit: 50 concurrent -10 adjustments on PostgreSQL must return balance to 100', async () => {
    const CONCURRENCY = 50;
    const DEBIT_AMOUNT = -10;

    const promises = Array.from({ length: CONCURRENCY }, (_, i) =>
      service.adjustTokens(
        {
          organisationId: testOrgId,
          type: TokenTransactionType.CONSUMPTION,
          amount: DEBIT_AMOUNT,
          reason: `Concurrent debit batch ${i + 1}`,
        },
        testActor,
        '127.0.0.1',
        'Jest-Integration-Tester',
      ),
    );

    const results = await Promise.all(promises);
    expect(results).toHaveLength(CONCURRENCY);

    // Verify directly against PostgreSQL row
    const balanceRecord = await prisma.organisationTokenBalance.findUnique({
      where: { organisationId: testOrgId },
    });

    expect(balanceRecord!.balance).toBe(100);
    expect(balanceRecord!.consumedTokens).toBe(CONCURRENCY * Math.abs(DEBIT_AMOUNT)); // 500 consumed
  });

  it('Underflow Protection: Attempting to debit 500 when balance is 100 must fail and rollback cleanly', async () => {
    await expect(
      service.adjustTokens(
        {
          organisationId: testOrgId,
          type: TokenTransactionType.CONSUMPTION,
          amount: -500, // Balance is currently 100 -> underflow
          reason: 'Excessive debit test',
        },
        testActor,
      ),
    ).rejects.toThrow(BadRequestException);

    // Verify balance remains unmodified at 100
    const balanceRecord = await prisma.organisationTokenBalance.findUnique({
      where: { organisationId: testOrgId },
    });
    expect(balanceRecord!.balance).toBe(100);
  });
});
