// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateJobsService
// ============================================================

import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmploymentType, JobStatus, OrganisationStatus, WorkMode } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CandidateJobsService } from './candidate-jobs.service';

describe('CandidateJobsService', () => {
  let service: CandidateJobsService;
  let prisma: any;

  const mockJob = {
    id: 'job_1',
    organisationId: 'org_1',
    title: 'Senior Full Stack Engineer',
    description: 'Build modern applications',
    responsibilities: 'Design APIs\nShip features',
    requiredSkills: ['TypeScript', 'React', 'NestJS'],
    preferredSkills: ['PostgreSQL'],
    experienceMin: 3,
    experienceMax: 6,
    salaryMin: 1200000,
    salaryMax: 1800000,
    currency: 'INR',
    location: 'Bengaluru',
    workMode: WorkMode.HYBRID,
    employmentType: EmploymentType.FULL_TIME,
    openings: 2,
    deadline: new Date(Date.now() + 86400000),
    status: JobStatus.PUBLISHED,
    publishedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOrg = {
    id: 'org_1',
    name: 'Clyptus Hiring Partner',
  };

  beforeEach(async () => {
    prisma = {
      job: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([mockJob]),
        findFirst: jest.fn().mockResolvedValue(mockJob),
      },
      organisation: {
        findMany: jest.fn().mockResolvedValue([mockOrg]),
        findUnique: jest.fn().mockResolvedValue(mockOrg),
        findFirst: jest.fn().mockResolvedValue(mockOrg),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateJobsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CandidateJobsService>(CandidateJobsService);
  });

  it('should list published jobs with pagination and company name', async () => {
    const result = await service.list({ page: 1, limit: 10 });
    expect(result.total).toBe(1);
    expect(result.items.length).toBe(1);
    expect(result.items[0].id).toBe('job_1');
    expect(result.items[0].companyName).toBe('Clyptus Hiring Partner');
    expect(result.items[0].workMode).toBe('Hybrid');
    expect(result.items[0].employmentType).toBe('Full-time');
    expect(prisma.job.findMany).toHaveBeenCalled();
  });

  it('should filter jobs by search query and location', async () => {
    await service.list({ search: 'React', location: 'Bengaluru' });
    expect(prisma.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: JobStatus.PUBLISHED,
          organisationId: { in: ['org_1'] },
          location: { contains: 'Bengaluru', mode: 'insensitive' },
        }),
      }),
    );
  });

  it('should return a published job by ID using get and findById', async () => {
    const result = await service.get('job_1');
    expect(result.id).toBe('job_1');
    expect(result.title).toBe('Senior Full Stack Engineer');
    expect(result.companyName).toBe('Clyptus Hiring Partner');

    const result2 = await service.findById('job_1');
    expect(result2.id).toBe('job_1');
    expect(prisma.job.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'job_1',
        status: JobStatus.PUBLISHED,
      },
    });
    expect(prisma.organisation.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'org_1',
        status: OrganisationStatus.ACTIVE,
      },
      select: { name: true },
    });
  });

  it('should throw NotFoundException if job is not found or organisation is not active', async () => {
    prisma.job.findFirst.mockResolvedValue(null);
    await expect(service.get('job_nonexistent')).rejects.toThrow(NotFoundException);
  });
});