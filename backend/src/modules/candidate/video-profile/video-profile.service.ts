// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Video Profile Service
// Manages video profile lifecycle, server-side ffprobe/ffmpeg processing,
// mutual exclusivity with AI interview, and secure streaming.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import { VideoProcessorService } from './video-processor.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '@prisma/client';
import { Response } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  ALLOWED_VIDEO_MIME_TYPES,
  CandidateVideoMode,
  MAX_FILE_BYTES,
  VideoAnalysisStatus,
  VideoInterviewStatus,
} from './video-profile.constants';
import { UploadVideoProfileDto } from './dto/upload-video-profile.dto';

export interface VideoProfileResponse {
  id?: string;
  hasVideo: boolean;
  videoMode: CandidateVideoMode;
  videoInterviewStatus: VideoInterviewStatus;
  canRecordProfile: boolean;
  canStartInterview: boolean;
  durationSeconds?: number;
  sizeBytes?: number;
  mimeType?: string;
  analysisStatus?: VideoAnalysisStatus;
  consentGivenAt?: Date | null;
  hasThumbnail?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  modeConflictNote?: string;
}

@Injectable()
export class VideoProfileService {
  private readonly logger = new Logger(VideoProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: CloudStorageService,
    private readonly videoProcessor: VideoProcessorService,
  ) {}

  /**
   * Retrieves candidate's current video profile and mode state.
   */
  async getVideoProfile(actor: AuthenticatedUser): Promise<VideoProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      include: { videoProfile: true },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const video = profile.videoProfile;
    const mode = (profile.videoMode as CandidateVideoMode) || CandidateVideoMode.NONE;
    const interviewStatus =
      (profile.videoInterviewStatus as VideoInterviewStatus) ||
      VideoInterviewStatus.NOT_STARTED;

    // Mutually exclusive rules
    const interviewActive =
      mode === CandidateVideoMode.INTERVIEW ||
      interviewStatus === VideoInterviewStatus.IN_PROGRESS ||
      interviewStatus === VideoInterviewStatus.COMPLETED;

    const profileActive = mode === CandidateVideoMode.PROFILE || !!video;

    let modeConflictNote: string | undefined;
    if (profileActive) {
      modeConflictNote = 'Delete your video profile to take the video interview instead.';
    } else if (interviewActive) {
      modeConflictNote = 'Reset your video interview to record or upload a video profile instead.';
    }

    return {
      id: video?.id,
      hasVideo: !!video,
      videoMode: mode,
      videoInterviewStatus: interviewStatus,
      canRecordProfile: !interviewActive,
      canStartInterview: !profileActive,
      durationSeconds: video?.durationSeconds,
      sizeBytes: video?.sizeBytes,
      mimeType: video?.mimeType,
      analysisStatus: video?.analysisStatus as VideoAnalysisStatus,
      consentGivenAt: video?.consentGivenAt,
      hasThumbnail: !!video?.thumbnailKey,
      createdAt: video?.createdAt,
      updatedAt: video?.updatedAt,
      modeConflictNote,
    };
  }

  /**
   * Uploads or re-records a video profile.
   * Validates size, mime, and real duration via ffprobe. Transcodes to H.264 MP4.
   */
  async uploadVideoProfile(
    actor: AuthenticatedUser,
    file: { originalname?: string; buffer: Buffer; mimetype?: string; size?: number },
    dto: UploadVideoProfileDto,
  ): Promise<VideoProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty video file payload is required');
    }

    if (dto.consent !== true && dto.consentGiven !== true) {
      throw new BadRequestException('Consent is required to save and analyze your video profile');
    }

    if (file.buffer.length > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `Video file size (${(file.buffer.length / (1024 * 1024)).toFixed(1)} MB) exceeds maximum 100 MB limit`,
      );
    }

    const rawMime = (file.mimetype || '').toLowerCase();
    const normalizedMime = rawMime.split(';')[0].trim();
    const ext = path.extname(file.originalname || '').toLowerCase();
    const isAllowedExt = ['.webm', '.mp4', '.mov', '.mkv'].includes(ext);
    const isAllowedMime =
      ALLOWED_VIDEO_MIME_TYPES.some((allowed) => normalizedMime === allowed) ||
      normalizedMime.startsWith('video/') ||
      isAllowedExt;

    if (!isAllowedMime) {
      throw new BadRequestException(
        `Unsupported video type "${file.mimetype}". Accepted formats: MP4, WebM, MOV.`,
      );
    }

    // Load candidate profile
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      include: { videoProfile: true },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    // SERVER-SIDE MUTUAL EXCLUSIVITY CHECK:
    // Interview active -> reject with 409 Conflict
    const mode = profile.videoMode as CandidateVideoMode;
    const interviewStatus = profile.videoInterviewStatus as VideoInterviewStatus;
    if (
      mode === CandidateVideoMode.INTERVIEW ||
      interviewStatus === VideoInterviewStatus.IN_PROGRESS ||
      interviewStatus === VideoInterviewStatus.COMPLETED
    ) {
      throw new ConflictException(
        'Cannot upload video profile when AI Video Interview is active or chosen. Delete or reset interview first.',
      );
    }

    // Allocate temporary working directory
    const tempDir = await this.videoProcessor.createTempDir();
    const rawInputExt = path.extname(file.originalname || '') || '.webm';
    const tempInputPath = path.join(tempDir, `raw_upload${rawInputExt}`);
    const tempOutputPath = path.join(tempDir, 'processed.mp4');
    const tempThumbPath = path.join(tempDir, 'thumbnail.jpg');

    try {
      await fs.writeFile(tempInputPath, file.buffer);

      // STEP 1: Transcode input video to H.264/AAC MP4 first.
      // Browser-recorded WebM often has missing duration metadata in the container header.
      // Transcoding/remuxing to MP4 first writes accurate duration metadata into the output file.
      await this.videoProcessor.transcodeToMp4(tempInputPath, tempOutputPath);

      // STEP 2: Probe transcoded output file with ffprobe and validate duration (30s <= duration <= 180s with tolerance)
      const clientDuration = dto.durationSeconds ?? dto.clientDurationSeconds;
      const probe = await this.videoProcessor.probeVideo(
        tempOutputPath,
        clientDuration,
      );

      // STEP 3: Generate video frame thumbnail from the transcoded MP4
      const hasThumb = await this.videoProcessor.generateThumbnail(
        tempOutputPath,
        tempThumbPath,
        1,
      );

      const processedBuffer = await fs.readFile(tempOutputPath);
      let thumbBuffer: Buffer | null = null;
      if (hasThumb) {
        try {
          thumbBuffer = await fs.readFile(tempThumbPath);
        } catch {
          thumbBuffer = null;
        }
      }

      // Store in private storage vault
      const safeId = profile.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const videoUpload = await this.storage.uploadFile({
        fileName: `video-profile-${Date.now()}.mp4`,
        buffer: processedBuffer,
        mimeType: 'video/mp4',
        folder: `candidates/${safeId}`,
      });
      const storageKey = videoUpload.key;

      let thumbKey: string | null = null;
      if (thumbBuffer) {
        const thumbUpload = await this.storage.uploadFile({
          fileName: `video-thumbnail-${Date.now()}.jpg`,
          buffer: thumbBuffer,
          mimeType: 'image/jpeg',
          folder: `candidates/${safeId}`,
        });
        thumbKey = thumbUpload.key;
      }

      // Cleanup old files if replacing
      if (profile.videoProfile) {
        await this.deleteStorageArtifacts(profile.videoProfile);
      }

      // Persist VideoProfile record & update candidateProfile.videoMode
      const videoProfile = await this.prisma.videoProfile.upsert({
        where: { candidateProfileId: profile.id },
        create: {
          candidateProfileId: profile.id,
          storageKey,
          thumbnailKey: thumbKey,
          durationSeconds: probe.durationSeconds,
          sizeBytes: processedBuffer.length,
          mimeType: 'video/mp4',
          consentGivenAt: dto.consent ? new Date() : new Date(),
          analysisStatus: VideoAnalysisStatus.NOT_STARTED,
        },
        update: {
          storageKey,
          thumbnailKey: thumbKey,
          durationSeconds: probe.durationSeconds,
          sizeBytes: processedBuffer.length,
          mimeType: 'video/mp4',
          consentGivenAt: dto.consent ? new Date() : new Date(),
          analysisStatus: VideoAnalysisStatus.NOT_STARTED,
          transcript: null,
          fluencyScore: null,
          communicationScore: null,
          grammarScore: null,
          metrics: {},
          analysisSummary: {},
          snapshotKeys: [],
          reportPdfKey: null,
          analyzedAt: null,
        },
      });

      await this.prisma.candidateProfile.update({
        where: { id: profile.id },
        data: {
          videoMode: CandidateVideoMode.PROFILE,
        },
      });

      this.logger.log(
        `Video profile successfully persisted for candidateProfile ${profile.id} (${probe.durationSeconds}s, ${processedBuffer.length} bytes)`,
      );

      return {
        id: videoProfile.id,
        hasVideo: true,
        videoMode: CandidateVideoMode.PROFILE,
        videoInterviewStatus: interviewStatus,
        canRecordProfile: true,
        canStartInterview: false,
        durationSeconds: videoProfile.durationSeconds,
        sizeBytes: videoProfile.sizeBytes,
        mimeType: videoProfile.mimeType,
        analysisStatus: videoProfile.analysisStatus as VideoAnalysisStatus,
        consentGivenAt: videoProfile.consentGivenAt,
        hasThumbnail: !!videoProfile.thumbnailKey,
        createdAt: videoProfile.createdAt,
        updatedAt: videoProfile.updatedAt,
      };
    } finally {
      await this.videoProcessor.removeDir(tempDir);
    }
  }

  /**
   * Deletes video profile, thumbnail, and all associated artifacts.
   * Resets candidateProfile.videoMode to NONE (idempotent).
   */
  async deleteVideoProfile(actor: AuthenticatedUser): Promise<{ success: boolean; message: string }> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      include: { videoProfile: true },
    });

    if (!profile) {
      throw new NotFoundException('Candidate profile not found');
    }

    if (!profile.videoProfile) {
      // Idempotent: already deleted
      await this.prisma.candidateProfile.update({
        where: { id: profile.id },
        data: { videoMode: CandidateVideoMode.NONE },
      });
      return { success: true, message: 'No video profile present' };
    }

    // Delete stored media files (video, thumbnail, snapshots, report PDF)
    await this.deleteStorageArtifacts(profile.videoProfile);

    // Delete database record
    await this.prisma.videoProfile.delete({
      where: { id: profile.videoProfile.id },
    });

    // Reset videoMode to NONE
    await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { videoMode: CandidateVideoMode.NONE },
    });

    this.logger.log(`Deleted video profile for candidateProfile ${profile.id}`);

    return { success: true, message: 'Video profile removed successfully' };
  }

  /**
   * Streams video with HTTP 206 Range support for seamless seeking and playback.
   */
  async streamVideo(
    actor: AuthenticatedUser,
    rangeHeader: string | undefined,
    res: Response,
  ): Promise<void> {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      include: { videoProfile: true },
    });

    if (!profile?.videoProfile) {
      throw new NotFoundException('Video profile not found');
    }

    await this.pipeMediaStream(profile.videoProfile.storageKey, rangeHeader, res, 'video/mp4');
  }

  /**
   * Serves video thumbnail image.
   */
  async streamThumbnail(actor: AuthenticatedUser, res: Response): Promise<void> {
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      include: { videoProfile: true },
    });

    if (!profile?.videoProfile?.thumbnailKey) {
      throw new NotFoundException('Thumbnail not found');
    }

    const obj = await this.storage.retrievePrivateObject(profile.videoProfile.thumbnailKey);
    res.setHeader('Content-Type', obj.contentType || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(obj.buffer);
  }

  /**
   * Recruiter endpoint: retrieves candidate video profile status and details.
   * Access is guarded to ensure recruiter is authorized to view this candidate.
   */
  async getRecruiterVideoProfile(
    actor: AuthenticatedUser,
    candidateId: string,
  ): Promise<VideoProfileResponse & { candidateId: string; candidateName: string }> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: {
          include: {
            candidateProfile: {
              include: { videoProfile: true },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (actor.organisationId && actor.role !== UserRole.PLATFORM_SUPER_ADMIN) {
      const allowed =
        candidate.organisationId === actor.organisationId ||
        (await this.prisma.application.count({
          where: { candidateId, organisationId: actor.organisationId },
        })) > 0;
      if (!allowed) {
        throw new ForbiddenException('You do not have permission to view this candidate');
      }
    }

    const profile = candidate.user?.candidateProfile;
    const video = profile?.videoProfile;

    return {
      candidateId,
      candidateName: `${candidate.firstName} ${candidate.lastName || ''}`.trim(),
      id: video?.id,
      hasVideo: !!video,
      videoMode: (profile?.videoMode as CandidateVideoMode) || CandidateVideoMode.NONE,
      videoInterviewStatus:
        (profile?.videoInterviewStatus as VideoInterviewStatus) ||
        VideoInterviewStatus.NOT_STARTED,
      canRecordProfile: false,
      canStartInterview: false,
      durationSeconds: video?.durationSeconds,
      sizeBytes: video?.sizeBytes,
      mimeType: video?.mimeType,
      analysisStatus: video?.analysisStatus as VideoAnalysisStatus,
      consentGivenAt: video?.consentGivenAt,
      hasThumbnail: !!video?.thumbnailKey,
      createdAt: video?.createdAt,
      updatedAt: video?.updatedAt,
    };
  }

  /**
   * Recruiter endpoint: streams candidate video.
   */
  async streamRecruiterVideo(
    actor: AuthenticatedUser,
    candidateId: string,
    rangeHeader: string | undefined,
    res: Response,
  ): Promise<void> {
    const candidate = await this.prisma.candidate.findUnique({
      where: { id: candidateId },
      include: {
        user: {
          include: {
            candidateProfile: {
              include: { videoProfile: true },
            },
          },
        },
      },
    });

    if (!candidate) {
      throw new NotFoundException('Candidate not found');
    }

    if (actor.organisationId && actor.role !== UserRole.PLATFORM_SUPER_ADMIN) {
      const allowed =
        candidate.organisationId === actor.organisationId ||
        (await this.prisma.application.count({
          where: { candidateId, organisationId: actor.organisationId },
        })) > 0;
      if (!allowed) {
        throw new ForbiddenException('You do not have permission to view this candidate');
      }
    }

    const video = candidate?.user?.candidateProfile?.videoProfile;
    if (!video) {
      throw new NotFoundException('Video profile not found for this candidate');
    }

    await this.pipeMediaStream(video.storageKey, rangeHeader, res, 'video/mp4');
  }

  /**
   * Helper to pipe media object with HTTP 206 Partial Content range support.
   */
  private async pipeMediaStream(
    storageKey: string,
    rangeHeader: string | undefined,
    res: Response,
    contentType = 'video/mp4',
  ): Promise<void> {
    const obj = await this.storage.retrievePrivateObject(storageKey);
    const totalSize = obj.buffer.length;

    if (!rangeHeader) {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      res.end(obj.buffer);
      return;
    }

    // Parse bytes=start-end range header
    const parts = rangeHeader.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

    if (isNaN(start) || start >= totalSize || end >= totalSize || start > end) {
      res.writeHead(416, {
        'Content-Range': `bytes */${totalSize}`,
      });
      res.end();
      return;
    }

    const chunk = obj.buffer.subarray(start, end + 1);
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${totalSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunk.length,
      'Content-Type': contentType,
    });
    res.end(chunk);
  }

  /**
   * Cleans up all storage artifacts for a video profile.
   */
  private async deleteStorageArtifacts(video: {
    storageKey: string;
    thumbnailKey?: string | null;
    snapshotKeys?: string[];
    reportPdfKey?: string | null;
  }): Promise<void> {
    if (video.storageKey) {
      await this.storage.deletePrivateObject(video.storageKey).catch(() => {});
    }
    if (video.thumbnailKey) {
      await this.storage.deletePrivateObject(video.thumbnailKey).catch(() => {});
    }
    if (video.reportPdfKey) {
      await this.storage.deletePrivateObject(video.reportPdfKey).catch(() => {});
    }
    if (Array.isArray(video.snapshotKeys)) {
      for (const snap of video.snapshotKeys) {
        if (snap) {
          await this.storage.deletePrivateObject(snap).catch(() => {});
        }
      }
    }
  }
}
