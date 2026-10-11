// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateResumeController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CandidateResumeController } from './candidate-resume.controller';
import {
  CandidateResumeMetadata,
  CandidateResumeService,
  UploadedFileObject,
} from './candidate-resume.service';

describe('CandidateResumeController', () => {
  let controller: CandidateResumeController;
  let service: jest.Mocked<CandidateResumeService>;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const mockMetadata: CandidateResumeMetadata = {
    hasResume: true,
    fileName: 'resume.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    uploadedAt: new Date(),
    hasText: false,
  };

  beforeEach(async () => {
    const mockService = {
      uploadResume: jest.fn().mockResolvedValue(mockMetadata),
      getResumeMetadata: jest.fn().mockResolvedValue(mockMetadata),
      downloadResume: jest.fn().mockResolvedValue({
        buffer: Buffer.from('%PDF-mock'),
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        fileSize: 9,
      }),
      deleteResume: jest.fn().mockResolvedValue({ message: 'Resume deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateResumeController],
      providers: [
        {
          provide: CandidateResumeService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CandidateResumeController>(CandidateResumeController);
    service = module.get(CandidateResumeService);
  });

  it('should delegate uploadResume to CandidateResumeService', async () => {
    const file: UploadedFileObject = {
      originalname: 'resume.pdf',
      mimetype: 'application/pdf',
      size: 9,
      buffer: Buffer.from('%PDF-mock'),
    };

    const result = await controller.uploadResume(mockActor, file);

    expect(result).toEqual(mockMetadata);
    expect(service.uploadResume).toHaveBeenCalledWith(mockActor, file);
  });

  it('should delegate getResumeMetadata to CandidateResumeService', async () => {
    const result = await controller.getResumeMetadata(mockActor);

    expect(result).toEqual(mockMetadata);
    expect(service.getResumeMetadata).toHaveBeenCalledWith(mockActor);
  });

  it('should stream downloaded resume with secure headers', async () => {
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as unknown as Response;

    await controller.downloadResume(mockActor, res);

    expect(service.downloadResume).toHaveBeenCalledWith(mockActor);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.send).toHaveBeenCalled();
  });

  it('should delegate deleteResume to CandidateResumeService', async () => {
    const result = await controller.deleteResume(mockActor);

    expect(result).toEqual({ message: 'Resume deleted successfully' });
    expect(service.deleteResume).toHaveBeenCalledWith(mockActor);
  });
});
