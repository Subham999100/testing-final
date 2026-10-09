// ============================================================
// ORGANISATION PORTAL — Candidate / application / interview / offer DTOs
// ============================================================

import { OmitType, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
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
import { ApplicationStage, FeedbackRecommendation, InterviewMode, InterviewStatus, OfferStatus } from '@prisma/client';
import { PageQueryDto } from '../common/org-helpers';
import { INTERVIEW_ACTIONS, OFFER_ACTIONS } from '../common/org-workflows';

// ---------------- candidates ----------------

export class CandidateInputDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  headline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  location?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  currentCompany?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(60)
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(50000)
  resumeText?: string;

  @IsOptional()
  @IsUrl({ protocols: ['https'], require_protocol: true })
  resumeUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}

export class UpdateCandidateDto extends PartialType(CandidateInputDto) {}

export class CandidateQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  skill?: string;

  @IsOptional()
  @IsIn(['true', 'false'])
  saved?: string;
}

export class NoteDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @IsOptional()
  @IsString()
  applicationId?: string;
}

// ---------------- applications ----------------

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  candidateId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class ApplicationQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsEnum(ApplicationStage)
  stage?: ApplicationStage;

  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class MoveApplicationDto {
  @IsEnum(ApplicationStage)
  toStage: ApplicationStage;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class BulkMoveDto extends MoveApplicationDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids: string[];
}

export class AssignApplicationDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}

// ---------------- interviews ----------------

export class InterviewInputDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @IsDateString()
  scheduledAt: string;

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMinutes: number;

  @IsEnum(InterviewMode)
  mode: InterviewMode;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @IsString({ each: true })
  interviewerIds: string[];
}

export class RescheduleInterviewDto extends PartialType(OmitType(InterviewInputDto, ['applicationId'] as const)) {}

export class InterviewQueryDto extends PageQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsEnum(InterviewStatus)
  status?: InterviewStatus;

  @IsOptional()
  @IsIn(['true', 'false'])
  mine?: string;

  @IsOptional()
  @IsString()
  applicationId?: string;
}

export class InterviewActionParam {
  @IsIn(INTERVIEW_ACTIONS as unknown as string[])
  action: string;
}

export class FeedbackDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsEnum(FeedbackRecommendation)
  recommendation: FeedbackRecommendation;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  strengths?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  concerns?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}

// ---------------- offers ----------------

export class OfferInputDto {
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  title: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  salary: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsDateString()
  joiningDate?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(3000)
  notes?: string;
}

export class UpdateOfferDto extends PartialType(OmitType(OfferInputDto, ['applicationId'] as const)) {}

export class OfferQueryDto extends PageQueryDto {
  @IsOptional()
  @IsEnum(OfferStatus)
  status?: OfferStatus;
}

export class OfferActionParam {
  @IsIn(OFFER_ACTIONS as unknown as string[])
  action: string;
}

export class OfferActionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
