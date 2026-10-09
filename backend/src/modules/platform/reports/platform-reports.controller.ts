// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Reports & Analytics Aggregation
// Base Route: /api/v1/platform/reports
// ============================================================

import {
  Controller,
  Get,
  Query,
  UseGuards,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformReportsService } from './platform-reports.service';
import { QueryReportDto } from './dto/query-report.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/reports')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformReportsController {
  constructor(private readonly reportsService: PlatformReportsService) {}

  @Get('overview')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  async getOverview(@Query() query: QueryReportDto) {
    return this.reportsService.getOverview(query);
  }

  @Get('organisations')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  async getOrganisationsReport(@Query() query: QueryReportDto) {
    return this.reportsService.getOrganisationsReport(query);
  }

  @Get('users')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  async getUsersReport(@Query() query: QueryReportDto) {
    return this.reportsService.getUsersReport(query);
  }

  @Get('jobs')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  async getJobsReport(@Query() query: QueryReportDto) {
    return this.reportsService.getJobsReport(query);
  }

  @Get('applications')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  async getApplicationsReport(@Query() query: QueryReportDto) {
    return this.reportsService.getApplicationsReport(query);
  }

  @Get('export')
  @RequirePermissions(
    PlatformPermissions.REPORTS_READ,
    PlatformPermissions.REPORTS_GENERATE,
    PlatformPermissions.REPORTS_EXPORT,
  )
  @Header('Content-Type', 'text/csv')
  async exportCsv(@Query() query: QueryReportDto, @Res() res: Response) {
    const csvData = await this.reportsService.exportCsv(query);
    const filename = `clyptus-${query.type || 'report'}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv');
    return res.status(200).send(csvData);
  }
}
