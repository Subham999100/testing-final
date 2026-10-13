// ============================================================
// Clyptus Job Portal - Candidate Portal
// DTOs: Candidate Onboarding Steps (1 through 5)
// ============================================================

import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  CandidateEducationItemDto,
  CandidateExperienceItemDto,
  CandidateProjectItemDto,
} from './update-candidate-profile.dto';

const trimString = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// --- STEP 1: Basic Details ---
export class OnboardingStep1Dto {
  @Transform(trimString)
  @IsString({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  @MaxLength(200, { message: 'Full name cannot exceed 200 characters' })
  @Matches(/^[a-zA-Z\u00C0-\u024F\u1E00-\u1EFF\s.'-]+$/, {
    message: 'Full name can only contain letters, spaces, dots, hyphens, and apostrophes',
  })
  fullName: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  firstName?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  lastName?: string;

  @Transform(trimString)
  @IsString({ message: 'Mobile number is required' })
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Mobile number must be a valid 10-digit Indian phone number starting with 6-9',
  })
  phone: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  phoneCountryCode?: string = '+91';

  @Transform(trimString)
  @IsString({ message: 'City is required' })
  @MinLength(2, { message: 'City name must have at least 2 characters' })
  @MaxLength(100, { message: 'City name cannot exceed 100 characters' })
  location: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsBoolean({ message: 'Work status must be declared (Fresher or Experienced)' })
  isFresher: boolean;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  gender?: string;
}

// --- STEP 2: Education ---
export class OnboardingStep2Dto {
  @Transform(trimString)
  @IsString()
  @IsOptional()
  highestQualification?: string;

  @IsArray({ message: 'Education must be an array of records' })
  @ValidateNested({ each: true })
  @Type(() => CandidateEducationItemDto)
  @IsOptional()
  education?: CandidateEducationItemDto[];
}


// --- STEP 3: Professional Details ---
export class OnboardingStep3Dto {
  @Transform(trimString)
  @IsString({ message: 'Resume headline is required' })
  @MinLength(10, { message: 'Resume headline must be at least 10 characters' })
  @MaxLength(120, { message: 'Resume headline cannot exceed 120 characters' })
  headline: string;

  @IsArray({ message: 'Key skills must be provided as an array' })
  @ArrayMinSize(3, { message: 'Please add at least 3 key skills' })
  @ArrayMaxSize(30, { message: 'You can specify at most 30 skills' })
  @IsString({ each: true, message: 'Each skill must be a string' })
  skills: string[];

  // Experienced fields
  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(150)
  currentJobTitle?: string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  @MaxLength(150)
  currentCompany?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(60)
  experienceYears?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(11)
  experienceMonths?: number;

  @IsOptional()
  currentSalary?: number | string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  noticePeriod?: string;

  // Fresher fields
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CandidateProjectItemDto)
  @IsOptional()
  projects?: CandidateProjectItemDto[];

  @IsInt()
  @IsOptional()
  expectedGraduationYear?: number;

  // Preferences
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(10, { message: 'Maximum 10 preferred locations allowed' })
  @IsOptional()
  preferredLocations?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredJobTypes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  preferredWorkModes?: string[];

  @IsOptional()
  expectedSalary?: number | string;

  @Transform(trimString)
  @IsString()
  @IsOptional()
  gender?: string;
}

// --- STEP 4: Resume Confirmation ---
export class OnboardingStep4Dto {
  @IsOptional()
  @IsBoolean()
  confirmed?: boolean = true;
}

// --- STEP 5: AI Video Interview ---
export class OnboardingStep5Dto {
  @Transform(trimString)
  @IsString()
  @IsOptional()
  action?: 'SKIP' | 'START' = 'SKIP';
}
