// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Resume Management
// Handles private resume upload, replacement, download, and deletion.
// ============================================================

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as crypto from 'crypto';
import * as path from 'path';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import {
  assertSafeContent,
  MAX_DOCUMENT_FILE_SIZE,
  sanitizeFileName,
  validateDocumentFile,
} from '../../../integrations/storage/document-validator.util';
import { CloudStorageService } from '../../../integrations/storage/storage.service';

export interface UploadedFileObject {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface CandidateResumeMetadata {
  hasResume: boolean;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  uploadedAt: Date | null;
  hasText: boolean;
}

export interface CandidateResumeDownloadResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

@Injectable()
export class CandidateResumeService {
  private readonly logger = new Logger(CandidateResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorage: CloudStorageService,
  ) {}

  /**
   * Uploads or replaces the candidate's private resume.
   * Atomic replacement:
   * 1. Validates and writes the new file first.
   * 2. Updates the database record.
   * 3. Deletes the previous file only after database update succeeds.
   */
  async uploadResume(
    actor: AuthenticatedUser,
    file: UploadedFileObject,
  ): Promise<CandidateResumeMetadata> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty file is required');
    }

    if (file.buffer.length > MAX_DOCUMENT_FILE_SIZE) {
      throw new BadRequestException(
        `File size exceeds maximum allowed limit of ${MAX_DOCUMENT_FILE_SIZE / (1024 * 1024)}MB`,
      );
    }

    const originalName = file.originalname || 'resume';
    const ext = path.extname(originalName).toLowerCase();

    if (!ALLOWED_RESUME_EXTENSIONS.includes(ext)) {
      throw new BadRequestException(
        `File extension "${ext}" is not supported. Supported extensions: .pdf, .doc, .docx, .txt`,
      );
    }

    let sanitizedFileName: string;
    let detectedMimeType: string;
    let resumeText: string | null = null;

    if (ext === '.txt') {
      sanitizedFileName = sanitizeFileName(originalName);
      assertSafeContent(file.buffer);
      detectedMimeType = 'text/plain';
      resumeText = file.buffer.toString('utf8').slice(0, 50000);
    } else {
      const validation = validateDocumentFile(originalName, file.buffer, file.mimetype);
      sanitizedFileName = validation.sanitizedFileName;
      detectedMimeType = validation.detectedMimeType;
    }

    // Retrieve candidate profile
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new NotFoundException('Candidate account not found');
    }

    let profile = user.candidateProfile;
    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: { userId: user.id },
      });
    }

    const previousStorageKey = profile.resumeStorageKey;
    const safeUserId = actor.userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const uniqueFileId = crypto.randomUUID();
    const safeBaseName = `${uniqueFileId}-${sanitizedFileName}`;

    // 1. Write new file to storage
    let uploadResult: { url: string; key: string };
    try {
      uploadResult = await this.cloudStorage.uploadFile({
        fileName: safeBaseName,
        buffer: file.buffer,
        mimeType: detectedMimeType,
        folder: `resumes/candidates/${safeUserId}`,
      });
    } catch (err: any) {
      this.logger.error(`Storage write failed for user ${actor.userId}: ${err.message}`, err.stack);
      throw new InternalServerErrorException('Failed to securely store resume file');
    }

    const newStorageKey = uploadResult.key;

    // 2. Update database record
    try {
      const updatedProfile = await this.prisma.candidateProfile.update({
        where: { id: profile.id },
        data: {
          resumeStorageKey: newStorageKey,
          resumeFileName: sanitizedFileName,
          resumeMimeType: detectedMimeType,
          resumeFileSize: file.buffer.length,
          resumeUploadedAt: new Date(),
          resumeText,
        },
      });

      // 3. Delete previous file only after DB update succeeds
      if (previousStorageKey && previousStorageKey !== newStorageKey) {
        try {
          await this.cloudStorage.deletePrivateObject(previousStorageKey);
          this.logger.log(`Safely cleaned up old resume: ${previousStorageKey}`);
        } catch (cleanupErr: any) {
          this.logger.warn(`Failed to clean up old resume ${previousStorageKey}: ${cleanupErr.message}`);
        }
      }

      this.logger.log(`Successfully uploaded resume for candidate ${actor.userId}`);

      return {
        hasResume: true,
        fileName: updatedProfile.resumeFileName,
        fileSize: updatedProfile.resumeFileSize,
        mimeType: updatedProfile.resumeMimeType,
        uploadedAt: updatedProfile.resumeUploadedAt,
        hasText: !!updatedProfile.resumeText,
      };
    } catch (dbErr: any) {
      // Rollback: delete newly uploaded file from storage on database failure
      await this.cloudStorage.deletePrivateObject(newStorageKey).catch(() => {});
      this.logger.error(`Database update failed for resume upload: ${dbErr.message}`, dbErr.stack);
      throw new InternalServerErrorException('Failed to update resume record in database');
    }
  }

  /**
   * Retrieves resume metadata for the authenticated candidate.
   */
  async getResumeMetadata(actor: AuthenticatedUser): Promise<CandidateResumeMetadata> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });

    if (!profile || !profile.resumeStorageKey) {
      return {
        hasResume: false,
        fileName: null,
        fileSize: null,
        mimeType: null,
        uploadedAt: null,
        hasText: false,
      };
    }

    return {
      hasResume: true,
      fileName: profile.resumeFileName,
      fileSize: profile.resumeFileSize,
      mimeType: profile.resumeMimeType,
      uploadedAt: profile.resumeUploadedAt,
      hasText: !!profile.resumeText,
    };
  }

  /**
   * Retrieves the raw resume buffer and metadata for secure streaming/download.
   */
  async downloadResume(actor: AuthenticatedUser): Promise<CandidateResumeDownloadResult> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });

    if (!profile || !profile.resumeStorageKey) {
      throw new NotFoundException('No resume found for this candidate');
    }

    const storedObject = await this.cloudStorage.retrievePrivateObject(profile.resumeStorageKey);

    return {
      buffer: storedObject.buffer,
      fileName: profile.resumeFileName || 'resume.pdf',
      mimeType: profile.resumeMimeType || storedObject.contentType || 'application/octet-stream',
      fileSize: profile.resumeFileSize || storedObject.contentLength,
    };
  }

  /**
   * Deletes the candidate's resume from storage and clears database fields.
   */
  async deleteResume(actor: AuthenticatedUser): Promise<{ message: string }> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });

    if (!profile || !profile.resumeStorageKey) {
      throw new NotFoundException('No resume found to delete');
    }

    const storageKey = profile.resumeStorageKey;

    // Delete from storage
    await this.cloudStorage.deletePrivateObject(storageKey).catch((err) => {
      this.logger.warn(`Storage delete warning for key ${storageKey}: ${err.message}`);
    });

    // Clear database fields
    await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        resumeStorageKey: null,
        resumeFileName: null,
        resumeMimeType: null,
        resumeFileSize: null,
        resumeUploadedAt: null,
        resumeText: null,
      },
    });

    this.logger.log(`Successfully deleted resume for candidate ${actor.userId}`);
    return { message: 'Resume deleted successfully' };
  }
}
