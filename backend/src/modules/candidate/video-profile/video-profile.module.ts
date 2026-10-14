// ============================================================
// Clyptus Job Portal - Candidate Portal
// Module: VideoProfileModule
// Provides candidate & recruiter video profile services, controllers,
// and guards with resolved JwtModule, ConfigModule, and PrismaModule.
// ============================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../../database/prisma.module';
import { IntegrationsModule } from '../../../integrations/integrations.module';
import { VideoProfileController } from './video-profile.controller';
import { RecruiterVideoProfileController } from './recruiter-video-profile.controller';
import { VideoProfileService } from './video-profile.service';
import { VideoProcessorService } from './video-processor.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    IntegrationsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret =
          config.get<string>('jwt.secret') ||
          config.get<string>('JWT_SECRET');

        if (!secret) {
          throw new Error('FATAL: JWT secret is required for VideoProfileModule');
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
  controllers: [VideoProfileController, RecruiterVideoProfileController],
  providers: [
    VideoProfileService,
    VideoProcessorService,
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [VideoProfileService, VideoProcessorService],
})
export class VideoProfileModule {}
