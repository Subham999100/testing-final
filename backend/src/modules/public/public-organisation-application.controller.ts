// ============================================================
// Clyptus Job Portal - Public Module
// Controller: Public Plans & Organisation Applications
// Base Route: /api/v1/public
// ============================================================

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseInterceptors,
  UploadedFile,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  PublicOrganisationApplicationService,
  UploadedFileObject,
} from './public-organisation-application.service';
import { CreateOrganisationApplicationDto } from './dto/create-organisation-application.dto';
import { UploadApplicationDocumentDto } from './dto/upload-application-document.dto';
import { RateLimiterGuard, RateLimit } from '../../common/guards/rate-limiter.guard';
import { MAX_DOCUMENT_FILE_SIZE } from '../../integrations/storage/document-validator.util';

@Controller('public')
@UseGuards(RateLimiterGuard)
export class PublicOrganisationApplicationController {
  constructor(
    private readonly applicationService: PublicOrganisationApplicationService,
  ) {}

  /**
   * GET /api/v1/public/plans
   * Exposes only active plans safe for public presentation.
   */
  @Get('plans')
  @RateLimit({ points: 60, duration: 60 }) // 60 requests per minute
  async getPlans() {
    return this.applicationService.getActivePlans();
  }

  /**
   * POST /api/v1/public/organisation-applications
   * Submits a new OrganisationApplication.
   */
  @Post('organisation-applications')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ points: 10, duration: 60 }) // 10 submissions per minute per IP to combat spam
  async createApplication(@Body() dto: CreateOrganisationApplicationDto) {
    return this.applicationService.submitApplication(dto);
  }

  /**
   * POST /api/v1/public/organisation-applications/:id/documents
   * Uploads verification documents for an existing application.
   * Requires Bearer continuation token returned upon submission.
   */
  @Post('organisation-applications/:id/documents')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ points: 20, duration: 60 }) // 20 document uploads per minute per IP
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_DOCUMENT_FILE_SIZE, // 10MB limit
      },
    }),
  )
  async uploadDocument(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UploadApplicationDocumentDto,
    @UploadedFile() file: UploadedFileObject,
    @Headers('authorization') authHeader?: string,
  ) {
    return this.applicationService.uploadDocument(id, dto, file, authHeader);
  }
}
