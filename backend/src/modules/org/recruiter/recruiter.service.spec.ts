import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RecruiterService } from './recruiter.service';
import { OrgContext } from '../common/org-context';
import { CandidatesService } from '../hiring/candidates.service';
const ctx = {
  organisationId: 'org-a',
  userId: 'member-a',
  permissions: ['candidates.read'],
  role: 'RECRUITER',
} as OrgContext;
function setup() {
  const prisma = {
    recruiterFolder: { findFirst: jest.fn() },
    candidate: { count: jest.fn(), findMany: jest.fn().mockResolvedValue([]) },
    recruiterFolderCandidate: { createMany: jest.fn(), deleteMany: jest.fn() },
    recruiterSavedSearch: {
      findFirst: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
    $transaction: jest.fn().mockResolvedValue([[{ total: 0n }], []]),
  };
  const candidates = { findInOrg: jest.fn().mockResolvedValue({ id: 'candidate-a', skills: ['Java'] }) };
  return {
    prisma,
    candidates,
    service: new RecruiterService(prisma as never, candidates as never, {} as never, {} as never),
  };
}
describe('Recruiter tenant and owner boundaries', () => {
  it('rejects private folder access before searching', async () => {
    const { service, prisma } = setup();
    prisma.recruiterFolder.findFirst.mockResolvedValue(null);
    await expect(service.search(ctx, { folderId: 'other', page: 1, limit: 20 })).rejects.toThrow(
      NotFoundException,
    );
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
    expect(prisma.recruiterFolder.findFirst).toHaveBeenCalledWith({
      where: { id: 'other', organisationId: 'org-a', userId: 'member-a' },
    });
  });
  it('rejects a mixed-tenant bulk selection without partial writes', async () => {
    const { service, prisma } = setup();
    prisma.recruiterFolder.findFirst.mockResolvedValue({});
    prisma.candidate.count.mockResolvedValue(1);
    await expect(
      service.folderCandidates(ctx, 'folder', { candidateIds: ['own', 'foreign'] }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.recruiterFolderCandidate.createMany).not.toHaveBeenCalled();
  });
  it('does not delete another member’s search', async () => {
    const { service, prisma } = setup();
    prisma.recruiterSavedSearch.findFirst.mockResolvedValue(null);
    await expect(service.deleteSearch(ctx, 'other')).rejects.toThrow(NotFoundException);
  });
  it('removes private filters when sharing searches', async () => {
    const { service, prisma } = setup();
    await service.saveSearch(ctx, {
      name: 'Backend',
      shared: true,
      filters: { search: 'Java', folderId: 'private', saved: 'true', hideViewed: 'true', page: 4, limit: 20 },
    });
    expect(prisma.recruiterSavedSearch.create.mock.calls[0][0].data.filters).toEqual({
      search: 'Java',
      page: 1,
      limit: 20,
    });
  });
  it('requires job-read permission before job matching', async () => {
    const { service } = setup();
    await expect(service.similar(ctx, 'candidate-a', 'job')).rejects.toThrow(ForbiddenException);
  });
  it('scopes even an empty search and adds stable pagination', async () => {
    const { service, prisma } = setup();
    await service.search(ctx, { page: 2, limit: 20 });
    const sql = prisma.$queryRaw.mock.calls[1][0];
    expect(sql.values).toContain('org-a');
    expect(sql.values.slice(-2)).toEqual([20, 20]);
    expect(sql.text).toContain('c.id ASC');
  });
  it('rejects inverted ranges before executing a query', async () => {
    const { service, prisma } = setup();
    await expect(
      service.search(ctx, { minExperience: 10, maxExperience: 2, page: 1, limit: 20 }),
    ).rejects.toThrow();
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });
});
describe('Contact unlock permission regression', () => {
  it('hides contact data after resume permission is removed even if org previously unlocked', async () => {
    const prisma = {
      candidate: {
        findFirst: jest
          .fn()
          .mockResolvedValue({
            id: 'c',
            firstName: 'A',
            lastName: 'B',
            email: 'private@example.test',
            skills: [],
          }),
      },
      tokenTransaction: { findMany: jest.fn().mockResolvedValue([{ idempotencyKey: 'resume:c' }]) },
      application: { findMany: jest.fn().mockResolvedValue([]) },
      candidateNote: { findMany: jest.fn().mockResolvedValue([]) },
      savedCandidate: { findUnique: jest.fn().mockResolvedValue(null) },
      candidateMessage: { count: jest.fn().mockResolvedValue(0) },
    };
    const service = new CandidatesService(prisma as never, {} as never, {} as never);
    const result = await service.get(ctx, 'c');
    expect(result.contact).toBeNull();
    expect(result.unlocked).toBe(false);
    expect(prisma.tokenTransaction.findMany).not.toHaveBeenCalled();
  });
});
