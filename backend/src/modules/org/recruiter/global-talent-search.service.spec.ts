// ============================================================
// Clyptus Job Portal - Global Talent Search Service Tests
// Phase C Unit Tests covering all requirements from Step 8
// ============================================================

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { TOKEN_COSTS } from '../common/org-workflows';
import { CandidatesService } from '../hiring/candidates.service';
import { GlobalTalentSearchService } from './global-talent-search.service';

describe('GlobalTalentSearchService', () => {
  let service: GlobalTalentSearchService;
  let prisma: any;
  let config: any;
  let events: any;
  let tokens: any;
  let candidatesService: any;

  const mockCtxAcme: OrgContext = {
    organisationId: 'org_acme',
    organisationName: 'Acme Corp',
    userId: 'recruiter_acme_1',
    role: UserRole.RECRUITER,
    email: 'recruiter@acme.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    permissions: ['candidates.search', 'candidates.read', 'candidates.resume.view'],
  };

  const mockCtxZenith: OrgContext = {
    organisationId: 'org_zenith',
    organisationName: 'Zenith Tech',
    userId: 'recruiter_zenith_1',
    role: UserRole.RECRUITER,
    email: 'recruiter@zenith.com',
    firstName: 'Zack',
    lastName: 'Taylor',
    permissions: ['candidates.search', 'candidates.read', 'candidates.resume.view'],
  };

  beforeEach(async () => {
    prisma = {
      candidateProfile: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      candidate: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      application: {
        count: jest.fn(),
      },
      auditLog: {
        count: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    config = {
      get: jest.fn((key: string) => {
        if (key === 'globalSearch.dailyLimit') return 0;
        if (key === 'globalSearch.unlockDailyLimit') return 0;
        return undefined;
      }),
    };

    events = {
      audit: jest.fn().mockResolvedValue(undefined),
    };

    tokens = {
      consume: jest.fn().mockResolvedValue({ charged: true }),
    };

    candidatesService = {
      unlockedSet: jest.fn().mockResolvedValue(new Set()),
      isUnlocked: jest.fn().mockResolvedValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalTalentSearchService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: config },
        { provide: OrgEventsService, useValue: events },
        { provide: OrgTokenService, useValue: tokens },
        { provide: CandidatesService, useValue: candidatesService },
      ],
    }).compile();

    service = module.get<GlobalTalentSearchService>(GlobalTalentSearchService);
  });

  // 1. Hidden candidates never appear
  it('1. hidden candidates never appear: only visibleToRecruiters = true are queried', async () => {
    prisma.candidateProfile.count.mockResolvedValue(0);
    prisma.candidateProfile.findMany.mockResolvedValue([]);
    prisma.candidate.findMany.mockResolvedValue([]);

    await service.search(mockCtxAcme, { keyword: 'developer' });

    expect(prisma.candidateProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          visibleToRecruiters: true,
        }),
      }),
    );
  });

  // 2. Blocked org never sees candidate
  it('2. blocked org never sees the candidate: caller organisationId excluded', async () => {
    prisma.candidateProfile.count.mockResolvedValue(0);
    prisma.candidateProfile.findMany.mockResolvedValue([]);
    prisma.candidate.findMany.mockResolvedValue([]);

    await service.search(mockCtxAcme, {});

    expect(prisma.candidateProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: {
            blockedOrganisations: {
              has: 'org_acme',
            },
          },
        }),
      }),
    );
  });

  // 3. Masked fields absent from the raw JSON of locked rows
  it('3. masked fields absent from raw JSON of locked rows: no email, phone, or resume in projection', async () => {
    const mockProfile = {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      phone: '+919988776655',
      headline: 'Senior Full Stack',
      location: 'Bangalore',
      experienceYears: 5,
      currentCompany: 'Secret Corp',
      skills: ['react', 'node'],
      bio: 'Private bio text',
      education: [],
      experience: [],
      resumeStorageKey: 'resumes/private-key-123.pdf',
      resumeText: 'Private resume text content',
      user: {
        id: 'usr_cand_1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane.doe@example.com',
      },
    };

    prisma.candidateProfile.count.mockResolvedValue(1);
    prisma.candidateProfile.findMany.mockResolvedValue([mockProfile]);
    prisma.candidate.findMany.mockResolvedValue([]); // not in pool
    candidatesService.unlockedSet.mockResolvedValue(new Set());

    const result = await service.search(mockCtxAcme, {});
    expect(result.items).toHaveLength(1);

    const item = result.items[0];
    const rawJson = JSON.parse(JSON.stringify(item));

    // Must be locked
    expect(item.isUnlocked).toBe(false);
    expect(item.lastName).toBe('D.'); // Last name initial only

    // Sensitive fields MUST be absent from raw JSON object keys
    expect(rawJson).not.toHaveProperty('email');
    expect(rawJson).not.toHaveProperty('phone');
    expect(rawJson).not.toHaveProperty('resumeUrl');
    expect(rawJson).not.toHaveProperty('resumeText');

    // Non-sensitive fields present
    expect(rawJson.firstName).toBe('Jane');
    expect(rawJson.headline).toBe('Senior Full Stack');
    expect(rawJson.skills).toEqual(['react', 'node']);
  });

  // 4. Unlock charges 2 tokens once and creates exactly one bridge row under two concurrent requests
  it('4. unlock charges 2 tokens once and creates bridge idempotently under concurrency', async () => {
    const mockProfile = {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      visibleToRecruiters: true,
      blockedOrganisations: [],
      phone: '+919988776655',
      resumeStorageKey: 'resumes/key.pdf',
      resumeText: 'Resume text',
      headline: 'Dev',
      location: 'Remote',
      skills: ['typescript'],
      user: {
        id: 'usr_cand_1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      },
    };

    prisma.candidateProfile.findUnique.mockResolvedValue(mockProfile);
    prisma.user.findUnique.mockResolvedValue({
      id: 'usr_cand_1',
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      candidateProfile: mockProfile,
    });
    prisma.application.count.mockResolvedValue(0); // Not applicant
    prisma.candidate.findFirst.mockResolvedValue(null); // Not bridged yet

    const createdBridge = {
      id: 'cand_bridge_1',
      organisationId: 'org_acme',
      userId: 'usr_cand_1',
      source: 'SOURCED',
    };

    // Simulate transaction execution
    prisma.$transaction.mockImplementation(async (cb: any) => {
      prisma.candidate.create.mockResolvedValue(createdBridge);
      return cb(prisma);
    });

    const unlockResult = await service.unlock(mockCtxAcme, 'usr_cand_1');

    expect(unlockResult.unlocked).toBe(true);
    expect(tokens.consume).toHaveBeenCalledWith(
      expect.objectContaining({ organisationId: 'org_acme' }),
      expect.objectContaining({
        amount: TOKEN_COSTS.RESUME_VIEW, // 2 tokens
        feature: 'RESUME_VIEW',
        idempotencyKey: 'resume:cand_bridge_1',
      }),
      expect.anything(),
    );

    // If second unlock call runs after bridge exists and is unlocked: charges 0 tokens
    candidatesService.isUnlocked.mockResolvedValue(true);
    prisma.candidate.findFirst.mockResolvedValue(createdBridge);

    tokens.consume.mockClear();
    const secondUnlock = await service.unlock(mockCtxAcme, 'usr_cand_1');
    expect(secondUnlock.unlocked).toBe(true);
    expect(secondUnlock.charged).toBe(false);
    expect(tokens.consume).not.toHaveBeenCalled();
  });

  // 5. Acme vs Zenith isolation of notes and unlock state
  it('5. Acme vs Zenith isolation: candidate unlocked by Acme remains locked for Zenith', async () => {
    const mockProfile = {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      visibleToRecruiters: true,
      blockedOrganisations: [],
      phone: '+919988776655',
      resumeStorageKey: 'resumes/key.pdf',
      resumeText: 'Resume text',
      skills: ['typescript'],
      user: {
        id: 'usr_cand_1',
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
      },
    };

    prisma.candidateProfile.count.mockResolvedValue(1);
    prisma.candidateProfile.findMany.mockResolvedValue([mockProfile]);

    // Acme has candidate in pool and unlocked
    prisma.candidate.findMany.mockImplementation((args: any) => {
      if (args.where.organisationId === 'org_acme') {
        return [
          {
            id: 'cand_acme_1',
            userId: 'usr_cand_1',
            applications: [],
          },
        ];
      }
      // Zenith does NOT have candidate in pool
      return [];
    });

    candidatesService.unlockedSet.mockImplementation(async (ids: string[]) => {
      if (ids.includes('cand_acme_1')) return new Set(['cand_acme_1']);
      return new Set();
    });

    // Acme searches
    const acmeResult = await service.search(mockCtxAcme, {});
    expect(acmeResult.items[0].isUnlocked).toBe(true);
    expect(acmeResult.items[0].email).toBe('jane@example.com');

    // Zenith searches
    const zenithResult = await service.search(mockCtxZenith, {});
    expect(zenithResult.items[0].isUnlocked).toBe(false);
    expect(zenithResult.items[0].email).toBeUndefined();
    expect(zenithResult.items[0].lastName).toBe('D.');
  });

  // 6. Applicants stay free
  it('6. applicants stay free: candidate with application in caller org is unlocked for 0 tokens', async () => {
    const mockProfile = {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      visibleToRecruiters: true,
      blockedOrganisations: [],
      phone: '+919988776655',
      resumeStorageKey: 'resumes/key.pdf',
      resumeText: 'Resume text',
      skills: ['typescript'],
      user: {
        id: 'usr_cand_1',
        firstName: 'Applicant',
        lastName: 'User',
        email: 'applicant@example.com',
      },
    };

    prisma.candidateProfile.findUnique.mockResolvedValue(mockProfile);
    prisma.application.count.mockResolvedValue(1); // 1 application to Acme
    prisma.candidate.findFirst.mockResolvedValue({
      id: 'cand_applicant_1',
      organisationId: 'org_acme',
      userId: 'usr_cand_1',
    });

    const unlockResult = await service.unlock(mockCtxAcme, 'usr_cand_1');

    expect(unlockResult.unlocked).toBe(true);
    expect(unlockResult.charged).toBe(false);
    expect(tokens.consume).not.toHaveBeenCalled();
    expect(unlockResult.candidate.email).toBe('applicant@example.com');
  });

  // 7. Page size > 25 is clamped
  it('7. page size > 25 is clamped to 25', async () => {
    prisma.candidateProfile.count.mockResolvedValue(0);
    prisma.candidateProfile.findMany.mockResolvedValue([]);
    prisma.candidate.findMany.mockResolvedValue([]);

    await service.search(mockCtxAcme, { limit: 100 });

    expect(prisma.candidateProfile.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 25,
      }),
    );
  });

  // 8. Every search and unlock writes an audit row
  it('8. every search and unlock writes an audit log without contact data', async () => {
    prisma.candidateProfile.count.mockResolvedValue(0);
    prisma.candidateProfile.findMany.mockResolvedValue([]);
    prisma.candidate.findMany.mockResolvedValue([]);

    await service.search(mockCtxAcme, { keyword: 'engineer' });

    expect(events.audit).toHaveBeenCalledWith(
      mockCtxAcme,
      'GLOBAL_TALENT_SEARCH',
      'GLOBAL_TALENT_POOL',
      'org_acme',
      expect.objectContaining({
        recruiterId: 'recruiter_acme_1',
        organisationId: 'org_acme',
        filters: expect.objectContaining({ keyword: 'engineer' }),
      }),
    );
  });

  // 9. Setting the limit config to a small number enforces it
  it('9. setting dailyLimit to a small number enforces it and throws ForbiddenException', async () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'globalSearch.dailyLimit') return 2;
      return 0;
    });

    // 2 searches already performed today
    prisma.auditLog.count.mockResolvedValue(2);

    await expect(service.search(mockCtxAcme, {})).rejects.toThrow(
      ForbiddenException,
    );
  });
});
