// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Job Discovery
// Scoped to published jobs across verified organisations.
// ============================================================

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EmploymentType, JobStatus, Prisma, WorkMode } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { CandidateJobQueryDto } from './candidate-jobs.dto';

export interface FormattedCandidateJob {
  id: string;
  title: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  location: string;
  workMode: 'Remote' | 'Hybrid' | 'On-site';
  employmentType: 'Full-time' | 'Contract' | 'Part-time' | 'Internship' | 'Temporary';
  experience: string;
  salary: string;
  skills: string[];
  postedAt: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  category: string;
  openings: number;
  deadline: string | null;
  status: string;
}

export interface CandidateJobListResult {
  items: FormattedCandidateJob[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function formatWorkMode(mode: WorkMode): 'Remote' | 'Hybrid' | 'On-site' {
  switch (mode) {
    case WorkMode.REMOTE:
      return 'Remote';
    case WorkMode.HYBRID:
      return 'Hybrid';
    default:
      return 'On-site';
  }
}

function formatEmploymentType(
  type: EmploymentType,
): 'Full-time' | 'Contract' | 'Part-time' | 'Internship' | 'Temporary' {
  switch (type) {
    case EmploymentType.CONTRACT:
      return 'Contract';
    case EmploymentType.PART_TIME:
      return 'Part-time';
    case EmploymentType.INTERNSHIP:
      return 'Internship';
        default:
      return 'Full-time';
  }
}

function formatExperience(min: number | null, max: number | null): string {
  if (min != null && max != null) return `${min}-${max} yrs`;
  if (min != null) return `${min}+ yrs`;
  if (max != null) return `Up to ${max} yrs`;
  return 'Not specified';
}

function formatSalary(min: number | null, max: number | null, currency = 'INR'): string {
  if (min == null && max == null) return 'Competitive';
  const symbol = currency === 'INR' ? '\u20B9' : '$';
  const formatNum = (num: number) => {
    if (num >= 100_000) return `${(num / 100_000).toFixed(1)} LPA`;
    return num.toLocaleString();
  };
  if (min != null && max != null) return `${symbol}${formatNum(min)} - ${symbol}${formatNum(max)}`;
  if (min != null) return `${symbol}${formatNum(min)}+`;
  return `Up to ${symbol}${formatNum(max!)}`;
}

@Injectable()
export class CandidateJobsService {
  private readonly logger = new Logger(CandidateJobsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async list(q: CandidateJobQueryDto): Promise<CandidateJobListResult> {
    const page = Math.max(1, Number(q.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(q.limit) || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.JobWhereInput = {
      status: JobStatus.PUBLISHED,
      OR: [
        { deadline: null },
        { deadline: { gte: new Date() } },
      ],
    };

    if (q.search?.trim()) {
      const term = q.search.trim();
      where.AND = [
        {
          OR: [
            { title: { contains: term, mode: 'insensitive' } },
            { description: { contains: term, mode: 'insensitive' } },
            { requiredSkills: { has: term } },
          ],
        },
      ];
    }

    if (q.location?.trim()) {
      where.location = { contains: q.location.trim(), mode: 'insensitive' };
    }

    if (q.employmentType) {
      where.employmentType = q.employmentType;
    }

    if (q.workMode) {
      where.workMode = q.workMode;
    }

    if (q.experienceMin != null) {
      where.OR = [
        { experienceMin: { lte: q.experienceMin } },
        { experienceMax: { gte: q.experienceMin } },
      ];
    }

    if (q.salaryMin != null) {
      where.salaryMax = { gte: q.salaryMin };
    }

    const orderBy: Prisma.JobOrderByWithRelationInput =
      q.sort === 'salary'
        ? { salaryMax: 'desc' }
        : { publishedAt: 'desc' };

    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    // Retrieve company names in a single batch
    const orgIds = [...new Set(jobs.map((j) => j.organisationId))];
    const orgs = orgIds.length
      ? await this.prisma.organisation.findMany({
          where: { id: { in: orgIds } },
          select: { id: true, name: true },
        })
      : [];
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    const items: FormattedCandidateJob[] = jobs.map((job) =>
      this.formatJob(job, orgMap.get(job.organisationId)),
    );

    return {
      items,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async get(id: string): Promise<FormattedCandidateJob> {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        status: JobStatus.PUBLISHED,
      },
    });

    if (!job) {
      throw new NotFoundException('Job not found or no longer open');
    }

    const org = await this.prisma.organisation.findUnique({
      where: { id: job.organisationId },
      select: { name: true },
    });

    return this.formatJob(job, org?.name);
  }

  private formatJob(job: any, companyName?: string): FormattedCandidateJob {
    const responsibilities = job.responsibilities
      ? job.responsibilities.split('\n').map((s: string) => s.trim()).filter(Boolean)
      : [];

    return {
      id: job.id,
      title: job.title,
      companyId: job.organisationId,
      companyName: companyName || 'Verified Hiring Partner',
      companyLogo: '',
      location: job.location || (job.workMode === WorkMode.REMOTE ? 'Remote' : 'Location Flexible'),
      workMode: formatWorkMode(job.workMode),
      employmentType: formatEmploymentType(job.employmentType),
      experience: formatExperience(job.experienceMin, job.experienceMax),
      salary: formatSalary(job.salaryMin, job.salaryMax, job.currency),
      skills: job.requiredSkills || [],
      postedAt: (job.publishedAt || job.createdAt).toISOString(),
      description: job.description,
      responsibilities,
      requirements: job.requiredSkills || [],
      benefits: [],
      category: job.department || job.industry || 'Engineering',
      openings: job.openings,
      deadline: job.deadline ? job.deadline.toISOString() : null,
      status: job.status,
    };
  }
}