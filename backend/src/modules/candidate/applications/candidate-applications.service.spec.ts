// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateApplicationsService
// ============================================================

import { ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ApplicationStage, JobStatus, Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CandidateApplicationsService } from './candidate-applications.service';

describe('CandidateApplicationsService', () => {
  let service: CandidateApplicationsService;
  let prisma: any;
  let auditService: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const mockJob = {
    id: 'job_1',
    organisationId: 'org_1',
    title: 'Frontend Engineer',
    location: 'Hyderabad',
    status: JobStatus.PUBLISHED,
    deadline: null,
  };

  const mockUser = {
    id: 'usr_cand_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    candidateProfile: {
      id: 'prof_cand_1',
      phone: '9876543210',
      headline: 'Frontend Engineer',
      location: 'Hyderabad',
      experienceYears: 4,
      currentCompany: 'Tech Ltd',
      skills: ['React', 'CSS'],
      resumeFileName: 'resume.pdf',
      resumeStorageKey: 'key_1',
    },
  };

  const mockAtsCandidate = {
    id: 'cand_ats_1',
    organisationId: 'org_1',
    userId: 'usr_cand_1',
    email: 'hema.candidate@example.com',
  };

  const mockApplication = {
    id: 'app_1',
    organisationId: 'org_1',
    jobId: 'job_1',
    candidateId: 'cand_ats_1',
    stage: ApplicationStage.APPLIED,
    createdAt: new Date(),
    job: mockJob,
    history: [
      {
        id: 'hist_1',
        fromStage: null,
        toStage: ApplicationStage.APPLIED,
        createdAt: new Date(),
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      job: {
        findUnique: jest.fn().mockResolvedValue(mockJob),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(mockUser),
      },
      candidate: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockAtsCandidate),
        update: jest.fn().mockResolvedValue(mockAtsCandidate),
      },
      application: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockApplication),
        findMany: jest.fn().mockResolvedValue([mockApplication]),
        findFirst: jest.fn().mockResolvedValue(mockApplication),
      },
      organisation: {
        findUnique: jest.fn().mockResolvedValue({ id: 'org_1', name: 'Org Alpha' }),
        findMany: jest.fn().mockResolvedValue([{ id: 'org_1', name: 'Org Alpha' }]),
      },
      candidateProfile: {
        findUnique: jest.fn().mockResolvedValue({ id: 'prof_cand_1', resumeFileName: 'resume.pdf' }),
      },
      $transaction: jest.fn().mockImplementation((fn: any) => fn(prisma)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CandidateApplicationsService>(CandidateApplicationsService);
  });

  it('should successfully submit an application and bridge all ATS Candidate fields in a transaction (Correction C)', async () => {
    const result = await service.create(mockActor, { jobId: 'job_1' });
    expect(result.id).toBe('app_1');
    expect(result.jobTitle).toBe('Frontend Engineer');
    expect(result.companyName).toBe('Org Alpha');
    expect(result.status).toBe(ApplicationStage.APPLIED);
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(prisma.candidate.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: 'Hema',
        lastName: 'Candidate',
        headline: 'Frontend Engineer',
        location: 'Hyderabad',
        experienceYears: 4,
        skills: ['React', 'CSS'],
        source: 'CANDIDATE_PORTAL',
        resumeUrl: 'key_1',
      }),
    });
    expect(prisma.application.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'CANDIDATE_APPLICATION_SUBMIT' }),
    );
  });

  it('should preserve recruiter-entered fields when linking to an existing candidate by email', async () => {
    const existingRecruiterCandidate = {
      id: 'cand_ats_existing',
      organisationId: 'org_1',
      userId: null,
      email: 'hema.candidate@example.com',
      firstName: 'Hema',
      lastName: 'RecruiterEnteredName',
      headline: 'Recruiter Headline',
      location: null, // empty
      experienceYears: 5,
      currentCompany: 'Existing Co',
      skills: ['Vue'],
      resumeText: 'Original recruiter resume text',
      resumeUrl: null,
    };

    prisma.candidate.findUnique.mockResolvedValue(existingRecruiterCandidate);

    await service.create(mockActor, { jobId: 'job_1' });

    // Should only fill empty fields and connect userId, without overwriting recruiter-entered values
    expect(prisma.candidate.update).toHaveBeenCalledWith({
      where: { id: 'cand_ats_existing' },
      data: expect.objectContaining({
        user: { connect: { id: 'usr_cand_1' } },
        location: 'Hyderabad', // was empty
        resumeUrl: 'key_1', // was empty
      }),
    });

    const updateCallArg = prisma.candidate.update.mock.calls[0][0].data;
    expect(updateCallArg.headline).toBeUndefined(); // preserved recruiter headline
    expect(updateCallArg.experienceYears).toBeUndefined(); // preserved recruiter years
    expect(updateCallArg.resumeText).toBeUndefined(); // preserved recruiter resume text
  });

  it('should catch P2002 unique constraint violations and return ConflictException cleanly (idempotent double-submit)', async () => {
    const p2002Error = new Error('Unique constraint failed');
    (p2002Error as any).code = 'P2002';
    (p2002Error as any).clientVersion = '6.4.0';
    Object.setPrototypeOf(p2002Error, Prisma.PrismaClientKnownRequestError.prototype);

    prisma.application.create.mockRejectedValue(p2002Error);

    await expect(service.create(mockActor, { jobId: 'job_1' })).rejects.toThrow(ConflictException);
  });

  it('should throw ConflictException if candidate already applied to the job', async () => {
    prisma.application.findUnique.mockResolvedValue(mockApplication);
    await expect(service.create(mockActor, { jobId: 'job_1' })).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException if job is not published', async () => {
    prisma.job.findUnique.mockResolvedValue({ ...mockJob, status: JobStatus.CLOSED });
    await expect(service.create(mockActor, { jobId: 'job_1' })).rejects.toThrow(NotFoundException);
  });

  it('should list only applications belonging to the authenticated candidate', async () => {
    const results = await service.list(mockActor);
    expect(results.length).toBe(1);
    expect(results[0].id).toBe('app_1');
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          candidate: {
            userId: mockActor.userId,
          },
        },
      }),
    );
  });

  it('should retrieve a single application with ownership check', async () => {
    const result = await service.get(mockActor, 'app_1');
    expect(result.id).toBe('app_1');
    expect(result.companyName).toBe('Org Alpha');
  });

  it('should throw UnauthorizedException if non-candidate attempts application actions', async () => {
    const nonCandidateActor = { ...mockActor, role: UserRole.RECRUITER };
    await expect(service.list(nonCandidateActor)).rejects.toThrow(UnauthorizedException);
  });
});