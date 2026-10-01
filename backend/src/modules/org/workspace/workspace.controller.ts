// ============================================================
// ORGANISATION PORTAL — Workspace endpoints: organisation, settings,
// integrations, profile, notifications, tasks, messages, analytics,
// audit, security and exports.
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { ChangePasswordDto, UpdateProfileDto } from '../team/dto';
import {
  AnnouncementDto,
  AuditQueryDto,
  ExportParam,
  IntegrationParam,
  MessageDto,
  NotificationPrefsDto,
  NotificationQueryDto,
  RangeQueryDto,
  TaskInputDto,
  TaskQueryDto,
  ToggleIntegrationDto,
  UpdateOrganisationDto,
  UpdateSettingsDto,
  UpsertIntegrationDto,
} from './dto';
import { EngagementService } from './engagement.service';
import { InsightsService } from './insights.service';
import { WorkspaceService } from './workspace.service';

@ApiTags('Org · Workspace')
@ApiBearerAuth()
@Controller('org')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgWorkspaceController {
  constructor(
    private readonly workspace: WorkspaceService,
    private readonly engagement: EngagementService,
    private readonly insights: InsightsService,
  ) {}

  // ----- organisation & settings -----
  @Get('organisation')
  @OrgPerms('org.profile.read')
  organisation(@Org() ctx: OrgContext) {
    return this.workspace.organisation(ctx);
  }

  @Patch('organisation')
  @OrgPerms('org.profile.update')
  updateOrganisation(@Org() ctx: OrgContext, @Body() dto: UpdateOrganisationDto) {
    return this.workspace.updateOrganisation(ctx, dto);
  }

  @Get('settings')
  settings(@Org() ctx: OrgContext) {
    return this.workspace.settings(ctx);
  }

  @Patch('settings')
  @OrgPerms('org.settings.update', 'org.security.manage', 'ai.govern')
  updateSettings(@Org() ctx: OrgContext, @Body() dto: UpdateSettingsDto) {
    return this.workspace.updateSettings(ctx, dto);
  }

  // ----- integrations -----
  @Get('integrations')
  @OrgPerms('org.integrations.manage')
  integrations(@Org() ctx: OrgContext) {
    return this.workspace.integrations(ctx);
  }

  @Put('integrations/:provider')
  @OrgPerms('org.integrations.manage')
  saveIntegration(@Org() ctx: OrgContext, @Param() p: IntegrationParam, @Body() dto: UpsertIntegrationDto) {
    return this.workspace.upsertIntegration(ctx, p.provider, dto);
  }

  @Patch('integrations/:provider')
  @OrgPerms('org.integrations.manage')
  toggleIntegration(@Org() ctx: OrgContext, @Param() p: IntegrationParam, @Body() dto: ToggleIntegrationDto) {
    return this.workspace.toggleIntegration(ctx, p.provider, dto.enabled);
  }

  @Delete('integrations/:provider')
  @OrgPerms('org.integrations.manage')
  removeIntegration(@Org() ctx: OrgContext, @Param() p: IntegrationParam) {
    return this.workspace.removeIntegration(ctx, p.provider);
  }

  // ----- own profile -----
  @Get('profile')
  profile(@Org() ctx: OrgContext) {
    return this.workspace.profile(ctx);
  }

  @Patch('profile')
  updateProfile(@Org() ctx: OrgContext, @Body() dto: UpdateProfileDto) {
    return this.workspace.updateProfile(ctx, dto);
  }

  @Post('profile/password')
  @HttpCode(HttpStatus.OK)
  changePassword(@Org() ctx: OrgContext, @Body() dto: ChangePasswordDto) {
    return this.workspace.changePassword(ctx, dto);
  }

  // ----- notifications -----
  @Get('notifications')
  notifications(@Org() ctx: OrgContext, @Query() q: NotificationQueryDto) {
    return this.engagement.notifications(ctx, q);
  }

  @Get('notifications/preferences')
  preferences(@Org() ctx: OrgContext) {
    return this.engagement.preferences(ctx);
  }

  @Put('notifications/preferences')
  updatePreferences(@Org() ctx: OrgContext, @Body() dto: NotificationPrefsDto) {
    return this.engagement.updatePreferences(ctx, dto.mutedTypes);
  }

  @Post('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  readAll(@Org() ctx: OrgContext) {
    return this.engagement.markAllRead(ctx);
  }

  @Post('notifications/announce')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('notifications.announce')
  announce(@Org() ctx: OrgContext, @Body() dto: AnnouncementDto) {
    return this.engagement.announce(ctx, dto.title, dto.body);
  }

  @Post('notifications/:id/read')
  @HttpCode(HttpStatus.OK)
  read(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.engagement.markRead(ctx, id);
  }

  // ----- tasks -----
  @Get('tasks')
  @OrgPerms('tasks.use')
  tasks(@Org() ctx: OrgContext, @Query() q: TaskQueryDto) {
    return this.engagement.tasks(ctx, q);
  }

  @Post('tasks')
  @OrgPerms('tasks.use')
  createTask(@Org() ctx: OrgContext, @Body() dto: TaskInputDto) {
    return this.engagement.createTask(ctx, dto);
  }

  @Patch('tasks/:id')
  @OrgPerms('tasks.use')
  updateTask(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: TaskInputDto) {
    return this.engagement.updateTask(ctx, id, dto);
  }

  @Post('tasks/:id/toggle')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('tasks.use')
  toggleTask(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.engagement.toggleTask(ctx, id);
  }

  @Delete('tasks/:id')
  @OrgPerms('tasks.use')
  deleteTask(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.engagement.deleteTask(ctx, id);
  }

  // ----- messages -----
  @Get('messages')
  @OrgPerms('messages.use', 'messages.oversee')
  conversations(@Org() ctx: OrgContext) {
    return this.engagement.conversations(ctx);
  }

  @Get('messages/:candidateId')
  @OrgPerms('messages.use', 'messages.oversee')
  thread(@Org() ctx: OrgContext, @Param('candidateId') id: string) {
    return this.engagement.thread(ctx, id);
  }

  @Post('messages/:candidateId')
  @OrgPerms('messages.use')
  send(@Org() ctx: OrgContext, @Param('candidateId') id: string, @Body() dto: MessageDto) {
    return this.engagement.send(ctx, id, dto);
  }

  // ----- dashboard & analytics -----
  @Get('dashboard')
  dashboard(@Org() ctx: OrgContext) {
    return this.insights.overview(ctx);
  }

  @Get('analytics/team')
  @OrgPerms('analytics.org', 'analytics.recruiter', 'analytics.self')
  team(@Org() ctx: OrgContext, @Query() q: RangeQueryDto) {
    return this.insights.teamStats(ctx, q.from, q.to);
  }

  @Get('analytics/jobs')
  @OrgPerms('analytics.org', 'analytics.recruiter', 'analytics.self')
  jobs(@Org() ctx: OrgContext) {
    return this.insights.jobPerformance(ctx);
  }

  // ----- audit & security -----
  @Get('audit')
  @OrgPerms('audit.read.org', 'audit.read.self')
  audit(@Org() ctx: OrgContext, @Query() q: AuditQueryDto) {
    return this.insights.audit(ctx, q);
  }

  @Get('security')
  @OrgPerms('org.security.manage')
  security(@Org() ctx: OrgContext) {
    return this.insights.security(ctx);
  }

  @Post('security/sessions/:id/revoke')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('org.security.manage')
  revoke(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.insights.revokeSession(ctx, id);
  }

  // ----- exports -----
  @Get('exports/:type')
  @OrgPerms('exports.run')
  async export(@Org() ctx: OrgContext, @Param() p: ExportParam, @Res() res: Response) {
    const { filename, csv } = await this.insights.exportCsv(ctx, p.type);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.send(csv);
  }
}
