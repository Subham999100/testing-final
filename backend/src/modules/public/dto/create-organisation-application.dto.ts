// ============================================================
// Clyptus Job Portal - Public Module
// DTO: Create Organisation Application
// ============================================================

import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  MaxLength,
  Matches,
  IsUUID,
  IsIn,
} from 'class-validator';

export class CreateOrganisationApplicationDto {
  // ── Organisation Details ──────────────────────────────────────
  @IsString()
  @IsNotEmpty({ message: 'Organisation name is required' })
  @MaxLength(120, { message: 'Organisation name must not exceed 120 characters' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Organisation slug is required' })
  @MaxLength(60, { message: 'Slug must not exceed 60 characters' })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must consist only of lowercase alphanumeric characters and hyphens without leading or trailing hyphens',
  })
  slug: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/, {
    message: 'Domain must be a valid fully qualified domain name (e.g. acme.com)',
  })
  domain?: string;

  @IsEmail({}, { message: 'A valid organisation contact email is required' })
  @MaxLength(150)
  contactEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Matches(/^[+]?[0-9\s\-()]{7,25}$/, {
    message: 'Contact phone must be a valid telephone number format',
  })
  contactPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  industry?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  companySize?: string;

  @IsString()
  @IsOptional()
  @MaxLength(255)
  @Matches(/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/, {
    message: 'Website must be a valid URL format',
  })
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  address?: string;

  // ── Authorised Representative / Applicant Details ─────────────
  @IsString()
  @IsNotEmpty({ message: 'Authorised representative first name is required' })
  @MaxLength(60)
  ownerFirstName: string;

  @IsString()
  @IsNotEmpty({ message: 'Authorised representative last name is required' })
  @MaxLength(60)
  ownerLastName: string;

  @IsEmail({}, { message: 'Authorised representative email is required' })
  @MaxLength(150)
  ownerEmail: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  @Matches(/^[+]?[0-9\s\-()]{7,25}$/, {
    message: 'Applicant phone must be a valid telephone number format',
  })
  ownerPhone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  ownerDesignation?: string;

  // ── Plan Selection & Payment Information ─────────────────────
  @IsString()
  @IsNotEmpty({ message: 'A selected plan is required' })
  @IsUUID('4', { message: 'selectedPlanId must be a valid UUID' })
  selectedPlanId: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  @IsIn(['BANK_TRANSFER', 'CHEQUE', 'ONLINE', 'OFFLINE_PROOF', 'WIRE'], {
    message: 'paymentMethod must be one of: BANK_TRANSFER, CHEQUE, ONLINE, OFFLINE_PROOF, WIRE',
  })
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: 'Payment reference must not exceed 100 characters' })
  paymentReference?: string;
}
