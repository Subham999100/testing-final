// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Authentication Endpoints
// Base Route: /api/v1/candidate/auth
// ============================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RateLimit, RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  CandidateAuthResult,
  CandidateAuthService,
  CandidateMeResult,
} from './candidate-auth.service';
import { CandidateLoginDto, CandidateRegisterDto } from './dto';

const extractIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || (req.socket?.remoteAddress as string) || '127.0.0.1';
};

const extractUa = (req: Request): string | undefined => {
  return typeof req.headers['user-agent'] === 'string'
    ? req.headers['user-agent']
    : undefined;
};

@ApiTags('Candidate · Auth')
@Controller('candidate/auth')
export class CandidateAuthController {
  constructor(private readonly authService: CandidateAuthService) {}

  @Post('register')
  @UseGuards(RateLimiterGuard)
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: CandidateRegisterDto,
    @Req() req: Request,
  ): Promise<CandidateAuthResult> {
    const ip = extractIp(req);
    const ua = extractUa(req);
    return this.authService.register(dto, ip, ua);
  }

  @Post('login')
  @UseGuards(RateLimiterGuard)
  @RateLimit({ points: 10, duration: 60 })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: CandidateLoginDto,
    @Req() req: Request,
  ): Promise<CandidateAuthResult> {
    const ip = extractIp(req);
    const ua = extractUa(req);
    return this.authService.login(dto, ip, ua);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  async me(@CurrentUser() actor: AuthenticatedUser): Promise<CandidateMeResult> {
    return this.authService.getMe(actor);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CANDIDATE)
  async logout(
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ): Promise<{ message: string }> {
    const ip = extractIp(req);
    const ua = extractUa(req);
    return this.authService.logout(actor, ip, ua);
  }
}
