// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Resolve Security Event
// ============================================================

import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResolveSecurityEventDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5, { message: 'Resolution notes must explain corrective actions taken' })
  resolutionNotes: string;
}
