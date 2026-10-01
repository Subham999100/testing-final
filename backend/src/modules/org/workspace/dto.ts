// ============================================================
// ORGANISATION PORTAL — Workspace DTOs (organisation, settings,
// integrations, notifications, tasks, messages, insights)
// ============================================================

import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PageQueryDto } from '../common/org-helpers';

export class UpdateOrganisationDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  companySize?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https', 'http'], require_protocol: true })
  website?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  jobApprovalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  offerApprovalRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  rejectReasonRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  messageOversight?: boolean;

  @IsOptional()
  @IsBoolean()
  aiEnabled?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  lowBalanceThreshold?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100_000)
  tokenConfirmThreshold?: number;
}

export const INTEGRATION_PROVIDERS = ['SLACK_WEBHOOK', 'MS_TEAMS_WEBHOOK', 'GOOGLE_CALENDAR', 'CUSTOM_WEBHOOK'] as const;

export class IntegrationParam {
  @IsIn(INTEGRATION_PROVIDERS as unknown as string[])
  provider: string;
}

export class UpsertIntegrationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  label: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  secret: string;
}

export class ToggleIntegrationDto {
  @IsBoolean()
  enabled: boolean;
}

export class NotificationQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['true', 'false'])
  unread?: string;
}

export class NotificationPrefsDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  mutedTypes: string[];
}

export class AnnouncementDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
}

export class TaskInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsDateString()
  dueAt?: string;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsIn(['JOB', 'CANDIDATE', 'APPLICATION', 'INTERVIEW', 'OFFER'])
  relatedType?: string;

  @IsOptional()
  @IsString()
  relatedId?: string;
}

export class TaskQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'DONE'])
  status?: 'OPEN' | 'DONE';

  @IsOptional()
  @IsIn(['mine', 'created'])
  scope?: 'mine' | 'created';
}

export class MessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  subject?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}

export class RangeQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class AuditQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  action?: string;

  @IsOptional()
  @IsString()
  actorId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  entityType?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export const EXPORT_TYPES = ['jobs', 'candidates', 'applications', 'audit', 'team-analytics'] as const;

export class ExportParam {
  @IsIn(EXPORT_TYPES as unknown as string[])
  type: string;
}
