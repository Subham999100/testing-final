// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Admin Management
// Base Route: /api/v1/platform/admins
//
// Security:
// Only PLATFORM_SUPER_ADMIN can create, modify, or deactivate
// other platform administrators.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformAdminService } from './platform-admin.service';
import { CreatePlatformAdminDto } from './dto/create-platform-admin.dto';
import { UpdatePlatformAdminDto } from './dto/update-platform-admin.dto';
import { QueryPlatformAdminDto } from './dto/query-platform-admin.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/admins')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
export class PlatformAdminController {
  constructor(private readonly adminService: PlatformAdminService) {}

  @Get()
  @Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @RequirePermissions(PlatformPermissions.ADMINS_READ)
  async findAll(@Query() query: QueryPlatformAdminDto) {
    return this.adminService.findAll(query);
  }

  @Get(':id')
  @Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
  @RequirePermissions(PlatformPermissions.ADMINS_READ)
  async findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Post()
  @Roles(UserRole.PLATFORM_SUPER_ADMIN) // STRICT: Only Super Admin can create admins
  @RequirePermissions(PlatformPermissions.ADMINS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePlatformAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.adminService.create(dto, actor, ipAddress, userAgent);
  }

  @Patch(':id')
  @Roles(UserRole.PLATFORM_SUPER_ADMIN)
  @RequirePermissions(PlatformPermissions.ADMINS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePlatformAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.adminService.update(id, dto, actor, ipAddress, userAgent);
  }

  @Patch(':id/status')
  @Roles(UserRole.PLATFORM_SUPER_ADMIN)
  @RequirePermissions(PlatformPermissions.ADMINS_DISABLE)
  async toggleStatus(
    @Param('id') id: string,
    @Body('isActive') isActive: boolean,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.adminService.toggleStatus(id, isActive, actor, ipAddress, userAgent);
  }
}
