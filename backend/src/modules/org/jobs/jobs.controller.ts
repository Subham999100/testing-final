// ============================================================
// ORGANISATION PORTAL — Jobs endpoints (/api/v1/org/jobs)
// ============================================================

import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { JobAction } from '../common/org-workflows';
import { ApplicationsService } from '../hiring/applications.service';
import { AssignJobDto, JobActionDto, JobActionParam, JobInputDto, JobQueryDto, UpdateJobDto } from './dto';
import { JobsService } from './jobs.service';

@ApiTags('Org · Jobs')
@ApiBearerAuth()
@Controller('org/jobs')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgJobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Get()
  @OrgPerms('jobs.read.all', 'jobs.read.assigned')
  list(@Org() ctx: OrgContext, @Query() q: JobQueryDto) {
    return this.jobs.list(ctx, q);
  }

  @Post()
  @OrgPerms('jobs.create')
  create(@Org() ctx: OrgContext, @Body() dto: JobInputDto) {
    return this.jobs.create(ctx, dto);
  }

  @Get(':id')
  @OrgPerms('jobs.read.all', 'jobs.read.assigned')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.jobs.get(ctx, id);
  }

  @Patch(':id')
  @OrgPerms('jobs.update')
  update(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: UpdateJobDto) {
    return this.jobs.update(ctx, id, dto);
  }

  @Post(':id/actions/:action')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('jobs.update', 'jobs.publish', 'jobs.approve', 'jobs.archive')
  action(@Org() ctx: OrgContext, @Param('id') id: string, @Param() p: JobActionParam, @Body() dto: JobActionDto) {
    return this.jobs.action(ctx, id, p.action as JobAction, dto.note);
  }

  @Post(':id/duplicate')
  @OrgPerms('jobs.create')
  duplicate(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.jobs.duplicate(ctx, id);
  }

  @Put(':id/assignees')
  @OrgPerms('jobs.assign')
  assign(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: AssignJobDto) {
    return this.jobs.assign(ctx, id, dto.userIds);
  }

  @Get(':id/pipeline')
  @OrgPerms('applications.read.all', 'applications.read.assigned')
  pipeline(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.applications.pipeline(ctx, id);
  }
}
