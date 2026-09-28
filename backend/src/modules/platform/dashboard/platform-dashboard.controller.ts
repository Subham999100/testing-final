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
import { Roles } from '../../../common/decorators/roles.decorator';

@Controller('platform/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformDashboardController {
  constructor(private readonly dashboardService: PlatformDashboardService) {}

  @Get()
  async getDashboardSummary() {
    return this.dashboardService.getDashboardSummary();
  }
}
