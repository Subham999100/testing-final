// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Security & Session Management
// Base Route: /api/v1/platform/security
// ============================================================

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole, SecuritySeverity } from '@prisma/client';
import { PlatformSecurityService } from './platform-security.service';
import { ResolveSecurityEventDto } from './dto/resolve-security-event.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/security')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformSecurityController {
  constructor(private readonly securityService: PlatformSecurityService) {}

  @Get('events')
  @RequirePermissions(PlatformPermissions.SECURITY_READ)
  async getEvents(
    @Query('severity') severity?: SecuritySeverity,
    @Query('isResolved') isResolved?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.securityService.findSecurityEvents({
      severity,
      isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  @Post('events/:id/resolve')
  @RequirePermissions(PlatformPermissions.SECURITY_MANAGE)
  async resolveEvent(
    @Param('id') id: string,
    @Body() dto: ResolveSecurityEventDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.securityService.resolveEvent(id, dto, actor, ip, ua);
  }

  @Get('sessions')
  @RequirePermissions(PlatformPermissions.SECURITY_READ)
  async getActiveSessions() {
    return this.securityService.findActiveSessions();
  }

  @Post('sessions/:id/revoke')
  @RequirePermissions(PlatformPermissions.SECURITY_MANAGE)
  async revokeSession(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.securityService.revokeSession(id, actor, ip, ua);
  }
}
