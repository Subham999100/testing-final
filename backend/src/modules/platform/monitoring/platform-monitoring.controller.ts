// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Infrastructure Health & Monitoring
// Base Route: /api/v1/platform/monitoring
// ============================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformMonitoringService } from './platform-monitoring.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/monitoring')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformMonitoringController {
  constructor(private readonly monitoringService: PlatformMonitoringService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async getMonitoring() {
    return this.monitoringService.getOverview();
  }

  @Get('overview')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async getMonitoringOverview() {
    return this.monitoringService.getOverview();
  }
}
