import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { TalentQueryDto } from "./dto";
export class RecentSearchDto {
  @IsUUID() requestId: string;
  @ValidateNested() @Type(() => TalentQueryDto) filters: TalentQueryDto;
}
export class ReportQueryDto {
  @IsOptional() @IsIn(["csv", "pdf", "xlsx"]) format?: string;
  @IsOptional()
  @IsIn(["usage", "inventory", "jobs", "interviews", "offers"])
  type: string = "usage";
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) from?: string;
  @IsOptional() @Matches(/^\d{4}-\d{2}-\d{2}$/) to?: string;
  @IsOptional() @IsUUID() userId?: string;
  @IsOptional()
  @IsIn([
    "RESUME_VIEW",
    "JOB_PUBLISH",
    "AI_MATCH",
    "AI_RESUME_PARSE",
    "AI_JD_IMPROVE",
    "AI_INTERVIEW_QUESTIONS",
  ])
  feature?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
