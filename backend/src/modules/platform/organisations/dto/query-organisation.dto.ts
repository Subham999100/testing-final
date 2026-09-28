// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Query & Filter Organisations
// ============================================================

import { IsOptional, IsString, IsEnum, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { OrganisationStatus } from '@prisma/client';

export class QueryOrganisationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(OrganisationStatus)
  status?: OrganisationStatus;

  @IsOptional()
  @IsString()
  tier?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
