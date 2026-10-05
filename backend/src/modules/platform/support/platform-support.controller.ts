// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Support Ticket System
// Base Route: /api/v1/platform/support
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
import { PlatformSupportService } from './platform-support.service';
import {
  QuerySupportTicketsDto,
  CreateSupportTicketDto,
  UpdateSupportTicketDto,
  UpdateTicketStatusDto,
  AssignTicketDto,
  CreateSupportMessageDto,
} from './dto/support-ticket.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform/support')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformSupportController {
  constructor(private readonly supportService: PlatformSupportService) {}

  @Get()
  @RequirePermissions(PlatformPermissions.SUPPORT_READ)
  async findAll(@Query() query: QuerySupportTicketsDto) {
    return this.supportService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PlatformPermissions.SUPPORT_READ)
  async findOne(@Param('id') id: string) {
    return this.supportService.findOne(id);
  }

  @Post()
  @RequirePermissions(PlatformPermissions.SUPPORT_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSupportTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.supportService.create(dto, actor, ipAddress, userAgent);
  }

  @Post(':id/messages')
  @RequirePermissions(PlatformPermissions.SUPPORT_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Param('id') id: string,
    @Body() dto: CreateSupportMessageDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.supportService.addMessage(id, dto, actor, ipAddress, userAgent);
  }

  @Patch(':id')
  @RequirePermissions(PlatformPermissions.SUPPORT_MANAGE)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateSupportTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.supportService.update(id, dto, actor, ipAddress, userAgent);
  }

  @Patch(':id/status')
  @RequirePermissions(PlatformPermissions.SUPPORT_MANAGE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTicketStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.supportService.updateStatus(id, dto, actor, ipAddress, userAgent);
  }

  @Patch(':id/assignment')
  @RequirePermissions(PlatformPermissions.SUPPORT_MANAGE)
  async assignTicket(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.supportService.assignTicket(id, dto, actor, ipAddress, userAgent);
  }
}
