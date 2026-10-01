// ============================================================
// ORGANISATION PORTAL — DTOs: auth, members, invitations, tokens
// ============================================================

import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PageQueryDto } from '../common/org-helpers';

const trimLower = ({ value }: { value?: unknown }) => (typeof value === 'string' ? value.toLowerCase().trim() : value);

export class OrgLoginDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  password: string;
}

const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{10,}$/;

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  lastName: string;

  @IsString()
  @Matches(PASSWORD_RULE, { message: 'Password must be at least 10 characters and include letters and numbers' })
  @MaxLength(200)
  password: string;
}

export class CreateInvitationDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;

  @IsIn(['ORGANISATION_ADMIN', 'RECRUITER'])
  role: 'ORGANISATION_ADMIN' | 'RECRUITER';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  permissions?: string[];
}

export class OwnerInvitationDto {
  @Transform(trimLower)
  @IsEmail()
  email: string;
}

export class MemberQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['ORGANISATION_SUPER_ADMIN', 'ORGANISATION_ADMIN', 'RECRUITER'])
  role?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'SUSPENDED', 'REMOVED'])
  status?: string;
}

export class InvitationQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED'])
  status?: string;
}

export class UpdatePermissionsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @IsString({ each: true })
  permissions: string[];
}

export class AllocateTokensDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @Type(() => Number)
  @IsInt()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  reason?: string;
}

export class LedgerQueryDto extends PageQueryDto {
  @IsOptional()
  @IsIn(['PURCHASE', 'ALLOCATION', 'CONSUMPTION', 'REFUND', 'ADJUSTMENT', 'EXPIRATION', 'REVERSAL'])
  type?: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  timezone?: string;
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @Matches(PASSWORD_RULE, { message: 'Password must be at least 10 characters and include letters and numbers' })
  @MaxLength(200)
  newPassword: string;
}
