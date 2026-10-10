import { reportPdf, reportXlsx } from "./report-files";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../../database/prisma.service";
import { OrgContext, assertCan, can } from "../common/org-context";
import { applicationScope, jobScope, toCsv } from "../common/org-helpers";
import { ReportQueryDto } from "./workspace.dto";
const DAY = 86400000;
const analytics = (ctx: OrgContext) =>
  ["analytics.self", "analytics.recruiter", "analytics.org"].some((p) =>
    can(ctx, p as any),
  );
export function reportRange(q: ReportQueryDto) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const to = q.to || today,
    from = q.from || `${to.slice(0, 7)}-01`;
  for (const value of [from, to]) {
    const date = new Date(`${value}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(+date) ||
      date.toISOString().slice(0, 10) !== value
    )
      throw new BadRequestException("Enter valid report dates");
  }
  const start = new Date(`${from}T00:00:00+05:30`),
    end = new Date(+new Date(`${to}T00:00:00+05:30`) + DAY);
  if (+start >= +end || +end - +start > 366 * DAY)
    throw new BadRequestException("Choose a date range of up to 366 days");
  return { from, to, start, end };
}
export function reportActor(ctx: OrgContext, q: ReportQueryDto) {
  if (!analytics(ctx))
    throw new ForbiddenException("Analytics permission is required");
  if (!can(ctx, "analytics.org")) {
    if (q.userId && q.userId !== ctx.userId)
      throw new ForbiddenException("You can only report on your own activity");
    return ctx.userId;
  }
  return q.userId;
}
@Injectable()
export class RecruiterReportsService {
  constructor(private readonly prisma: PrismaService) {}
  async run(ctx: OrgContext, q: ReportQueryDto, exporting = false) {
    const actorId = reportActor(ctx, q),
      range = reportRange(q);
    const { start, end } = range;
    const page = exporting ? 1 : q.page || 1,
      limit = exporting ? 10001 : q.limit || 20,
      skip = (page - 1) * limit;
    let rows: Record<string, unknown>[] = [],
      columns: string[] = [],
      total = 0;
    let summary: unknown = null;
    const createdAt = { gte: start, lt: end };
    const scope = actorId
      ? actorId === ctx.userId
        ? "Own activity"
        : "Selected member activity"
      : "Organisation activity";
    if (q.feature && q.type !== "inventory")
      throw new BadRequestException(
        "Feature filters apply to the inventory report",
      );
    if (q.type === "usage" || q.type === "inventory") {
      assertCan(ctx, "tokens.read");
      const actor = actorId
        ? Prisma.sql`AND t."actorId" = ${actorId}`
        : Prisma.empty;
      const feature = q.feature
        ? Prisma.sql`AND t.metadata->>'feature' = ${q.feature}`
        : Prisma.empty;
      const metric = async (from: Date, to: Date) => {
        const result = await this.prisma.$queryRaw<
          { debited: bigint; refunded: bigint; resumeUnlocks: bigint }[]
        >(Prisma.sql`
          SELECT COALESCE(SUM(CASE WHEN t.type = 'CONSUMPTION' THEN -t.amount ELSE 0 END),0)::bigint AS debited,
          COALESCE(SUM(CASE WHEN t.type = 'REFUND' THEN t.amount ELSE 0 END),0)::bigint AS refunded,
          COUNT(*) FILTER (WHERE t.type = 'CONSUMPTION' AND t.metadata->>'feature' = 'RESUME_VIEW') AS "resumeUnlocks"
          FROM token_transactions t WHERE t."organisationId" = ${ctx.organisationId} AND t."createdAt" >= ${from} AND t."createdAt" < ${to} ${actor} ${feature}`);
        const r = result[0];
        return {
          debited: Number(r.debited),
          refunded: Number(r.refunded),
          net: Number(r.debited) - Number(r.refunded),
          resumeUnlocks: Number(r.resumeUnlocks),
        };
      };
      const dayStart = new Date(`${range.to}T00:00:00+05:30`);
      const monthStart = new Date(`${range.to.slice(0, 7)}-01T00:00:00+05:30`);
      const [period, daily, monthly] = await Promise.all([
        metric(start, end),
        metric(dayStart, end),
        metric(monthStart, end),
      ]);
      summary = { period, daily, monthly };
      if (q.type === "inventory") {
        const where: Prisma.TokenTransactionWhereInput = {
          organisationId: ctx.organisationId,
          createdAt,
          type: { in: ["CONSUMPTION", "REFUND"] },
          ...(actorId ? { actorId } : {}),
          ...(q.feature
            ? { metadata: { path: ["feature"], equals: q.feature } }
            : {}),
        };
        const [count, records] = await Promise.all([
          this.prisma.tokenTransaction.count({ where }),
          this.prisma.tokenTransaction.findMany({
            where,
            skip,
            take: limit,
            orderBy: [{ createdAt: "desc" }, { id: "asc" }],
            include: {
              actor: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          }),
        ]);
        total = count;
        columns = [
          "Date",
          "Member",
          "Email",
          "Feature",
          "Type",
          "Tokens",
          "Reference",
          "Reason",
        ];
        rows = records.map((r) => ({
          Date: r.createdAt.toISOString(),
          Member: r.actor
            ? `${r.actor.firstName} ${r.actor.lastName}`
            : "Former member",
          Email: r.actor?.email ?? "",
          Feature: (r.metadata as any)?.feature ?? "Other",
          Type: r.type,
          Tokens: -r.amount,
          Reference: r.referenceId ?? "",
          Reason: r.reason ?? "",
        }));
      } else {
        const where = {
          organisationId: ctx.organisationId,
          ...(actorId ? { id: actorId } : {}),
          orgMemberProfile: { isNot: null },
        };
        const [count, users] = await Promise.all([
          this.prisma.user.count({ where }),
          this.prisma.user.findMany({
            where,
            skip,
            take: limit,
            orderBy: { id: "asc" },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              isActive: true,
            },
          }),
        ]);
        total = count;
        columns = [
          "Member",
          "Login email",
          "Account status",
          "Searches performed",
          "Resume unlocks",
          "Tokens debited",
          "Tokens refunded",
          "Net tokens",
        ];
        const memberIds = users.map((u) => u.id);
        const [groups, searches, unlocks] = await Promise.all([
          this.prisma.tokenTransaction.groupBy({
            by: ["actorId", "type"],
            where: {
              organisationId: ctx.organisationId,
              actorId: { in: memberIds },
              createdAt,
              type: { in: ["CONSUMPTION", "REFUND"] },
            },
            _sum: { amount: true },
          }),
          this.prisma.auditLog.groupBy({
            by: ["actorId"],
            where: {
              organisationId: ctx.organisationId,
              actorId: { in: memberIds },
              action: "RECRUITER_SEARCH_PERFORMED",
              createdAt,
            },
            _count: { _all: true },
          }),
          this.prisma.tokenTransaction.groupBy({
            by: ["actorId"],
            where: {
              organisationId: ctx.organisationId,
              actorId: { in: memberIds },
              createdAt,
              type: "CONSUMPTION",
              metadata: { path: ["feature"], equals: "RESUME_VIEW" },
            },
            _count: { _all: true },
          }),
        ]);
        const amounts = new Map(
          groups.map((g) => [`${g.actorId}:${g.type}`, g._sum.amount ?? 0]),
        );
        const searchCounts = new Map(
          searches.map((g) => [g.actorId, g._count._all]),
        );
        const unlockCounts = new Map(
          unlocks.map((g) => [g.actorId, g._count._all]),
        );
        rows = users.map((u) => {
          const debited = -(amounts.get(`${u.id}:CONSUMPTION`) ?? 0),
            refunded = amounts.get(`${u.id}:REFUND`) ?? 0;
          return {
            Member: `${u.firstName} ${u.lastName}`,
            "Login email": u.email,
            "Account status": u.isActive ? "Active" : "Inactive",
            "Searches performed": searchCounts.get(u.id) ?? 0,
            "Resume unlocks": unlockCounts.get(u.id) ?? 0,
            "Tokens debited": debited,
            "Tokens refunded": refunded,
            "Net tokens": debited - refunded,
          };
        });
      }
    } else if (q.type === "jobs") {
      if (!can(ctx, "jobs.read.all") && !can(ctx, "jobs.read.assigned"))
        throw new ForbiddenException("Job access required");
      const where: Prisma.JobWhereInput = {
        AND: [
          jobScope(ctx),
          { publishedAt: createdAt },
          ...(actorId ? [{ createdById: actorId }] : []),
        ],
      };
      const [count, records] = await Promise.all([
        this.prisma.job.count({ where }),
        this.prisma.job.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ publishedAt: "desc" }, { id: "asc" }],
        }),
      ]);
      total = count;
      columns = [
        "Job ID",
        "Job title",
        "Location",
        "Status",
        "Published",
        "Openings",
      ];
      rows = records.map((r) => ({
        "Job ID": r.id,
        "Job title": r.title,
        Location: r.location ?? "",
        Status: r.status,
        Published: r.publishedAt?.toISOString() ?? "",
        Openings: r.openings,
      }));
    } else if (q.type === "interviews") {
      assertCan(ctx, "interviews.read");
      const where: Prisma.InterviewWhereInput = {
        organisationId: ctx.organisationId,
        scheduledAt: createdAt,
        AND: [
          {
            OR: [
              { application: applicationScope(ctx) },
              { interviewers: { some: { userId: ctx.userId } } },
            ],
          },
          ...(actorId
            ? [
                {
                  OR: [
                    { createdById: actorId },
                    { interviewers: { some: { userId: actorId } } },
                  ],
                },
              ]
            : []),
        ],
      };
      const [count, records] = await Promise.all([
        this.prisma.interview.count({ where }),
        this.prisma.interview.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ scheduledAt: "desc" }, { id: "asc" }],
          include: {
            application: {
              include: {
                candidate: { select: { firstName: true, lastName: true } },
                job: { select: { title: true } },
              },
            },
          },
        }),
      ]);
      total = count;
      columns = [
        "Interview",
        "Candidate",
        "Job",
        "Scheduled",
        "Mode",
        "Status",
      ];
      rows = records.map((r) => ({
        Interview: r.title,
        Candidate: `${r.application.candidate.firstName} ${r.application.candidate.lastName}`,
        Job: r.application.job.title,
        Scheduled: r.scheduledAt.toISOString(),
        Mode: r.mode,
        Status: r.status,
      }));
    } else {
      assertCan(ctx, "offers.read");
      const where: Prisma.OfferWhereInput = {
        organisationId: ctx.organisationId,
        createdAt,
        application: applicationScope(ctx),
        ...(actorId ? { createdById: actorId } : {}),
      };
      const [count, records] = await Promise.all([
        this.prisma.offer.count({ where }),
        this.prisma.offer.findMany({
          where,
          skip,
          take: limit,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          include: {
            application: {
              include: {
                candidate: { select: { firstName: true, lastName: true } },
                job: { select: { title: true } },
              },
            },
          },
        }),
      ]);
      total = count;
      columns = ["Offer", "Candidate", "Job", "Status", "Created", "Sent"];
      rows = records.map((r) => ({
        Offer: r.title,
        Candidate: `${r.application.candidate.firstName} ${r.application.candidate.lastName}`,
        Job: r.application.job.title,
        Status: r.status,
        Created: r.createdAt.toISOString(),
        Sent: r.sentAt?.toISOString() ?? "",
      }));
    }
    return {
      columns,
      rows,
      summary,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      scope,
      from: range.from,
      to: range.to,
      timeZone: "Asia/Kolkata",
      canExport: can(ctx, "exports.run") || can(ctx, "reports.export.self"),
    };
  }
  async export(ctx: OrgContext, q: ReportQueryDto) {
    if (!can(ctx, "exports.run")) {
      assertCan(ctx, "reports.export.self");
      if (q.userId && q.userId !== ctx.userId)
        throw new ForbiddenException(
          "This permission only allows your own reports",
        );
      ctx = {
        ...ctx,
        permissions: ctx.permissions.filter((p) => p !== "analytics.org"),
      };
      q = { ...q, userId: ctx.userId };
    }
    const r = await this.run(ctx, q, true);
    if (r.pagination.total > 10000)
      throw new BadRequestException(
        "Narrow the date range to export at most 10,000 rows",
      );
    if (q.format === "pdf") return reportPdf(r);
    if (q.format === "xlsx") return reportXlsx(r);
    return toCsv(r.rows, r.columns);
  }
}
