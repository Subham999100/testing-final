// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformTokenService (Immutable Ledger Mechanics)
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformTokenService } from './platform-token.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { BadRequestException } from '@nestjs/common';
import { TokenTransactionType, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformTokenService', () => {
  let service: PlatformTokenService;
  let prisma: any;
  let auditService: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_admin',
    email: 'superadmin@clyptus.platform',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.PLATFORM_SUPER_ADMIN,
  };

  beforeEach(async () => {
    prisma = {
      tokenPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      organisation: {
        findUnique: jest.fn(),
      },
      organisationTokenBalance: {
        create: jest.fn(),
        update: jest.fn(),
      },
      tokenTransaction: {
        create: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformTokenService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PlatformTokenService>(PlatformTokenService);
  });

  it('should atomically credit tokens, update balance, and write ledger entry', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_acme',
      tokenBalance: {
        balance: 500,
        allocatedTokens: 500,
        consumedTokens: 0,
        reservedTokens: 0,
      },
    });

    prisma.organisationTokenBalance.update.mockResolvedValue({
      balance: 1500,
      allocatedTokens: 1500,
    });

    prisma.tokenTransaction.create.mockResolvedValue({
      id: 'tx_ledger_1',
      balanceBefore: 500,
      balanceAfter: 1500,
      amount: 1000,
    });

    const result = await service.adjustTokens(
      {
        organisationId: 'org_acme',
        type: TokenTransactionType.ALLOCATION,
        amount: 1000,
        reason: 'Monthly plan grant renewal',
      },
      mockActor,
    );

    expect(result.ledgerEntry).toBeDefined();
    expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organisationId: 'org_acme',
        amount: 1000,
        balanceBefore: 500,
        balanceAfter: 1500,
        type: TokenTransactionType.ALLOCATION,
      }),
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'TOKEN_ADJUSTMENT_EXECUTED',
        entityId: 'tx_ledger_1',
      }),
    );
  });

  it('should reject debit adjustments that would drop balance below zero', async () => {
    prisma.organisation.findUnique.mockResolvedValue({
      id: 'org_broke',
      tokenBalance: {
        balance: 100,
        allocatedTokens: 100,
        consumedTokens: 0,
      },
    });

    await expect(
      service.adjustTokens(
        {
          organisationId: 'org_broke',
          type: TokenTransactionType.ADJUSTMENT,
          amount: -500, // Exceeds balance of 100
          reason: 'Manual clawback',
        },
        mockActor,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
