// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Analytics & Insights
// Base Route: /api/v1/platform/analytics
// ============================================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformAnalyticsService } from './platform-analytics.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/analytics')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformAnalyticsController {
  constructor(private readonly analyticsService: PlatformAnalyticsService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.ANALYTICS_READ)
  async getAnalytics(@Query('timeframe') timeframe?: string) {
    return this.analyticsService.getPlatformAnalytics(timeframe);
  }
}
