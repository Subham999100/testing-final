// ============================================================
// ORGANISATION PORTAL — Jobs
// Lifecycle: DRAFT → IN_REVIEW → PUBLISHED ⇄ PAUSED → CLOSED → ARCHIVED
// First publish debits JOB_PUBLISH tokens in the same transaction
// as the status change (idempotent per job).
// ============================================================

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, assertCan, can } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { jobScope, pageResult, paging, userSummaries } from '../common/org-helpers';
import {
  ATS_STAGES,
  JOB_ACTION_PERMISSION,
  JOB_EDITABLE,
  JobAction,
  TOKEN_COSTS,
  nextJobStatus,
} from '../common/org-workflows';
import { JobInputDto, JobQueryDto, UpdateJobDto } from './dto';

function cleanList(list?: string[]) {
  return list ? [...new Set(list.map((s) => s.trim()).filter(Boolean))] : undefined;
}

@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  private validateRanges(dto: Partial<JobInputDto>) {
    if (dto.experienceMin != null && dto.experienceMax != null && dto.experienceMin > dto.experienceMax) {
      throw new BadRequestException('Minimum experience cannot exceed maximum experience');
    }
    if (dto.salaryMin != null && dto.salaryMax != null && dto.salaryMin > dto.salaryMax) {
      throw new BadRequestException('Minimum salary cannot exceed maximum salary');
    }
  }

  private toData(dto: Partial<JobInputDto>) {
    return {
      title: dto.title?.trim(),
      description: dto.description,
      responsibilities: dto.responsibilities,
      requiredSkills: cleanList(dto.requiredSkills),
      preferredSkills: cleanList(dto.preferredSkills),
      experienceMin: dto.experienceMin,
      experienceMax: dto.experienceMax,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      currency: dto.currency?.toUpperCase(),
      location: dto.location,
      workMode: dto.workMode,
      employmentType: dto.employmentType,
      education: dto.education,
      industry: dto.industry,
      department: dto.department,
      openings: dto.openings,
      deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      screeningQuestions: cleanList(dto.screeningQuestions),
    };
  }

  async findScoped(ctx: OrgContext, id: string) {
    const job = await this.prisma.job.findFirst({ where: { AND: [{ id }, jobScope(ctx)] }, include: { assignments: true } });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async list(ctx: OrgContext, q: JobQueryDto) {
    const { page, limit, skip } = paging(q);
    const and: Prisma.JobWhereInput[] = [jobScope(ctx)];
    if (q.status) and.push({ status: q.status });
    else and.push({ status: { not: 'ARCHIVED' } });
    if (q.view === 'mine') and.push({ OR: [{ createdById: ctx.userId }, { assignments: { some: { userId: ctx.userId } } }] });
    if (q.view === 'approvals') and.push({ status: 'IN_REVIEW' });
    if (q.search) {
      and.push({
        OR: [
          { title: { contains: q.search, mode: 'insensitive' } },
          { department: { contains: q.search, mode: 'insensitive' } },
          { location: { contains: q.search, mode: 'insensitive' } },
        ],
      });
    }
    if (q.startDate || q.endDate) {
      let start: Date | undefined;
      let endExclusive: Date | undefined;

      if (q.startDate) {
        start = new Date(`${q.startDate}T00:00:00.000Z`);
        if (isNaN(start.getTime())) throw new BadRequestException('Invalid start date');
      }
      if (q.endDate) {
        const parsedEnd = new Date(`${q.endDate}T00:00:00.000Z`);
        if (isNaN(parsedEnd.getTime())) throw new BadRequestException('Invalid end date');
        endExclusive = new Date(parsedEnd.getTime() + 86400000);
      }
      if (start && endExclusive && start >= endExclusive) {
        throw new BadRequestException('Start date cannot be after end date');
      }
      and.push({
        createdAt: {
          ...(start ? { gte: start } : {}),
          ...(endExclusive ? { lt: endExclusive } : {}),
        },
      });
    }
    const where = { AND: and };
    const [total, jobs] = await Promise.all([
      this.prisma.job.count({ where }),
      this.prisma.job.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { assignments: { select: { userId: true } }, _count: { select: { applications: true } } },
      }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, jobs.map((j) => j.createdById));
    return pageResult(
      jobs.map((j) => ({
        id: j.id,
        title: j.title,
        status: j.status,
        department: j.department,
        location: j.location,
        workMode: j.workMode,
        employmentType: j.employmentType,
        openings: j.openings,
        applications: j._count.applications,
        createdBy: users.get(j.createdById)?.name ?? '—',
        assigneeIds: j.assignments.map((a) => a.userId),
        publishedAt: j.publishedAt,
        deadline: j.deadline,
        updatedAt: j.updatedAt,
      })),
      total,
      page,
      limit,
    );
  }

  async get(ctx: OrgContext, id: string) {
    const job = await this.findScoped(ctx, id);
    const [stages, users, settings] = await Promise.all([
      this.prisma.application.groupBy({
        by: ['stage'],
        where: { organisationId: ctx.organisationId, jobId: id },
        _count: { _all: true },
      }),
      userSummaries(this.prisma, ctx.organisationId, [job.createdById, job.approvedById, ...job.assignments.map((a) => a.userId)]),
      this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } }),
    ]);
    const stageCounts = Object.fromEntries(ATS_STAGES.map((s) => [s, stages.find((x) => x.stage === s)?._count._all ?? 0]));
    return {
      ...job,
      createdBy: users.get(job.createdById) ?? null,
      approvedBy: job.approvedById ? users.get(job.approvedById) ?? null : null,
      assignees: job.assignments.map((a) => users.get(a.userId)).filter(Boolean),
      stageCounts,
      approvalRequired: settings?.jobApprovalRequired ?? false,
      publishCost: TOKEN_COSTS.JOB_PUBLISH,
      alreadyCharged: !!job.publishedAt,
    };
  }

  async create(ctx: OrgContext, dto: JobInputDto) {
    this.validateRanges(dto);
    const job = await this.prisma.job.create({
      data: { ...this.toData(dto), title: dto.title.trim(), description: dto.description, organisationId: ctx.organisationId, createdById: ctx.userId },
    });
    await this.events.audit(ctx, 'JOB_CREATED', 'JOB', job.id, { title: job.title });
    this.events.emit(ctx.organisationId, 'job.updated', { jobId: job.id });
    return job;
  }

  async update(ctx: OrgContext, id: string, dto: UpdateJobDto) {
    const job = await this.findScoped(ctx, id);
    if (!JOB_EDITABLE.includes(job.status)) throw new BadRequestException(`A ${job.status.toLowerCase()} job cannot be edited`);
    this.validateRanges({ ...job, ...dto } as Partial<JobInputDto>);
    const updated = await this.prisma.job.update({ where: { id }, data: this.toData(dto) });
    await this.events.audit(ctx, 'JOB_UPDATED', 'JOB', id, { fields: Object.keys(dto) });
    this.events.emit(ctx.organisationId, 'job.updated', { jobId: id });
    return updated;
  }

  async action(ctx: OrgContext, id: string, action: JobAction, note?: string) {
    assertCan(ctx, JOB_ACTION_PERMISSION[action]);
    const job = await this.findScoped(ctx, id);
    const settings = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    const approvalRequired = settings?.jobApprovalRequired ?? false;
    const next = nextJobStatus(job.status, action, approvalRequired, can(ctx, 'jobs.approve'));
    if (!next) throw new BadRequestException(`Cannot ${action} a job that is ${job.status.replace('_', ' ').toLowerCase()}`);
    if (action === 'reject' && !note?.trim()) throw new BadRequestException('Add a note explaining what needs to change');

    const data: Prisma.JobUpdateInput = { status: next };
    if (action === 'approve') data.approvedById = ctx.userId;
    if (action === 'reject' || action === 'approve') data.reviewNote = note?.trim() || null;
    if (next === 'CLOSED') data.closedAt = new Date();
    if (next === 'PUBLISHED') data.closedAt = null;
    const firstPublish = next === 'PUBLISHED' && !job.publishedAt;
    if (firstPublish) data.publishedAt = new Date();

    const updated = await this.prisma.$transaction(
      async (tx) => {
        const res = await tx.job.updateMany({ where: { id, status: job.status }, data: data as Prisma.JobUpdateManyMutationInput });
        if (!res.count) throw new BadRequestException('The job was changed by someone else. Refresh and try again.');
        if (firstPublish) {
          await this.tokens.consume(
            { organisationId: ctx.organisationId, userId: ctx.userId, role: ctx.role },
            { feature: 'JOB_PUBLISH', amount: TOKEN_COSTS.JOB_PUBLISH, idempotencyKey: `job-publish:${id}`, referenceId: id, reason: `Published job: ${job.title}` },
            tx,
          );
        }
        return tx.job.findUnique({ where: { id } });
      },
      { maxWait: 15000, timeout: 20000 },
    );

    await this.events.audit(ctx, `JOB_${action.toUpperCase()}`, 'JOB', id, { from: job.status, to: next, note });
    this.events.emit(ctx.organisationId, 'job.updated', { jobId: id });
    if (action === 'submit') {
      const approvers = await this.events.membersWithPermission(ctx.organisationId, 'jobs.approve');
      await this.events.notify(ctx.organisationId, approvers, { type: 'job.approval', title: `Job awaiting approval: ${job.title}`, link: `/org/jobs/${id}` }, ctx.userId);
    }
    if (action === 'approve' || action === 'reject') {
      await this.events.notify(
        ctx.organisationId,
        [job.createdById],
        { type: 'job.decision', title: `Your job "${job.title}" was ${action === 'approve' ? 'approved and published' : 'sent back for changes'}`, body: note, link: `/org/jobs/${id}` },
        ctx.userId,
      );
    }
    return updated;
  }

  async duplicate(ctx: OrgContext, id: string) {
    const job = await this.findScoped(ctx, id);
    const copy = await this.prisma.job.create({
      data: {
        organisationId: ctx.organisationId,
        createdById: ctx.userId,
        title: `${job.title} (copy)`.slice(0, 150),
        description: job.description,
        responsibilities: job.responsibilities,
        requiredSkills: job.requiredSkills,
        preferredSkills: job.preferredSkills,
        experienceMin: job.experienceMin,
        experienceMax: job.experienceMax,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        currency: job.currency,
        location: job.location,
        workMode: job.workMode,
        employmentType: job.employmentType,
        education: job.education,
        industry: job.industry,
        department: job.department,
        openings: job.openings,
        screeningQuestions: job.screeningQuestions,
      },
    });
    await this.events.audit(ctx, 'JOB_DUPLICATED', 'JOB', copy.id, { sourceJobId: id });
    return copy;
  }

  async assign(ctx: OrgContext, id: string, userIds: string[]) {
    const job = await this.findScoped(ctx, id);
    const unique = [...new Set(userIds)];
    const members = await this.prisma.orgMemberProfile.findMany({
      where: {
        organisationId: ctx.organisationId,
        status: 'ACTIVE',
        userId: { in: unique },
        user: { role: { in: [UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN] } },
      },
      select: { userId: true },
    });
    if (members.length !== unique.length) throw new ForbiddenException('Assignees must be active recruiters or admins in your organisation');
    const before = job.assignments.map((a) => a.userId);
    await this.prisma.$transaction([
      this.prisma.jobAssignment.deleteMany({ where: { jobId: id, userId: { notIn: unique } } }),
      ...unique
        .filter((u) => !before.includes(u))
        .map((userId) => this.prisma.jobAssignment.create({ data: { organisationId: ctx.organisationId, jobId: id, userId } })),
    ]);
    const added = unique.filter((u) => !before.includes(u));
    await this.events.audit(ctx, 'JOB_ASSIGNED', 'JOB', id, { assignees: unique });
    await this.events.notify(ctx.organisationId, added, { type: 'job.assigned', title: `You were assigned to ${job.title}`, link: `/org/jobs/${id}` }, ctx.userId);
    this.events.emit(ctx.organisationId, 'job.updated', { jobId: id });
    return this.get(ctx, id);
  }
}
