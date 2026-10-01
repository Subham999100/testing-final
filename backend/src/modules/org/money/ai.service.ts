// ============================================================
// ORGANISATION PORTAL — AI assistance (decision support only)
// Every run is token-metered: reserve → run → commit, or release
// on failure. AI never moves, rejects or hires a candidate; it only
// returns suggestions with an explanation of the factors used.
//
// • Matching and resume skill extraction are deterministic and
//   explainable (job-relevant factors only — never protected
//   characteristics such as age, gender, religion, ethnicity).
// • JD improvement and interview questions call Gemini when
//   GEMINI_API_KEY is configured; otherwise they are unavailable.
// ============================================================

import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext, can } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { applicationScope, jobScope, pageResult, paging, userSummaries } from '../common/org-helpers';
import { TOKEN_COSTS, TokenFeature } from '../common/org-workflows';

const COMMON_SKILLS = [
  'javascript', 'typescript', 'react', 'angular', 'vue', 'node.js', 'nestjs', 'express', 'python', 'django', 'flask',
  'java', 'spring', 'kotlin', 'swift', 'go', 'rust', 'c#', '.net', 'php', 'laravel', 'ruby', 'rails', 'sql', 'postgresql',
  'mysql', 'mongodb', 'redis', 'graphql', 'rest', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'terraform', 'ci/cd',
  'git', 'linux', 'html', 'css', 'tailwind', 'figma', 'machine learning', 'data analysis', 'excel', 'power bi', 'tableau',
  'salesforce', 'sap', 'marketing', 'seo', 'sales', 'recruitment', 'accounting', 'project management', 'agile', 'scrum',
  'communication', 'leadership', 'customer service', 'testing', 'selenium', 'cypress', 'jest', 'android', 'ios', 'flutter',
];

const tokenize = (s?: string | null) =>
  new Set((s || '').toLowerCase().split(/[^a-z0-9+#.]+/).filter((w) => w.length > 2));

const norm = (s: string) => s.trim().toLowerCase();

export interface MatchFactor {
  factor: string;
  weight: number;
  score: number; // 0..1
  detail: string;
}

export function explainMatch(
  job: { title: string; requiredSkills: string[]; preferredSkills: string[]; experienceMin: number | null; experienceMax: number | null; location: string | null; workMode: string },
  candidate: { headline: string | null; skills: string[]; experienceYears: number | null; location: string | null },
): { score: number; factors: MatchFactor[] } {
  const cSkills = new Set(candidate.skills.map(norm));
  const req = job.requiredSkills.map(norm);
  const pref = job.preferredSkills.map(norm);
  const reqHit = req.filter((s) => cSkills.has(s));
  const prefHit = pref.filter((s) => cSkills.has(s));

  let expScore = 0.5;
  let expDetail = 'Experience not specified';
  if (candidate.experienceYears != null && (job.experienceMin != null || job.experienceMax != null)) {
    const min = job.experienceMin ?? 0;
    const max = job.experienceMax ?? Number.POSITIVE_INFINITY;
    const y = candidate.experienceYears;
    expScore = y >= min && y <= max ? 1 : y < min ? Math.max(0, y / Math.max(min, 1)) : 0.8;
    expDetail = `${y} yrs vs required ${min}${Number.isFinite(max) ? `–${max}` : '+'} yrs`;
  }

  const titleWords = tokenize(job.title);
  const headWords = tokenize(candidate.headline);
  const overlap = [...titleWords].filter((w) => headWords.has(w));
  const titleScore = titleWords.size ? Math.min(1, overlap.length / Math.min(titleWords.size, 3)) : 0.5;

  let locScore = 0.5;
  let locDetail = 'Location not specified';
  if (job.workMode === 'REMOTE') {
    locScore = 1;
    locDetail = 'Remote role';
  } else if (job.location && candidate.location) {
    const same = candidate.location.toLowerCase().includes(job.location.toLowerCase().split(',')[0].trim());
    locScore = same ? 1 : 0.2;
    locDetail = same ? `Based in ${candidate.location}` : `${candidate.location} vs ${job.location}`;
  }

  const factors: MatchFactor[] = [
    {
      factor: 'Required skills',
      weight: 45,
      score: req.length ? reqHit.length / req.length : 0.5,
      detail: req.length ? `${reqHit.length}/${req.length} matched${reqHit.length ? `: ${reqHit.join(', ')}` : ''}` : 'No required skills listed',
    },
    {
      factor: 'Preferred skills',
      weight: 15,
      score: pref.length ? prefHit.length / pref.length : 0.5,
      detail: pref.length ? `${prefHit.length}/${pref.length} matched` : 'No preferred skills listed',
    },
    { factor: 'Experience', weight: 20, score: expScore, detail: expDetail },
    { factor: 'Title relevance', weight: 10, score: titleScore, detail: overlap.length ? `Headline mentions ${overlap.join(', ')}` : 'Headline differs from job title' },
    { factor: 'Location', weight: 10, score: locScore, detail: locDetail },
  ];
  const score = Math.round(factors.reduce((sum, f) => sum + f.weight * f.score, 0));
  return { score, factors };
}

export function extractSkills(text: string, dictionary: string[]): { skills: string[]; years: number | null } {
  const lower = ` ${text.toLowerCase()} `;
  const skills = [...new Set(dictionary.map(norm))].filter((skill) => {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(lower);
  });
  const years = [...text.matchAll(/(\d{1,2})\+?\s*(?:years|yrs)/gi)].map((m) => Number(m[1])).filter((n) => n <= 50);
  return { skills, years: years.length ? Math.max(...years) : null };
}

@Injectable()
export class AiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  private async assertEnabled(ctx: OrgContext) {
    const s = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    if (s && !s.aiEnabled) throw new ForbiddenException('AI features are turned off for your organisation');
  }

  /** Runs `work` inside a token reservation and records an AiRun either way. */
  private async metered<T>(
    ctx: OrgContext,
    feature: TokenFeature,
    referenceId: string,
    work: () => Promise<{ output: T; explanation?: unknown }>,
  ): Promise<T> {
    const amount = TOKEN_COSTS[feature];
    const reservation = await this.tokens.reserve({ organisationId: ctx.organisationId, userId: ctx.userId, role: ctx.role }, feature, amount, referenceId);
    try {
      const { output, explanation } = await work();
      await this.tokens.commit(reservation.id);
      await this.prisma.aiRun.create({
        data: {
          organisationId: ctx.organisationId,
          userId: ctx.userId,
          feature,
          status: 'SUCCEEDED',
          tokens: amount,
          referenceId,
          output: output as unknown as Prisma.InputJsonValue,
          explanation: (explanation ?? null) as Prisma.InputJsonValue,
        },
      });
      await this.events.audit(ctx, 'AI_RUN', 'AI', referenceId, { feature, tokens: amount });
      return output;
    } catch (err) {
      await this.tokens.release(reservation.id);
      await this.prisma.aiRun.create({
        data: { organisationId: ctx.organisationId, userId: ctx.userId, feature, status: 'FAILED', tokens: 0, referenceId, error: (err as Error).message.slice(0, 500) },
      });
      throw err;
    }
  }

  private geminiConfigured() {
    const key = process.env.GEMINI_API_KEY;
    return !!key && !/placeholder/i.test(key);
  }

  private async gemini(prompt: string): Promise<string> {
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      signal: AbortSignal.timeout(30000),
    }).catch((e: Error) => {
      throw new BadGatewayException(`AI provider unreachable: ${e.message}`);
    });
    if (!res.ok) throw new BadGatewayException(`AI provider error (${res.status})`);
    const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('').trim();
    if (!text) throw new BadGatewayException('AI provider returned an empty response');
    return text;
  }

  async match(ctx: OrgContext, applicationId: string) {
    await this.assertEnabled(ctx);
    const app = await this.prisma.application.findFirst({
      where: { AND: [{ id: applicationId }, applicationScope(ctx)] },
      include: { job: true, candidate: true },
    });
    if (!app) throw new NotFoundException('Application not found');
    return this.metered(ctx, 'AI_MATCH', app.id, async () => {
      const result = explainMatch(app.job, app.candidate);
      await this.prisma.application.update({ where: { id: app.id }, data: { matchScore: result.score } });
      this.events.emit(ctx.organisationId, 'application.stage_changed', { applicationId: app.id, jobId: app.jobId });
      const explanation = {
        factors: result.factors,
        method: 'Weighted job-relevant factors (skills, experience, title, location). Protected characteristics are never used.',
        advisory: 'Decision support only — a person makes every hiring decision.',
      };
      return { output: { score: result.score, ...explanation }, explanation };
    });
  }

  async parseResume(ctx: OrgContext, candidateId: string) {
    await this.assertEnabled(ctx);
    const candidate = await this.prisma.candidate.findFirst({ where: { id: candidateId, organisationId: ctx.organisationId } });
    if (!candidate) throw new NotFoundException('Candidate not found');
    if (!candidate.resumeText?.trim()) throw new BadRequestException('Add resume text to this candidate first');
    const jobSkills = await this.prisma.job.findMany({
      where: { organisationId: ctx.organisationId },
      select: { requiredSkills: true, preferredSkills: true },
      take: 200,
    });
    const dictionary = [...COMMON_SKILLS, ...jobSkills.flatMap((j) => [...j.requiredSkills, ...j.preferredSkills])];
    return this.metered(ctx, 'AI_RESUME_PARSE', candidate.id, async () => {
      const { skills, years } = extractSkills(candidate.resumeText, dictionary);
      const merged = [...new Set([...candidate.skills, ...skills])];
      await this.prisma.candidate.update({
        where: { id: candidate.id },
        data: { skills: merged, experienceYears: candidate.experienceYears ?? years },
      });
      const output = { extractedSkills: skills, experienceYears: years, skills: merged };
      return { output, explanation: { method: 'Rule-based keyword extraction against the organisation skill dictionary.' } };
    });
  }

  async improveJd(ctx: OrgContext, jobId: string) {
    await this.assertEnabled(ctx);
    if (!this.geminiConfigured()) throw new ServiceUnavailableException('AI writing tools are not configured (GEMINI_API_KEY missing).');
    const job = await this.prisma.job.findFirst({ where: { AND: [{ id: jobId }, jobScope(ctx)] } });
    if (!job) throw new NotFoundException('Job not found');
    return this.metered(ctx, 'AI_JD_IMPROVE', job.id, async () => {
      const text = await this.gemini(
        `Rewrite this job description to be clear, inclusive and concise. Avoid biased or exclusionary language and do not add requirements that are not implied. Return plain text only.\n\nTitle: ${job.title}\nRequired skills: ${job.requiredSkills.join(', ')}\n\n${job.description}`.slice(0, 20000),
      );
      return { output: { suggestion: text }, explanation: { method: 'Generated by Gemini; review before applying.' } };
    });
  }

  async interviewQuestions(ctx: OrgContext, jobId: string) {
    await this.assertEnabled(ctx);
    if (!this.geminiConfigured()) throw new ServiceUnavailableException('AI writing tools are not configured (GEMINI_API_KEY missing).');
    const job = await this.prisma.job.findFirst({ where: { AND: [{ id: jobId }, jobScope(ctx)] } });
    if (!job) throw new NotFoundException('Job not found');
    return this.metered(ctx, 'AI_INTERVIEW_QUESTIONS', job.id, async () => {
      const text = await this.gemini(
        `Write 8 structured, job-relevant interview questions for the role below. Focus only on skills and experience; never ask about age, family, religion, health, nationality or other protected characteristics. Number them.\n\nTitle: ${job.title}\nRequired skills: ${job.requiredSkills.join(', ')}\n\n${job.description}`.slice(0, 20000),
      );
      return { output: { questions: text }, explanation: { method: 'Generated by Gemini; review before use.' } };
    });
  }

  async runs(ctx: OrgContext, q: { page?: number; limit?: number }) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.AiRunWhereInput = { organisationId: ctx.organisationId };
    if (!can(ctx, 'ai.govern')) where.userId = ctx.userId;
    const [total, rows, totals] = await Promise.all([
      this.prisma.aiRun.count({ where }),
      this.prisma.aiRun.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { id: true, feature: true, status: true, tokens: true, referenceId: true, error: true, createdAt: true, userId: true },
      }),
      this.prisma.aiRun.groupBy({ by: ['feature'], where: { ...where, status: 'SUCCEEDED' }, _sum: { tokens: true }, _count: { _all: true } }),
    ]);
    const users = await userSummaries(this.prisma, ctx.organisationId, rows.map((r) => r.userId));
    const settings = await this.prisma.orgSettings.findUnique({ where: { organisationId: ctx.organisationId } });
    // Nested under `runs`: the global TransformInterceptor keeps only data/meta from a top-level page result.
    return {
      runs: pageResult(rows.map((r) => ({ ...r, user: users.get(r.userId)?.name ?? 'Former member' })), total, page, limit),
      summary: {
        enabled: settings?.aiEnabled ?? true,
        writingToolsConfigured: this.geminiConfigured(),
        byFeature: totals.map((t) => ({ feature: t.feature, runs: t._count._all, tokens: t._sum.tokens ?? 0 })),
        costs: TOKEN_COSTS,
      },
    };
  }
}
