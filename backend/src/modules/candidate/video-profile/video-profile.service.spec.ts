// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: VideoProfileService
// Tests: Mutual exclusivity rule and duration validation (server)
// ============================================================

import { BadRequestException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import { VideoProcessorService } from './video-processor.service';
import { VideoProfileService } from './video-profile.service';
import { CandidateVideoMode, VideoInterviewStatus } from './video-profile.constants';
import * as fs from 'fs/promises';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mock_video_bytes')),
  unlink: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
}));

describe('VideoProfileService (Phase 1)', () => {
  let service: VideoProfileService;
  let prisma: any;
  let storage: any;
  let videoProcessor: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'test.candidate@clyptus.com',
    firstName: 'Test',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const createMockUser = (overrides: any = {}) => ({
    id: 'usr_cand_1',
    email: 'test.candidate@clyptus.com',
    firstName: 'Test',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    candidateProfile: {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      videoMode: CandidateVideoMode.NONE,
      videoInterviewStatus: VideoInterviewStatus.NOT_STARTED,
      videoProfile: null,
      ...overrides,
    },
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
      },
      candidateProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      videoProfile: {
        create: jest.fn(),
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };

    storage = {
      uploadFile: jest.fn().mockResolvedValue({ key: 'mock_key', url: 'private://mock_key' }),
      deletePrivateObject: jest.fn().mockResolvedValue(true),
      retrievePrivateObject: jest.fn().mockResolvedValue({ buffer: Buffer.from('mock'), contentType: 'video/mp4' }),
    };

    videoProcessor = {
      createTempDir: jest.fn().mockResolvedValue('/tmp/mock_video_dir'),
      removeDir: jest.fn().mockResolvedValue(undefined),
      probeVideo: jest.fn(),
      transcodeToMp4: jest.fn().mockResolvedValue(true),
      generateThumbnail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProfileService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudStorageService, useValue: storage },
        { provide: VideoProcessorService, useValue: videoProcessor },
      ],
    }).compile();

    service = module.get<VideoProfileService>(VideoProfileService);
  });

  describe('Mutual Exclusivity Rule', () => {
    it('should return canRecordProfile=true and canStartInterview=true when mode is NONE', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);

      const res = await service.getVideoProfile(mockActor);

      expect(res.videoMode).toBe(CandidateVideoMode.NONE);
      expect(res.hasVideo).toBe(false);
      expect(res.canRecordProfile).toBe(true);
      expect(res.canStartInterview).toBe(true);
    });

    it('should return canRecordProfile=true and canStartInterview=false when video profile exists', async () => {
      const user = createMockUser({
        videoMode: CandidateVideoMode.PROFILE,
        videoProfile: {
          id: 'vp_1',
          durationSeconds: 45,
          storageKey: 'video_key.mp4',
          mimeType: 'video/mp4',
        },
      });
      prisma.candidateProfile.findUnique.mockResolvedValue(user.candidateProfile);

      const res = await service.getVideoProfile(mockActor);

      expect(res.videoMode).toBe(CandidateVideoMode.PROFILE);
      expect(res.hasVideo).toBe(true);
      expect(res.canRecordProfile).toBe(true); // Can replace
      expect(res.canStartInterview).toBe(false); // Interview locked out
      expect(res.modeConflictNote).toContain('Delete your video profile');
    });

    it('should reject video upload with 409 Conflict if candidate has videoMode INTERVIEW', async () => {
      const user = createMockUser({
        videoMode: CandidateVideoMode.INTERVIEW,
        videoInterviewStatus: VideoInterviewStatus.IN_PROGRESS,
      });
      prisma.candidateProfile.findUnique.mockResolvedValue(user.candidateProfile);

      const mockFile = {
        buffer: Buffer.from('fake-video-bytes'),
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject video upload with 409 Conflict if interview is IN_PROGRESS or COMPLETED', async () => {
      const user = createMockUser({
        videoMode: CandidateVideoMode.NONE,
        videoInterviewStatus: VideoInterviewStatus.COMPLETED,
      });
      prisma.candidateProfile.findUnique.mockResolvedValue(user.candidateProfile);

      const mockFile = {
        buffer: Buffer.from('fake-video-bytes'),
        mimetype: 'video/mp4',
        size: 10 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(ConflictException);
    });

    it('deleting video profile resets videoMode to NONE and removes storage objects', async () => {
      const existingVideo = {
        id: 'vp_1',
        candidateProfileId: 'prof_cand_1',
        storageKey: 'videos/vp_1.mp4',
        thumbnailKey: 'thumbnails/vp_1.jpg',
        snapshotKeys: ['s1.jpg', 's2.jpg'],
        reportPdfKey: 'reports/vp_1.pdf',
      };
      const user = createMockUser({
        videoMode: CandidateVideoMode.PROFILE,
        videoProfile: existingVideo,
      });
      prisma.candidateProfile.findUnique.mockResolvedValue(user.candidateProfile);
      prisma.candidateProfile.update.mockResolvedValue({});

      const result = await service.deleteVideoProfile(mockActor);

      expect(result.success).toBe(true);
      expect(storage.deletePrivateObject).toHaveBeenCalledWith(existingVideo.storageKey);
      expect(storage.deletePrivateObject).toHaveBeenCalledWith(existingVideo.thumbnailKey);
      expect(storage.deletePrivateObject).toHaveBeenCalledWith('s1.jpg');
      expect(storage.deletePrivateObject).toHaveBeenCalledWith('s2.jpg');
      expect(storage.deletePrivateObject).toHaveBeenCalledWith(existingVideo.reportPdfKey);
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_cand_1' },
        data: { videoMode: CandidateVideoMode.NONE },
      });
    });

    it('deleting video profile is idempotent if no video profile exists', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser({ videoProfile: null }).candidateProfile);

      const result = await service.deleteVideoProfile(mockActor);

      expect(result.success).toBe(true);
      expect(result.message).toContain('No video profile');
    });
  });

  describe('Duration and File Validation (Server-side)', () => {
    it('should reject video if consentGiven is false or missing', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);

      const mockFile = {
        buffer: Buffer.from('video'),
        mimetype: 'video/mp4',
        size: 5 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject video if file size exceeds MAX_FILE_MB (100 MB)', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);

      const mockFile = {
        buffer: Buffer.alloc(101 * 1024 * 1024),
        mimetype: 'video/mp4',
        size: 101 * 1024 * 1024, // 101 MB
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject video if mimetype is not an allowed video format', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);

      const mockFile = {
        buffer: Buffer.from('fake image'),
        mimetype: 'image/jpeg',
        size: 2 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject video if ffprobe duration is less than MIN_SECONDS (30s)', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);
      videoProcessor.probeVideo.mockRejectedValue(
        new BadRequestException('Video duration (24.0s) is shorter than required 30s minimum.'),
      );

      const mockFile = {
        buffer: Buffer.from('short video'),
        mimetype: 'video/mp4',
        size: 5 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject video if ffprobe duration is greater than MAX_SECONDS (180s / 3m)', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);
      videoProcessor.probeVideo.mockRejectedValue(
        new BadRequestException('Video duration (185.0s) exceeds maximum 3 minutes limit.'),
      );

      const mockFile = {
        buffer: Buffer.from('long video'),
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024,
      };

      await expect(
        service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should accept valid video between 30s and 180s, transcode, save thumbnail and set mode PROFILE', async () => {
      prisma.candidateProfile.findUnique.mockResolvedValue(createMockUser().candidateProfile);
      videoProcessor.probeVideo.mockResolvedValue({
        durationSeconds: 60,
        format: 'mp4',
        sizeBytes: 15 * 1024 * 1024,
      });
      prisma.candidateProfile.update.mockResolvedValue({});
      prisma.videoProfile.upsert.mockResolvedValue({
        id: 'new_vp_id',
        candidateProfileId: 'prof_cand_1',
        storageKey: 'mock_key',
        mimeType: 'video/mp4',
        durationSeconds: 60,
        sizeBytes: 15 * 1024 * 1024,
        thumbnailKey: 'mock_key',
        analysisStatus: 'NOT_STARTED',
        consentGivenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const mockFile = {
        buffer: Buffer.from('valid video raw'),
        mimetype: 'video/webm',
        size: 15 * 1024 * 1024,
      };

      const result = await service.uploadVideoProfile(mockActor, mockFile, { consentGiven: true });

      expect(result.hasVideo).toBe(true);
      expect(result.durationSeconds).toBe(60);
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith({
        where: { id: 'prof_cand_1' },
        data: { videoMode: CandidateVideoMode.PROFILE },
      });
    });
  });
});
