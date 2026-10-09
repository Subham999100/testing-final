// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Request More Information on Organisation Application
// ============================================================

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RequestApplicationInfoDto {
  @IsString()
  @IsNotEmpty({ message: 'Information request notes are required' })
  @MinLength(5, { message: 'Notes must be at least 5 characters long' })
  @MaxLength(2000, { message: 'Notes must not exceed 2000 characters' })
  notes: string;
}
