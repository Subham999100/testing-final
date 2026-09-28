// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Adjust Organisation Tokens (Ledger Mutation)
// ============================================================

import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsEnum,
  IsOptional,
  MinLength,
} from 'class-validator';
import { TokenTransactionType } from '@prisma/client';

export class AdjustTokensDto {
  @IsString()
  @IsNotEmpty()
  organisationId: string;

  @IsEnum(TokenTransactionType)
  type: TokenTransactionType; // ALLOCATION, ADJUSTMENT, REFUND, REVERSAL

  @IsInt()
  amount: number; // Positive number for credit, negative for debit

  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Reason must be descriptive for ledger auditability' })
  reason: string;

  @IsString()
  @IsOptional()
  referenceId?: string;
}
