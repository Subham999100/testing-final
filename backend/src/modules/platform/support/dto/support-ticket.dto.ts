// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTOs: Support Ticket & Conversation Management
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
  IsBoolean,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
} from '@prisma/client';

export class QuerySupportTicketsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

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

  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsString()
  assignedToUserId?: string;

  @IsOptional()
  @IsString()
  sortBy?: 'createdAt' | 'updatedAt' | 'priority' | 'ticketNumber' = 'updatedAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class CreateSupportTicketDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subject: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsUUID()
  organisationId?: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority = SupportTicketPriority.MEDIUM;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory = SupportTicketCategory.TECHNICAL;

  @IsOptional()
  @IsUUID()
  assignedToUserId?: string;
}

export class UpdateSupportTicketDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  subject?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsEnum(SupportTicketCategory)
  category?: SupportTicketCategory;
}

export class UpdateTicketStatusDto {
  @IsEnum(SupportTicketStatus)
  @IsNotEmpty()
  status: SupportTicketStatus;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

export class AssignTicketDto {
  @IsOptional()
  @IsUUID()
  assignedToUserId?: string | null;
}

export class CreateSupportMessageDto {
  @IsString()
  @IsNotEmpty()
  body: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean = false;
}
