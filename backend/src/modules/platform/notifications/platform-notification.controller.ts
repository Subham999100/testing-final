// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Notifications
// Base Route: /api/v1/platform/notifications
// ============================================================

import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PlatformNotificationService } from './platform-notification.service';
import { QueryNotificationDto } from './dto/query-notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

@Controller('platform/notifications')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformNotificationController {
  constructor(
    private readonly notificationService: PlatformNotificationService,
  ) {}

  @Get()
  @RequirePermissions(PlatformPermissions.NOTIFICATIONS_READ)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryNotificationDto,
  ) {
    return this.notificationService.findAll(user.userId, query);
  }

  @Get('unread-count')
  @RequirePermissions(PlatformPermissions.NOTIFICATIONS_READ)
  async getUnreadCount(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.getUnreadCount(user.userId);
  }

  @Patch(':id/read')
  @RequirePermissions(PlatformPermissions.NOTIFICATIONS_READ)
  async markRead(@Param('id') id: string) {
    return this.notificationService.markRead(id);
  }

  @Post('mark-all-read')
  @RequirePermissions(PlatformPermissions.NOTIFICATIONS_READ)
  @HttpCode(HttpStatus.OK)
  async markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationService.markAllRead(user.userId);
  }

  @Delete(':id')
  @RequirePermissions(PlatformPermissions.NOTIFICATIONS_READ)
  async deleteNotification(@Param('id') id: string) {
    return this.notificationService.deleteNotification(id);
  }
}
