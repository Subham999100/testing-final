// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Profile Endpoints
// Base Route: /api/v1/candidate/profile
// ============================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UploadedFile,
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

  @Get('organisations')
  @HttpCode(HttpStatus.OK)
  async getOrganisations(): Promise<{ id: string; name: string }[]> {
    return this.profileService.getActiveOrganisations();
  }

  @Post('photo')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadPhoto(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: any,
  ): Promise<CandidateProfileResponse> {
    return this.profileService.uploadPhoto(actor, file);
  }

  @Post('cover')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadCover(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: any,
  ): Promise<CandidateProfileResponse> {
    return this.profileService.uploadCover(actor, file);
  }

  @Delete('cover')
  @HttpCode(HttpStatus.OK)
  async deleteCover(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CandidateProfileResponse> {
    return this.profileService.deleteCover(actor);
  }
}
