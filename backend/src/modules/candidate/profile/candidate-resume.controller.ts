// ============================================================
// Clyptus Job Portal - Candidate Portal
// Controller: Candidate Resume Endpoints
// Base Route: /api/v1/candidate/profile/resume
// ============================================================

import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { MAX_DOCUMENT_FILE_SIZE } from '../../../integrations/storage/document-validator.util';
import {
  CandidateResumeMetadata,
  CandidateResumeService,
  UploadedFileObject,
} from './candidate-resume.service';

@ApiTags('Candidate · Resume')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.CANDIDATE)
@Controller('candidate/profile/resume')
export class CandidateResumeController {
  constructor(private readonly resumeService: CandidateResumeService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: MAX_DOCUMENT_FILE_SIZE,
      },
    }),
  )
  async uploadResume(
    @CurrentUser() actor: AuthenticatedUser,
    @UploadedFile() file: UploadedFileObject,
  ): Promise<CandidateResumeMetadata> {
    return this.resumeService.uploadResume(actor, file);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getResumeMetadata(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CandidateResumeMetadata> {
    return this.resumeService.getResumeMetadata(actor);
  }

  @Get('download')
  async downloadResume(
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const result = await this.resumeService.downloadResume(actor);

    res.setHeader('Content-Type', result.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    res.setHeader('Content-Length', result.fileSize);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    res.send(result.buffer);
  }

  @Delete()
  @HttpCode(HttpStatus.OK)
  async deleteResume(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<{ message: string }> {
    return this.resumeService.deleteResume(actor);
  }
}
