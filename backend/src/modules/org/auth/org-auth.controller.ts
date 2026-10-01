// ============================================================
// ORGANISATION PORTAL — Auth & public invitation endpoints
// Base: /api/v1/org/auth, /api/v1/org/invitations/(preview|accept)
// ============================================================

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard } from '../common/org-context';
import { AcceptInvitationDto, OrgLoginDto } from '../team/dto';
import { OrgAuthService } from './org-auth.service';

const ua = (req: Request) => (typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined);

@ApiTags('Org · Auth')
@Controller('org/auth')
export class OrgAuthController {
  constructor(private readonly auth: OrgAuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: OrgLoginDto, @Req() req: Request) {
    return this.auth.login(dto, req.ip, ua(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgGuard)
  logout(@Org() ctx: OrgContext) {
    return this.auth.logout(ctx);
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, OrgGuard)
  me(@Org() ctx: OrgContext) {
    return this.auth.me(ctx);
  }
}

@ApiTags('Org · Invitations (public)')
@Controller('org/invitations')
export class OrgPublicInvitationsController {
  constructor(private readonly auth: OrgAuthService) {}

  @Get('preview')
  preview(@Query('token') token: string) {
    return this.auth.previewInvitation(token);
  }

  @Post('accept')
  @HttpCode(HttpStatus.OK)
  accept(@Body() dto: AcceptInvitationDto, @Req() req: Request) {
    return this.auth.acceptInvitation(dto, req.ip, ua(req));
  }
}
