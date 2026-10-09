// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Centralized Audit Logs
// Base Route: /api/v1/platform/audit-logs
// ============================================================

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditService, AuditQueryDto } from '../../audit/audit.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformAuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.AUDIT_READ)
  async getAuditLogs(@Query() query: AuditQueryDto) {
    return this.auditService.findAuditLogs(query);
  }
}
