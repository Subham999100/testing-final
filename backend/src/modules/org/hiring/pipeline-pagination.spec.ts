import { NotFoundException } from "@nestjs/common";
import { ApplicationsService } from "./applications.service";
import { OrgContext } from "../common/org-context";
const ctx = {
  organisationId: "org-one",
  userId: "recruiter-one",
  role: "RECRUITER",
  permissions: ["applications.read.assigned", "jobs.read.assigned"],
} as OrgContext;
describe("Pipeline pagination", () => {
  let service: ApplicationsService;
  let prisma: any;
  beforeEach(() => {
    prisma = {
      job: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: "job-one",
            title: "Developer",
            status: "PUBLISHED",
          }),
      },
      application: {
        groupBy: jest.fn().mockResolvedValue([
          { stage: "APPLIED", _count: { _all: 1000 } },
          { stage: "SCREENING", _count: { _all: 200 } },
        ]),
        findMany: jest.fn().mockResolvedValue([]),
      },
      orgSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    };
    service = new ApplicationsService(prisma, {} as any);
  });
  it("returns full counts with a bounded page beyond the old 500-row cap", async () => {
    const result = await service.pipeline(ctx, "job-one", {
      page: 31,
      limit: 20,
    });
    expect(result.pagination).toEqual({
      page: 31,
      limit: 20,
      total: 1200,
      totalPages: 60,
    });
    expect(result.counts.APPLIED).toBe(1000);
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 600,
        take: 20,
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      }),
    );
    const scope = prisma.application.groupBy.mock.calls[0][0].where.AND;
    expect(scope).toContainEqual({ jobId: "job-one" });
    expect(scope[0]).toMatchObject({
      organisationId: "org-one",
      OR: expect.any(Array),
    });
  });
  it("filters the page by stage but keeps all search-matching stage counts", async () => {
    const result = await service.pipeline(ctx, "job-one", {
      page: 999,
      limit: 50,
      stage: "SCREENING",
      search: "Sara Khan",
    });
    expect(result.pagination).toEqual({
      page: 4,
      limit: 50,
      total: 200,
      totalPages: 4,
    });
    const groupedWhere = prisma.application.groupBy.mock.calls[0][0].where.AND;
    const rowsWhere = prisma.application.findMany.mock.calls[0][0].where.AND;
    expect(groupedWhere).not.toContainEqual({ stage: "SCREENING" });
    expect(rowsWhere).toContainEqual({ stage: "SCREENING" });
    expect(JSON.stringify(groupedWhere)).toContain("Sara");
    expect(JSON.stringify(groupedWhere)).toContain("Khan");
    expect(result.counts.APPLIED).toBe(1000);
  });
  it("does not read application counts or rows for an inaccessible job", async () => {
    prisma.job.findFirst.mockResolvedValue(null);
    await expect(service.pipeline(ctx, "other-job")).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.application.groupBy).not.toHaveBeenCalled();
    expect(prisma.application.findMany).not.toHaveBeenCalled();
  });
});