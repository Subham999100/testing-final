// ============================================================
// Clyptus Job Portal - Recruiter Video Profile Endpoints
// Base Route: /api/v1/recruiter/candidates/:id/video-profile
// ============================================================

import {
  Controller,
  Get,
  Headers,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  VideoProfileResponse,
  VideoProfileService,
} from './video-profile.service';

@ApiTags('Recruiter · Candidate Video Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('recruiter')
export class RecruiterVideoProfileController {
  constructor(private readonly service: VideoProfileService) {}

  @Get('candidates/:id/video-profile')
  @Roles(
    UserRole.RECRUITER,
    UserRole.ORGANISATION_ADMIN,
    UserRole.ORGANISATION_SUPER_ADMIN,
  )
  async getVideoProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<VideoProfileResponse & { candidateId: string; candidateName: string }> {
    return this.service.getRecruiterVideoProfile(actor, id);
  }

  @Get('candidates/:id/video-profile/stream')
  @Roles(
    UserRole.RECRUITER,
    UserRole.ORGANISATION_ADMIN,
    UserRole.ORGANISATION_SUPER_ADMIN,
  )
  async streamVideo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.service.streamRecruiterVideo(actor, id, range, res);
  }
}
