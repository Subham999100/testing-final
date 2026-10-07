// ============================================================
// PLATFORM SUPER ADMIN
// Module: Platform Super Admin Domain Module
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Controllers
import { PlatformAuthController } from './auth/platform-auth.controller';
import { PlatformDashboardController } from './dashboard/platform-dashboard.controller';
import { PlatformOrganisationController } from './organisations/platform-organisation.controller';
import { PlatformOrganisationVerificationController } from './organisations/platform-organisation-verification.controller';
import { PlatformAdminController } from './admins/platform-admin.controller';
import { PlatformTokenController } from './tokens/platform-token.controller';
import { PlatformAnalyticsController } from './analytics/platform-analytics.controller';
import { PlatformAuditController } from './audit/platform-audit.controller';
import { PlatformSecurityController } from './security/platform-security.controller';
import { PlatformSettingsController } from './settings/platform-settings.controller';
import { PlatformSupportController } from './support/platform-support.controller';
import { PlatformReportsController } from './reports/platform-reports.controller';
import { PlatformNotificationController } from './notifications/platform-notification.controller';
import { PlatformMonitoringController } from './monitoring/platform-monitoring.controller';

// Services
import { PlatformAuthService } from './auth/platform-auth.service';
import { PlatformDashboardService } from './dashboard/platform-dashboard.service';
import { PlatformOrganisationService } from './organisations/platform-organisation.service';
import { PlatformOrganisationVerificationService } from './organisations/platform-organisation-verification.service';
import { PlatformAdminService } from './admins/platform-admin.service';
import { PlatformTokenService } from './tokens/platform-token.service';
import { PlatformAnalyticsService } from './analytics/platform-analytics.service';
import { PlatformSecurityService } from './security/platform-security.service';
import { PlatformSettingsService } from './settings/platform-settings.service';
import { PlatformSupportService } from './support/platform-support.service';
import { PlatformReportsService } from './reports/platform-reports.service';
import { PlatformNotificationService } from './notifications/platform-notification.service';
import { PlatformMonitoringService } from './monitoring/platform-monitoring.service';

// Guards
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret =
          configService.get<string>('jwt.secret') ||
          configService.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('FATAL: JWT secret is required for JwtModule');
        }

        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiresIn') || configService.get<string>('JWT_EXPIRES_IN', '1d'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [
    PlatformAuthController,
    PlatformDashboardController,
    PlatformOrganisationController,
    PlatformOrganisationVerificationController,
    PlatformAdminController,
    PlatformTokenController,
    PlatformAnalyticsController,
    PlatformAuditController,
    PlatformSecurityController,
    PlatformSettingsController,
    PlatformSupportController,
    PlatformReportsController,
    PlatformNotificationController,
    PlatformMonitoringController,
  ],
  providers: [
    PlatformAuthService,
    PlatformDashboardService,
    PlatformOrganisationService,
    PlatformOrganisationVerificationService,
    PlatformAdminService,
    PlatformTokenService,
    PlatformAnalyticsService,
    PlatformSecurityService,
    PlatformSettingsService,
    PlatformSupportService,
    PlatformReportsService,
    PlatformNotificationService,
    PlatformMonitoringService,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [
    PlatformAuthService,
    PlatformOrganisationService,
    PlatformOrganisationVerificationService,
    PlatformAdminService,
    PlatformTokenService,
    PlatformSupportService,
    PlatformReportsService,
    PlatformNotificationService,
    PlatformMonitoringService,
  ],
})
export class PlatformModule {}

