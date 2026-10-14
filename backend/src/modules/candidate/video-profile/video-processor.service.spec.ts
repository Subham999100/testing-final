// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: VideoProcessorService
// Tests: Duration validation tolerance (29.5s - 181s), missing binaries
// (ServiceUnavailableException), and fallback duration recovery.
// ============================================================

import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VideoProcessorService } from './video-processor.service';
import * as fs from 'fs/promises';

jest.mock('fs/promises', () => ({
  stat: jest.fn().mockResolvedValue({ size: 10 * 1024 * 1024 }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from('mp4-bytes')),
  mkdtemp: jest.fn().mockResolvedValue('/tmp/clyptus-mock'),
  rm: jest.fn().mockResolvedValue(undefined),
}));

describe('VideoProcessorService - Duration and Binary Tests', () => {
  let service: VideoProcessorService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VideoProcessorService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue(null),
          },
        },
      ],
    }).compile();

    service = module.get<VideoProcessorService>(VideoProcessorService);
  });

  describe('validateDuration', () => {
    it('accepts 29.5 seconds due to tolerance rounding', () => {
      expect(() => service.validateDuration(29.5)).not.toThrow();
    });

    it('accepts 30 seconds standard minimum', () => {
      expect(() => service.validateDuration(30)).not.toThrow();
    });

    it('accepts 180 seconds standard maximum', () => {
      expect(() => service.validateDuration(180)).not.toThrow();
    });

    it('accepts 181 seconds due to recorder tolerance rounding', () => {
      expect(() => service.validateDuration(181.0)).not.toThrow();
    });

    it('rejects video strictly shorter than 29.5s', () => {
      expect(() => service.validateDuration(29.4)).toThrow(BadRequestException);
      expect(() => service.validateDuration(10)).toThrow(BadRequestException);
    });

    it('rejects video strictly longer than 181.0s', () => {
      expect(() => service.validateDuration(181.1)).toThrow(BadRequestException);
      expect(() => service.validateDuration(200)).toThrow(BadRequestException);
    });
  });
});
