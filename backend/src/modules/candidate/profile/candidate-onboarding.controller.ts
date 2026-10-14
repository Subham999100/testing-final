// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Onboarding & Video Interview
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserRole, VideoInterviewStatus } from '@prisma/client';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CandidateOnboardingService } from './candidate-onboarding.service';
import {
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingStep3Dto,
  OnboardingStep4Dto,
  OnboardingStep5Dto,
} from './dto';

@ApiTags('Candidate · Onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
@Controller('candidate')
export class CandidateOnboardingController {
  constructor(private readonly onboardingService: CandidateOnboardingService) {}

  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get current candidate onboarding status and step' })
  @ApiResponse({ status: 200, description: 'Onboarding state retrieved successfully' })
  getStatus(@CurrentUser() actor: AuthenticatedUser) {
    return this.onboardingService.getStatus(actor);
  }

  @Patch('onboarding/steps/1')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save Step 1: Basic Details' })
  saveStep1(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: OnboardingStep1Dto,
  ) {
    return this.onboardingService.saveStep1(actor, dto);
  }

  @Patch('onboarding/steps/2')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save Step 2: Education' })
  saveStep2(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: OnboardingStep2Dto,
  ) {
    return this.onboardingService.saveStep2(actor, dto);
  }

  @Patch('onboarding/steps/3')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save Step 3: Professional Details & Preferences' })
  saveStep3(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: OnboardingStep3Dto,
  ) {
    return this.onboardingService.saveStep3(actor, dto);
  }

  @Patch('onboarding/steps/4')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save Step 4: Resume Confirmation' })
  saveStep4(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: OnboardingStep4Dto,
  ) {
    return this.onboardingService.saveStep4(actor, dto);
  }

  @Patch('onboarding/steps/5')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Save Step 5: AI Video Interview & Completion' })
  saveStep5(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: OnboardingStep5Dto,
  ) {
    return this.onboardingService.saveStep5(actor, dto);
  }

  @Post('onboarding/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip onboarding and mark profile as complete' })
  skipOnboarding(@CurrentUser() actor: AuthenticatedUser) {
    return this.onboardingService.skipOnboarding(actor);
  }

  // --- AI Video Interview Stubs ---

  @Post('video-interview/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start AI video interview (Feature flag stub)' })
  startVideoInterview(@CurrentUser() actor: AuthenticatedUser) {
    // VIDEO_INTERVIEW_ENABLED=false feature flag stub contract
    return {
      enabled: false,
      status: 'COMING_SOON',
      message: 'AI video interview is currently disabled via feature flag VIDEO_INTERVIEW_ENABLED=false',
    };
  }

  @Get('video-interview/status')
  @ApiOperation({ summary: 'Get current AI video interview status' })
  async getVideoInterviewStatus(@CurrentUser() actor: AuthenticatedUser) {
    const status = await this.onboardingService.getStatus(actor);
    return {
      status: status.videoInterviewStatus || VideoInterviewStatus.NOT_STARTED,
      enabled: false,
    };
  }

  @Post('video-interview/skip')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Skip AI video interview' })
  skipVideoInterview(@CurrentUser() actor: AuthenticatedUser) {
    return this.onboardingService.skipOnboarding(actor);
  }
}
