// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Controller: Platform Authentication Endpoints
// Base Route: /api/v1/platform/auth
// ============================================================

import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { PlatformAuthService, LoginResult } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { RateLimiterGuard, RateLimit } from '../../../common/guards/rate-limiter.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

@Controller('platform/auth')
export class PlatformAuthController {
  constructor(private readonly authService: PlatformAuthService) {}

  @Post('login')
  @UseGuards(RateLimiterGuard)
  @RateLimit({ points: 5, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: PlatformLoginDto,
    @Req() req: Request,
  ): Promise<LoginResult> {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.authService.login(dto, ipAddress, userAgent);
  }


  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ipAddress = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const userAgent = req.headers['user-agent'];
    return this.authService.logout(actor, ipAddress, userAgent);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.getMe(actor);
  }
}
