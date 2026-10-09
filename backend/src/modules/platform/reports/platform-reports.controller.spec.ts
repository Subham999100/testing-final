// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: PlatformReportsController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformReportsController } from './platform-reports.controller';
import { PlatformReportsService } from './platform-reports.service';
import { ReportTimeframe } from './dto/query-report.dto';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

describe('PlatformReportsController', () => {
  let controller: PlatformReportsController;
  let service: jest.Mocked<PlatformReportsService>;

  beforeEach(async () => {
    const mockService = {
      getOverview: jest.fn().mockResolvedValue({
        timeframe: '30d',
        organisations: { total: 10, active: 8 },
        users: { total: 50, active: 45 },
        recruiters: { total: 12, active: 10 },
        jobs: { total: 20, active: 15 },
        applications: { total: 100 },
        trends: [],
        topOrganisations: [],
      }),
      getOrganisationsReport: jest.fn().mockResolvedValue({ total: 10 }),
      getUsersReport: jest.fn().mockResolvedValue({ total: 50 }),
      getJobsReport: jest.fn().mockResolvedValue({ total: 20 }),
      getApplicationsReport: jest.fn().mockResolvedValue({ total: 100 }),
      exportCsv: jest.fn().mockResolvedValue('Header1,Header2\nVal1,Val2'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformReportsController],
      providers: [{ provide: PlatformReportsService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlatformReportsController>(PlatformReportsController);
    service = module.get(PlatformReportsService);
  });

  it('should return overview', async () => {
    const result = await controller.getOverview({ timeframe: ReportTimeframe.LAST_30_DAYS });
    expect(result.organisations.total).toBe(10);
    expect(service.getOverview).toHaveBeenCalled();
  });

  it('should return organisations report', async () => {
    const result = await controller.getOrganisationsReport({});
    expect(result.total).toBe(10);
    expect(service.getOrganisationsReport).toHaveBeenCalled();
  });

  it('should export CSV with headers', async () => {
    const mockRes = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.exportCsv({ type: 'overview' }, mockRes);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(mockRes.send).toHaveBeenCalledWith('Header1,Header2\nVal1,Val2');
  });
});
