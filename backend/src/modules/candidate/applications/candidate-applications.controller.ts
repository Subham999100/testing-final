// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Applications Endpoints
// Base Route: /api/v1/candidate/applications
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CreateCandidateApplicationDto } from './candidate-applications.dto';
import { CandidateApplicationsService } from './candidate-applications.service';

@ApiTags('Candidate ? Applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
@Controller('candidate/applications')
export class CandidateApplicationsController {
  constructor(private readonly applicationsService: CandidateApplicationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateCandidateApplicationDto,
  ) {
    return this.applicationsService.create(actor, dto);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(@CurrentUser() actor: AuthenticatedUser) {
    return this.applicationsService.list(actor);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async get(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.applicationsService.get(actor, id);
  }
}