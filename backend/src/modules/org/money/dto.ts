// ============================================================
// ORGANISATION PORTAL — Billing DTOs
// ============================================================

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { PageQueryDto } from '../common/org-helpers';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  planId: string;
}

export class PaymentQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  status?: string;
}
