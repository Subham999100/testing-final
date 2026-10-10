import { Prisma } from "@prisma/client";
import { RecruiterService } from "./recruiter.service";
import { OrgContext } from "../common/org-context";
const ctx = {
  organisationId: "org-1",
  userId: "member-1",
  role: "RECRUITER",
  permissions: ["candidates.search"],
} as OrgContext;
const dto = {
  requestId: "d1712fa7-e8e4-401f-8108-08df45ad8e0c",
  filters: { search: "Java", page: 3, limit: 20 },
};
function setup() {
  const prisma = {
    auditLog: {
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return {
    prisma,
    service: new RecruiterService(
      prisma as any,
      {} as any,
      {} as any,
      {} as any,
    ),
  };
}
describe("Recent search history isolation", () => {
  it("persists a normalized search owned by the current organisation member", async () => {
    const { service, prisma } = setup();
    await service.recordSearch(ctx, dto);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: dto.requestId,
        actorId: ctx.userId,
        organisationId: ctx.organisationId,
        metadata: { filters: { ...dto.filters, page: 1 } },
      }),
    });
  });
  it("accepts replay only if the existing request belongs to this actor and organisation", async () => {
    const { service, prisma } = setup();
    prisma.auditLog.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Duplicate", {
        code: "P2002",
        clientVersion: "6",
      }),
    );
    prisma.auditLog.findFirst.mockResolvedValue({ id: dto.requestId });
    await expect(service.recordSearch(ctx, dto)).resolves.toEqual({
      recorded: true,
    });
    expect(prisma.auditLog.findFirst).toHaveBeenCalledWith({
      where: {
        id: dto.requestId,
        organisationId: ctx.organisationId,
        actorId: ctx.userId,
        action: "RECRUITER_SEARCH_PERFORMED",
      },
    });
    prisma.auditLog.findFirst.mockResolvedValue(null);
    await expect(service.recordSearch(ctx, dto)).rejects.toThrow(
      "Invalid search request identifier",
    );
  });
  it("limits history retrieval to the last 30 searches for this member", async () => {
    const { service, prisma } = setup();
    await service.recentSearches(ctx);
    expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 30,
        where: {
          organisationId: ctx.organisationId,
          actorId: ctx.userId,
          action: "RECRUITER_SEARCH_PERFORMED",
        },
      }),
    );
  });
});