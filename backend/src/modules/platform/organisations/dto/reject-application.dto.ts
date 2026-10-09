// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Reject Organisation Application
// ============================================================

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RejectApplicationDto {
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MinLength(5, { message: 'Rejection reason must be at least 5 characters long' })
  @MaxLength(2000, { message: 'Rejection reason must not exceed 2000 characters' })
  reason: string;
}
