// ============================================================
// ORGANISATION PORTAL — Members, permissions, invitations,
// and platform provisioning of the first Org Super Admin.
// ============================================================

import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { Org, OrgContext, OrgGuard, OrgPerms, can } from '../common/org-context';
import { OrgRole } from '../common/org-permissions';
import {
  CreateInvitationDto,
  InvitationQueryDto,
  MemberQueryDto,
  OwnerInvitationDto,
  UpdateMemberRoleDto,
  UpdatePermissionsDto,
} from './dto';
import { TeamService } from './team.service';

@ApiTags('Org · Members')
@ApiBearerAuth()
@Controller('org')
@UseGuards(JwtAuthGuard, RolesGuard, OrgGuard)
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

  @Patch('members/:id/role')
  @OrgPerms('org_admins.manage')
  updateRole(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: UpdateMemberRoleDto) {
    return this.team.updateMemberRole(ctx, id, dto.role as OrgRole);
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

  @Get('super-admin/capabilities')
  @Roles(UserRole.ORGANISATION_SUPER_ADMIN)
  superAdminCapabilities(@Org() ctx: OrgContext) {
    return {
      organisationId: ctx.organisationId,
      organisationName: ctx.organisationName,
      role: ctx.role,
      fullOrgAccess: true,
      canPurchaseTokens: true,
      canManageBilling: true,
      canManageOrgAdmins: true,
      canManageRecruiters: true,
      canManageIntegrations: true,
      canManageSecurity: true,
      canUpdateOrgProfile: true,
      permissions: ctx.permissions,
    };
  }

  @Get('admin/capabilities')
  @Roles(UserRole.ORGANISATION_SUPER_ADMIN, UserRole.ORGANISATION_ADMIN)
  adminCapabilities(@Org() ctx: OrgContext) {
    const isSuperAdmin = ctx.role === UserRole.ORGANISATION_SUPER_ADMIN;
    return {
      organisationId: ctx.organisationId,
      organisationName: ctx.organisationName,
      role: ctx.role,
      fullOrgAccess: isSuperAdmin,
      canPurchaseTokens: isSuperAdmin,
      canManageBilling: isSuperAdmin,
      canManageOrgAdmins: isSuperAdmin,
      canManageRecruiters: can(ctx, 'recruiters.manage'),
      canManageIntegrations: isSuperAdmin,
      canManageSecurity: isSuperAdmin,
      canUpdateOrgProfile: isSuperAdmin,
      permissions: ctx.permissions,
    };
  }

  @Get(':orgId/super-admin')
  @Roles(UserRole.ORGANISATION_SUPER_ADMIN)
  getSuperAdminData(@Org() ctx: OrgContext, @Param('orgId') orgId: string) {
    if (orgId !== ctx.organisationId) {
      throw new ForbiddenException('Access denied: You are not authorized for this organization');
    }
    return {
      organisationId: ctx.organisationId,
      role: ctx.role,
      fullOrgAccess: true,
      canPurchaseTokens: true,
      canManageBilling: true,
      canCreateOrgAdmins: true,
      canManageRecruiters: true,
    };
  }

  @Get(':orgId/admin')
  @Roles(UserRole.ORGANISATION_SUPER_ADMIN, UserRole.ORGANISATION_ADMIN)
  getAdminData(@Org() ctx: OrgContext, @Param('orgId') orgId: string) {
    if (orgId !== ctx.organisationId) {
      throw new ForbiddenException('Access denied: You are not authorized for this organization');
    }
    const isSuperAdmin = ctx.role === UserRole.ORGANISATION_SUPER_ADMIN;
    return {
      organisationId: ctx.organisationId,
      role: ctx.role,
      canManageRecruiters: can(ctx, 'recruiters.manage'),
      canManageJobs: can(ctx, 'jobs.create'),
      canAllocateTokens: can(ctx, 'tokens.allocate'),
      canPurchaseTokens: isSuperAdmin,
      canManageBilling: isSuperAdmin,
    };
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
