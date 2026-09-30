// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Dashboard Overview
// Base Route: /api/v1/platform/dashboard
// ============================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformDashboardService } from './platform-dashboard.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformDashboardController {
  constructor(private readonly dashboardService: PlatformDashboardService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.ANALYTICS_READ)
  async getDashboardSummary() {
    return this.dashboardService.getDashboardSummary();
  }
}

