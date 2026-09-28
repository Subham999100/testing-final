// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Query Immutable Token Transactions Ledger
// ============================================================

import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TokenTransactionType } from '@prisma/client';

export class QueryTokenTransactionsDto {
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
  organisationId?: string;

  @IsOptional()
  @IsEnum(TokenTransactionType)
  type?: TokenTransactionType;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;
}
