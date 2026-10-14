// ============================================================
// Clyptus Job Portal - Candidate Portal
// DTO: Upload Video Profile
// Every field decorated for ValidationPipe whitelist compatibility
// ============================================================

import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadVideoProfileDto {
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean({ message: 'consent must be a boolean' })
  consent?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === 1 || value === '1')
  @IsBoolean({ message: 'consentGiven must be a boolean' })
  consentGiven?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber({}, { message: 'clientDurationSeconds must be a number' })
  clientDurationSeconds?: number;

  @IsOptional()
  @Transform(({ value }) => (value != null ? parseFloat(value) : undefined))
  @IsNumber({}, { message: 'durationSeconds must be a number' })
  durationSeconds?: number;
}
