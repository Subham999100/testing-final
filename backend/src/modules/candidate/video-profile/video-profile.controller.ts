// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Video Profile Endpoints
// Base Route: /api/v1/candidate/video-profile
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  VideoProfileResponse,
  VideoProfileService,
} from './video-profile.service';
import { UploadVideoProfileDto } from './dto/upload-video-profile.dto';
import { Response } from 'express';

@ApiTags('Candidate · Video Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('candidate/video-profile')
export class VideoProfileController {
  constructor(private readonly service: VideoProfileService) {}

  @Get()
  @Roles(UserRole.CANDIDATE)
  @HttpCode(HttpStatus.OK)
  async getVideoProfile(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<VideoProfileResponse> {
    return this.service.getVideoProfile(actor);
  }

  @Post()
  @Roles(UserRole.CANDIDATE)
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 105 * 1024 * 1024, // 105 MB ceiling for 100 MB max video
      },
    }),
  )
  async uploadVideoProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: any,
    @Body() dto: UploadVideoProfileDto,
  ): Promise<VideoProfileResponse> {
    return this.service.uploadVideoProfile(actor, file, dto);
  }

  @Delete()
  @Roles(UserRole.CANDIDATE)
  @HttpCode(HttpStatus.OK)
  async deleteVideoProfile(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.service.deleteVideoProfile(actor);
  }

  @Get('stream')
  @Roles(UserRole.CANDIDATE)
  async streamVideo(
    @CurrentUser() actor: AuthenticatedUser,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.service.streamVideo(actor, range, res);
  }

  @Get('thumbnail')
  @Roles(UserRole.CANDIDATE)
  async streamThumbnail(
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    await this.service.streamThumbnail(actor, res);
  }

  /**
   * Recruiter view endpoint: GET /api/v1/recruiter/candidates/:id/video-profile
   * Also accessible at /api/v1/candidate/video-profile/recruiter/:candidateId
   */
  @Get('recruiter/:candidateId')
  @Roles(UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN)
  async getRecruiterVideoProfile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
  ): Promise<VideoProfileResponse & { candidateId: string; candidateName: string }> {
    return this.service.getRecruiterVideoProfile(actor, candidateId);
  }

  @Get('recruiter/:candidateId/stream')
  @Roles(UserRole.RECRUITER, UserRole.ORGANISATION_ADMIN, UserRole.ORGANISATION_SUPER_ADMIN)
  async streamRecruiterVideo(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('candidateId') candidateId: string,
    @Headers('range') range: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    await this.service.streamRecruiterVideo(actor, candidateId, range, res);
  }
}
