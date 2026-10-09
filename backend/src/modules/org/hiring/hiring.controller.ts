// ============================================================
// ORGANISATION PORTAL — Candidates, applications, interviews, offers
// ============================================================

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { InterviewAction, OfferAction } from '../common/org-workflows';
import { ApplicationsService } from './applications.service';
import { CandidatesService } from './candidates.service';
import {
  ApplicationQueryDto,
  AssignApplicationDto,
  BulkMoveDto,
  CandidateInputDto,
  CandidateQueryDto,
  CreateApplicationDto,
  FeedbackDto,
  InterviewActionParam,
  InterviewInputDto,
  InterviewQueryDto,
  MoveApplicationDto,
  NoteDto,
  OfferActionDto,
  OfferActionParam,
  OfferInputDto,
  OfferQueryDto,
  RescheduleInterviewDto,
  UpdateCandidateDto,
  UpdateOfferDto,
} from './dto';
import { InterviewsService } from './interviews.service';
import { OffersService } from './offers.service';

@ApiTags('Org · Candidates')
@ApiBearerAuth()
@Controller('org/candidates')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgCandidatesController {
  constructor(private readonly candidates: CandidatesService) {}

  @Get()
  @OrgPerms('candidates.read', 'candidates.search')
  list(@Org() ctx: OrgContext, @Query() q: CandidateQueryDto) {
    return this.candidates.list(ctx, q);
  }

  @Post()
  @OrgPerms('candidates.save')
  create(@Org() ctx: OrgContext, @Body() dto: CandidateInputDto) {
    return this.candidates.create(ctx, dto);
  }

  @Get(':id')
  @OrgPerms('candidates.read')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.candidates.get(ctx, id);
  }

  @Patch(':id')
  @OrgPerms('candidates.save')
  update(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: UpdateCandidateDto) {
    return this.candidates.update(ctx, id, dto);
  }

  @Post(':id/unlock')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('candidates.resume.view')
  unlock(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.candidates.unlock(ctx, id);
  }

  @Post(':id/notes')
  @OrgPerms('candidates.notes.write')
  addNote(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: NoteDto) {
    return this.candidates.addNote(ctx, id, dto.body, dto.applicationId);
  }

  @Post(':id/save')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('candidates.save')
  save(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.candidates.setSaved(ctx, id, true);
  }

  @Delete(':id/save')
  @OrgPerms('candidates.save')
  unsave(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.candidates.setSaved(ctx, id, false);
  }
}

@ApiTags('Org · Applications & ATS')
@ApiBearerAuth()
@Controller('org/applications')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgApplicationsController {
  constructor(private readonly applications: ApplicationsService) {}

  @Get()
  @OrgPerms('applications.read.all', 'applications.read.assigned')
  list(@Org() ctx: OrgContext, @Query() q: ApplicationQueryDto) {
    return this.applications.list(ctx, q);
  }

  @Post()
  @OrgPerms('applications.transition')
  create(@Org() ctx: OrgContext, @Body() dto: CreateApplicationDto) {
    return this.applications.create(ctx, dto);
  }

  @Post('bulk-move')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ats.bulk')
  bulkMove(@Org() ctx: OrgContext, @Body() dto: BulkMoveDto) {
    return this.applications.bulkMove(ctx, dto.ids, dto.toStage, dto.reason);
  }

  @Get(':id')
  @OrgPerms('applications.read.all', 'applications.read.assigned')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.applications.get(ctx, id);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ats.move')
  move(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: MoveApplicationDto) {
    return this.applications.move(ctx, id, dto.toStage, dto.reason);
  }

  @Patch(':id/assign')
  @OrgPerms('applications.assign')
  assign(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: AssignApplicationDto) {
    return this.applications.assign(ctx, id, dto.userId);
  }
}

@ApiTags('Org · Interviews')
@ApiBearerAuth()
@Controller('org/interviews')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgInterviewsController {
  constructor(private readonly interviews: InterviewsService) {}

  @Get()
  @OrgPerms('interviews.read')
  list(@Org() ctx: OrgContext, @Query() q: InterviewQueryDto) {
    return this.interviews.list(ctx, q);
  }

  @Post()
  @OrgPerms('interviews.schedule')
  schedule(@Org() ctx: OrgContext, @Body() dto: InterviewInputDto) {
    return this.interviews.schedule(ctx, dto);
  }

  @Get(':id')
  @OrgPerms('interviews.read')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.interviews.get(ctx, id);
  }

  @Patch(':id')
  @OrgPerms('interviews.schedule')
  reschedule(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: RescheduleInterviewDto) {
    return this.interviews.reschedule(ctx, id, dto);
  }

  @Post(':id/actions/:action')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('interviews.schedule')
  action(@Org() ctx: OrgContext, @Param('id') id: string, @Param() p: InterviewActionParam) {
    return this.interviews.action(ctx, id, p.action as InterviewAction);
  }

  @Post(':id/feedback')
  @OrgPerms('interviews.feedback.write')
  feedback(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: FeedbackDto) {
    return this.interviews.feedback(ctx, id, dto);
  }
}

@ApiTags('Org · Offers')
@ApiBearerAuth()
@Controller('org/offers')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgOffersController {
  constructor(private readonly offers: OffersService) {}

  @Get()
  @OrgPerms('offers.read')
  list(@Org() ctx: OrgContext, @Query() q: OfferQueryDto) {
    return this.offers.list(ctx, q);
  }

  @Post()
  @OrgPerms('offers.create')
  create(@Org() ctx: OrgContext, @Body() dto: OfferInputDto) {
    return this.offers.create(ctx, dto);
  }

  @Get(':id')
  @OrgPerms('offers.read')
  get(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.offers.get(ctx, id);
  }

  @Patch(':id')
  @OrgPerms('offers.create')
  update(@Org() ctx: OrgContext, @Param('id') id: string, @Body() dto: UpdateOfferDto) {
    return this.offers.update(ctx, id, dto);
  }

  @Post(':id/actions/:action')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('offers.create', 'offers.approve', 'offers.send')
  action(@Org() ctx: OrgContext, @Param('id') id: string, @Param() p: OfferActionParam, @Body() dto: OfferActionDto) {
    return this.offers.action(ctx, id, p.action as OfferAction, dto.note);
  }
}
