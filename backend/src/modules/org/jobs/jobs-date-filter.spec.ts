import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JobsService } from './jobs.service';
import { OrgContext } from '../common/org-context';
import { ALL_ORG_PERMISSIONS } from '../common/org-permissions';

describe('JobsService - Date Range Filtering', () => {
  let service: JobsService;
  let prismaMock: any;
  let eventsMock: any;
  let auditMock: any;

  const adminCtx: OrgContext = {
    userId: 'usr-admin',
    email: 'admin@acme.com',
    firstName: 'Admin',
    lastName: 'User',
    organisationId: 'org-123',
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_ADMIN,
    permissions: [...ALL_ORG_PERMISSIONS],
    ip: '127.0.0.1',
    userAgent: 'test-agent',
  };

  beforeEach(() => {
    prismaMock = {
      job: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    eventsMock = { emit: jest.fn() };
    auditMock = { log: jest.fn() };

    service = new JobsService(
      prismaMock,
      eventsMock,
      auditMock,
    );
  });

  it('applies exclusive next-day upper bound for single endDate', async () => {
    await service.list(adminCtx, { endDate: '2026-05-15' });

    expect(prismaMock.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              createdAt: {
                lt: new Date('2026-05-16T00:00:00.000Z'),
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('applies start of day bound for single startDate', async () => {
    await service.list(adminCtx, { startDate: '2026-05-10' });

    expect(prismaMock.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              createdAt: {
                gte: new Date('2026-05-10T00:00:00.000Z'),
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('applies both start and exclusive next-day bounds for a date range', async () => {
    await service.list(adminCtx, {
      startDate: '2026-05-10',
      endDate: '2026-05-15',
    });

    expect(prismaMock.job.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              createdAt: {
                gte: new Date('2026-05-10T00:00:00.000Z'),
                lt: new Date('2026-05-16T00:00:00.000Z'),
              },
            }),
          ]),
        }),
      }),
    );
  });

  it('rejects reversed date range where startDate is after endDate', async () => {
    await expect(
      service.list(adminCtx, {
        startDate: '2026-05-20',
        endDate: '2026-05-10',
      }),
    ).rejects.toThrow(
      new BadRequestException('Start date cannot be after end date'),
    );
  });

  it('rejects invalid date strings', async () => {
    await expect(
      service.list(adminCtx, { startDate: 'invalid-date' }),
    ).rejects.toThrow(new BadRequestException('Invalid start date'));

    await expect(
      service.list(adminCtx, { endDate: 'invalid-date' }),
    ).rejects.toThrow(new BadRequestException('Invalid end date'));
  });
});
