// ============================================================
// ORGANISATION PORTAL
// Controller: Organisation Support Tickets & Communication
// Base Route: /api/v1/org/support
// ============================================================

import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { Org, OrgContext, OrgGuard, OrgPerms } from '../common/org-context';
import { OrgSupportService } from './org-support.service';
import {
  OrgQuerySupportTicketsDto,
  OrgCreateSupportTicketDto,
  OrgCreateSupportMessageDto,
} from './dto';

@ApiTags('Org · Support')
@ApiBearerAuth()
@Controller('org/support')
@UseGuards(JwtAuthGuard, OrgGuard)
export class OrgSupportController {
  constructor(private readonly supportService: OrgSupportService) {}

  @Get()
  @OrgPerms('support.read')
  async listTickets(
    @Org() ctx: OrgContext,
    @Query() query: OrgQuerySupportTicketsDto,
  ) {
    return this.supportService.listTickets(ctx, query);
  }

  @Get(':id')
  @OrgPerms('support.read')
  async getTicket(
    @Org() ctx: OrgContext,
    @Param('id') id: string,
  ) {
    return this.supportService.getTicket(ctx, id);
  }

  @Post()
  @OrgPerms('support.create')
  @HttpCode(HttpStatus.CREATED)
  async createTicket(
    @Org() ctx: OrgContext,
    @Body() dto: OrgCreateSupportTicketDto,
  ) {
    return this.supportService.createTicket(ctx, dto);
  }

  @Post(':id/messages')
  @OrgPerms('support.reply')
  @HttpCode(HttpStatus.CREATED)
  async addMessage(
    @Org() ctx: OrgContext,
    @Param('id') id: string,
    @Body() dto: OrgCreateSupportMessageDto,
  ) {
    return this.supportService.addMessage(ctx, id, dto);
  }
}
