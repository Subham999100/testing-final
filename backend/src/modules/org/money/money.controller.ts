// ============================================================
// ORGANISATION PORTAL — Tokens, billing (Razorpay) and AI tools
// ============================================================

import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { PageQueryDto } from '../common/org-helpers';
import { OrgTokenService } from '../common/org-token.service';
import { AllocateTokensDto, LedgerQueryDto } from '../team/dto';
import { AiService } from './ai.service';
import { BillingService } from './billing.service';
import { CreateOrderDto, PaymentQueryDto } from './dto';

@ApiTags('Org · Tokens')
@ApiBearerAuth()
@Controller('org/tokens')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgTokensController {
  constructor(private readonly tokens: OrgTokenService) {}

  @Get('wallet')
  @OrgPerms('tokens.read')
  wallet(@Org() ctx: OrgContext) {
    return this.tokens.wallet(ctx);
  }

  @Get('allocations')
  @OrgPerms('tokens.allocate')
  allocations(@Org() ctx: OrgContext) {
    return this.tokens.allocations(ctx);
  }

  @Post('allocations')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('tokens.allocate')
  allocate(@Org() ctx: OrgContext, @Body() dto: AllocateTokensDto) {
    return this.tokens.allocate(ctx, dto.userId, dto.amount, dto.reason);
  }

  @Get('ledger')
  @OrgPerms('tokens.allocate', 'tokens.purchase')
  ledger(@Org() ctx: OrgContext, @Query() q: LedgerQueryDto) {
    return this.tokens.ledger(ctx, q);
  }

  @Get('my-ledger')
  @OrgPerms('tokens.read')
  myLedger(@Org() ctx: OrgContext, @Query() q: PageQueryDto) {
    return this.tokens.myLedger(ctx, q);
  }

  @Get('usage')
  @OrgPerms('tokens.allocate', 'tokens.purchase')
  usage(@Org() ctx: OrgContext) {
    return this.tokens.usage(ctx);
  }
}

@ApiTags('Org · Billing')
@ApiBearerAuth()
@Controller('org/billing')
export class OrgBillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('plans')
  @UseGuards(JwtAuthGuard, OrgGuard)
  @OrgPerms('tokens.purchase', 'billing.read')
  plans() {
    return this.billing.plans();
  }

  @Post('orders')
  @UseGuards(JwtAuthGuard, OrgGuard)
  @OrgPerms('tokens.purchase')
  createOrder(@Org() ctx: OrgContext, @Body() dto: CreateOrderDto) {
    return this.billing.createOrder(ctx, dto.planId);
  }

  @Get('payments')
  @UseGuards(JwtAuthGuard, OrgGuard)
  @OrgPerms('billing.read', 'tokens.purchase')
  payments(@Org() ctx: OrgContext, @Query() q: PaymentQueryDto) {
    return this.billing.list(ctx, q);
  }

  @Get('payments/:id')
  @UseGuards(JwtAuthGuard, OrgGuard)
  @OrgPerms('billing.read', 'tokens.purchase')
  payment(@Org() ctx: OrgContext, @Param('id') id: string) {
    return this.billing.get(ctx, id);
  }

  /** Public: authenticated by the Razorpay HMAC signature over the raw body. */
  @Post('razorpay/webhook')
  @HttpCode(HttpStatus.OK)
  webhook(@Req() req: RawBodyRequest<Request>, @Headers('x-razorpay-signature') signature: string, @Body() body: Record<string, unknown>) {
    return this.billing.handleWebhook(req.rawBody, signature, body, req.ip);
  }
}

@ApiTags('Org · AI')
@ApiBearerAuth()
@Controller('org/ai')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgAiController {
  constructor(private readonly ai: AiService) {}

  @Post('match/:applicationId')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ai.use')
  match(@Org() ctx: OrgContext, @Param('applicationId') id: string) {
    return this.ai.match(ctx, id);
  }

  @Post('parse-resume/:candidateId')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ai.use')
  parse(@Org() ctx: OrgContext, @Param('candidateId') id: string) {
    return this.ai.parseResume(ctx, id);
  }

  @Post('improve-jd/:jobId')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ai.use')
  improve(@Org() ctx: OrgContext, @Param('jobId') id: string) {
    return this.ai.improveJd(ctx, id);
  }

  @Post('interview-questions/:jobId')
  @HttpCode(HttpStatus.OK)
  @OrgPerms('ai.use')
  questions(@Org() ctx: OrgContext, @Param('jobId') id: string) {
    return this.ai.interviewQuestions(ctx, id);
  }

  @Get('runs')
  @OrgPerms('ai.use', 'ai.govern')
  runs(@Org() ctx: OrgContext, @Query() q: PageQueryDto) {
    return this.ai.runs(ctx, q);
  }
}
