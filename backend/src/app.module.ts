// ============================================================
// Clyptus Job Portal - Platform Super Admin Root App Module
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './database/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { PlatformModule } from './modules/platform/platform.module';
import { OrgModule } from './modules/org/org.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    PrismaModule,
    AuditModule,
    IntegrationsModule,
    PlatformModule,
    OrgModule,
  ],
})
export class AppModule {}
