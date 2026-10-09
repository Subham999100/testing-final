// ============================================================
// ORGANISATION PORTAL — Applications & ATS pipeline
// Every stage change: allowed-transition check → optimistic
// update (WHERE stage = from) → history row → audit → WS event.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Application, ApplicationStage, Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { applicationScope, jobScope, pageResult, paging, userSummaries } from '../common/org-helpers';
import { ATS_STAGES, ATS_TRANSITIONS, canMoveStage } from '../common/org-workflows';
import { ApplicationQueryDto, CreateApplicationDto } from './dto';

type Tx = Prisma.TransactionClient;

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
  ) {}

  async findScoped(ctx: OrgContext, id: string) {
    const app = await this.prisma.application.findFirst({ where: { AND: [{ id }, applicationScope(ctx)] } });
    if (!app) throw new NotFoundException('Application not found');
    return app;
  }

  private async assertActiveMember(ctx: OrgContext, userId: string) {
    const member = await this.prisma.orgMemberProfile.findFirst({
      where: { userId, organisationId: ctx.organisationId, status: 'ACTIVE' },
    });
    if (!member) throw new BadRequestException('Assignee must be an active member of your organisation');
  }

  async list(ctx: OrgContext, q: ApplicationQueryDto) {
    const { page, limit, skip } = paging(q);
    const and: Prisma.ApplicationWhereInput[] = [applicationScope(ctx)];
    if (q.jobId) and.push({ jobId: q.jobId });
    if (q.stage) and.push({ stage: q.stage });
    if (q.assignedToId) and.push({ assignedToId: q.assignedToId === 'me' ? ctx.userId : q.assignedToId });
    if (q.search) {
      const s = q.search.trim();
      and.push({
        OR: [
          { candidate: { firstName: { contains: s, mode: 'insensitive' } } },
          { candidate: { lastName: { contains: s, mode: 'insensitive' } } },
          { job: { title: { contains: s, mode: 'insensitive' } } },
        ],
      });
    }
    const where = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.application.count({ where }),
      this.prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          candidate: { select: { id: true, firstName: true, lastName: true, headline: true } },
          job: { select: { id: true, title: true } },
        },
      }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.assignedToId));
    return pageResult(
      rows.map((a) => ({
        id: a.id,
        stage: a.stage,
        matchScore: a.matchScore,
        candidate: { id: a.candidate.id, name: `${a.candidate.firstName} ${a.candidate.lastName}`, headline: a.candidate.headline },
        job: a.job,
        assignedTo: a.assignedToId ? users.get(a.assignedToId) ?? null : null,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
      })),
      total,
      page,
      limit,
    );
  }

  async pipeline(ctx: OrgContext, jobId: string) {
    const job = await this.prisma.job.findFirst({ where: { AND: [{ id: jobId }, jobScope(ctx)] }, select: { id: true, title: true, status: true } });
    if (!job) throw new NotFoundException('Job not found');
    const [apps, settings] = await Promise.all([
      this.prisma.application.findMany({
        where: { AND: [applicationScope(ctx), { jobId }] },
        take: 500,
        orderBy: { updatedAt: 'desc' },
        include: { candidate: { select: { id: true, firstName: true, lastName: true, headline: true, skills: true, experienceYears: true } } },
      }),
      this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, apps.map((a) => a.assignedToId));
    return {
      job,
      stages: ATS_STAGES,
      transitions: ATS_TRANSITIONS,
      rejectReasonRequired: settings?.rejectReasonRequired ?? true,
      applications: apps.map((a) => ({
        id: a.id,
        stage: a.stage,
        matchScore: a.matchScore,
        updatedAt: a.updatedAt,
        candidate: {
          id: a.candidate.id,
          name: `${a.candidate.firstName} ${a.candidate.lastName}`,
          headline: a.candidate.headline,
          skills: a.candidate.skills.slice(0, 5),
          experienceYears: a.candidate.experienceYears,
        },
        assignedTo: a.assignedToId ? users.get(a.assignedToId) ?? null : null,
      })),
    };
  }

  async create(ctx: OrgContext, dto: CreateApplicationDto) {
    const job = await this.prisma.job.findFirst({ where: { AND: [{ id: dto.jobId }, jobScope(ctx)] } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.status !== 'PUBLISHED') throw new BadRequestException('Candidates can only be added to published jobs');
    const candidate = await this.prisma.candidate.findFirst({ where: { id: dto.candidateId, organisationId: ctx.organisationId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (dto.assignedToId) await this.assertActiveMember(ctx, dto.assignedToId);
    const exists = await this.prisma.application.findUnique({ where: { jobId_candidateId: { jobId: job.id, candidateId: candidate.id } } });
    if (exists) throw new ConflictException('This candidate already applied to this job');

    const app = await this.prisma.$transaction(async (tx) => {
      const created = await tx.application.create({
        data: {
          organisationId: ctx.organisationId,
          jobId: job.id,
          candidateId: candidate.id,
          assignedToId: dto.assignedToId ?? null,
          createdById: ctx.userId,
          source: 'RECRUITER_ADDED',
        },
      });
      await tx.applicationStageHistory.create({
        data: { organisationId: ctx.organisationId, applicationId: created.id, toStage: 'APPLIED', actorId: ctx.userId },
      });
      return created;
    });
    await this.events.audit(ctx, 'APPLICATION_CREATED', 'APPLICATION', app.id, { jobId: job.id, candidateId: candidate.id });
    this.events.emit(ctx.organisationId, 'application.created', { applicationId: app.id, jobId: job.id });
    if (dto.assignedToId) {
      await this.events.notify(ctx.organisationId, [dto.assignedToId], {
        type: 'application.assigned',
        title: `${candidate.firstName} ${candidate.lastName} (${job.title}) was assigned to you`,
        link: `/org/applications/${app.id}`,
      }, ctx.userId);
    }
    return app;
  }

  async get(ctx: OrgContext, id: string) {
    const app = await this.prisma.application.findFirst({
      where: { AND: [{ id }, applicationScope(ctx)] },
      include: {
        candidate: { select: { id: true, firstName: true, lastName: true, headline: true, skills: true, experienceYears: true, location: true } },
        job: { select: { id: true, title: true, status: true, requiredSkills: true } },
        history: { orderBy: { createdAt: 'asc' } },
        interviews: { orderBy: { scheduledAt: 'desc' }, select: { id: true, title: true, scheduledAt: true, status: true, mode: true } },
        offers: { orderBy: { createdAt: 'desc' }, select: { id: true, title: true, status: true, salary: true, currency: true } },
      },
    });
    if (!app) throw new NotFoundException('Application not found');
    const [notes, lastMatch, settings] = await Promise.all([
      this.prisma.candidateNote.findMany({ where: { organisationId: ctx.organisationId, applicationId: id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.aiRun.findFirst({
        where: { organisationId: ctx.organisationId, feature: 'AI_MATCH', status: 'SUCCEEDED', referenceId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, [
      app.assignedToId,
      ...app.history.map((h) => h.actorId),
      ...notes.map((n) => n.authorId),
    ]);
    return {
      id: app.id,
      stage: app.stage,
      rejectReason: app.rejectReason,
      matchScore: app.matchScore,
      match: lastMatch ? { score: app.matchScore, explanation: lastMatch.explanation, at: lastMatch.createdAt } : null,
      candidate: { ...app.candidate, name: `${app.candidate.firstName} ${app.candidate.lastName}` },
      job: app.job,
      assignedTo: app.assignedToId ? users.get(app.assignedToId) ?? null : null,
      allowedMoves: ATS_TRANSITIONS[app.stage],
      rejectReasonRequired: settings?.rejectReasonRequired ?? true,
      history: app.history.map((h) => ({ ...h, actor: users.get(h.actorId)?.name ?? 'Former member' })),
      interviews: app.interviews,
      offers: app.offers,
      notes: notes.map((n) => ({ id: n.id, body: n.body, author: users.get(n.authorId)?.name ?? 'Former member', createdAt: n.createdAt })),
      createdAt: app.createdAt,
    };
  }

  /**
   * Validates and applies a stage change. Shared by manual moves, bulk moves,
   * interview scheduling (→ INTERVIEW) and offer acceptance (→ HIRED).
   */
  async applyStageChange(tx: Tx, ctx: OrgContext, app: Application, to: ApplicationStage, reason?: string, system = false) {
    if (app.stage === to) return app;
    if (!canMoveStage(app.stage, to)) {
      throw new BadRequestException(`Cannot move from ${app.stage.toLowerCase()} to ${to.toLowerCase()}`);
    }
    if (!system) {
      const settings = await tx.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
      if (to === 'REJECTED' && (settings?.rejectReasonRequired ?? true) && !reason?.trim()) {
        throw new BadRequestException('A rejection reason is required');
      }
      if (to === 'HIRED') {
        const accepted = await tx.offer.count({ where: { applicationId: app.id, status: 'ACCEPTED' } });
        if (!accepted) throw new BadRequestException('Record the accepted offer before marking the candidate as hired');
      }
    }
    const res = await tx.application.updateMany({
      where: { id: app.id, organisationId: ctx.organisationId, stage: app.stage },
      data: { stage: to, rejectReason: to === 'REJECTED' ? reason?.trim() ?? null : null },
    });
    if (!res.count) throw new ConflictException('This application was just moved by someone else. Refresh to see the latest stage.');
    await tx.applicationStageHistory.create({
      data: { organisationId: ctx.organisationId, applicationId: app.id, fromStage: app.stage, toStage: to, actorId: ctx.userId, reason: reason?.trim() || null },
    });
    return { ...app, stage: to };
  }

  private async afterMove(ctx: OrgContext, app: Application, from: ApplicationStage, to: ApplicationStage, reason?: string) {
    await this.events.audit(ctx, 'APPLICATION_STAGE_CHANGED', 'APPLICATION', app.id, { from, to, reason });
    this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: app.id, jobId: app.jobId, from, to });
    if (app.assignedToId) {
      await this.events.notify(ctx.organisationId, [app.assignedToId], {
        type: 'application.stage',
        title: `An application moved to ${to.toLowerCase()}`,
        link: `/org/applications/${app.id}`,
      }, ctx.userId);
    }
  }

  async move(ctx: OrgContext, id: string, to: ApplicationStage, reason?: string) {
    const app = await this.findScoped(ctx, id);
    const from = app.stage;
    await this.prisma.$transaction((tx) => this.applyStageChange(tx, ctx, app, to, reason));
    await this.afterMove(ctx, app, from, to, reason);
    return { id, stage: to };
  }

  async bulkMove(ctx: OrgContext, ids: string[], to: ApplicationStage, reason?: string) {
    const moved: string[] = [];
    const failed: { id: string; reason: string }[] = [];
    for (const id of [...new Set(ids)]) {
      try {
        await this.move(ctx, id, to, reason);
        moved.push(id);
      } catch (err) {
        failed.push({ id, reason: (err as Error).message });
      }
    }
    return { moved, failed };
  }

  async assign(ctx: OrgContext, id: string, userId: string) {
    const app = await this.findScoped(ctx, id);
    await this.assertActiveMember(ctx, userId);
    await this.prisma.application.update({ where: { id }, data: { assignedToId: userId } });
    await this.events.audit(ctx, 'APPLICATION_ASSIGNED', 'APPLICATION', id, { from: app.assignedToId, to: userId });
    this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: id, jobId: app.jobId });
    await this.events.notify(ctx.organisationId, [userId], { type: 'application.assigned', title: 'An application was assigned to you', link: `/org/applications/${id}` }, ctx.userId);
    return { id, assignedToId: userId };
  }

  /** Guard used by other services before acting on an application. */
  assertStage(app: Application, allowed: ApplicationStage[], action: string) {
    if (!allowed.includes(app.stage)) {
      throw new ForbiddenException(`You can only ${action} for candidates in ${allowed.map((s) => s.toLowerCase()).join(' or ')} stage`);
    }
  }
}
