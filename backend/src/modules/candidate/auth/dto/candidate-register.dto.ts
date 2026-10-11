// ============================================================
// Clyptus Job Portal - Candidate Portal
// DTO: Candidate Registration Request
// ============================================================

import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const trimLower = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Minimum 8 characters, at least 1 uppercase letter, 1 number, and 1 special character
const CANDIDATE_PASSWORD_RULE =
  /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;

export class CandidateRegisterDto {
  @Transform(trimLower)
  @IsEmail({}, { message: 'A valid email address is required' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @IsString({ message: 'Password must be a string' })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  @Matches(CANDIDATE_PASSWORD_RULE, {
    message:
      'Password must be at least 8 characters long, contain at least one uppercase letter, one number, and one special character',
  })
  @MaxLength(100, { message: 'Password cannot exceed 100 characters' })
  password: string;

  @Transform(trimString)
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name cannot be empty' })
  @MaxLength(80, { message: 'First name cannot exceed 80 characters' })
  firstName: string;

  @Transform(trimString)
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name cannot be empty' })
  @MaxLength(80, { message: 'Last name cannot exceed 80 characters' })
  lastName: string;

  @Transform(trimString)
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters' })
  phone?: string;
}
