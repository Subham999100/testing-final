// ============================================================
// Clyptus Job Portal - Public Module
// DTO: Upload Application Document
// ============================================================

import { IsNotEmpty, IsEnum } from 'class-validator';
import { ApplicationDocumentType } from '@prisma/client';

export class UploadApplicationDocumentDto {
  @IsNotEmpty({ message: 'Document type is required' })
  @IsEnum(ApplicationDocumentType, {
    message:
      'type must be one of: REGISTRATION_CERTIFICATE, TAX_ID, AUTHORIZATION_LETTER, PAYMENT_PROOF, OTHER',
  })
  type: ApplicationDocumentType;
}
