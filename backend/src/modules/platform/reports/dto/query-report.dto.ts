// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTOs: Platform Reports & Analytics Query
// ============================================================

import { IsOptional, IsString, IsEnum, IsDateString, IsIn } from 'class-validator';

export enum ReportTimeframe {
  TODAY = 'today',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  LAST_90_DAYS = '90d',
  THIS_YEAR = 'this_year',
  ALL = 'all',
}

export class QueryReportDto {
  @IsOptional()
  @IsEnum(ReportTimeframe)
  timeframe?: ReportTimeframe = ReportTimeframe.LAST_30_DAYS;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  organisationId?: string;

  @IsOptional()
  @IsIn(['overview', 'organisations', 'jobs', 'applications'])
  type?: 'overview' | 'organisations' | 'jobs' | 'applications' = 'overview';
}
