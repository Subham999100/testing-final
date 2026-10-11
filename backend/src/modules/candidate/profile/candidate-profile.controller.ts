// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Profile Endpoints
// Base Route: /api/v1/candidate/profile
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  CandidateProfileResponse,
  CandidateProfileService,
} from './candidate-profile.service';
import { UpdateCandidateProfileDto } from './dto';

@ApiTags('Candidate · Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
@Controller('candidate/profile')
export class CandidateProfileController {
  constructor(private readonly profileService: CandidateProfileService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async getProfile(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CandidateProfileResponse> {
    return this.profileService.getProfile(actor);
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponse> {
    return this.profileService.updateProfile(actor, dto);
  }
}
