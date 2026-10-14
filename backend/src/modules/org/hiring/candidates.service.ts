// ============================================================
// ORGANISATION PORTAL — Candidates (org talent pool)
// Contact details and resumes are hidden until a member with
// candidates.resume.view unlocks them (RESUME_VIEW tokens, charged
// once per organisation per candidate).
// ============================================================

import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, can } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { applicationScope, pageResult, paging, userSummaries } from '../common/org-helpers';
import { TOKEN_COSTS } from '../common/org-workflows';
import { CandidateInputDto, CandidateQueryDto, UpdateCandidateDto } from './dto';

export const PUBLIC_CANDIDATE_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  headline: true,
  location: true,
  experienceYears: true,
  currentCompany: true,
  skills: true,
  source: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.CandidateSelect;

const unlockKey = (candidateId: string) => `resume:${candidateId}`;

function cleanSkills(skills?: string[]) {
  return skills ? [...new Set(skills.map((s) => s.trim()).filter(Boolean))] : undefined;
}

@Injectable()
export class CandidatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  async findInOrg(ctx: OrgContext, id: string) {
    const c = await this.prisma.candidate.findFirst({ where: { id, organisationId: ctx.organisationId } });
    if (!c) throw new NotFoundException('Candidate not found');
    return c;
  }

  async unlockedSet(ids: string[]): Promise<Set<string>> {
    if (!ids.length) return new Set();
    const rows = await this.prisma.tokenTransaction.findMany({
      where: { idempotencyKey: { in: ids.map(unlockKey) } },
      select: { idempotencyKey: true },
    });
    return new Set(rows.map((r) => r.idempotencyKey.replace('resume:', '')));
  }

  async isUnlocked(ctx: OrgContext, id: string): Promise<boolean> {
    const set = await this.unlockedSet([id]);
    return set.has(id);
  }

  async list(ctx: OrgContext, q: CandidateQueryDto) {
    const { page, limit, skip } = paging(q);
    const and: Prisma.CandidateWhereInput[] = [{ organisationId: ctx.organisationId }];
    if (q.search) {
      const s = q.search.trim();
      and.push({
        OR: [
          { firstName: { contains: s, mode: 'insensitive' } },
          { lastName: { contains: s, mode: 'insensitive' } },
          { headline: { contains: s, mode: 'insensitive' } },
          { currentCompany: { contains: s, mode: 'insensitive' } },
          { location: { contains: s, mode: 'insensitive' } },
          { skills: { has: s } },
        ],
      });
    }
    if (q.skill) and.push({ skills: { has: q.skill.trim() } });
    if (q.saved === 'true') and.push({ saved: { some: { userId: ctx.userId } } });
    const where = { AND: and };
    const [total, rows] = await Promise.all([
      this.prisma.candidate.count({ where }),
      this.prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          ...PUBLIC_CANDIDATE_SELECT,
          _count: { select: { applications: true } },
          saved: { where: { userId: ctx.userId }, select: { id: true } },
        },
      }),
    ]);
    const unlocked = await this.unlockedSet(rows.map((r) => r.id));
    return pageResult(
      rows.map(({ _count, saved, ...c }) => ({
        ...c,
        name: `${c.firstName} ${c.lastName}`,
        applications: _count.applications,
        saved: saved.length > 0,
        unlocked: unlocked.has(c.id),
      })),
      total,
      page,
      limit,
    );
  }

  async get(ctx: OrgContext, id: string) {
    const c = await this.findInOrg(ctx, id);
    const unlocked = can(ctx, 'candidates.resume.view') && (await this.unlockedSet([id])).has(id);
    const [applications, notes, saved, messages] = await Promise.all([
      this.prisma.application.findMany({
        where: { AND: [applicationScope(ctx), { candidateId: id }] },
        include: { job: { select: { id: true, title: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.candidateNote.findMany({
        where: { organisationId: ctx.organisationId, candidateId: id },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.savedCandidate.findUnique({
        where: { userId_candidateId: { userId: ctx.userId, candidateId: id } },
      }),
      this.prisma.candidateMessage.count({ where: { organisationId: ctx.organisationId, candidateId: id } }),
    ]);
    const matchRuns = applications.length
      ? await this.prisma.aiRun.findMany({
          where: {
            organisationId: ctx.organisationId,
            feature: 'AI_MATCH',
            status: 'SUCCEEDED',
            referenceId: { in: applications.map((a) => a.id) },
          },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    const users = await userSummaries(
      this.prisma,
      ctx.organisationId,
      notes.map((n) => n.authorId),
    );
    const latestMatch = new Map<string, (typeof matchRuns)[number]>();
    matchRuns.forEach((r) => !latestMatch.has(r.referenceId) && latestMatch.set(r.referenceId, r));

    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      firstName: c.firstName,
      lastName: c.lastName,
      headline: c.headline,
      location: c.location,
      experienceYears: c.experienceYears,
      currentCompany: c.currentCompany,
      skills: c.skills,
      source: c.source,
      createdAt: c.createdAt,
      hasResume: !!(c.resumeText || c.resumeUrl),
      unlocked,
      unlockCost: TOKEN_COSTS.RESUME_VIEW,
      contact: unlocked
        ? { email: c.email, phone: c.phone, resumeText: c.resumeText, resumeUrl: c.resumeUrl }
        : null,
      saved: !!saved,
      messageCount: messages,
      applications: applications.map((a) => ({
        id: a.id,
        stage: a.stage,
        matchScore: a.matchScore,
        job: a.job,
        createdAt: a.createdAt,
        match: latestMatch.has(a.id)
          ? {
              score: a.matchScore,
              explanation: latestMatch.get(a.id).explanation,
              at: latestMatch.get(a.id).createdAt,
            }
          : null,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        body: n.body,
        applicationId: n.applicationId,
        author: users.get(n.authorId)?.name ?? 'Former member',
        createdAt: n.createdAt,
      })),
    };
  }

  async unlock(ctx: OrgContext, id: string) {
    const c = await this.findInOrg(ctx, id);
    const result = await this.tokens.consume(
      { organisationId: ctx.organisationId, userId: ctx.userId, role: ctx.role },
      {
        feature: 'RESUME_VIEW',
        amount: TOKEN_COSTS.RESUME_VIEW,
        idempotencyKey: unlockKey(id),
        referenceId: id,
        reason: `Unlocked ${c.firstName} ${c.lastName}`,
      },
    );
    await this.events.audit(ctx, 'CANDIDATE_RESUME_VIEWED', 'CANDIDATE', id, { charged: result.charged });
    return {
      unlocked: true,
      charged: result.charged,
      contact: { email: c.email, phone: c.phone, resumeText: c.resumeText, resumeUrl: c.resumeUrl },
    };
  }

  async create(ctx: OrgContext, dto: CandidateInputDto) {
    const exists = await this.prisma.candidate.findUnique({
      where: { organisationId_email: { organisationId: ctx.organisationId, email: dto.email } },
      select: { id: true },
    });
    if (exists)
      throw new ConflictException({
        message: 'This candidate is already in your talent pool',
        details: { candidateId: exists.id },
      });
    const c = await this.prisma.candidate.create({
      data: {
        ...dto,
        skills: cleanSkills(dto.skills) ?? [],
        organisationId: ctx.organisationId,
        createdById: ctx.userId,
      },
      select: PUBLIC_CANDIDATE_SELECT,
    });
    await this.events.audit(ctx, 'CANDIDATE_CREATED', 'CANDIDATE', c.id, { source: dto.source });
    this.events.emit(ctx.organisationId, 'candidate.updated', { candidateId: c.id });
    return c;
  }

  async update(ctx: OrgContext, id: string, dto: UpdateCandidateDto) {
    await this.findInOrg(ctx, id);
    if (dto.email) {
      const clash = await this.prisma.candidate.findFirst({
        where: { organisationId: ctx.organisationId, email: dto.email, id: { not: id } },
        select: { id: true },
      });
      if (clash) throw new ConflictException('Another candidate already uses this email');
    }
    const c = await this.prisma.candidate.update({
      where: { id },
      data: { ...dto, skills: cleanSkills(dto.skills) },
      select: PUBLIC_CANDIDATE_SELECT,
    });
    await this.events.audit(ctx, 'CANDIDATE_UPDATED', 'CANDIDATE', id, { fields: Object.keys(dto) });
    this.events.emit(ctx.organisationId, 'candidate.updated', { candidateId: id });
    return c;
  }

  async addNote(ctx: OrgContext, id: string, body: string, applicationId?: string) {
    await this.findInOrg(ctx, id);
    if (applicationId) {
      const app = await this.prisma.application.findFirst({
        where: { id: applicationId, organisationId: ctx.organisationId, candidateId: id },
      });
      if (!app) throw new NotFoundException('Application not found');
    }
    const note = await this.prisma.candidateNote.create({
      data: {
        organisationId: ctx.organisationId,
        candidateId: id,
        applicationId,
        authorId: ctx.userId,
        body: body.trim(),
      },
    });
    await this.events.audit(ctx, 'CANDIDATE_NOTE_ADDED', 'CANDIDATE', id, { noteId: note.id });
    return {
      id: note.id,
      body: note.body,
      applicationId: note.applicationId,
      author: `${ctx.firstName} ${ctx.lastName}`,
      createdAt: note.createdAt,
    };
  }

  async getNotes(ctx: OrgContext, id: string) {
    await this.findInOrg(ctx, id);
    const notes = await this.prisma.candidateNote.findMany({
      where: { organisationId: ctx.organisationId, candidateId: id },
      orderBy: { createdAt: 'desc' },
    });
    const users = await userSummaries(
      this.prisma,
      ctx.organisationId,
      notes.map((n) => n.authorId),
    );
    return notes.map((n) => ({
      id: n.id,
      body: n.body,
      applicationId: n.applicationId,
      author: users.get(n.authorId)?.name ?? 'Former member',
      createdAt: n.createdAt,
    }));
  }

  async setSaved(ctx: OrgContext, id: string, saved: boolean) {
    await this.findInOrg(ctx, id);
    if (saved) {
      await this.prisma.savedCandidate.upsert({
        where: { userId_candidateId: { userId: ctx.userId, candidateId: id } },
        create: { organisationId: ctx.organisationId, userId: ctx.userId, candidateId: id },
        update: {},
      });
    } else {
      await this.prisma.savedCandidate.deleteMany({ where: { userId: ctx.userId, candidateId: id } });
    }
    return { saved };
  }
}
