// ============================================================
// ORGANISATION PORTAL — Interviews
// Times are stored in UTC; the UI renders in the viewer's timezone.
// SCHEDULED → (complete) FEEDBACK_PENDING → COMPLETED once every
// interviewer has submitted a scorecard. Also CANCELLED / NO_SHOW.
// ============================================================

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, assertCan, can } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { applicationScope, dateRange, pageResult, paging, userSummaries } from '../common/org-helpers';
import { InterviewAction, nextInterviewStatus } from '../common/org-workflows';
import { ApplicationsService } from './applications.service';
import { FeedbackDto, InterviewInputDto, InterviewQueryDto, RescheduleInterviewDto } from './dto';

@Injectable()
export class InterviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly applications: ApplicationsService,
  ) {}

  private visible(ctx: OrgContext): Prisma.InterviewWhereInput {
    return {
      organisationId: ctx.organisationId,
      OR: [{ application: applicationScope(ctx) }, { interviewers: { some: { userId: ctx.userId } } }],
    };
  }

  private async findVisible(ctx: OrgContext, id: string) {
    const interview = await this.prisma.interview.findFirst({
      where: { AND: [{ id }, this.visible(ctx)] },
      include: { interviewers: true, feedback: true },
    });
    if (!interview) throw new NotFoundException('Interview not found');
    return interview;
  }

  private async validateInterviewers(ctx: OrgContext, ids: string[]) {
    const unique = [...new Set(ids)];
    if (unique.some((id) => id !== ctx.userId)) assertCan(ctx, 'interviews.assign_interviewer');
    const count = await this.prisma.orgMemberProfile.count({
      where: { organisationId: ctx.organisationId, status: 'ACTIVE', userId: { in: unique } },
    });
    if (count !== unique.length) throw new BadRequestException('Interviewers must be active members of your organisation');
    return unique;
  }

  private parseWhen(value: string) {
    const when = new Date(value);
    if (Number.isNaN(when.getTime())) throw new BadRequestException('Invalid interview time');
    if (when.getTime() < Date.now() - 5 * 60_000) throw new BadRequestException('Interview time must be in the future');
    return when;
  }

  async list(ctx: OrgContext, q: InterviewQueryDto) {
    const { page, limit, skip } = paging(q);
    const and: Prisma.InterviewWhereInput[] = [this.visible(ctx)];
    const range = dateRange(q.from, q.to);
    if (range) and.push({ scheduledAt: range });
    if (q.status) and.push({ status: q.status });
    if (q.mine === 'true') and.push({ interviewers: { some: { userId: ctx.userId } } });
    if (q.applicationId) and.push({ applicationId: q.applicationId });
    const where = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.interview.count({ where }),
      this.prisma.interview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledAt: q.from ? 'asc' : 'desc' },
        include: {
          interviewers: { select: { userId: true } },
          feedback: { select: { authorId: true } },
          application: {
            select: { id: true, stage: true, candidate: { select: { firstName: true, lastName: true } }, job: { select: { id: true, title: true } } },
          },
        },
      }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.flatMap((r) => r.interviewers.map((i) => i.userId)));
    return pageResult(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        scheduledAt: r.scheduledAt,
        durationMinutes: r.durationMinutes,
        mode: r.mode,
        location: r.location,
        status: r.status,
        candidate: `${r.application.candidate.firstName} ${r.application.candidate.lastName}`,
        job: r.application.job,
        applicationId: r.application.id,
        interviewers: r.interviewers.map((i) => users.get(i.userId)).filter(Boolean),
        feedbackCount: r.feedback.length,
        myFeedbackDue:
          r.interviewers.some((i) => i.userId === ctx.userId) &&
          !r.feedback.some((f) => f.authorId === ctx.userId) &&
          ['SCHEDULED', 'FEEDBACK_PENDING'].includes(r.status) &&
          r.scheduledAt <= new Date(),
      })),
      total,
      page,
      limit,
    );
  }

  async get(ctx: OrgContext, id: string) {
    const i = await this.findVisible(ctx, id);
    const app = await this.prisma.application.findUnique({
      where: { id: i.applicationId },
      select: { id: true, stage: true, candidate: { select: { id: true, firstName: true, lastName: true } }, job: { select: { id: true, title: true } } },
    });
    const users = await userSummaries(this.prisma, ctx.organisationId, [
      ...i.interviewers.map((x) => x.userId),
      ...i.feedback.map((f) => f.authorId),
      i.createdById,
    ]);
    return {
      ...i,
      application: { ...app, candidateName: `${app.candidate.firstName} ${app.candidate.lastName}` },
      interviewers: i.interviewers.map((x) => users.get(x.userId) ?? { id: x.userId, name: 'Former member', email: '' }),
      feedback: i.feedback.map((f) => ({ ...f, author: users.get(f.authorId)?.name ?? 'Former member' })),
      createdBy: users.get(i.createdById)?.name ?? '—',
      isInterviewer: i.interviewers.some((x) => x.userId === ctx.userId),
      canGiveFeedback:
        can(ctx, 'interviews.feedback.write') &&
        i.interviewers.some((x) => x.userId === ctx.userId) &&
        !i.feedback.some((f) => f.authorId === ctx.userId) &&
        ['SCHEDULED', 'FEEDBACK_PENDING', 'COMPLETED'].includes(i.status),
    };
  }

  async schedule(ctx: OrgContext, dto: InterviewInputDto) {
    const app = await this.applications.findScoped(ctx, dto.applicationId);
    this.applications.assertStage(app, ['SHORTLISTED', 'INTERVIEW'], 'schedule interviews');
    const when = this.parseWhen(dto.scheduledAt);
    const interviewerIds = await this.validateInterviewers(ctx, dto.interviewerIds);

    const interview = await this.prisma.$transaction(async (tx) => {
      if (app.stage === 'SHORTLISTED') await this.applications.applyStageChange(tx, ctx, app, 'INTERVIEW', 'Interview scheduled', true);
      return tx.interview.create({
        data: {
          organisationId: ctx.organisationId,
          applicationId: app.id,
          title: dto.title.trim(),
          scheduledAt: when,
          durationMinutes: dto.durationMinutes,
          mode: dto.mode,
          location: dto.location,
          notes: dto.notes,
          createdById: ctx.userId,
          interviewers: { create: interviewerIds.map((userId) => ({ userId })) },
        },
      });
    });
    await this.events.audit(ctx, 'INTERVIEW_SCHEDULED', 'INTERVIEW', interview.id, { applicationId: app.id, scheduledAt: when });
    this.events.emit(ctx.organisationId, 'interview.updated', { interviewId: interview.id, applicationId: app.id });
    if (app.stage === 'SHORTLISTED') {
      this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: app.id, jobId: app.jobId, from: 'SHORTLISTED', to: 'INTERVIEW' });
    }
    await this.events.notify(ctx.organisationId, interviewerIds, {
      type: 'interview.assigned',
      title: `You're interviewing: ${dto.title}`,
      body: when.toISOString(),
      link: `/org/interviews/${interview.id}`,
    }, ctx.userId);
    return interview;
  }

  async reschedule(ctx: OrgContext, id: string, dto: RescheduleInterviewDto) {
    const i = await this.findVisible(ctx, id);
    if (i.status !== 'SCHEDULED') throw new BadRequestException('Only scheduled interviews can be changed');
    const data: Prisma.InterviewUpdateInput = {
      title: dto.title?.trim(),
      durationMinutes: dto.durationMinutes,
      mode: dto.mode,
      location: dto.location,
      notes: dto.notes,
    };
    if (dto.scheduledAt) data.scheduledAt = this.parseWhen(dto.scheduledAt);
    let added: string[] = [];
    await this.prisma.$transaction(async (tx) => {
      await tx.interview.update({ where: { id }, data });
      if (dto.interviewerIds) {
        const ids = await this.validateInterviewers(ctx, dto.interviewerIds);
        const before = i.interviewers.map((x) => x.userId);
        added = ids.filter((u) => !before.includes(u));
        await tx.interviewInterviewer.deleteMany({ where: { interviewId: id, userId: { notIn: ids } } });
        for (const userId of added) await tx.interviewInterviewer.create({ data: { interviewId: id, userId } });
      }
    });
    await this.events.audit(ctx, 'INTERVIEW_UPDATED', 'INTERVIEW', id, { fields: Object.keys(dto) });
    this.events.emit(ctx.organisationId, 'interview.updated', { interviewId: id });
    const everyone = [...new Set([...i.interviewers.map((x) => x.userId), ...added])];
    await this.events.notify(ctx.organisationId, everyone, { type: 'interview.assigned', title: `Interview updated: ${dto.title ?? i.title}`, link: `/org/interviews/${id}` }, ctx.userId);
    return this.get(ctx, id);
  }

  async action(ctx: OrgContext, id: string, action: InterviewAction) {
    const i = await this.findVisible(ctx, id);
    const next = nextInterviewStatus(i.status, action);
    if (!next) throw new BadRequestException(`Cannot ${action.replace('_', ' ')} an interview that is ${i.status.toLowerCase()}`);
    const res = await this.prisma.interview.updateMany({ where: { id, status: i.status }, data: { status: next } });
    if (!res.count) throw new ConflictException('The interview was changed by someone else');
    await this.events.audit(ctx, `INTERVIEW_${action.toUpperCase()}`, 'INTERVIEW', id, { from: i.status, to: next });
    this.events.emit(ctx.organisationId, 'interview.updated', { interviewId: id });
    return { id, status: next };
  }

  async feedback(ctx: OrgContext, id: string, dto: FeedbackDto) {
    const i = await this.findVisible(ctx, id);
    if (!i.interviewers.some((x) => x.userId === ctx.userId)) throw new ForbiddenException('Only assigned interviewers can submit feedback');
    if (!['SCHEDULED', 'FEEDBACK_PENDING', 'COMPLETED'].includes(i.status)) throw new BadRequestException('Feedback is closed for this interview');
    if (i.scheduledAt > new Date()) throw new BadRequestException('Feedback opens once the interview has started');
    if (i.feedback.some((f) => f.authorId === ctx.userId)) throw new ConflictException('You already submitted feedback');

    await this.prisma.$transaction(async (tx) => {
      await tx.interviewFeedback.create({
        data: {
          organisationId: ctx.organisationId,
          interviewId: id,
          authorId: ctx.userId,
          rating: dto.rating,
          recommendation: dto.recommendation,
          strengths: dto.strengths,
          concerns: dto.concerns,
          notes: dto.notes,
        },
      });
      const total = await tx.interviewFeedback.count({ where: { interviewId: id } });
      const status = total >= i.interviewers.length ? 'COMPLETED' : 'FEEDBACK_PENDING';
      await tx.interview.update({ where: { id }, data: { status } });
    });
    await this.events.audit(ctx, 'INTERVIEW_FEEDBACK_SUBMITTED', 'INTERVIEW', id, { rating: dto.rating, recommendation: dto.recommendation });
    this.events.emit(ctx.organisationId, 'interview.updated', { interviewId: id });
    return this.get(ctx, id);
  }
}
