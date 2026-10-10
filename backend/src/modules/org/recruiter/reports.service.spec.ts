import { ForbiddenException, BadRequestException } from "@nestjs/common";
import {
  reportActor,
  reportRange,
  RecruiterReportsService,
} from "./reports.service";
import { OrgContext } from "../common/org-context";
import { ReportQueryDto } from "./workspace.dto";
const context = (permissions: string[] = ["analytics.self", "tokens.read"]) =>
  ({
    userId: "member-1",
    organisationId: "org-1",
    permissions,
    role: "RECRUITER",
  }) as OrgContext;
const query = (extra: Partial<ReportQueryDto> = {}) =>
  Object.assign(
    new ReportQueryDto(),
    { from: "2026-10-01", to: "2026-10-07" },
    extra,
  );
describe("Recruiter report access and dates", () => {
  it("limits self and recruiter analytics to the signed-in member", () => {
    expect(reportActor(context(), query())).toBe("member-1");
    expect(reportActor(context(["analytics.recruiter"]), query())).toBe(
      "member-1",
    );
    expect(() =>
      reportActor(context(), query({ userId: "another-member" })),
    ).toThrow(ForbiddenException);
  });
  it("requires analytics and only permits organisation scope with analytics.org", () => {
    expect(() => reportActor(context(["tokens.read"]), query())).toThrow(
      ForbiddenException,
    );
    expect(reportActor(context(["analytics.org"]), query())).toBeUndefined();
  });
  it("uses an inclusive IST date range with an exclusive end instant", () => {
    const r = reportRange(query());
    expect(r.start.toISOString()).toBe("2026-09-30T18:30:00.000Z");
    expect(r.end.toISOString()).toBe("2026-10-07T18:30:00.000Z");
  });
  it.each([
    { from: "2026-02-30" },
    { from: "2026-10-08" },
    { from: "2024-01-01" },
  ])("rejects invalid or excessive ranges %p", (extra) =>
    expect(() => reportRange(query(extra))).toThrow(BadRequestException),
  );
  it("enforces token permissions before querying the database", async () => {
    const prisma = { $queryRaw: jest.fn() };
    await expect(
      new RecruiterReportsService(prisma as any).run(
        context(["analytics.self"]),
        query(),
      ),
    ).rejects.toThrow(ForbiddenException);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
  it("scopes inventory records and aggregates to organisation and member", async () => {
    const prisma = {
      $queryRaw: jest
        .fn()
        .mockResolvedValue([{ debited: 4n, refunded: 1n, resumeUnlocks: 2n }]),
      tokenTransaction: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    const r = await new RecruiterReportsService(prisma as any).run(
      context(),
      query({ type: "inventory", feature: "RESUME_VIEW" }),
    );
    expect(prisma.tokenTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organisationId: "org-1",
          actorId: "member-1",
          metadata: { path: ["feature"], equals: "RESUME_VIEW" },
        }),
        take: 20,
        skip: 0,
      }),
    );
    for (const [sql] of prisma.$queryRaw.mock.calls) {
      expect(sql.values).toContain("org-1");
      expect(sql.values).toContain("member-1");
      expect(sql.values).toContain("RESUME_VIEW");
    }
    expect((r.summary as any).period).toEqual({
      debited: 4,
      refunded: 1,
      net: 3,
      resumeUnlocks: 2,
    });
  });
  it("does not allow exporting without export permission and rejects oversized exports", async () => {
    const service = new RecruiterReportsService({} as any);
    await expect(service.export(context(), query())).rejects.toThrow(
      ForbiddenException,
    );
    jest.spyOn(service, "run").mockResolvedValue({
      pagination: { total: 10001 },
      rows: [],
      columns: [],
    } as any);
    await expect(
      service.export(context(["analytics.self", "exports.run"]), query()),
    ).rejects.toThrow("10,000");
  });
});
describe("Own report download permission", () => {
  it("cannot export another member even with organisation analytics", async () => {
    const service = new RecruiterReportsService({} as any);
    await expect(
      service.export(
        context(["analytics.org", "analytics.self", "reports.export.self"]),
        query({ userId: "other" }),
      ),
    ).rejects.toThrow("own reports");
  });
  it("forces own data when granted only the own-report export permission", async () => {
    const service = new RecruiterReportsService({} as any);
    const run = jest
      .spyOn(service, "run")
      .mockResolvedValue({
        rows: [],
        columns: ["Member"],
        pagination: { total: 0 },
      } as any);
    await service.export(
      context(["analytics.org", "analytics.self", "reports.export.self"]),
      query(),
    );
    expect(run.mock.calls[0][0].permissions).not.toContain("analytics.org");
    expect(run.mock.calls[0][1].userId).toBe("member-1");
  });
});