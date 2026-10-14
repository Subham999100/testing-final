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
import { CandidateScoringService } from './candidate-scoring.service';
import { ResumeParserService, ParsedResumeData } from './resume-parser.service';

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
  parseStatus?: string | null;
  parsedData?: any;
}

export interface CandidateResumeDownloadResult {
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  fileSize: number;
}

const ALLOWED_RESUME_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_RESUME_TEXT_LENGTH = 200_000;
const EXTRACTION_TIMEOUT_MS = 10_000;

/**
 * Extracts text from resume document buffer with strict character cap and timeout.
 * Never throws; returns null on failure. Never logs resume text content.
 */
async function extractTextFromDocument(
  ext: string,
  buffer: Buffer,
  logger: Logger,
): Promise<string | null> {
  if (ext === '.txt') {
    return buffer.toString('utf8').trim().slice(0, MAX_RESUME_TEXT_LENGTH) || null;
  }
  if (ext === '.doc') {
    // Note: Legacy binary .doc format yields null text
    logger.log('Legacy .doc binary format encountered; skipping text extraction');
    return null;
  }

  if (ext === '.pdf') {
    let timer: NodeJS.Timeout;
    try {
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const parsePromise = pdfParse(buffer);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('PDF extraction timed out after 10s')), EXTRACTION_TIMEOUT_MS);
      });

      const data: any = await Promise.race([parsePromise, timeoutPromise]);
      clearTimeout(timer!);
      const text = (data?.text || '').trim().slice(0, MAX_RESUME_TEXT_LENGTH);
      return text || null;
    } catch (err: any) {
      clearTimeout(timer!);
      logger.warn(`PDF text extraction failed: ${err.message || 'unknown error'}`);
      return null;
    }
  }

  if (ext === '.docx') {
    let timer: NodeJS.Timeout;
    try {
      const mammoth = require('mammoth');
      const parsePromise = mammoth.extractRawText({ buffer });
      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('DOCX extraction timed out after 10s')), EXTRACTION_TIMEOUT_MS);
      });

      const result: any = await Promise.race([parsePromise, timeoutPromise]);
      clearTimeout(timer!);
      const text = (result?.value || '').trim().slice(0, MAX_RESUME_TEXT_LENGTH);
      return text || null;
    } catch (err: any) {
      clearTimeout(timer!);
      logger.warn(`DOCX text extraction failed: ${err.message || 'unknown error'}`);
      return null;
    }
  }

  return null;
}

@Injectable()
export class CandidateResumeService {
  private readonly logger = new Logger(CandidateResumeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudStorage: CloudStorageService,
    private readonly parser: ResumeParserService,
    private readonly scoringService: CandidateScoringService,
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
    } else {
      const validation = validateDocumentFile(originalName, file.buffer, file.mimetype);
      sanitizedFileName = validation.sanitizedFileName;
      detectedMimeType = validation.detectedMimeType;
    }

    resumeText = await extractTextFromDocument(ext, file.buffer, this.logger);

    let parsedData: ParsedResumeData | null = null;
    let parseStatus: string = 'FAILED';
    if (resumeText) {
      try {
        parsedData = await this.parser.parse(resumeText);
        parseStatus = 'DONE';
      } catch (parseErr: any) {
        this.logger.warn(`Resume parse error: ${parseErr.message}`);
        parseStatus = 'FAILED';
      }
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

    // 2. Update database record with extracted resumeText and updated searchableText
    try {
      const effSkills = profile.skills || [];
      const searchableText = [
        user.firstName,
        user.lastName,
        profile.headline,
        profile.location,
        profile.currentCompany,
        ...effSkills,
        profile.bio,
        resumeText,
      ].filter(Boolean).join(' ').trim();

      // Calculate completion score with newly uploaded resume
      const scoreResult = this.scoringService.calculateScore({
        user,
        profile: {
          ...profile,
          resumeStorageKey: newStorageKey,
        },
      });

      const updatedProfile = await this.prisma.candidateProfile.update({
        where: { id: profile.id },
        data: {
          resumeStorageKey: newStorageKey,
          resumeFileName: sanitizedFileName,
          resumeMimeType: detectedMimeType,
          resumeFileSize: file.buffer.length,
          resumeUploadedAt: new Date(),
          resumeText,
          searchableText,
          resumeParseStatus: parseStatus,
          rawParsedResume: parsedData as any,
          completionScore: scoreResult.score,
          completionBreakdown: scoreResult.breakdown as any,
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

      // 4. Sync candidate-owned resume fields to org-scoped candidate rows linked by userId
      try {
        const linkedCandidates = await this.prisma.candidate.findMany({
          where: { userId: actor.userId },
        });

        for (const cand of linkedCandidates) {
          const isRecruiterSourced = cand.source !== 'CANDIDATE_PORTAL' && cand.source !== 'PORTAL';
          const updateData: any = {};
          if (newStorageKey && (!isRecruiterSourced || !cand.resumeUrl)) {
            updateData.resumeUrl = newStorageKey;
          }
          if (resumeText !== null && (!isRecruiterSourced || !cand.resumeText)) {
            updateData.resumeText = resumeText;
          }
          if (Object.keys(updateData).length > 0) {
            await this.prisma.candidate.update({
              where: { id: cand.id },
              data: updateData,
            });
          }
        }
      } catch (syncErr: any) {
        this.logger.warn(`Failed to sync resume to linked ATS candidates: ${syncErr.message}`);
      }

      this.logger.log(`Successfully uploaded resume for candidate ${actor.userId}`);

      return {
        hasResume: true,
        fileName: updatedProfile.resumeFileName,
        fileSize: updatedProfile.resumeFileSize,
        mimeType: updatedProfile.resumeMimeType,
        uploadedAt: updatedProfile.resumeUploadedAt,
        hasText: !!updatedProfile.resumeText,
        parseStatus,
        parsedData,
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
        parseStatus: null,
        parsedData: null,
      };
    }

    return {
      hasResume: true,
      fileName: profile.resumeFileName,
      fileSize: profile.resumeFileSize,
      mimeType: profile.resumeMimeType,
      uploadedAt: profile.resumeUploadedAt,
      hasText: !!profile.resumeText,
      parseStatus: profile.resumeParseStatus || 'DONE',
      parsedData: profile.rawParsedResume,
    };
  }

  /**
   * Poll parse status (stages: Uploading -> Reading -> Extracting -> Done / Failed)
   */
  async getParseStatus(actor: AuthenticatedUser) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });

    if (!profile || !profile.resumeStorageKey) {
      return {
        status: 'NONE',
        hasResume: false,
        parsedData: null,
      };
    }

    return {
      status: profile.resumeParseStatus || 'DONE',
      hasResume: true,
      fileName: profile.resumeFileName,
      uploadedAt: profile.resumeUploadedAt,
      parsedData: profile.rawParsedResume,
    };
  }

  /**
   * Merges parsed resume data into candidate profile.
   * STRICT MERGE RULE: Only fills EMPTY fields; never overwrites user input.
   */
  async mergeParsedResume(actor: AuthenticatedUser) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || !user.candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const profile = user.candidateProfile;
    const parsedData = profile.rawParsedResume as unknown as ParsedResumeData | null;
    if (!parsedData) {
      throw new BadRequestException('No parsed resume data available to merge');
    }

    const { merged, autoFilledFields } = this.parser.mergeParsedData(profile, parsedData);

    const updateData: any = {};
    if (autoFilledFields.includes('headline')) updateData.headline = merged.headline;
    if (autoFilledFields.includes('location')) updateData.location = merged.location;
    if (autoFilledFields.includes('phone')) updateData.phone = merged.phone;
    if (autoFilledFields.includes('bio')) updateData.bio = merged.bio;
    if (autoFilledFields.includes('skills')) updateData.skills = merged.skills;
    if (autoFilledFields.includes('education')) updateData.education = merged.education;
    if (autoFilledFields.includes('experience')) updateData.experience = merged.experience;
    if (autoFilledFields.includes('projects')) updateData.projects = merged.projects;
    if (autoFilledFields.includes('certifications')) updateData.certifications = merged.certifications;
    if (autoFilledFields.includes('languages')) updateData.languages = merged.languages;
    if (autoFilledFields.includes('socialLinks')) updateData.socialLinks = merged.socialLinks;

    const existingFromResume = profile.fromResumeSections || [];
    updateData.fromResumeSections = Array.from(new Set([...existingFromResume, ...autoFilledFields]));

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: updateData,
    });

    // Recompute score
    const scoreResult = this.scoringService.calculateScore({ user, profile: updatedProfile });
    await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return {
      success: true,
      autoFilledFields,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
      profile: updatedProfile,
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

    // Clear database fields and recompute searchableText
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });
    const effSkills = profile.skills || [];
    const searchableText = [
      user?.firstName,
      user?.lastName,
      profile.headline,
      profile.location,
      profile.currentCompany,
      ...effSkills,
      profile.bio,
    ].filter(Boolean).join(' ').trim();

    await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: {
        resumeStorageKey: null,
        resumeFileName: null,
        resumeMimeType: null,
        resumeFileSize: null,
        resumeUploadedAt: null,
        resumeText: null,
        searchableText,
      },
    });

    // Clear candidate-owned resume fields on linked ATS candidates
    try {
      const linkedCandidates = await this.prisma.candidate.findMany({
        where: { userId: actor.userId },
      });
      for (const cand of linkedCandidates) {
        const isRecruiterSourced = cand.source !== 'CANDIDATE_PORTAL' && cand.source !== 'PORTAL';
        if (!isRecruiterSourced) {
          await this.prisma.candidate.update({
            where: { id: cand.id },
            data: { resumeUrl: null, resumeText: null },
          });
        }
      }
    } catch (syncErr: any) {
      this.logger.warn(`Failed to sync resume deletion to linked ATS candidates: ${syncErr.message}`);
    }

    this.logger.log(`Successfully deleted resume for candidate ${actor.userId}`);
    return { message: 'Resume deleted successfully' };
  }
}
