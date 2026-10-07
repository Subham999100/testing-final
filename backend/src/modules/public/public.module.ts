// ============================================================
// Clyptus Job Portal - Public Module
// ============================================================

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PublicOrganisationApplicationController } from './public-organisation-application.controller';
import { PublicOrganisationApplicationService } from './public-organisation-application.service';

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
          throw new Error('FATAL: JWT secret is required for PublicModule');
        }

        return {
          secret,
          signOptions: {
            expiresIn: '48h',
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [PublicOrganisationApplicationController],
  providers: [PublicOrganisationApplicationService],
  exports: [PublicOrganisationApplicationService],
})
export class PublicModule {}
