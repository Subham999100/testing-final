// ============================================================
// Clyptus Job Portal - Candidate Portal
// DTO: Candidate Applications
// ============================================================

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCandidateApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Job ID is required' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  jobId: string;

  @IsOptional()
  @IsString()
  resumeId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}