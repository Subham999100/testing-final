// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Update Platform Setting
// ============================================================

import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateSettingDto {
  @IsNotEmpty()
  value: any;

  @IsString()
  @IsOptional()
  description?: string;
}
