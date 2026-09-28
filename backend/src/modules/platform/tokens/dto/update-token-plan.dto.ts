// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Update Token Plan
// ============================================================

import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class UpdateTokenPlanDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  tokenAmount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceCents?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @IsOptional()
  sortOrder?: number;
}
