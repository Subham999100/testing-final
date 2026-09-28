// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Update Organisation Token Allocation Limits
// ============================================================

import { IsInt, Min, IsBoolean, IsOptional } from 'class-validator';

export class UpdateAllocationLimitDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  monthlyMaxAllocation?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  singleTxLimit?: number;

  @IsBoolean()
  @IsOptional()
  autoRechargeEnabled?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  autoRechargeThreshold?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  autoRechargeAmount?: number;
}
