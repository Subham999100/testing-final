// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: VideoProcessorService
// Wraps ffprobe & ffmpeg for server-side video duration validation,
// H.264/AAC MP4 transcoding, and thumbnail extraction
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  MAX_DURATION_TOLERANCE_SECONDS,
  MAX_FILE_BYTES,
  MAX_SECONDS,
  MIN_DURATION_TOLERANCE_SECONDS,
  MIN_SECONDS,
} from './video-profile.constants';

const execFileAsync = promisify(execFile);

export interface VideoProbeResult {
  durationSeconds: number;
  sizeBytes: number;
  width?: number;
  height?: number;
  formatName?: string;
  videoCodec?: string;
  audioCodec?: string;
}

@Injectable()
export class VideoProcessorService implements OnModuleInit {
  private readonly logger = new Logger(VideoProcessorService.name);
  private readonly ffmpegPath: string;
  private readonly ffprobePath: string;

  constructor(private readonly configService: ConfigService) {
    this.ffmpegPath = this.resolveBinary('ffmpeg');
    this.ffprobePath = this.resolveBinary('ffprobe');
  }

  onModuleInit() {
    this.logger.log(`VideoProcessorService initialized`);
    this.logger.log(`Using ffmpeg at: ${this.ffmpegPath}`);
    this.logger.log(`Using ffprobe at: ${this.ffprobePath}`);
  }

  private resolveBinary(binName: 'ffmpeg' | 'ffprobe'): string {
    const envKey = binName.toUpperCase() + '_PATH';
    const configured = this.configService.get<string>(envKey) || process.env[envKey];
    if (configured) return configured;

    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || '';
      if (localAppData) {
        const wingetLink = path.join(localAppData, 'Microsoft', 'WinGet', 'Links', `${binName}.exe`);
        try {
          if (require('fs').existsSync(wingetLink)) return wingetLink;
        } catch {}

        const gyanBin = path.join(
          localAppData,
          'Microsoft',
          'WinGet',
          'Packages',
          'Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe',
          'ffmpeg-9.0.2-full_build',
          'bin',
          `${binName}.exe`,
        );
        try {
          if (require('fs').existsSync(gyanBin)) return gyanBin;
        } catch {}
      }
    }
    return binName;
  }

  /**
   * Transcodes input video to H.264 / AAC MP4 with faststart.
   * This remuxes all packets and ensures clean duration metadata is written.
   */
  async transcodeToMp4(inputPath: string, outputPath: string): Promise<void> {
    try {
      await execFileAsync(
        this.ffmpegPath,
        [
          '-y',
          '-i',
          inputPath,
          '-c:v',
          'libx264',
          '-preset',
          'fast',
          '-crf',
          '23',
          '-c:a',
          'aac',
          '-b:a',
          '128k',
          '-movflags',
          '+faststart',
          outputPath,
        ],
        { timeout: 60000, shell: false },
      );
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('ENOENT') || err.message?.includes('spawn')) {
        this.logger.error(
          `ffmpeg binary was not found or failed to spawn at "${this.ffmpegPath}".`,
        );
        throw new ServiceUnavailableException('Video processing is not available');
      }
      this.logger.error(`FFmpeg transcoding failed: ${err.message}`);
      throw new BadRequestException(
        `Failed to transcode video: ${err.message || 'Corrupted or unsupported format'}`,
      );
    }
  }

  /**
   * Probes video metadata using ffprobe.
   * Strictly verifies duration with tolerance (29.5s - 181s).
   */
  async probeVideo(
    filePath: string,
    fallbackDuration?: number,
  ): Promise<VideoProbeResult> {
    const stats = await fs.stat(filePath);
    if (stats.size > MAX_FILE_BYTES) {
      throw new BadRequestException(
        `File size (${(stats.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 100 MB`,
      );
    }

    let rawDuration = 0;
    let formatName: string | undefined;
    let videoStream: any;
    let audioStream: any;

    try {
      const { stdout } = await execFileAsync(
        this.ffprobePath,
        [
          '-v',
          'error',
          '-show_entries',
          'format=duration,size,format_name:stream=codec_type,codec_name,width,height,duration',
          '-of',
          'json',
          filePath,
        ],
        { timeout: 15000, shell: false },
      );

      const parsed = JSON.parse(stdout);
      rawDuration = parseFloat(parsed.format?.duration || '0');
      const streams = parsed.streams || [];
      videoStream = streams.find((s: any) => s.codec_type === 'video');
      audioStream = streams.find((s: any) => s.codec_type === 'audio');
      formatName = parsed.format?.format_name;

      if ((!rawDuration || isNaN(rawDuration) || rawDuration <= 0) && videoStream?.duration) {
        rawDuration = parseFloat(videoStream.duration);
      }
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('ENOENT') || err.message?.includes('spawn')) {
        this.logger.error(
          `ffprobe binary was not found or failed to spawn at "${this.ffprobePath}".`,
        );
        throw new ServiceUnavailableException('Video processing is not available');
      }
      this.logger.warn(`ffprobe primary inspect failed: ${err.message}`);
    }

    // Fallback if ffprobe returned N/A or 0
    if (!rawDuration || isNaN(rawDuration) || rawDuration <= 0) {
      this.logger.warn('Duration missing from ffprobe container header; attempting fallback inspection...');

      // Fallback 1: Parse duration from ffmpeg -i stderr
      try {
        const stderrDuration = await this.extractDurationFromFfmpegStderr(filePath);
        if (stderrDuration && stderrDuration > 0) {
          rawDuration = stderrDuration;
          this.logger.log(`Detected duration via ffmpeg stderr: ${rawDuration}s`);
        }
      } catch (err: any) {
        if (err instanceof ServiceUnavailableException) throw err;
      }

      // Fallback 2: Read packet timestamps via ffprobe
      if (!rawDuration || isNaN(rawDuration) || rawDuration <= 0) {
        try {
          const packetDuration = await this.extractDurationFromPacketTimestamps(filePath);
          if (packetDuration && packetDuration > 0) {
            rawDuration = packetDuration;
            this.logger.log(`Detected duration via packet timestamps: ${rawDuration}s`);
          }
        } catch (err: any) {
          if (err instanceof ServiceUnavailableException) throw err;
        }
      }

      // Fallback 3: Client timer measured duration
      if ((!rawDuration || isNaN(rawDuration) || rawDuration <= 0) && fallbackDuration && fallbackDuration > 0) {
        rawDuration = fallbackDuration;
        this.logger.log(`Using client recorder duration fallback: ${rawDuration}s`);
      }
    }

    if (!rawDuration || isNaN(rawDuration) || rawDuration <= 0) {
      throw new BadRequestException('Unable to detect video duration via video analysis tools');
    }

    this.validateDuration(rawDuration);

    return {
      durationSeconds: Math.round(rawDuration * 100) / 100,
      sizeBytes: stats.size,
      width: videoStream?.width,
      height: videoStream?.height,
      formatName,
      videoCodec: videoStream?.codec_name,
      audioCodec: audioStream?.codec_name,
    };
  }

  /**
   * Reads container duration from `ffmpeg -i <file>` stderr output
   */
  private async extractDurationFromFfmpegStderr(filePath: string): Promise<number | null> {
    try {
      await execFileAsync(this.ffmpegPath, ['-i', filePath], { timeout: 10000, shell: false });
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
        throw new ServiceUnavailableException('Video processing is not available');
      }
      const stderr = err.stderr || '';
      const match = stderr.match(/Duration:\s*(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/i);
      if (match) {
        const hours = parseFloat(match[1]);
        const mins = parseFloat(match[2]);
        const secs = parseFloat(match[3]);
        const total = hours * 3600 + mins * 60 + secs;
        if (!isNaN(total) && total > 0) {
          return total;
        }
      }
    }
    return null;
  }

  /**
   * Reads the last packet PTS/DTS timestamps from ffprobe
   */
  private async extractDurationFromPacketTimestamps(filePath: string): Promise<number | null> {
    try {
      const { stdout } = await execFileAsync(
        this.ffprobePath,
        [
          '-v',
          'error',
          '-show_entries',
          'packet=pts_time,dts_time',
          '-read_intervals',
          '%+#50',
          '-of',
          'json',
          filePath,
        ],
        { timeout: 15000, shell: false },
      );
      const parsed = JSON.parse(stdout);
      const packets = parsed.packets || [];
      for (let i = packets.length - 1; i >= 0; i--) {
        const pts = parseFloat(packets[i].pts_time || packets[i].dts_time);
        if (!isNaN(pts) && pts > 0) return pts;
      }
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
        throw new ServiceUnavailableException('Video processing is not available');
      }
    }
    return null;
  }

  /**
   * Extracts a single frame at the specified second as a JPEG thumbnail.
   */
  async generateThumbnail(
    inputPath: string,
    outputPath: string,
    atSecond = 1,
  ): Promise<boolean> {
    try {
      await execFileAsync(
        this.ffmpegPath,
        [
          '-y',
          '-ss',
          String(atSecond),
          '-i',
          inputPath,
          '-vframes',
          '1',
          '-q:v',
          '2',
          outputPath,
        ],
        { timeout: 15000, shell: false },
      );
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
        this.logger.warn('ffmpeg binary not available for thumbnail generation');
        return false;
      }
      this.logger.warn(`Failed to generate video thumbnail via ffmpeg: ${err.message}`);
      return false;
    }
  }

  /**
   * Duration validation helper with tolerance (Min 29.5s, Max 181.0s).
   */
  validateDuration(durationSeconds: number): void {
    if (durationSeconds < MIN_DURATION_TOLERANCE_SECONDS) {
      throw new BadRequestException(
        `Video duration is too short (${Math.round(durationSeconds)}s). Minimum required duration is ${MIN_SECONDS} seconds.`,
      );
    }
    if (durationSeconds > MAX_DURATION_TOLERANCE_SECONDS) {
      throw new BadRequestException(
        `Video duration is too long (${Math.round(durationSeconds)}s). Maximum allowed duration is ${Math.round(MAX_SECONDS / 60)} minutes.`,
      );
    }
  }

  /**
   * Helper to allocate and clean up temporary working directory.
   */
  async createTempDir(): Promise<string> {
    return fs.mkdtemp(path.join(os.tmpdir(), 'clyptus-video-'));
  }

  async removeDir(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  }
}
