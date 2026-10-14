import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationStage, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { OrgContext } from '../common/org-context';
import { CandidatesService } from './candidates.service';
import { ApplicationsService } from './applications.service';

describe('Applicant Resume Access & History Actor (FIX 1 & FIX 3)', () => {
  let candidatesService: CandidatesService;
  let applicationsService: ApplicationsService;
  let prisma: any;
  let tokens: any;
  let events: any;

  const mockCtx: OrgContext = {
    userId: 'usr_recruiter_1',
    organisationId: 'org_acme_1',
    organisationName: 'Acme Corp',
    role: UserRole.RECRUITER,
    permissions: ['candidates.read', 'candidates.resume.view', 'applications.read.all'],
    email: 'recruiter@acme.com',
    firstName: 'Priya',
    lastName: 'Sharma',
  };

  beforeEach(async () => {
    prisma = {
      candidate: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      application: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
      },
      candidateNote: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      savedCandidate: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      candidateMessage: {
        count: jest.fn().mockResolvedValue(0),
      },
      aiRun: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      orgSettings: {
        findUnique: jest.fn().mockResolvedValue({ rejectReasonRequired: false }),
      },
      tokenTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      orgMemberProfile: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    tokens = {
      consume: jest.fn().mockResolvedValue({ charged: true }),
    };

    events = {
      audit: jest.fn().mockResolvedValue(undefined),
      emit: jest.fn(),
      notify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        ApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: OrgEventsService, useValue: events },
        { provide: OrgTokenService, useValue: tokens },
      ],
    }).compile();

    candidatesService = module.get<CandidatesService>(CandidatesService);
    applicationsService = module.get<ApplicationsService>(ApplicationsService);
  });

  describe('CandidatesService (FIX 1)', () => {
    const mockCandidate = {
      id: 'cand_123',
      organisationId: 'org_acme_1',
      userId: 'usr_cand_1',
      firstName: 'Jane',
      lastName: 'Applicant',
      email: 'jane@example.com',
      phone: '+919999999999',
      headline: 'Full Stack Engineer',
      location: 'Bengaluru',
      skills: ['React', 'Node'],
      resumeText: 'Sample resume text',
      resumeUrl: 'resumes/cand_123/file.pdf',
      source: 'CANDIDATE_PORTAL',
      createdAt: new Date(),
    };

    it('should treat applicant with at least one application as unlocked for free without token charge', async () => {
      prisma.candidate.findFirst.mockResolvedValue(mockCandidate);
      // Candidate has 1 application in this org
      prisma.application.findMany.mockResolvedValue([
        {
          id: 'app_1',
          organisationId: 'org_acme_1',
          candidateId: 'cand_123',
          stage: ApplicationStage.APPLIED,
          job: { id: 'job_1', title: 'React Dev', status: 'PUBLISHED' },
          createdAt: new Date(),
        },
      ]);

      const result = await candidatesService.get(mockCtx, 'cand_123');

      expect(result.unlocked).toBe(true);
      expect(result.unlockCost).toBe(0);
      expect(result.contact).toEqual({
        email: 'jane@example.com',
        phone: '+919999999999',
        resumeText: 'Sample resume text',
        resumeUrl: 'resumes/cand_123/file.pdf',
      });
    });

    it('should keep sourced candidate without applications token-gated', async () => {
      prisma.candidate.findFirst.mockResolvedValue({
        ...mockCandidate,
        source: 'SOURCED',
      });
      // Zero applications
      prisma.application.findMany.mockResolvedValue([]);

      const result = await candidatesService.get(mockCtx, 'cand_123');

      expect(result.unlocked).toBe(false);
      expect(result.unlockCost).toBe(2);
      expect(result.contact).toBeNull();
    });

    it('should not charge tokens or create token transaction when unlocking candidate who has applied', async () => {
      prisma.candidate.findFirst.mockResolvedValue(mockCandidate);
      prisma.application.count.mockResolvedValue(1);

      const result = await candidatesService.unlock(mockCtx, 'cand_123');

      expect(result.unlocked).toBe(true);
      expect(result.charged).toBe(false);
      expect(tokens.consume).not.toHaveBeenCalled();
      expect(result.contact?.email).toBe('jane@example.com');
      expect(result.contact?.resumeUrl).toBe('resumes/cand_123/file.pdf');
    });

    it('should charge tokens when unlocking sourced candidate without applications', async () => {
      prisma.candidate.findFirst.mockResolvedValue({
        ...mockCandidate,
        source: 'SOURCED',
      });
      prisma.application.count.mockResolvedValue(0);

      const result = await candidatesService.unlock(mockCtx, 'cand_123');

      expect(result.unlocked).toBe(true);
      expect(result.charged).toBe(true);
      expect(tokens.consume).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          feature: 'RESUME_VIEW',
          amount: 2,
        }),
      );
    });
  });

  describe('ApplicationsService (FIX 1 & FIX 3)', () => {
    it('should expose applicant contact and resume on application detail and label history actor as Applicant', async () => {
      prisma.application.findFirst.mockResolvedValue({
        id: 'app_1',
        organisationId: 'org_acme_1',
        jobId: 'job_1',
        candidateId: 'cand_123',
        stage: ApplicationStage.APPLIED,
        candidate: {
          id: 'cand_123',
          userId: 'usr_cand_1',
          firstName: 'Jane',
          lastName: 'Applicant',
          headline: 'Full Stack Engineer',
          skills: ['React'],
          experienceYears: 4,
          location: 'Bengaluru',
          email: 'jane@example.com',
          phone: '+919999999999',
          resumeText: 'Resume content',
          resumeUrl: 'resumes/cand_123/file.pdf',
        },
        job: { id: 'job_1', title: 'React Dev', status: 'PUBLISHED', requiredSkills: [] },
        history: [
          {
            id: 'hist_1',
            fromStage: null,
            toStage: ApplicationStage.APPLIED,
            actorId: 'usr_cand_1', // Candidate self-submitted
            createdAt: new Date(),
          },
        ],
        interviews: [],
        offers: [],
        createdAt: new Date(),
      });

      const result = await applicationsService.get(mockCtx, 'app_1');

      // FIX 1: candidate resume and contact exposed
      expect(result.candidate.contact).toEqual({
        email: 'jane@example.com',
        phone: '+919999999999',
      });
      expect(result.candidate.resumeUrl).toBe('resumes/cand_123/file.pdf');
      expect(result.candidate.resumeText).toBe('Resume content');

      // FIX 3: candidate actorId displays "Applicant"
      expect(result.history[0].actor).toBe('Applicant');
    });
  });
});
