// ============================================================
// ORGANISATION PORTAL — Members, permissions, invitations,
// and platform provisioning of the first Org Super Admin.
// ============================================================

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { CreateInvitationDto, InvitationQueryDto, MemberQueryDto, OwnerInvitationDto, UpdatePermissionsDto } from './dto';
import { TeamService } from './team.service';

@ApiTags('Org · Members')
@ApiBearerAuth()
@Controller('org')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgMembersController {
  constructor(private readonly team: TeamService) {}

  @Get('members')
  @OrgPerms('members.read')
  list(@Org() ctx: OrgContext, @Query() q: MemberQueryDto) {
    return this.team.listMembers(ctx, q);
  }

  @Get('members/options')
  options(@Org() ctx: OrgContext) {
    return this.team.memberOptions(ctx);
  }

  @Get('members/:id')
  @OrgPerms('members.read')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.getMember(ctx, id);
  }

  @Put('members/:id/permissions')
  @OrgPerms('recruiters.permissions.manage', 'org_admins.manage')
  updatePermissions(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: UpdatePermissionsDto) {
    return this.team.updatePermissions(ctx, id, dto.permissions);
  }

  @Post('members/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('recruiters.manage', 'org_admins.manage')
  suspend(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.suspend(ctx, id);
  }

  @Post('members/:id/reactivate')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('recruiters.manage', 'org_admins.manage')
  reactivate(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.reactivate(ctx, id);
  }

  @Delete('members/:id')
  @OrgPerms('recruiters.manage', 'org_admins.manage')
  remove(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.remove(ctx, id);
  }

  @Get('permissions/catalog')
  catalog(@Org() ctx: OrgContext) {
    return this.team.permissionCatalog(ctx);
  }

  @Get('invitations')
  @OrgPerms('invitations.manage')
  invitations(@Org() ctx: OrgContext, @Query() q: InvitationQueryDto) {
    return this.team.listInvitations(ctx, q);
  }

  @Post('invitations')
  @OrgPerms('invitations.manage')
  invite(@Org() ctx: OrgContext, @Body() dto: CreateInvitationDto) {
    return this.team.createInvitation(ctx, dto);
  }

  @Post('invitations/:id/resend')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('invitations.manage')
  resend(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.resendInvitation(ctx, id);
  }

  @Post('invitations/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('invitations.manage')
  cancel(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.team.cancelInvitation(ctx, id);
  }
}

@ApiTags('Platform · Org provisioning')
@ApiBearerAuth()
@Controller('org-provisioning')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class OrgProvisioningController {
  constructor(private readonly team: TeamService) {}

  @Post('organisations/:orgId/owner-invitations')
  @RequirePermissions(PlatformPermissions.ORGANISATIONS_UPDATE)
  inviteOwner(@CurrentUser() actor: AuthenticatedUser, @Param('orgId') orgId: string, @Body() dto: OwnerInvitationDto) {
    return this.team.createOwnerInvitation(actor, orgId, dto.email);
  }
}
