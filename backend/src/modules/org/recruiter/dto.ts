import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  Matches,
  ValidateNested,
  IsUrl,
  IsDefined,
  ArrayMinSize,
  IsObject,
} from "class-validator";

export class TalentQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  activityDays?: number;
  @IsOptional()
  @IsIn(["INDIA_WORK_AUTH", "H1B", "L1", "TN", "US_WORK_AUTH"])
  workAuthorisation?: string;
  @IsOptional() @IsIn(["registered", "sourced"]) sourceGroup?: string;
  @IsOptional() @IsIn(["true", "false"]) booleanMode?: string;
  @IsOptional() @IsIn(["true", "false"]) excludeSynonyms?: string;
  @IsOptional() @IsString() @MaxLength(120) preferredLocation?: string;
  @IsOptional() @IsString() @MaxLength(120) excludeCompany?: string;
  @IsOptional() @IsIn(["current", "past", "any"]) companyScope?: string;
  @IsOptional() @IsIn(["current", "past", "any"]) designationScope?: string;
  @IsOptional() @IsIn(["current", "past", "any"]) industryScope?: string;
  @IsOptional() @IsIn(["any", "specific", "none"]) ug?: string;
  @IsOptional() @IsIn(["any", "specific", "none"]) pg?: string;
  @IsOptional() @IsIn(["any", "specific", "none"]) phd?: string;
  @IsOptional() @IsString() @MaxLength(120) ugText?: string;
  @IsOptional() @IsString() @MaxLength(120) pgText?: string;
  @IsOptional() @IsString() @MaxLength(120) phdText?: string;
  @IsOptional() @IsString() @MaxLength(120) ugCourse?: string;
  @IsOptional() @IsString() @MaxLength(120) ugInstitute?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) ugYearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) ugYearTo?: number;
  @IsOptional() @IsString() @MaxLength(120) pgCourse?: string;
  @IsOptional() @IsString() @MaxLength(120) pgInstitute?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) pgYearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) pgYearTo?: number;
  @IsOptional() @IsString() @MaxLength(120) phdCourse?: string;
  @IsOptional() @IsString() @MaxLength(120) phdInstitute?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) phdYearFrom?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1950) @Max(2050) phdYearTo?: number;
  @IsOptional() @IsIn(["true", "false"]) servingNotice?: string;
  @IsOptional() @IsIn(["true", "false"]) hasResume?: string;
  @IsOptional() @IsIn(["true", "false"]) hideEmailed?: string;
  @IsOptional() @IsIn(["true", "false"]) hideUnlocked?: string;
  @IsOptional() @IsString() @MaxLength(80) language?: string;
  @IsOptional() @IsString() @MaxLength(500) languages?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(16) @Max(100) minAge?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(16) @Max(100) maxAge?: number;
  @IsOptional() @IsIn(["true", "false"]) includeUnknownAge?: string;
  @IsOptional() @IsIn(["ONSITE", "HYBRID", "REMOTE"]) workMode?: string;
  @IsOptional()
  @IsIn(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"])
  employmentType?: string;
  @IsOptional() @IsString() @MaxLength(120) source?: string;
  @IsOptional() @IsString() @MaxLength(300) insights?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(11)
  minExperienceMonths?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(11)
  maxExperienceMonths?: number;
  @IsOptional() @IsIn(["true", "false"]) includePreferred?: string;
  @IsOptional() @IsIn(["true", "false"]) includeUnknownSalary?: string;
  @IsOptional() @IsIn(["true", "false"]) includeUnknownNotice?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  updatedDays?: number;

  @IsOptional() @IsString() @MaxLength(500) search?: string;
  @IsOptional() @IsString() @MaxLength(200) exclude?: string;
  @IsOptional()
  @IsIn(["profile", "skills", "headline", "resume", "titleSkills"])
  searchIn?: string;
  @IsOptional() @IsString() @MaxLength(120) location?: string;
  @IsOptional() @IsString() @MaxLength(120) company?: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string;
  @IsOptional() @IsString() @MaxLength(120) education?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  minExperience?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  maxExperience?: number;
  // Annual salary in INR rupees, not paise/lakhs. Explicit currency prevents cross-currency comparison.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  minSalary?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  maxSalary?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  noticeDays?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(730)
  activeDays?: number;
  @IsOptional() @IsIn(["true", "false"]) saved?: string;
  @IsOptional() @IsIn(["true", "false"]) hideViewed?: string;
  @IsOptional() @IsUUID() folderId?: string;
  @IsOptional()
  @IsIn(["relevance", "updated", "experience", "active"])
  sort?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
export class CareerEntryDto {
  @IsOptional() @IsIn(["UG", "PG", "PHD", "OTHER", ""]) level?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;

  @IsOptional() @Matches(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/) startMonth?: string;
  @IsOptional() @Matches(/^(19|20)\d{2}-(0[1-9]|1[0-2])$/) endMonth?: string;
  @IsOptional() @IsBoolean() current?: boolean;

  @IsString() @MinLength(1) @MaxLength(160) title: string;
  @IsString() @MaxLength(160) organisation: string;
  @IsOptional() @IsString() @MaxLength(80) period?: string;
  @IsOptional() @IsString() @MaxLength(1500) description?: string;
}
export class ITSkillDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
  @IsOptional() @IsString() @MaxLength(40) version?: string;
  @IsOptional() @IsString() @MaxLength(10) lastUsed?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(720) months?: number;
}
export class SearchDetailsDto {
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(5)
  @IsIn(["INDIA_WORK_AUTH", "H1B", "L1", "TN", "US_WORK_AUTH"], { each: true })
  workAuthorisations?: string[];
  @IsOptional() @IsBoolean() servingNotice?: boolean;
  @IsOptional() @IsBoolean() educationComplete?: boolean;
  @IsOptional() @IsBoolean() emailOptOut?: boolean;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  languages?: string[];
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(10)
  @IsIn(["startup", "founder", "earlyStartup", "promoted", "phdUnder4"], {
    each: true,
  })
  insights?: string[];
  @IsOptional() @IsBoolean() isEmailVerified?: boolean;
  @IsOptional() @IsBoolean() isPhoneVerified?: boolean;
  @IsOptional()
  @IsUrl({ protocols: ["https"], require_protocol: true })
  @MaxLength(500)
  portfolioUrl?: string;
}
/** Professional data only. lastActiveAt is deliberately not recruiter-editable. */
export class ProfessionalProfileDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => SearchDetailsDto)
  searchDetails?: SearchDetailsDto;
  @IsOptional() @IsString() @MaxLength(4000) summary?: string;
  @IsOptional() @IsString() @MaxLength(120) designation?: string;
  @IsOptional() @IsString() @MaxLength(120) industry?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(11)
  experienceMonths?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  currentSalary?: number | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  expectedSalary?: number | null;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  noticePeriodDays?: number | null;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  preferredLocations?: string[];
  @IsOptional()
  @IsIn(["", "FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"])
  employmentPreference?: string;
  @IsOptional()
  @IsIn(["", "ONSITE", "HYBRID", "REMOTE"])
  workPreference?: string;
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CareerEntryDto)
  employment?: CareerEntryDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => CareerEntryDto)
  education?: CareerEntryDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => CareerEntryDto)
  certifications?: CareerEntryDto[];
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => ITSkillDto)
  itSkills?: ITSkillDto[];
}
export class FolderDto {
  @IsString() @MinLength(1) @MaxLength(80) name: string;
}
export class FolderCandidatesDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsUUID("all", { each: true })
  candidateIds: string[];
}
export class SavedSearchDto extends FolderDto {
  @IsBoolean() shared: boolean;
  @IsDefined()
  @ValidateNested()
  @Type(() => TalentQueryDto)
  filters: TalentQueryDto;
}

export class SelectionRangeDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => TalentQueryDto)
  filters: TalentQueryDto;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) from: number;
  @Type(() => Number) @IsInt() @Min(1) @Max(1000000) to: number;
}
export class EmailDraftDto extends FolderCandidatesDto {
  @IsUUID() requestId: string;
  @IsString() @MinLength(1) @MaxLength(200) subject: string;
  @IsString() @MinLength(1) @MaxLength(10000) body: string;
  @IsOptional() @IsString() campaignName?: string;
  @IsOptional() @IsString() folderId?: string;
  @IsOptional() @IsString() bannerUrl?: string;
  @IsOptional() @IsString() jobDesignation?: string;
  @IsOptional() @IsString() jobMode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) jobLocations?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) experienceMax?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) salaryMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) salaryMax?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() signature?: string;
  @IsOptional() @IsString() scheduleAt?: string;
  @IsOptional() @IsString() replyTo?: string;
  @IsOptional() @Type(() => Number) followUpIntervalDays?: number;
  @IsOptional() @Type(() => Number) maxFollowUpAttempts?: number;
  @IsOptional() @IsBoolean() stopFollowUpOnReply?: boolean;
}

export class WhatsAppPreviewDto extends FolderCandidatesDto {
  @IsOptional() @IsString() jobTitle?: string;
  @IsOptional() @IsString() jobMode?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) locations?: string[];
  @IsOptional() @Type(() => Number) minExp?: number;
  @IsOptional() @Type(() => Number) maxExp?: number;
  @IsOptional() @Type(() => Number) salaryMin?: number;
  @IsOptional() @Type(() => Number) salaryMax?: number;
  @IsOptional() @IsString() currency?: string;
  @IsOptional() @IsString() campaignName?: string;
  @IsOptional() @IsString() folderId?: string;
  @IsOptional() @IsString() noticePeriod?: string;
  @IsOptional() @IsString() templateId?: string;
  @IsOptional() @IsObject() templateVariables?: Record<string, string>;
  @IsOptional() @IsString() mediaUrl?: string;
}

export class WhatsAppDispatchDto extends WhatsAppPreviewDto {
  @IsOptional() @IsUUID() requestId?: string;
}

export class SmsPreviewDto extends FolderCandidatesDto {
  @IsOptional() @IsString() templateKey?: string;
  @IsOptional() @IsString() folderId?: string;
  @IsOptional() @IsObject() variables?: Record<string, string>;
}

export class SmsDispatchDto extends SmsPreviewDto {
  @IsOptional() @IsUUID() requestId?: string;
}