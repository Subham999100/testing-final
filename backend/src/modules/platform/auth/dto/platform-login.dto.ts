// ============================================================
// Clyptus Job Portal - Platform Super Admin
// DTO: Platform Login Request
// ============================================================

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class PlatformLoginDto {
  @IsEmail({}, { message: 'Invalid email address format' })
  @IsNotEmpty({ message: 'Email address is required' })
  @Transform(({ value }: { value?: string }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;
}
