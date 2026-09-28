// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Global Configuration Settings
// Base Route: /api/v1/platform/settings
// ============================================================

import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformSettingsService } from './platform-settings.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/settings')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN) // Super Admin only for global system settings
export class PlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.SETTINGS_READ)
  async getAllSettings() {
    return this.settingsService.findAllSettings();
  }

  @Patch(':key')
  @RequirePermissions(PlatformPermissions.SETTINGS_MANAGE)
  async updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.settingsService.updateSetting(key, dto, actor, ip, ua);
  }
}
