// ============================================================
// PLATFORM SUPER ADMIN
// Controller: Platform Token System & Ledger Operations
// Base Route: /api/v1/platform/tokens & /api/v1/platform/token-plans
// ============================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { PlatformTokenService } from './platform-token.service';
import { CreateTokenPlanDto } from './dto/create-token-plan.dto';
import { UpdateTokenPlanDto } from './dto/update-token-plan.dto';
import { AdjustTokensDto } from './dto/adjust-tokens.dto';
import { UpdateAllocationLimitDto } from './dto/update-allocation-limit.dto';
import { QueryTokenTransactionsDto } from './dto/query-token-transactions.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { RequirePermissions } from '../../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PlatformPermissions } from '../../../common/constants/permissions.constant';

@Controller('platform')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.PLATFORM_SUPER_ADMIN, UserRole.PLATFORM_ADMIN)
export class PlatformTokenController {
  constructor(private readonly tokenService: PlatformTokenService) {}

  // ------------------------------------------------------------
  // TOKEN PLANS
  // ------------------------------------------------------------

  @Get('token-plans')
  @RequirePermissions(PlatformPermissions.TOKENS_READ)
  async getPlans(@Query('includeInactive') includeInactive?: string) {
    return this.tokenService.findAllPlans(includeInactive === 'true');
  }

  @Get('token-plans/:id')
  @RequirePermissions(PlatformPermissions.TOKENS_READ)
  async getPlan(@Param('id') id: string) {
    return this.tokenService.findOnePlan(id);
  }

  @Post('token-plans')
  @RequirePermissions(PlatformPermissions.TOKENS_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  async createPlan(
    @Body() dto: CreateTokenPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.tokenService.createPlan(dto, actor, ip, ua);
  }

  @Patch('token-plans/:id')
  @RequirePermissions(PlatformPermissions.TOKENS_MANAGE)
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateTokenPlanDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.tokenService.updatePlan(id, dto, actor, ip, ua);
  }

  // ------------------------------------------------------------
  // ATOMIC LEDGER ADJUSTMENT
  // ------------------------------------------------------------

  @Post('tokens/adjust')
  @RequirePermissions(PlatformPermissions.TOKENS_ADJUST)
  @HttpCode(HttpStatus.OK)
  async adjustTokens(
    @Body() dto: AdjustTokensDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.tokenService.adjustTokens(dto, actor, ip, ua);
  }

  // ------------------------------------------------------------
  // ALLOCATION LIMITS
  // ------------------------------------------------------------

  @Patch('tokens/organisations/:orgId/limits')
  @RequirePermissions(PlatformPermissions.TOKENS_ALLOCATE)
  async updateLimits(
    @Param('orgId') orgId: string,
    @Body() dto: UpdateAllocationLimitDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] || req.ip || req.socket?.remoteAddress) as string;
    const ua = req.headers['user-agent'];
    return this.tokenService.updateAllocationLimit(orgId, dto, actor, ip, ua);
  }

  // ------------------------------------------------------------
  // TRANSACTIONS & USAGE
  // ------------------------------------------------------------

  @Get('token-transactions')
  @RequirePermissions(PlatformPermissions.TOKENS_READ)
  async getTransactions(@Query() query: QueryTokenTransactionsDto) {
    return this.tokenService.findTransactions(query);
  }

  @Get('token-usage')
  @RequirePermissions(PlatformPermissions.TOKENS_READ)
  async getTokenUsage() {
    return this.tokenService.getPlatformTokenOverview();
  }
}
