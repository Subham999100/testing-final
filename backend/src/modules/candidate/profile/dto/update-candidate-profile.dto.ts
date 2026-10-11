// ============================================================
// Clyptus Job Portal - Candidate Portal
// DTO: Update Candidate Profile Request
// ============================================================

import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CandidateEducationItemDto {
  @Transform(trimString)
  @IsString({ message: 'Education id must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Education id cannot exceed 100 characters' })
  id?: string;

  @Transform(trimString)
  @IsString({ message: 'Degree must be a string' })
  @IsOptional()
  @MaxLength(150, { message: 'Degree cannot exceed 150 characters' })
  degree?: string;

  @Transform(trimString)
  @IsString({ message: 'Institution must be a string' })
  @IsOptional()
  @MaxLength(200, { message: 'Institution cannot exceed 200 characters' })
  institution?: string;

  @Transform(trimString)
  @IsString({ message: 'Field of study must be a string' })
  @IsOptional()
  @MaxLength(150, { message: 'Field of study cannot exceed 150 characters' })
  fieldOfStudy?: string;

  @IsInt({ message: 'Start year must be an integer' })
  @IsOptional()
  @Min(1950, { message: 'Start year must be 1950 or later' })
  @Max(2100, { message: 'Start year cannot exceed 2100' })
  startYear?: number;

  @IsInt({ message: 'End year must be an integer' })
  @IsOptional()
  @Min(1950, { message: 'End year must be 1950 or later' })
  @Max(2100, { message: 'End year cannot exceed 2100' })
  endYear?: number;

  @Transform(trimString)
  @IsString({ message: 'Grade must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Grade cannot exceed 50 characters' })
  grade?: string;

  @Transform(trimString)
  @IsString({ message: 'Education description must be a string' })
  @IsOptional()
  @MaxLength(1000, { message: 'Education description cannot exceed 1000 characters' })
  description?: string;
}

export class CandidateExperienceItemDto {
  @Transform(trimString)
  @IsString({ message: 'Experience id must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Experience id cannot exceed 100 characters' })
  id?: string;

  @Transform(trimString)
  @IsString({ message: 'Company must be a string' })
  @IsOptional()
  @MaxLength(200, { message: 'Company cannot exceed 200 characters' })
  company?: string;

  @Transform(trimString)
  @IsString({ message: 'Job title must be a string' })
  @IsOptional()
  @MaxLength(150, { message: 'Job title cannot exceed 150 characters' })
  jobTitle?: string;

  @Transform(trimString)
  @IsString({ message: 'Employment type must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Employment type cannot exceed 50 characters' })
  employmentType?: string;

  @Transform(trimString)
  @IsString({ message: 'Location must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
  location?: string;

  @Transform(trimString)
  @IsString({ message: 'Start date must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'Start date cannot exceed 50 characters' })
  startDate?: string;

  @Transform(trimString)
  @IsString({ message: 'End date must be a string' })
  @IsOptional()
  @MaxLength(50, { message: 'End date cannot exceed 50 characters' })
  endDate?: string;

  @IsBoolean({ message: 'currentJob must be a boolean' })
  @IsOptional()
  currentJob?: boolean;

  @Transform(trimString)
  @IsString({ message: 'Experience description must be a string' })
  @IsOptional()
  @MaxLength(2000, { message: 'Experience description cannot exceed 2000 characters' })
  description?: string;
}

export class UpdateCandidateProfileDto {
  @Transform(trimString)
  @IsString({ message: 'First name must be a string' })
  @IsOptional()
  @MaxLength(60, { message: 'First name cannot exceed 60 characters' })
  firstName?: string;

  @Transform(trimString)
  @IsString({ message: 'Last name must be a string' })
  @IsOptional()
  @MaxLength(60, { message: 'Last name cannot exceed 60 characters' })
  lastName?: string;

  @Transform(trimString)
  @IsString({ message: 'Full name must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'Full name cannot exceed 120 characters' })
  fullName?: string;

  @Transform(trimString)
  @IsString({ message: 'Phone must be a string' })
  @IsOptional()
  @MaxLength(30, { message: 'Phone number cannot exceed 30 characters' })
  phone?: string;

  @Transform(trimString)
  @IsString({ message: 'Headline must be a string' })
  @IsOptional()
  @MaxLength(150, { message: 'Headline cannot exceed 150 characters' })
  headline?: string;

  @Transform(trimString)
  @IsString({ message: 'Location must be a string' })
  @IsOptional()
  @MaxLength(100, { message: 'Location cannot exceed 100 characters' })
  location?: string;

  @IsInt({ message: 'Experience years must be an integer' })
  @IsOptional()
  @Min(0, { message: 'Experience years cannot be negative' })
  @Max(60, { message: 'Experience years cannot exceed 60' })
  experienceYears?: number;

  @Transform(trimString)
  @IsString({ message: 'Current company must be a string' })
  @IsOptional()
  @MaxLength(120, { message: 'Current company cannot exceed 120 characters' })
  currentCompany?: string;

  @IsArray({ message: 'Skills must be an array of strings' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  @IsOptional()
  skills?: string[];

  @Transform(trimString)
  @IsString({ message: 'Bio must be a string' })
  @IsOptional()
  @MaxLength(2000, { message: 'Bio cannot exceed 2000 characters' })
  bio?: string;

  @IsArray({ message: 'Education must be an array' })
  @ArrayMaxSize(20, { message: 'Education cannot have more than 20 entries' })
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationItemDto)
  @IsOptional()
  education?: CandidateEducationItemDto[];

  @IsArray({ message: 'Experience must be an array' })
  @ArrayMaxSize(20, { message: 'Experience cannot have more than 20 entries' })
  @ValidateNested({ each: true })
  @Type(() => CandidateExperienceItemDto)
  @IsOptional()
  experience?: CandidateExperienceItemDto[];
}
