// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateResumeService
// ============================================================

import {
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import {
  CandidateResumeService,
  UploadedFileObject,
} from './candidate-resume.service';

describe('CandidateResumeService', () => {
  let service: CandidateResumeService;
  let prisma: any;
  let cloudStorage: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const validPdfBuffer = Buffer.from('%PDF-1.4 test resume content with safe characters');

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      candidateProfile: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    cloudStorage = {
      uploadFile: jest.fn().mockResolvedValue({
        url: 'private://key',
        key: 'resumes/candidates/usr_cand_1/mock-resume-key.pdf',
      }),
      retrievePrivateObject: jest.fn().mockResolvedValue({
        buffer: validPdfBuffer,
        contentType: 'application/pdf',
        contentLength: validPdfBuffer.length,
      }),
      deletePrivateObject: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateResumeService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudStorageService, useValue: cloudStorage },
      ],
    }).compile();

    service = module.get<CandidateResumeService>(CandidateResumeService);
  });

  describe('uploadResume', () => {
    it('should validate, upload, store, and update database for valid PDF resume', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_1',
        role: UserRole.CANDIDATE,
        candidateProfile: {
          id: 'prof_cand_1',
          userId: 'usr_cand_1',
          resumeStorageKey: null,
        },
      });

      prisma.candidateProfile.update.mockResolvedValue({
        id: 'prof_cand_1',
        resumeStorageKey: 'resumes/candidates/usr_cand_1/mock-resume-key.pdf',
        resumeFileName: 'my-resume.pdf',
        resumeMimeType: 'application/pdf',
        resumeFileSize: validPdfBuffer.length,
        resumeUploadedAt: new Date(),
        resumeText: null,
      });

      const file: UploadedFileObject = {
        originalname: 'my-resume.pdf',
        mimetype: 'application/pdf',
        size: validPdfBuffer.length,
        buffer: validPdfBuffer,
      };

      const result = await service.uploadResume(mockActor, file);

      expect(result).toBeDefined();
      expect(result.hasResume).toBe(true);
      expect(result.fileName).toBe('my-resume.pdf');
      expect(cloudStorage.uploadFile).toHaveBeenCalled();
      expect(prisma.candidateProfile.update).toHaveBeenCalled();
    });

    it('should support plain text (.txt) resumes and extract text content', async () => {
      const txtBuffer = Buffer.from('Plain text resume of Hema with TypeScript skills');

      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_1',
        role: UserRole.CANDIDATE,
        candidateProfile: {
          id: 'prof_cand_1',
          userId: 'usr_cand_1',
          resumeStorageKey: null,
        },
      });

      prisma.candidateProfile.update.mockResolvedValue({
        id: 'prof_cand_1',
        resumeStorageKey: 'resumes/candidates/usr_cand_1/mock-resume-key.txt',
        resumeFileName: 'resume.txt',
        resumeMimeType: 'text/plain',
        resumeFileSize: txtBuffer.length,
        resumeUploadedAt: new Date(),
        resumeText: txtBuffer.toString('utf8'),
      });

      const file: UploadedFileObject = {
        originalname: 'resume.txt',
        mimetype: 'text/plain',
        size: txtBuffer.length,
        buffer: txtBuffer,
      };

      const result = await service.uploadResume(mockActor, file);

      expect(result.hasText).toBe(true);
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resumeText: txtBuffer.toString('utf8'),
          }),
        }),
      );
    });

    it('should reject empty file buffer with BadRequestException', async () => {
      const emptyFile: UploadedFileObject = {
        originalname: 'empty.pdf',
        mimetype: 'application/pdf',
        size: 0,
        buffer: Buffer.alloc(0),
      };

      await expect(service.uploadResume(mockActor, emptyFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject oversized file (>10MB) with BadRequestException', async () => {
      const oversizedFile: UploadedFileObject = {
        originalname: 'huge.pdf',
        mimetype: 'application/pdf',
        size: 11 * 1024 * 1024,
        buffer: Buffer.alloc(11 * 1024 * 1024),
      };

      await expect(service.uploadResume(mockActor, oversizedFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject unsupported file extensions (e.g. .exe)', async () => {
      const maliciousFile: UploadedFileObject = {
        originalname: 'virus.exe',
        mimetype: 'application/x-msdownload',
        size: 100,
        buffer: Buffer.from('binary-content'),
      };

      await expect(service.uploadResume(mockActor, maliciousFile)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should safely replace previous resume: delete old storage key only after DB update succeeds', async () => {
      const oldStorageKey = 'resumes/candidates/usr_cand_1/old-resume-key.pdf';

      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_1',
        role: UserRole.CANDIDATE,
        candidateProfile: {
          id: 'prof_cand_1',
          userId: 'usr_cand_1',
          resumeStorageKey: oldStorageKey,
        },
      });

      prisma.candidateProfile.update.mockResolvedValue({
        id: 'prof_cand_1',
        resumeStorageKey: 'resumes/candidates/usr_cand_1/mock-resume-key.pdf',
        resumeFileName: 'new-resume.pdf',
        resumeMimeType: 'application/pdf',
        resumeFileSize: validPdfBuffer.length,
        resumeUploadedAt: new Date(),
        resumeText: null,
      });

      const file: UploadedFileObject = {
        originalname: 'new-resume.pdf',
        mimetype: 'application/pdf',
        size: validPdfBuffer.length,
        buffer: validPdfBuffer,
      };

      await service.uploadResume(mockActor, file);

      expect(cloudStorage.deletePrivateObject).toHaveBeenCalledWith(oldStorageKey);
    });

    it('should rollback newly uploaded storage file if database update fails', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_1',
        role: UserRole.CANDIDATE,
        candidateProfile: {
          id: 'prof_cand_1',
          userId: 'usr_cand_1',
          resumeStorageKey: null,
        },
      });

      prisma.candidateProfile.update.mockRejectedValue(new Error('Database disk error'));

      const file: UploadedFileObject = {
        originalname: 'resume.pdf',
        mimetype: 'application/pdf',
        size: validPdfBuffer.length,
        buffer: validPdfBuffer,
      };

      await expect(service.uploadResume(mockActor, file)).rejects.toThrow(
        InternalServerErrorException,
      );

      // Verify rollback deletion was invoked
      expect(cloudStorage.deletePrivateObject).toHaveBeenCalledWith(
        'resumes/candidates/usr_cand_1/mock-resume-key.pdf',
      );
    });
  });

  describe('getResumeMetadata', () => {
    it('should return resume metadata when resume exists', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: 'resumes/key.pdf',
        resumeFileName: 'resume.pdf',
        resumeFileSize: 1024,
        resumeMimeType: 'application/pdf',
        resumeUploadedAt: new Date(),
        resumeText: 'Sample text',
      });

      const result = await service.getResumeMetadata(mockActor);

      expect(result.hasResume).toBe(true);
      expect(result.fileName).toBe('resume.pdf');
      expect(result.hasText).toBe(true);
    });

    it('should return hasResume false when no resume uploaded', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: null,
      });

      const result = await service.getResumeMetadata(mockActor);

      expect(result.hasResume).toBe(false);
      expect(result.fileName).toBeNull();
    });
  });

  describe('downloadResume', () => {
    it('should return buffer and metadata when resume exists', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: 'resumes/key.pdf',
        resumeFileName: 'resume.pdf',
        resumeFileSize: validPdfBuffer.length,
        resumeMimeType: 'application/pdf',
      });

      const result = await service.downloadResume(mockActor);

      expect(result.buffer).toEqual(validPdfBuffer);
      expect(result.fileName).toBe('resume.pdf');
      expect(cloudStorage.retrievePrivateObject).toHaveBeenCalledWith('resumes/key.pdf');
    });

    it('should throw NotFoundException if candidate has no resume', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: null,
      });

      await expect(service.downloadResume(mockActor)).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteResume', () => {
    it('should delete file from storage and nullify database fields', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: 'resumes/key.pdf',
      });

      const result = await service.deleteResume(mockActor);

      expect(result).toEqual({ message: 'Resume deleted successfully' });
      expect(cloudStorage.deletePrivateObject).toHaveBeenCalledWith('resumes/key.pdf');
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prof_cand_1' },
          data: expect.objectContaining({
            resumeStorageKey: null,
            resumeFileName: null,
          }),
        }),
      );
    });

    it('should throw NotFoundException if no resume exists to delete', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue({
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        resumeStorageKey: null,
      });

      await expect(service.deleteResume(mockActor)).rejects.toThrow(NotFoundException);
    });
  });
});
