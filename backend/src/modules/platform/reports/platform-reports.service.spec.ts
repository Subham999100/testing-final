// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformReportsService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformReportsService } from './platform-reports.service';
import { PrismaService } from '../../../database/prisma.service';
import { ReportTimeframe } from './dto/query-report.dto';
import { UserRole, JobStatus, ApplicationStage, OrganisationStatus } from '@prisma/client';

describe('PlatformReportsService', () => {
  let service: PlatformReportsService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      organisation: {
        count: jest.fn().mockResolvedValue(10),
        groupBy: jest.fn().mockResolvedValue([
          { status: OrganisationStatus.ACTIVE, _count: { id: 8 } },
          { status: OrganisationStatus.SUSPENDED, _count: { id: 2 } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'org-1',
            name: 'Acme Corp',
            slug: 'acme-corp',
            status: OrganisationStatus.ACTIVE,
            tier: 'ENTERPRISE',
            contactEmail: 'admin@acme.com',
            createdAt: new Date('2026-05-01'),
            _count: { users: 5 },
          },
        ]),
      },
      user: {
        count: jest.fn().mockResolvedValue(25),
        groupBy: jest.fn().mockResolvedValue([
          { role: UserRole.RECRUITER, _count: { id: 12 } },
          { role: UserRole.ORGANISATION_ADMIN, _count: { id: 3 } },
          { role: UserRole.CANDIDATE, _count: { id: 10 } },
        ]),
      },
      job: {
        count: jest.fn().mockResolvedValue(50),
        groupBy: jest.fn().mockResolvedValue([
          { status: JobStatus.PUBLISHED, _count: { id: 35 } },
          { status: JobStatus.DRAFT, _count: { id: 10 } },
          { status: JobStatus.CLOSED, _count: { id: 5 } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'job-1',
            title: 'Senior Software Engineer',
            organisationId: 'org-1',
            status: JobStatus.PUBLISHED,
            workMode: 'REMOTE',
            employmentType: 'FULL_TIME',
            openings: 2,
            createdAt: new Date('2026-06-01'),
            _count: { applications: 15 },
          },
        ]),
      },
      application: {
        count: jest.fn().mockResolvedValue(100),
        groupBy: jest.fn().mockResolvedValue([
          { stage: ApplicationStage.APPLIED, _count: { id: 40 } },
          { stage: ApplicationStage.INTERVIEW, _count: { id: 10 } },
          { stage: ApplicationStage.HIRED, _count: { id: 5 } },
        ]),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'app-1',
            createdAt: new Date('2026-06-15'),
          },
        ]),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PlatformReportsService>(PlatformReportsService);
  });

  describe('getOverview', () => {
    it('should aggregate metrics for organisations, users, jobs, applications', async () => {
      const result = await service.getOverview({
        timeframe: ReportTimeframe.LAST_30_DAYS,
      });

      expect(result).toBeDefined();
      expect(result.organisations.total).toBe(10);
      expect(result.users.total).toBe(25);
      expect(result.recruiters.total).toBe(25);
      expect(result.jobs.total).toBe(50);
      expect(result.jobs.active).toBe(50);
      expect(result.applications.total).toBe(100);
      expect(result.trends).toHaveLength(6);
      expect(result.topOrganisations).toHaveLength(1);
      expect(result.topOrganisations[0].name).toBe('Acme Corp');
    });

    it('should respect organisationId filter', async () => {
      await service.getOverview({
        timeframe: ReportTimeframe.LAST_7_DAYS,
        organisationId: 'org-1',
      });

      expect(prisma.job.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organisationId: 'org-1' }),
        }),
      );
      expect(prisma.application.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organisationId: 'org-1' }),
        }),
      );
    });
  });

  describe('exportCsv', () => {
    it('should export overview metrics in RFC 4180 format', async () => {
      const csv = await service.exportCsv({ type: 'overview' });
      expect(csv).toContain('Category,Metric,Value');
      expect(csv).toContain('Organisations,Total Organisations');
      expect(csv).not.toContain('password');
      expect(csv).not.toContain('token');
    });

    it('should export organisations tabular CSV with aggregate counts', async () => {
      const csv = await service.exportCsv({ type: 'organisations' });
      expect(csv).toContain('Organisation ID,Name,Slug,Contact Email,Status,Tier,Recruiters,Jobs,Applications,Created At');
      expect(csv).toContain('Acme Corp');
      expect(csv).not.toContain('secret');
    });

    it('should export jobs tabular CSV', async () => {
      const csv = await service.exportCsv({ type: 'jobs' });
      expect(csv).toContain('Job ID,Title,Organisation ID,Status,Work Mode,Employment Type,Openings,Applications,Created At');
      expect(csv).toContain('Senior Software Engineer');
    });
  });
});
