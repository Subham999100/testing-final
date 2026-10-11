// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateProfileService
// ============================================================

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { CandidateProfileService } from './candidate-profile.service';

describe('CandidateProfileService', () => {
  let service: CandidateProfileService;
  let prisma: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const mockUser = {
    id: 'usr_cand_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    isEmailVerified: false,
    candidateProfile: {
      id: 'prof_cand_1',
      userId: 'usr_cand_1',
      phone: '+919876543210',
      headline: 'Software Engineer',
      location: 'Hyderabad',
      experienceYears: 3,
      currentCompany: 'Tech Corp',
      skills: ['TypeScript', 'NestJS'],
      bio: 'Enthusiastic developer',
      education: [],
      experience: [],
      resumeStorageKey: 'resumes/cand_1/key.pdf',
      resumeFileName: 'hema-resume.pdf',
      resumeFileSize: 10240,
      resumeMimeType: 'application/pdf',
      resumeUploadedAt: new Date('2026-01-01'),
      resumeText: null,
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
    },
  };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateProfileService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<CandidateProfileService>(CandidateProfileService);
  });

  describe('getProfile', () => {
    it('should return authenticated candidate profile and identity data', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile(mockActor);

      expect(result).toBeDefined();
      expect(result.id).toBe('prof_cand_1');
      expect(result.userId).toBe('usr_cand_1');
      expect(result.fullName).toBe('Hema Candidate');
      expect(result.headline).toBe('Software Engineer');
      expect(result.skills).toEqual(['TypeScript', 'NestJS']);
      expect(result.resume.hasResume).toBe(true);
      expect(result.resume.fileName).toBe('hema-resume.pdf');
    });

    it('should auto-initialize candidate profile if missing', async () => {
      const userWithoutProfile = {
        ...mockUser,
        candidateProfile: null,
      };
      prisma.user.findUnique.mockResolvedValue(userWithoutProfile);
      prisma.candidateProfile.create.mockResolvedValue({
        id: 'prof_new_1',
        userId: 'usr_cand_1',
        phone: null,
        headline: null,
        location: null,
        experienceYears: null,
        currentCompany: null,
        skills: [],
        bio: null,
        education: [],
        experience: [],
        resumeStorageKey: null,
        resumeFileName: null,
        resumeFileSize: null,
        resumeMimeType: null,
        resumeUploadedAt: null,
        resumeText: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getProfile(mockActor);

      expect(result).toBeDefined();
      expect(result.id).toBe('prof_new_1');
      expect(prisma.candidateProfile.create).toHaveBeenCalledWith({
        data: { userId: 'usr_cand_1' },
      });
    });

    it('should throw UnauthorizedException if actor is missing or not a CANDIDATE', async () => {
      const invalidActor = { ...mockActor, role: UserRole.RECRUITER };
      await expect(service.getProfile(invalidActor)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user does not exist in DB', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getProfile(mockActor)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update allowed candidate profile fields safely', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.candidateProfile.update.mockResolvedValue({
        ...mockUser.candidateProfile,
        headline: 'Lead Engineer',
        location: 'Bengaluru',
        skills: ['TypeScript', 'NestJS', 'PostgreSQL'],
      });

      const result = await service.updateProfile(mockActor, {
        headline: 'Lead Engineer',
        location: 'Bengaluru',
        skills: ['TypeScript', 'NestJS', 'PostgreSQL'],
      });

      expect(result.headline).toBe('Lead Engineer');
      expect(result.location).toBe('Bengaluru');
      expect(prisma.candidateProfile.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prof_cand_1' },
          data: expect.objectContaining({
            headline: 'Lead Engineer',
            location: 'Bengaluru',
            skills: ['TypeScript', 'NestJS', 'PostgreSQL'],
          }),
        }),
      );
    });

    it('should throw UnauthorizedException if actor is not a CANDIDATE', async () => {
      const invalidActor = { ...mockActor, role: UserRole.PLATFORM_ADMIN };
      await expect(service.updateProfile(invalidActor, {})).rejects.toThrow(UnauthorizedException);
    });
  });
});
