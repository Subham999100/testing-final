// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Create Platform Admin
// ============================================================

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreatePlatformAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @MinLength(8, { message: 'Temporary password must be at least 8 characters long' })
  password: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  permissions?: string[];

  @IsString()
  @IsOptional()
  notes?: string;
}
