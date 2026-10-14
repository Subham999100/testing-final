// ============================================================
// CANDIDATE PORTAL
// Module: Candidate Authentication and Portal Services (/api/v1/candidate/*)
// Reuses the existing PrismaService, AuditService, PlatformSession,
// JwtAuthGuard, RolesGuard and RateLimiterGuard.
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RateLimiterGuard } from '../../common/guards/rate-limiter.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CandidateApplicationsController } from './applications/candidate-applications.controller';
import { CandidateApplicationsService } from './applications/candidate-applications.service';
import { CandidateAuthController } from './auth/candidate-auth.controller';
import { CandidateAuthService } from './auth/candidate-auth.service';
import { CandidateJobsController } from './jobs/candidate-jobs.controller';
import { CandidateJobsService } from './jobs/candidate-jobs.service';
import { CandidateOnboardingController } from './profile/candidate-onboarding.controller';
import { CandidateOnboardingService } from './profile/candidate-onboarding.service';
import { CandidateProfileController } from './profile/candidate-profile.controller';
import { CandidateProfileService } from './profile/candidate-profile.service';
import { CandidateResumeController } from './profile/candidate-resume.controller';
import { CandidateResumeService } from './profile/candidate-resume.service';
import { CandidateScoringService } from './profile/candidate-scoring.service';
import { ResumeParserService } from './profile/resume-parser.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret =
          config.get<string>('jwt.secret') ||
          config.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('FATAL: JWT secret is required for the candidate portal');
        }

        return {
          secret,
          signOptions: {
            expiresIn: config.get<string>('jwt.expiresIn') || '1d',
          },
        };
      },
    }),
  ],
  controllers: [
    CandidateAuthController,
    CandidateOnboardingController,
    CandidateProfileController,
    CandidateResumeController,
    CandidateJobsController,
    CandidateApplicationsController,
  ],
  providers: [
    CandidateAuthService,
    CandidateOnboardingService,
    CandidateScoringService,
    ResumeParserService,
    CandidateProfileService,
    CandidateResumeService,
    CandidateJobsService,
    CandidateApplicationsService,
    JwtAuthGuard,
    RolesGuard,
    RateLimiterGuard,
  ],
  exports: [
    CandidateAuthService,
    CandidateOnboardingService,
    CandidateScoringService,
    ResumeParserService,
    CandidateProfileService,
    CandidateResumeService,
    CandidateJobsService,
    CandidateApplicationsService,
  ],
})
export class CandidateModule {}