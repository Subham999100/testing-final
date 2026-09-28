// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Create Organisation
// ============================================================

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsInt,
  Min,
  Matches,
} from 'class-validator';

export class CreateOrganisationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Slug must consist only of lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @IsString()
  @IsOptional()
  domain?: string;

  @IsEmail()
  contactEmail: string;

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

  @IsInt()
  @Min(0)
  @IsOptional()
  initialTokenAllocation?: number;
}
