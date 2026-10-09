// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Create Token Plan
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { BillingCycle } from '@prisma/client';

export class CreateTokenPlanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  tokenAmount: number;

  @IsInt()
  @Min(0)
  priceCents: number;

  @IsString()
  @IsOptional()
  currency?: string = 'USD';

  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle = BillingCycle.MONTHLY;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsInt()
  @IsOptional()
  sortOrder?: number = 0;
}
