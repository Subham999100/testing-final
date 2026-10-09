// ============================================================
// ORGANISATION PORTAL
// Support Ticket DTOs — Organisation View
// Tenant isolation: organisationId and createdByUserId are derived
// exclusively from the authenticated OrgContext, never from request.
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '@prisma/client';

export class OrgQuerySupportTicketsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 15;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory;
}

export class OrgCreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority = SupportTicketPriority.MEDIUM;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory = SupportTicketCategory.TECHNICAL;
}

export class OrgCreateSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;
}
