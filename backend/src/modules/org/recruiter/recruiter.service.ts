import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Response } from "express";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { OrgContext, can } from "../common/org-context";
import { OrgEventsService } from "../common/org-events.service";
import { jobScope, pageResult } from "../common/org-helpers";
import {
  CandidatesService,
  PUBLIC_CANDIDATE_SELECT,
} from "../hiring/candidates.service";
import {
  FolderCandidatesDto,
  FolderDto,
  ProfessionalProfileDto,
  SavedSearchDto,
  TalentQueryDto,
  SelectionRangeDto,
} from "./dto";
import { RecentSearchDto } from "./workspace.dto";
import { AiService } from "../money/ai.service";
import {
  escapedLike,
  keywordSql,
  parseKeywords,
  positiveTerms,
  expandSynonyms,
  plainKeywords,
} from "./search";

const profileDocument = Prisma.sql`concat_ws(' ', c."firstName", c."lastName", c.headline, c."currentCompany", c.location, array_to_string(c.skills, ' '), p.designation, p.summary)`;
const skillsDocument = Prisma.sql`coalesce(array_to_string(c.skills, ' '), '')`;
const join = Prisma.sql`FROM candidates c LEFT JOIN recruiter_profiles p ON p."candidateId" = c.id`;
@Injectable()
export class RecruiterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidates: CandidatesService,
    private readonly events: OrgEventsService,
    private readonly ai: AiService,
  ) {}
  private async folder(ctx: OrgContext, id: string) {
    const row = await this.prisma.recruiterFolder.findFirst({
      where: { id, organisationId: ctx.organisationId, userId: ctx.userId },
    });
    if (!row) throw new NotFoundException("Folder not found");
    return row;
  }
  async search(
    ctx: OrgContext,
    q: TalentQueryDto,
    range?: { from: number; to: number },
  ) {
    if (q.maxExperienceMonths != null && q.maxExperience == null)
      q = { ...q, maxExperience: 0 };
    if (
      (q.minExperience != null || q.minExperienceMonths != null) &&
      q.maxExperience != null &&
      (q.minExperience ?? 0) * 12 + (q.minExperienceMonths ?? 0) >
        q.maxExperience * 12 + (q.maxExperienceMonths ?? 0)
    )
      throw new BadRequestException("Minimum experience exceeds maximum");
    if (q.minSalary != null && q.maxSalary != null && q.minSalary > q.maxSalary)
      throw new BadRequestException("Minimum salary exceeds maximum");
    if (q.folderId) await this.folder(ctx, q.folderId);
    const expression = expandSynonyms(
      q.booleanMode === "false"
        ? plainKeywords(q.search ?? "")
        : parseKeywords(q.search ?? ""),
      q.excludeSynonyms !== "false",
    );
    const document =
      q.searchIn === "skills"
        ? skillsDocument
        : q.searchIn === "headline"
          ? Prisma.sql`concat_ws(' ', c.headline, p.designation)`
          : q.searchIn === "resume"
            ? Prisma.sql`coalesce(c."resumeText", '')`
            : q.searchIn === "titleSkills"
              ? Prisma.sql`concat_ws(' ', c.headline, p.designation, array_to_string(c.skills, ' '))`
              : profileDocument;
    const clauses: Prisma.Sql[] = [
      Prisma.sql`c."organisationId" = ${ctx.organisationId}`,
      keywordSql(expression, document),
    ];
    if (q.exclude?.trim())
      clauses.push(
        Prisma.sql`NOT (${keywordSql(parseKeywords(q.exclude), document)})`,
      );
    if (q.location)
      clauses.push(
        q.includePreferred === "false"
          ? Prisma.sql`c.location ILIKE ${escapedLike(q.location)}`
          : Prisma.sql`(c.location ILIKE ${escapedLike(q.location)} OR array_to_string(p."preferredLocations", ' ') ILIKE ${escapedLike(q.location)})`,
      );
    const careerMatch = (
      value: string,
      field: string,
      current: Prisma.Sql,
      scope = "current",
    ) => {
      const currentFlag = Prisma.sql`(e->>'current' = 'true' OR coalesce(e->>'period','') ~* '(present|current|till date)$')`;
      const currentMatch = Prisma.sql`(${current} OR EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.employment, '[]'::jsonb)) e WHERE ${currentFlag} AND e->>${field} ILIKE ${escapedLike(value)}))`;
      const historical = Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.employment, '[]'::jsonb)) e WHERE NOT coalesce(${currentFlag},false) AND e->>${field} ILIKE ${escapedLike(value)})`;
      return scope === "past"
        ? historical
        : scope === "any"
          ? Prisma.sql`(${currentMatch} OR ${historical})`
          : currentMatch;
    };
    if (q.company)
      clauses.push(
        careerMatch(
          q.company,
          "organisation",
          Prisma.sql`c."currentCompany" ILIKE ${escapedLike(q.company)}`,
          q.companyScope,
        ),
      );
    if (q.excludeCompany)
      clauses.push(
        Prisma.sql`NOT coalesce(${careerMatch(q.excludeCompany, "organisation", Prisma.sql`c."currentCompany" ILIKE ${escapedLike(q.excludeCompany)}`, "any")}, false)`,
      );
    if (q.designation)
      clauses.push(
        careerMatch(
          q.designation,
          "title",
          Prisma.sql`(p.designation ILIKE ${escapedLike(q.designation)} OR c.headline ILIKE ${escapedLike(q.designation)})`,
          q.designationScope,
        ),
      );
    if (q.industry)
      clauses.push(
        careerMatch(
          q.industry,
          "industry",
          Prisma.sql`p.industry ILIKE ${escapedLike(q.industry)}`,
          q.industryScope,
        ),
      );
    if (q.education)
      clauses.push(
        Prisma.sql`p.education::text ILIKE ${escapedLike(q.education)}`,
      );
    for (const [key, level] of [
      ["ug", "UG"],
      ["pg", "PG"],
      ["phd", "PHD"],
    ] as const) {
      const mode = (q as any)[key];
      if (!mode) continue;

      const course = ((q as any)[`${key}Course`] || (q as any)[`${key}Text`])?.trim();
      const institute = (q as any)[`${key}Institute`]?.trim();
      const yearFrom = (q as any)[`${key}YearFrom`];
      const yearTo = (q as any)[`${key}YearTo`];

      if (yearFrom != null && yearTo != null && yearFrom > yearTo) {
        throw new BadRequestException(
          `Passing year From cannot be after To for ${level}`,
        );
      }

      if (mode === "specific" && !course && !institute && yearFrom == null && yearTo == null) {
        throw new BadRequestException(
          `Enter a specific ${level} qualification`,
        );
      }

      const conds: Prisma.Sql[] = [Prisma.sql`e->>'level' = ${level}`];

      if (mode === "specific") {
        if (course) {
          conds.push(
            Prisma.sql`concat_ws(' ', e->>'title', e->>'specialisation') ILIKE ${escapedLike(course)}`,
          );
        }
        if (institute) {
          conds.push(
            Prisma.sql`e->>'organisation' ILIKE ${escapedLike(institute)}`,
          );
        }
      }

      const yearExpr = Prisma.sql`coalesce(
        nullif(substring(e->>'endMonth' from '^(?:19|20)\\d{2}'), '')::int,
        nullif(substring(e->>'period' from '(?:19|20)\\d{2}$'), '')::int,
        nullif(substring(e->>'year' from '(?:19|20)\\d{2}'), '')::int,
        nullif(substring(e->>'passingYear' from '(?:19|20)\\d{2}'), '')::int
      )`;

      if (yearFrom != null) {
        conds.push(Prisma.sql`${yearExpr} >= ${yearFrom}`);
      }
      if (yearTo != null) {
        conds.push(Prisma.sql`${yearExpr} <= ${yearTo}`);
      }

      const innerWhere = Prisma.join(conds, " AND ");
      const exists = Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.education, '[]'::jsonb)) e WHERE ${innerWhere})`;

      clauses.push(
        mode === "none"
          ? Prisma.sql`(p."searchDetails"->>'educationComplete' = 'true' AND NOT EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.education, '[]'::jsonb)) e WHERE e->>'level' = ${level}))`
          : exists,
      );
    }
    if (q.preferredLocation)
      clauses.push(
        Prisma.sql`array_to_string(p."preferredLocations", ' ') ILIKE ${escapedLike(q.preferredLocation)}`,
      );
    if (q.activityDays != null)
      clauses.push(
        Prisma.sql`(p."lastActiveAt" >= ${new Date(Date.now() - q.activityDays * 86400000)} OR greatest(c."updatedAt",p."updatedAt") >= ${new Date(Date.now() - q.activityDays * 86400000)})`,
      );
    if (q.workAuthorisation)
      clauses.push(
        Prisma.sql`coalesce(p."searchDetails"->'workAuthorisations','[]'::jsonb) @> ${JSON.stringify([q.workAuthorisation])}::jsonb`,
      );
    if (q.servingNotice === "true")
      clauses.push(Prisma.sql`p."searchDetails"->>'servingNotice' = 'true'`);
    if (q.language || q.languages) {
      const langs = (q.languages || q.language || "")
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean);
      if (langs.length > 0) {
        const langClauses = langs.map(
          (l) =>
            Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements_text(coalesce(p."searchDetails"->'languages', '[]'::jsonb)) l WHERE l ILIKE ${escapedLike(l)})`,
        );
        clauses.push(Prisma.sql`(${Prisma.join(langClauses, " OR ")})`);
      }
    }
    if (q.minAge != null || q.maxAge != null) {
      if (q.minAge != null && q.maxAge != null && q.minAge > q.maxAge) {
        throw new BadRequestException("Minimum age exceeds maximum.");
      }
      const ageExpr = Prisma.sql`coalesce(
        nullif(p."searchDetails"->>'age', '')::int,
        CASE
          WHEN p."searchDetails"->>'dateOfBirth' ~ '^(?:19|20)\\d{2}-\\d{2}-\\d{2}'
          THEN date_part('year', age(now(), (p."searchDetails"->>'dateOfBirth')::date))::int
          ELSE NULL
        END
      )`;
      const ageConds: Prisma.Sql[] = [];
      if (q.minAge != null) {
        ageConds.push(Prisma.sql`${ageExpr} >= ${q.minAge}`);
      }
      if (q.maxAge != null) {
        ageConds.push(Prisma.sql`${ageExpr} <= ${q.maxAge}`);
      }
      const rangeCond = Prisma.sql`(${Prisma.join(ageConds, " AND ")})`;
      if (q.includeUnknownAge === "true") {
        clauses.push(Prisma.sql`(${rangeCond} OR ${ageExpr} IS NULL)`);
      } else {
        clauses.push(Prisma.sql`(${ageExpr} IS NOT NULL AND ${rangeCond})`);
      }
    }
    if (q.workMode)
      clauses.push(Prisma.sql`p."workPreference" = ${q.workMode}`);
    if (q.employmentType)
      clauses.push(Prisma.sql`p."employmentPreference" = ${q.employmentType}`);
    if (q.sourceGroup === "registered")
      clauses.push(
        Prisma.sql`lower(c.source) IN ('registered', 'candidate_portal', 'direct_application')`,
      );
    if (q.sourceGroup === "sourced")
      clauses.push(
        Prisma.sql`lower(c.source) IN ('sourced', 'recruiter_added', 'referral', 'import')`,
      );
    if (q.source) clauses.push(Prisma.sql`c.source = ${q.source}`);
    if (q.hasResume === "true")
      clauses.push(
        Prisma.sql`(nullif(c."resumeText", '') IS NOT NULL OR nullif(c."resumeUrl", '') IS NOT NULL)`,
      );
    if (q.hideUnlocked === "true")
      clauses.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM token_transactions t WHERE t."organisationId" = ${ctx.organisationId} AND t."idempotencyKey" = concat('resume:', c.id))`,
      );
    if (q.hideEmailed === "true")
      clauses.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM recruiter_email_recipients er JOIN recruiter_email_batches eb ON eb.id = er."batchId" WHERE er."candidateId" = c.id AND eb."organisationId" = ${ctx.organisationId} AND er.status IN ('SENT', 'SENDING', 'UNCERTAIN'))`,
      );
    for (const insight of q.insights?.split(",").filter(Boolean) ?? []) {
      if (
        [
          "startup",
          "founder",
          "earlyStartup",
          "promoted",
          "phdUnder4",
        ].includes(insight)
      )
        clauses.push(
          Prisma.sql`coalesce(p."searchDetails"->'insights', '[]'::jsonb) @> ${JSON.stringify([insight])}::jsonb`,
        );
      else if (insight === "portfolio")
        clauses.push(
          Prisma.sql`nullif(p."searchDetails"->>'portfolioUrl', '') IS NOT NULL`,
        );
      else if (insight === "certified")
        clauses.push(
          Prisma.sql`jsonb_array_length(coalesce(p.certifications, '[]'::jsonb)) > 0`,
        );
      else if (insight === "structuredHistory")
        clauses.push(
          Prisma.sql`EXISTS (SELECT 1 FROM jsonb_array_elements(coalesce(p.employment, '[]'::jsonb)) e WHERE e->>'startMonth' IS NOT NULL)`,
        );
      else throw new BadRequestException("Unknown smart insight");
    }
    if (q.minExperience != null || q.minExperienceMonths != null)
      clauses.push(
        Prisma.sql`(c."experienceYears" * 12 + coalesce(p."experienceMonths", 0)) >= ${(q.minExperience ?? 0) * 12 + (q.minExperienceMonths ?? 0)}`,
      );
    if (q.maxExperience != null)
      clauses.push(
        Prisma.sql`(c."experienceYears" * 12 + coalesce(p."experienceMonths", 0)) <= ${q.maxExperience * 12 + (q.maxExperienceMonths ?? 0)}`,
      );
    if (q.minSalary != null)
      clauses.push(
        Prisma.sql`(p."currentSalary" >= ${q.minSalary} ${q.includeUnknownSalary === "true" ? Prisma.sql`OR p."currentSalary" IS NULL` : Prisma.empty})`,
      );
    if (q.maxSalary != null)
      clauses.push(
        Prisma.sql`(p."currentSalary" <= ${q.maxSalary} ${q.includeUnknownSalary === "true" ? Prisma.sql`OR p."currentSalary" IS NULL` : Prisma.empty})`,
      );
    if (q.noticeDays != null)
      clauses.push(
        Prisma.sql`(p."noticePeriodDays" <= ${q.noticeDays} ${q.includeUnknownNotice === "true" ? Prisma.sql`OR p."noticePeriodDays" IS NULL` : Prisma.empty})`,
      );
    if (q.activeDays != null)
      clauses.push(
        Prisma.sql`p."lastActiveAt" >= ${new Date(Date.now() - q.activeDays * 86400000)}`,
      );
    if (q.updatedDays != null)
      clauses.push(
        Prisma.sql`greatest(c."updatedAt", p."updatedAt") >= ${new Date(Date.now() - q.updatedDays * 86400000)}`,
      );
    if (q.saved === "true")
      clauses.push(
        Prisma.sql`EXISTS (SELECT 1 FROM saved_candidates s WHERE s."candidateId" = c.id AND s."userId" = ${ctx.userId} AND s."organisationId" = ${ctx.organisationId})`,
      );
    if (q.hideViewed === "true")
      clauses.push(
        Prisma.sql`NOT EXISTS (SELECT 1 FROM recruiter_visits v WHERE v."candidateId" = c.id AND v."userId" = ${ctx.userId} AND v."organisationId" = ${ctx.organisationId})`,
      );
    if (q.folderId)
      clauses.push(
        Prisma.sql`EXISTS (SELECT 1 FROM recruiter_folder_candidates f WHERE f."candidateId" = c.id AND f."folderId" = ${q.folderId})`,
      );
    const where = Prisma.sql`WHERE ${Prisma.join(clauses, " AND ")}`;
    const terms = positiveTerms(expression);
    const score = terms.length
      ? Prisma.sql`(${Prisma.join(
          terms.map(
            (t) =>
              Prisma.sql`CASE WHEN ${skillsDocument} ILIKE ${escapedLike(t)} THEN 3 WHEN ${profileDocument} ILIKE ${escapedLike(t)} THEN 1 ELSE 0 END`,
          ),
          " + ",
        )})`
      : Prisma.sql`CAST(0 AS integer)`;
    const order =
      q.sort === "experience"
        ? Prisma.sql`c."experienceYears" DESC NULLS LAST, p."experienceMonths" DESC NULLS LAST`
        : q.sort === "active"
          ? Prisma.sql`p."lastActiveAt" DESC NULLS LAST`
          : q.sort === "updated"
            ? Prisma.sql`greatest(c."updatedAt", p."updatedAt") DESC`
            : Prisma.sql`${score} DESC`;
    const page = q.page || 1,
      limit = range ? range.to - range.from + 1 : q.limit || 20;
    const offset = range ? range.from - 1 : (page - 1) * limit;
    const [count, ids] = await this.prisma.$transaction(
      [
        this.prisma.$queryRaw<{ total: bigint }[]>(
          Prisma.sql`SELECT count(*) AS total ${join} ${where}`,
        ),
        this.prisma.$queryRaw<{ id: string }[]>(
          Prisma.sql`SELECT c.id ${join} ${where} ORDER BY ${order}, c."createdAt" DESC, c.id ASC LIMIT ${limit} OFFSET ${offset}`,
        ),
      ],
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
    if (range)
      return {
        candidateIds: ids.map((r) => r.id),
        total: Number(count[0].total),
        from: range.from,
        to: range.from + ids.length - 1,
      };
    return pageResult(
      await this.cards(
        ctx,
        ids.map((r) => r.id),
      ),
      Number(count[0].total),
      page,
      limit,
    );
  }
  async selectRange(ctx: OrgContext, dto: SelectionRangeDto) {
    if (dto.from < 1 || dto.to < dto.from || dto.to - dto.from >= 1000)
      throw new BadRequestException("Select a range of 1–1,000 candidates");
    return this.search(ctx, dto.filters, { from: dto.from, to: dto.to });
  }
  private async cards(ctx: OrgContext, ids: string[]) {
    if (!ids.length) return [];
    const [rows, visits, downloads, unlockedSet] = await Promise.all([
      this.prisma.candidate.findMany({
        where: { organisationId: ctx.organisationId, id: { in: ids } },
        select: {
          ...PUBLIC_CANDIDATE_SELECT,
          resumeUrl: true,
          resumeText: true,
          professional: true,
          saved: { where: { userId: ctx.userId }, select: { id: true } },
        },
      }),
      this.prisma.recruiterVisit?.groupBy
        ? this.prisma.recruiterVisit.groupBy({
            by: ["candidateId"],
            where: { organisationId: ctx.organisationId, candidateId: { in: ids } },
            _count: { userId: true },
          })
        : Promise.resolve([]),
      this.prisma.recruiterDownload?.groupBy
        ? this.prisma.recruiterDownload.groupBy({
            by: ["candidateId"],
            where: { organisationId: ctx.organisationId, candidateId: { in: ids } },
            _count: { userId: true },
          })
        : Promise.resolve([]),
      this.candidates?.unlockedSet
        ? this.candidates.unlockedSet(ids)
        : Promise.resolve(new Set<string>()),
    ]);
    const visitsMap = new Map(
      visits.map((v) => [v.candidateId, v._count.userId]),
    );
    const downloadsMap = new Map(
      downloads.map((d) => [d.candidateId, d._count.userId]),
    );
    const map = new Map(
      rows.map(({ saved, resumeUrl, resumeText, ...row }) => [
        row.id,
        {
          ...row,
          name: `${row.firstName} ${row.lastName}`,
          saved: saved.length > 0,
          hasResume: Boolean(resumeUrl || resumeText),
          unlocked: unlockedSet.has(row.id),
          viewCount: visitsMap.get(row.id) ?? 0,
          downloadCount: downloadsMap.get(row.id) ?? 0,
        },
      ]),
    );
    return ids.flatMap((id) => (map.has(id) ? [map.get(id)!] : []));
  }
  async detail(ctx: OrgContext, id: string) {
    const candidate = await this.candidates.get(ctx, id);
    if (
      !can(ctx, "applications.read.all") &&
      !can(ctx, "applications.read.assigned")
    )
      candidate.applications = [];
    const [professional, viewers] = await Promise.all([
      this.prisma.recruiterProfile.findUnique({ where: { candidateId: id } }),
      this.prisma.recruiterVisit.count({
        where: { candidateId: id, organisationId: ctx.organisationId },
      }),
    ]);
    return { ...candidate, professional, viewers };
  }
  async updateProfile(
    ctx: OrgContext,
    id: string,
    dto: ProfessionalProfileDto,
  ) {
    await this.candidates.findInOrg(ctx, id);
    for (const [key, value] of Object.entries(dto))
      if (
        value === null &&
        !["currentSalary", "expectedSalary", "noticePeriodDays"].includes(key)
      )
        throw new BadRequestException(`${key} cannot be null`);
    if (
      dto.searchDetails &&
      Object.values(dto.searchDetails).some((v) => v === null)
    )
      throw new BadRequestException(
        "Search details cannot contain null values",
      );
    const {
      employment,
      education,
      certifications,
      itSkills,
      searchDetails,
      ...scalars
    } = dto;
    const currentMonth = new Date().toISOString().slice(0, 7);
    for (const row of employment ?? []) {
      if (row.endMonth && !row.startMonth)
        throw new BadRequestException(
          "Employment start month is required with an end month",
        );
      if (row.current && !row.startMonth)
        throw new BadRequestException("Current employment needs a start month");
      if (row.current && row.endMonth)
        throw new BadRequestException(
          "Current employment cannot have an end month",
        );
      if (row.startMonth && row.endMonth && row.endMonth < row.startMonth)
        throw new BadRequestException(
          "Employment end month precedes start month",
        );
      if (
        (row.startMonth && row.startMonth > currentMonth) ||
        (row.endMonth && row.endMonth > currentMonth)
      )
        throw new BadRequestException(
          "Employment history cannot be in the future",
        );
    }
    const data = {
      ...scalars,
      ...(searchDetails ? { searchDetails: { ...searchDetails } } : {}),
      ...(employment ? { employment: employment.map((r) => ({ ...r })) } : {}),
      ...(education ? { education: education.map((r) => ({ ...r })) } : {}),
      ...(certifications
        ? { certifications: certifications.map((r) => ({ ...r })) }
        : {}),
      ...(itSkills ? { itSkills: itSkills.map((r) => ({ ...r })) } : {}),
    };
    const row = await this.prisma.recruiterProfile.upsert({
      where: { candidateId: id },
      create: { ...data, candidateId: id },
      update: data,
    });
    await this.events.audit(
      ctx,
      "CANDIDATE_PROFESSIONAL_PROFILE_UPDATED",
      "CANDIDATE",
      id,
      {
        fields: Object.keys(dto),
      },
    );
    this.events.emit(ctx.organisationId, "candidate.updated", {
      candidateId: id,
    });
    return row;
  }
  async viewed(ctx: OrgContext, id: string) {
    await this.candidates.findInOrg(ctx, id);
    await this.prisma.recruiterVisit.upsert({
      where: { userId_candidateId: { userId: ctx.userId, candidateId: id } },
      create: {
        userId: ctx.userId,
        organisationId: ctx.organisationId,
        candidateId: id,
      },
      update: { lastViewedAt: new Date() },
    });
    return { recorded: true };
  }
  async downloadResume(ctx: OrgContext, id: string, res: Response) {
    const candidate = await this.candidates.findInOrg(ctx, id);
    const isUnlocked = await this.candidates.isUnlocked(ctx, id);
    if (!isUnlocked && !can(ctx, "candidates.resume.view")) {
      throw new ForbiddenException(
        "Resume access permission required or contact must be unlocked",
      );
    }
    if (!candidate.resumeUrl && !candidate.resumeText) {
      throw new NotFoundException("No resume available for this candidate");
    }
    await this.prisma.recruiterDownload.upsert({
      where: { userId_candidateId: { userId: ctx.userId, candidateId: id } },
      create: {
        userId: ctx.userId,
        organisationId: ctx.organisationId,
        candidateId: id,
      },
      update: { downloadedAt: new Date() },
    });
    if (candidate.resumeUrl) {
      return res.redirect(candidate.resumeUrl);
    } else {
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${candidate.firstName}_${candidate.lastName}_Resume.txt"`,
      );
      return res.send(candidate.resumeText);
    }
  }
  /** Explainable suggestions; not an AI model or an automatic hiring decision. */
  async similar(ctx: OrgContext, id: string, jobId?: string, mode = "skills") {
    const source = await this.candidates.findInOrg(ctx, id);
    if (mode === "viewed") {
      const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
        SELECT v."candidateId" AS id FROM recruiter_visits v
        JOIN candidates c ON c.id = v."candidateId" AND c."organisationId" = ${ctx.organisationId}
        WHERE v."organisationId" = ${ctx.organisationId} AND v."candidateId" <> ${id}
        AND v."userId" IN (SELECT "userId" FROM recruiter_visits WHERE "candidateId" = ${id} AND "organisationId" = ${ctx.organisationId})
        GROUP BY v."candidateId" ORDER BY count(DISTINCT v."userId") DESC, max(v."lastViewedAt") DESC, v."candidateId" LIMIT 10`);
      return {
        method: "Organisation viewing history",
        candidates: await this.cards(
          ctx,
          ids.map((r) => r.id),
        ),
      };
    }
    let skills = source.skills;
    if (jobId) {
      if (!can(ctx, "jobs.read.all") && !can(ctx, "jobs.read.assigned"))
        throw new ForbiddenException("Job access permission required");
      const job = await this.prisma.job.findFirst({
        where: { AND: [jobScope(ctx), { id: jobId }] },
      });
      if (!job) throw new NotFoundException("Job not found");
      skills = job.requiredSkills;
    }
    const wanted = [
      ...new Set(skills.map((s) => s.trim().toLowerCase()).filter(Boolean)),
    ];
    if (!wanted.length) return { method: "Shared skills", candidates: [] };
    const ids = await this.prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
      SELECT c.id, (SELECT count(DISTINCT lower(skill)) FROM unnest(c.skills) skill WHERE lower(skill) IN (${Prisma.join(wanted)})) AS matches
      FROM candidates c WHERE c."organisationId" = ${ctx.organisationId} AND c.id <> ${id}
      AND EXISTS (SELECT 1 FROM unnest(c.skills) skill WHERE lower(skill) IN (${Prisma.join(wanted)}))
      ORDER BY matches DESC, c."updatedAt" DESC, c.id LIMIT 10`);
    const cards = await this.cards(
      ctx,
      ids.map((r) => r.id),
    );
    return {
      method: jobId ? "Required job skills" : "Shared profile skills",
      candidates: cards.map((c) => ({
        ...c,
        matchingSkills: c.skills.filter((s) =>
          wanted.includes(s.trim().toLowerCase()),
        ),
        skillCoverage: Math.round(
          (new Set(
            c.skills
              .filter((s) => wanted.includes(s.trim().toLowerCase()))
              .map((s) => s.trim().toLowerCase()),
          ).size /
            wanted.length) *
            100,
        ),
      })),
    };
  }
  async aiSimilar(ctx: OrgContext, id: string, jobId?: string) {
    const source = await this.candidates.findInOrg(ctx, id);
    const shortlist = await this.similar(ctx, id, jobId);
    if (!shortlist.candidates.length)
      return { method: "AI reranking", candidates: [], charged: 0 };
    let requirements = { title: source.headline ?? "", skills: source.skills };
    if (jobId) {
      const job = await this.prisma.job.findFirst({
        where: { AND: [jobScope(ctx), { id: jobId }] },
      });
      if (!job) throw new NotFoundException("Job not found");
      requirements = { title: job.title, skills: job.requiredSkills };
    }
    const rankings = await this.ai.rankRecruiterProfiles(
      ctx,
      id,
      requirements,
      shortlist.candidates.map((c) => ({
        id: c.id,
        headline: c.headline,
        skills: c.skills,
        experienceYears: c.experienceYears,
      })),
    );
    const byId = new Map(shortlist.candidates.map((c) => [c.id, c]));
    return {
      method: "Gemini reranking of up to 10 shared-skill profiles",
      candidates: rankings.map((r) => ({
        ...byId.get(r.id)!,
        aiReason: r.reason,
      })),
      charged: 5,
    };
  }
  folders(ctx: OrgContext) {
    return this.prisma.recruiterFolder.findMany({
      where: { organisationId: ctx.organisationId, userId: ctx.userId },
      include: { _count: { select: { candidates: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }
  async createFolder(ctx: OrgContext, dto: FolderDto) {
    if (!dto.name.trim()) throw new BadRequestException("Name is required");
    if (
      (await this.prisma.recruiterFolder.count({
        where: { organisationId: ctx.organisationId, userId: ctx.userId },
      })) >= 100
    )
      throw new BadRequestException("Maximum 100 folders per member");
    return this.prisma.recruiterFolder.create({
      data: {
        name: dto.name.trim(),
        organisationId: ctx.organisationId,
        userId: ctx.userId,
      },
    });
  }
  async deleteFolder(ctx: OrgContext, id: string) {
    await this.folder(ctx, id);
    await this.prisma.recruiterFolder.delete({ where: { id } });
    return { deleted: true };
  }
  async folderCandidates(
    ctx: OrgContext,
    id: string,
    dto: FolderCandidatesDto,
    remove = false,
  ) {
    await this.folder(ctx, id);
    const count = await this.prisma.candidate.count({
      where: {
        organisationId: ctx.organisationId,
        id: { in: dto.candidateIds },
      },
    });
    if (count !== dto.candidateIds.length)
      throw new NotFoundException("Candidate not found");
    if (remove)
      await this.prisma.recruiterFolderCandidate.deleteMany({
        where: { folderId: id, candidateId: { in: dto.candidateIds } },
      });
    else
      await this.prisma.recruiterFolderCandidate.createMany({
        data: dto.candidateIds.map((candidateId) => ({
          folderId: id,
          candidateId,
        })),
        skipDuplicates: true,
      });
    return { updated: true };
  }
  async savedSearches(ctx: OrgContext) {
    const rows = await this.prisma.recruiterSavedSearch.findMany({
      where: {
        organisationId: ctx.organisationId,
        OR: [{ userId: ctx.userId }, { shared: true }],
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return rows.map((row) => ({ ...row, owned: row.userId === ctx.userId }));
  }
  async saveSearch(ctx: OrgContext, dto: SavedSearchDto) {
    if (!dto.filters || !dto.name.trim())
      throw new BadRequestException("Search name and filters are required");
    parseKeywords(dto.filters.search ?? "");
    parseKeywords(dto.filters.exclude ?? "");
    const filters = { ...dto.filters, page: 1 };
    if (dto.shared) {
      delete filters.folderId;
      delete filters.saved;
      delete filters.hideViewed;
    } else if (filters.folderId) await this.folder(ctx, filters.folderId);
    if (
      (await this.prisma.recruiterSavedSearch.count({
        where: { organisationId: ctx.organisationId, userId: ctx.userId },
      })) >= 100
    )
      throw new BadRequestException("Maximum 100 saved searches per member");
    return this.prisma.recruiterSavedSearch.create({
      data: {
        organisationId: ctx.organisationId,
        userId: ctx.userId,
        name: dto.name.trim(),
        shared: dto.shared,
        filters: filters as Prisma.InputJsonObject,
      },
    });
  }
  async recentSearches(ctx: OrgContext) {
    const rows = await this.prisma.auditLog.findMany({
      where: {
        organisationId: ctx.organisationId,
        actorId: ctx.userId,
        action: "RECRUITER_SEARCH_PERFORMED",
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, createdAt: true, metadata: true },
    });
    return rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt,
      filters: (r.metadata as Prisma.JsonObject)?.filters ?? {},
    }));
  }
  async recordSearch(ctx: OrgContext, dto: RecentSearchDto) {
    if (!dto.filters)
      throw new BadRequestException("Search filters are required");
    parseKeywords(dto.filters.search ?? "");
    parseKeywords(dto.filters.exclude ?? "");
    if (dto.filters.folderId) await this.folder(ctx, dto.filters.folderId);
    const filters = { ...dto.filters, page: 1 };
    try {
      await this.prisma.auditLog.create({
        data: {
          id: dto.requestId,
          actorId: ctx.userId,
          actorRole: ctx.role,
          organisationId: ctx.organisationId,
          action: "RECRUITER_SEARCH_PERFORMED",
          entityType: "RECRUITER_SEARCH",
          entityId: dto.requestId,
          metadata: { filters } as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (
        !(e instanceof Prisma.PrismaClientKnownRequestError) ||
        e.code !== "P2002"
      )
        throw e;
      const existing = await this.prisma.auditLog.findFirst({
        where: {
          id: dto.requestId,
          organisationId: ctx.organisationId,
          actorId: ctx.userId,
          action: "RECRUITER_SEARCH_PERFORMED",
        },
      });
      if (!existing)
        throw new BadRequestException("Invalid search request identifier");
    }
    return { recorded: true };
  }
  async deleteSearch(ctx: OrgContext, id: string) {
    const row = await this.prisma.recruiterSavedSearch.findFirst({
      where: { id, organisationId: ctx.organisationId, userId: ctx.userId },
    });
    if (!row) throw new NotFoundException("Search not found");
    await this.prisma.recruiterSavedSearch.delete({ where: { id } });
    return { deleted: true };
  }
}


