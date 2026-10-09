import { IsOptional, IsString, IsEmail, IsInt, Min } from 'class-validator';

export class ProvisionApplicationDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEmail()
  ownerEmail?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  recruiterLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  initialTokens?: number;
}
