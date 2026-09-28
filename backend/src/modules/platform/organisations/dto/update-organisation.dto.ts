// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Update Organisation
// ============================================================

import {
  IsString,
  IsEmail,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateOrganisationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsEmail()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  tier?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  maxRecruiters?: number;

  @IsString()
  @IsOptional()
  industry?: string;

  @IsString()
  @IsOptional()
  companySize?: string;

  @IsString()
  @IsOptional()
  website?: string;
}
