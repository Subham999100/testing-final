// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Query Organisation Applications Queue
// ============================================================

import { IsOptional, IsEnum, IsInt, Min, Max, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { OrgApplicationStatus } from '@prisma/client';

export class QueryOrganisationApplicationsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(OrgApplicationStatus, {
    message: 'status must be one of: PENDING_REVIEW, MORE_INFO_REQUESTED, APPROVED, REJECTED',
  })
  status?: OrgApplicationStatus;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['createdAt', 'name', 'applicationNumber', 'status', 'reviewedAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
