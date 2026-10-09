// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Suspend Organisation (Destructive Operation)
// ============================================================

import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class SuspendOrganisationDto {
  @IsString()
  @IsNotEmpty({ message: 'A formal reason is strictly required to suspend an organisation' })
  @MinLength(10, { message: 'Suspension reason must provide at least 10 characters of justification' })
  reason: string;
}
