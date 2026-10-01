// ============================================================
// ORGANISATION PORTAL — Dashboard, analytics, audit log, security
// and CSV exports. Every figure is scoped to what the caller may see.
// ============================================================

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationStage, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, assertCan, can } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { applicationScope, dateRange, jobScope, pageResult, paging, toCsv, userSummaries } from '../common/org-helpers';
import { ATS_STAGES } from '../common/org-workflows';
import { AuditQueryDto } from './dto';

const DAY = 86_400_000;

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  private auditWhere(ctx: OrgContext): Prisma.AuditLogWhereInput {
    if (can(ctx, 'audit.read.org')) return { organisationId: ctx.organisationId };
    if (can(ctx, 'audit.read.self')) return { organisationId: ctx.organisationId, actorId: ctx.userId };
    throw new ForbiddenException('Missing permission: audit.read.org or audit.read.self');
  }

  // ---------------- dashboard ----------------

  async overview(ctx: OrgContext) {
    const orgId = ctx.organisationId;
    const canJobs = can(ctx, 'jobs.read.all') || can(ctx, 'jobs.read.assigned');
    const canApps = can(ctx, 'applications.read.all') || can(ctx, 'applications.read.assigned');
    const now = new Date();

    const [jobGroups, stageGroups, upcomingInterviews, feedbackDue, offerGroups, openTasks] = await Promise.all([
      canJobs ? this.prisma.job.groupBy({ by: ['status'], where: jobScope(ctx), _count: { _all: true } }) : [],
      canApps ? this.prisma.application.groupBy({ by: ['stage'], where: applicationScope(ctx), _count: { _all: true } }) : [],
      can(ctx, 'interviews.read')
        ? this.prisma.interview.count({
            where: {
              organisationId: orgId,
              status: 'SCHEDULED',
              scheduledAt: { gte: now, lte: new Date(now.getTime() + 7 * DAY) },
              OR: [{ application: applicationScope(ctx) }, { interviewers: { some: { userId: ctx.userId } } }],
            },
          })
        : 0,
      this.prisma.interview.count({
        where: {
          organisationId: orgId,
          status: { in: ['SCHEDULED', 'FEEDBACK_PENDING'] },
          scheduledAt: { lte: now },
          interviewers: { some: { userId: ctx.userId } },
          feedback: { none: { authorId: ctx.userId } },
        },
      }),
      can(ctx, 'offers.read')
        ? this.prisma.offer.groupBy({ by: ['status'], where: { organisationId: orgId, application: applicationScope(ctx) }, _count: { _all: true } })
        : [],
      can(ctx, 'tasks.use') ? this.prisma.orgTask.count({ where: { organisationId: orgId, assigneeId: ctx.userId, status: 'OPEN' } }) : 0,
    ]);

    const jobs = Object.fromEntries(jobGroups.map((g) => [g.status, g._count._all]));
    const stages = Object.fromEntries(ATS_STAGES.map((s) => [s, stageGroups.find((g) => g.stage === s)?._count._all ?? 0]));
    const offers = Object.fromEntries(offerGroups.map((g) => [g.status, g._count._all]));

    const members = can(ctx, 'members.read')
      ? await this.prisma.orgMemberProfile.findMany({
          where: { organisationId: orgId, status: { in: ['ACTIVE', 'SUSPENDED'] } },
          select: { status: true, user: { select: { role: true } } },
        })
      : [];
    const wallet = can(ctx, 'tokens.read') ? await this.tokens.wallet(ctx) : null;

    // Alerts — each only when the viewer can act on it.
    const alerts: { kind: string; count: number; label: string; link: string }[] = [];
    const push = (kind: string, count: number, label: string, link: string) => count > 0 && alerts.push({ kind, count, label, link });
    if (can(ctx, 'jobs.approve')) {
      push('job_approvals', await this.prisma.job.count({ where: { organisationId: orgId, status: 'IN_REVIEW' } }), 'jobs awaiting approval', '/org/jobs?view=approvals');
    }
    if (can(ctx, 'offers.approve')) {
      push(
        'offer_approvals',
        await this.prisma.offer.count({ where: { organisationId: orgId, status: 'PENDING_APPROVAL', createdById: { not: ctx.userId } } }),
        'offers awaiting approval',
        '/org/offers?status=PENDING_APPROVAL',
      );
    }
    if (can(ctx, 'members.read')) push('suspended', members.filter((m) => m.status === 'SUSPENDED').length, 'suspended members', '/org/members?status=SUSPENDED');
    if (can(ctx, 'billing.read')) {
      push('failed_payments', await this.prisma.orgPayment.count({ where: { organisationId: orgId, status: 'FAILED', createdAt: { gte: new Date(now.getTime() - 30 * DAY) } } }), 'failed payments (30 days)', '/org/billing');
    }
    if (wallet && wallet.balance < wallet.lowBalanceThreshold) push('low_balance', wallet.balance, 'tokens left — balance is low', '/org/tokens');
    if (can(ctx, 'org.security.manage')) {
      push(
        'failed_logins',
        await this.prisma.securityEvent.count({ where: { eventType: 'FAILED_ORG_LOGIN', createdAt: { gte: new Date(now.getTime() - DAY) }, actor: { organisationId: orgId } } }),
        'failed sign-ins in the last 24h',
        '/org/security',
      );
    }
    if (canJobs) {
      const stalled = await this.prisma.job.count({
        where: {
          AND: [
            jobScope(ctx),
            { status: 'PUBLISHED', publishedAt: { lte: new Date(now.getTime() - 14 * DAY) } },
            { applications: { none: { updatedAt: { gte: new Date(now.getTime() - 14 * DAY) } } } },
          ],
        },
      });
      push('stalled_jobs', stalled, 'published jobs with no activity for 14 days', '/org/jobs?status=PUBLISHED');
    }
    push('feedback_due', feedbackDue, 'interview scorecards waiting for you', '/org/interviews?mine=true');
    push('tasks', openTasks, 'open tasks assigned to you', '/org/tasks');

    const recent = can(ctx, 'audit.read.org') || can(ctx, 'audit.read.self')
      ? await this.prisma.auditLog.findMany({
          where: this.auditWhere(ctx),
          orderBy: { createdAt: 'desc' },
          take: 8,
          select: { id: true, action: true, entityType: true, entityId: true, createdAt: true, actor: { select: { firstName: true, lastName: true } } },
        })
      : [];

    return {
      jobs,
      funnel: ATS_STAGES.filter((s) => s !== 'WITHDRAWN').map((s) => ({ stage: s, count: stages[s] })),
      applicationsTotal: Object.values(stages).reduce((a, b) => a + b, 0),
      interviews: { upcoming: upcomingInterviews, feedbackDue },
      offers,
      hires: stages.HIRED,
      members: members.length
        ? {
            orgAdmins: members.filter((m) => m.user.role === UserRole.ORGANISATION_ADMIN && m.status === 'ACTIVE').length,
            recruiters: members.filter((m) => m.user.role === UserRole.RECRUITER && m.status === 'ACTIVE').length,
            suspended: members.filter((m) => m.status === 'SUSPENDED').length,
          }
        : null,
      tokens: wallet ? { balance: wallet.balance, spendable: wallet.spendable, allocatedToMembers: wallet.allocatedToMembers, myAllocation: wallet.myAllocation } : null,
      openTasks,
      alerts,
      recentActivity: recent.map((r) => ({ ...r, actor: r.actor ? `${r.actor.firstName} ${r.actor.lastName}` : 'System' })),
    };
  }

  // ---------------- analytics ----------------

  /** Per-member recruiting stats. Recruiters only ever see their own row. */
  async teamStats(ctx: OrgContext, from?: string, to?: string) {
    const wide = can(ctx, 'analytics.org') || can(ctx, 'analytics.recruiter');
    if (!wide) assertCan(ctx, 'analytics.self');
    const range = dateRange(from, to) ?? { gte: new Date(Date.now() - 90 * DAY) };
    const orgId = ctx.organisationId;
    const profiles = await this.prisma.orgMemberProfile.findMany({
      where: {
        organisationId: orgId,
        status: { not: 'REMOVED' },
        ...(wide ? {} : { userId: ctx.userId }),
        user: { role: { in: [UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN] } },
      },
      include: { user: { select: { firstName: true, lastName: true, role: true } } },
    });
    const ids = profiles.map((p) => p.userId);
    const [jobs, moves, hires, interviews, offers] = await Promise.all([
      this.prisma.job.groupBy({ by: ['createdById'], where: { organisationId: orgId, createdById: { in: ids }, createdAt: range }, _count: { _all: true } }),
      this.prisma.applicationStageHistory.groupBy({ by: ['actorId'], where: { organisationId: orgId, actorId: { in: ids }, createdAt: range, fromStage: { not: null } }, _count: { _all: true } }),
      this.prisma.applicationStageHistory.groupBy({ by: ['actorId'], where: { organisationId: orgId, actorId: { in: ids }, createdAt: range, toStage: 'HIRED' }, _count: { _all: true } }),
      this.prisma.interview.groupBy({ by: ['createdById'], where: { organisationId: orgId, createdById: { in: ids }, createdAt: range }, _count: { _all: true } }),
      this.prisma.offer.groupBy({ by: ['createdById'], where: { organisationId: orgId, createdById: { in: ids }, createdAt: range }, _count: { _all: true } }),
    ]);
    const m = <T extends { _count: { _all: number } }>(rows: T[], key: keyof T) => new Map(rows.map((r) => [r[key] as unknown as string, r._count._all]));
    const [jm, mm, hm, im, om] = [m(jobs, 'createdById'), m(moves, 'actorId'), m(hires, 'actorId'), m(interviews, 'createdById'), m(offers, 'createdById')];
    return {
      range: { from: range.gte ?? null, to: range.lte ?? null },
      members: profiles
        .map((p) => ({
          userId: p.userId,
          name: `${p.user.firstName} ${p.user.lastName}`,
          role: p.user.role,
          jobsCreated: jm.get(p.userId) ?? 0,
          stageMoves: mm.get(p.userId) ?? 0,
          interviewsScheduled: im.get(p.userId) ?? 0,
          offersCreated: om.get(p.userId) ?? 0,
          hires: hm.get(p.userId) ?? 0,
        }))
        .sort((a, b) => b.hires - a.hires || b.stageMoves - a.stageMoves),
    };
  }

  async jobPerformance(ctx: OrgContext) {
    const jobs = await this.prisma.job.findMany({
      where: { AND: [jobScope(ctx), { status: { in: ['PUBLISHED', 'PAUSED', 'CLOSED'] } }] },
      orderBy: { publishedAt: 'desc' },
      take: 20,
      select: { id: true, title: true, status: true, publishedAt: true },
    });
    const groups = jobs.length
      ? await this.prisma.application.groupBy({
          by: ['jobId', 'stage'],
          where: { organisationId: ctx.organisationId, jobId: { in: jobs.map((j) => j.id) } },
          _count: { _all: true },
        })
      : [];
    return jobs.map((j) => {
      const counts = Object.fromEntries(ATS_STAGES.map((s) => [s, groups.find((g) => g.jobId === j.id && g.stage === s)?._count._all ?? 0])) as Record<ApplicationStage, number>;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { ...j, total, ...counts, daysOpen: j.publishedAt ? Math.floor((Date.now() - j.publishedAt.getTime()) / DAY) : null };
    });
  }

  // ---------------- audit ----------------

  async audit(ctx: OrgContext, q: AuditQueryDto) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.AuditLogWhereInput = { ...this.auditWhere(ctx) };
    if (q.action) where.action = { contains: q.action.toUpperCase() };
    if (q.entityType) where.entityType = q.entityType.toUpperCase();
    if (q.actorId && can(ctx, 'audit.read.org')) where.actorId = q.actorId;
    const range = dateRange(q.from, q.to);
    if (range) where.createdAt = range;
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { actor: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
    ]);
    return pageResult(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        actorRole: r.actorRole,
        actor: r.actor ? { id: r.actor.id, name: `${r.actor.firstName} ${r.actor.lastName}`, email: r.actor.email } : null,
        metadata: r.metadata,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
      })),
      total,
      page,
      limit,
    );
  }

  // ---------------- security ----------------

  async security(ctx: OrgContext) {
    const orgId = ctx.organisationId;
    const [sessions, logins, failures] = await Promise.all([
      this.prisma.platformSession.findMany({
        where: { revokedAt: null, expiresAt: { gt: new Date() }, user: { organisationId: orgId } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
      }),
      this.prisma.auditLog.findMany({
        where: { organisationId: orgId, action: { in: ['ORG_LOGIN', 'ORG_LOGOUT', 'PASSWORD_CHANGED'] } },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.securityEvent.findMany({
        where: { actor: { organisationId: orgId }, eventType: 'FAILED_ORG_LOGIN' },
        orderBy: { createdAt: 'desc' },
        take: 30,
        include: { actor: { select: { firstName: true, lastName: true, email: true } } },
      }),
    ]);
    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        user: { id: s.user.id, name: `${s.user.firstName} ${s.user.lastName}`, email: s.user.email, role: s.user.role },
        ipAddress: s.ipAddress,
        userAgent: s.userAgent,
        createdAt: s.createdAt,
        expiresAt: s.expiresAt,
        current: s.id === ctx.sessionId,
      })),
      recentLogins: logins.map((l) => ({ id: l.id, action: l.action, ipAddress: l.ipAddress, createdAt: l.createdAt, actor: l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : '—' })),
      failedLogins: failures.map((f) => ({ id: f.id, ipAddress: f.ipAddress, createdAt: f.createdAt, actor: f.actor ? `${f.actor.firstName} ${f.actor.lastName} (${f.actor.email})` : '—' })),
    };
  }

  async revokeSession(ctx: OrgContext, sessionId: string) {
    const s = await this.prisma.platformSession.findUnique({ where: { id: sessionId }, include: { user: { select: { organisationId: true, role: true } } } });
    if (!s || s.user.organisationId !== ctx.organisationId) throw new NotFoundException('Session not found');
    await this.prisma.platformSession.update({ where: { id: sessionId }, data: { revokedAt: new Date() } });
    await this.events.audit(ctx, 'ORG_SESSION_REVOKED', 'PLATFORM_SESSION', sessionId, { targetUserId: s.userId });
    return { id: sessionId, revoked: true };
  }

  // ---------------- exports ----------------

  async exportCsv(ctx: OrgContext, type: string): Promise<{ filename: string; csv: string }> {
    const orgId = ctx.organisationId;
    const stamp = new Date().toISOString().slice(0, 10);
    let rows: Record<string, unknown>[] = [];
    let columns: string[] = [];

    if (type === 'jobs') {
      if (!can(ctx, 'jobs.read.all') && !can(ctx, 'jobs.read.assigned')) throw new ForbiddenException('Missing permission to export jobs');
      const jobs = await this.prisma.job.findMany({ where: jobScope(ctx), take: 5000, orderBy: { createdAt: 'desc' }, include: { _count: { select: { applications: true } } } });
      rows = jobs.map((j) => ({ ...j, applications: j._count.applications }));
      columns = ['id', 'title', 'status', 'department', 'location', 'workMode', 'employmentType', 'openings', 'applications', 'publishedAt', 'createdAt'];
    } else if (type === 'candidates') {
      assertCan(ctx, 'candidates.read');
      // Contact details are deliberately excluded (field-level protection).
      rows = await this.prisma.candidate.findMany({
        where: { organisationId: orgId },
        take: 5000,
        orderBy: { createdAt: 'desc' },
        select: { id: true, firstName: true, lastName: true, headline: true, location: true, experienceYears: true, currentCompany: true, skills: true, source: true, createdAt: true },
      });
      columns = ['id', 'firstName', 'lastName', 'headline', 'location', 'experienceYears', 'currentCompany', 'skills', 'source', 'createdAt'];
    } else if (type === 'applications') {
      if (!can(ctx, 'applications.read.all') && !can(ctx, 'applications.read.assigned')) throw new ForbiddenException('Missing permission to export applications');
      const apps = await this.prisma.application.findMany({
        where: applicationScope(ctx),
        take: 5000,
        orderBy: { createdAt: 'desc' },
        include: { candidate: { select: { firstName: true, lastName: true } }, job: { select: { title: true } } },
      });
      rows = apps.map((a) => ({ id: a.id, candidate: `${a.candidate.firstName} ${a.candidate.lastName}`, job: a.job.title, stage: a.stage, matchScore: a.matchScore, rejectReason: a.rejectReason, createdAt: a.createdAt, updatedAt: a.updatedAt }));
      columns = ['id', 'candidate', 'job', 'stage', 'matchScore', 'rejectReason', 'createdAt', 'updatedAt'];
    } else if (type === 'audit') {
      assertCan(ctx, 'audit.export');
      const logs = await this.prisma.auditLog.findMany({ where: { organisationId: orgId }, take: 5000, orderBy: { createdAt: 'desc' } });
      const users = await userSummaries(this.prisma, orgId, logs.map((l) => l.actorId));
      rows = logs.map((l) => ({ ...l, actor: l.actorId ? users.get(l.actorId)?.email ?? l.actorId : 'system', metadata: JSON.stringify(l.metadata) }));
      columns = ['createdAt', 'actor', 'actorRole', 'action', 'entityType', 'entityId', 'ipAddress', 'metadata'];
    } else if (type === 'team-analytics') {
      assertCan(ctx, 'analytics.export');
      rows = (await this.teamStats(ctx)).members;
      columns = ['name', 'role', 'jobsCreated', 'stageMoves', 'interviewsScheduled', 'offersCreated', 'hires'];
    }

    await this.events.audit(ctx, 'EXPORT_RUN', 'EXPORT', type, { rows: rows.length });
    return { filename: `clyptus-${type}-${stamp}.csv`, csv: toCsv(rows, columns) };
  }
}
