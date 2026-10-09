// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Organisation Oversight & Management
// Base Route: /api/v1/platform/organisations
//
// Security:
// Only platform administrators with explicit permissions can access.
// Never trust client-provided actor identity.
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { PlatformOrganisationService } from './platform-organisation.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { SuspendOrganisationDto } from './dto/suspend-organisation.dto';
import { QueryOrganisationDto } from './dto/query-organisation.dto';
import { TransferSuperAdminDto } from './dto/transfer-super-admin.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/organisations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformOrganisationController {
  constructor(
    private readonly organisationService: PlatformOrganisationService,
  ) {}

  @Get()
  @RequirePermissions(
    PlatformPermissions.ORGANISATIONS_READ,
    PlatformPermissions.USERS_READ,
  )
  async findAll(@Query() query: QueryOrganisationDto) {
    return this.organisationService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_READ)
  async findOne(@Param('id') id: string) {
    return this.organisationService.findOne(id);
  }

  @Post()
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_CREATE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.create(dto, actor, ipAddress, userAgent);
  }

  @Patch(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.update(id, dto, actor, ipAddress, userAgent);
  }

  @Post(':id/suspend')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_SUSPEND)
  @HttpCode(HttpStatus.OK)
  async suspend(
    @Param('id') id: string,
    @Body() dto: SuspendOrganisationDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.suspend(id, dto, actor, ipAddress, userAgent);
  }

  @Post(':id/activate')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_SUSPEND)
  @HttpCode(HttpStatus.OK)
  async activate(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.activate(id, actor, ipAddress, userAgent);
  }

  @Post(':id/super-admin/reset-password')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  @HttpCode(HttpStatus.OK)
  async resetSuperAdminPassword(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.resetSuperAdminPassword(id, actor, ipAddress, userAgent);
  }

  @Post(':id/super-admin/transfer')
  @RequirePermissions(
    PlatformPermissions.ORGANISATIONS_UPDATE,
    PlatformPermissions.USERS_READ,
  )
  @HttpCode(HttpStatus.OK)
  async transferSuperAdmin(
    @Param('id') id: string,
    @Body() dto: TransferSuperAdminDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.transferSuperAdminCredentials(id, dto, actor, ipAddress, userAgent);
  }

  @Delete(':id')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_DELETE)
  @HttpCode(HttpStatus.OK)
  async remove(
    @Param('id') id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.organisationService.remove(id, actor, ipAddress, userAgent);
  }
}
