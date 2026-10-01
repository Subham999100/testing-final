// ============================================================
// ORGANISATION PORTAL
// Module: Org Super Admin · Org Admin · Recruiter APIs (/api/v1/org/*)
// Reuses the existing PrismaService, AuditService, EmailService and
// JwtAuthGuard. Adds no global providers and changes no platform routes.
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { OrgAuthController, OrgPublicInvitationsController } from './auth/org-auth.controller';
import { OrgAuthService } from './auth/org-auth.service';
import { OrgGuard } from './common/org-context';
import { OrgEventsService } from './common/org-events.service';
import { OrgRealtimeGateway } from './common/org-realtime.gateway';
import { OrgTokenService } from './common/org-token.service';
import { ApplicationsService } from './hiring/applications.service';
import { CandidatesService } from './hiring/candidates.service';
import {
  OrgApplicationsController,
  OrgCandidatesController,
  OrgInterviewsController,
  OrgOffersController,
} from './hiring/hiring.controller';
import { InterviewsService } from './hiring/interviews.service';
import { OffersService } from './hiring/offers.service';
import { JobsService } from './jobs/jobs.service';
import { OrgJobsController } from './jobs/jobs.controller';
import { AiService } from './money/ai.service';
import { BillingService } from './money/billing.service';
import { OrgAiController, OrgBillingController, OrgTokensController } from './money/money.controller';
import { OrgMembersController, OrgProvisioningController } from './team/team.controller';
import { TeamService } from './team/team.service';
import { EngagementService } from './workspace/engagement.service';
import { InsightsService } from './workspace/insights.service';
import { OrgWorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.secret') || config.get<string>('JWT_SECRET');
        if (!secret) throw new Error('FATAL: JWT secret is required for the organisation portal');
        return { secret, signOptions: { expiresIn: config.get<string>('jwt.expiresIn') || '1d' } };
      },
    }),
  ],
  controllers: [
    OrgAuthController,
    OrgPublicInvitationsController,
    OrgMembersController,
    OrgProvisioningController,
    OrgJobsController,
    OrgCandidatesController,
    OrgApplicationsController,
    OrgInterviewsController,
    OrgOffersController,
    OrgTokensController,
    OrgBillingController,
    OrgAiController,
    OrgWorkspaceController,
  ],
  providers: [
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    OrgGuard,
    OrgRealtimeGateway,
    OrgEventsService,
    OrgTokenService,
    OrgAuthService,
    TeamService,
    JobsService,
    CandidatesService,
    ApplicationsService,
    InterviewsService,
    OffersService,
    BillingService,
    AiService,
    WorkspaceService,
    EngagementService,
    InsightsService,
  ],
})
export class OrgModule {}
