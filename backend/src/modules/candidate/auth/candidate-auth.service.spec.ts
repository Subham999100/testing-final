// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateAuthService
// ============================================================

import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CandidateAuthService } from './candidate-auth.service';

describe('CandidateAuthService', () => {
  let service: CandidateAuthService;
  let prisma: any;
  let jwtService: any;
  let configService: any;
  let auditService: any;

  const rawPassword = 'ValidCandidate123!';
  let passwordHash: string;

  beforeAll(async () => {
    passwordHash = await bcrypt.hash(rawPassword, 10);
  });

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      candidateProfile: {
        create: jest.fn(),
      },
      platformSession: {
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.candidate.jwt.token'),
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'jwt.expiresIn') return '1d';
        return null;
      }),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidateAuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: configService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CandidateAuthService>(CandidateAuthService);
  });

  describe('register', () => {
    it('should atomically create User with CANDIDATE role, isEmailVerified false, CandidateProfile, session and audit log', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const mockCreatedUser = {
        id: 'usr_cand_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.CANDIDATE,
        isEmailVerified: false,
        isActive: true,
        organisationId: null,
      };

      const mockCreatedProfile = {
        id: 'prof_cand_1',
        userId: 'usr_cand_1',
        phone: '+1234567890',
        headline: null,
        bio: null,
        location: null,
        experienceYears: null,
        currentCompany: null,
        skills: [],
      };

      prisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: {
            create: jest.fn().mockResolvedValue(mockCreatedUser),
          },
          candidateProfile: {
            create: jest.fn().mockResolvedValue(mockCreatedProfile),
          },
        });
      });

      const result = await service.register(
        {
          email: 'APPLICANT@EXAMPLE.COM',
          password: rawPassword,
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '+1234567890',
        },
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock.candidate.jwt.token');
      expect(result.user.email).toBe('applicant@example.com');
      expect(result.user.role).toBe(UserRole.CANDIDATE);
      expect(result.user.isEmailVerified).toBe(false);
      expect(result.profile.phone).toBe('+1234567890');
      expect(prisma.platformSession.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'usr_cand_1',
            ipAddress: '192.168.1.1',
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CANDIDATE_REGISTER',
          actorId: 'usr_cand_1',
          actorRole: UserRole.CANDIDATE,
        }),
      );
    });

    it('should reject registration if email already exists with ConflictException', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_existing',
        email: 'existing@example.com',
      });

      await expect(
        service.register({
          email: 'existing@example.com',
          password: rawPassword,
          firstName: 'John',
          lastName: 'Smith',
        }),
      ).rejects.toThrow(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should authenticate active candidate, create session, and return token and profile', async () => {
      const mockUser = {
        id: 'usr_cand_2',
        email: 'jane@example.com',
        passwordHash,
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.CANDIDATE,
        isActive: true,
        isEmailVerified: false,
        candidateProfile: {
          id: 'prof_cand_2',
          userId: 'usr_cand_2',
          phone: null,
          headline: 'Full Stack Engineer',
          bio: 'Passionate builder',
          location: 'San Francisco, CA',
          experienceYears: 4,
          currentCompany: 'Tech Corp',
          skills: ['TypeScript', 'React', 'NestJS'],
        },
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.login(
        {
          email: 'jane@example.com',
          password: rawPassword,
        },
        '127.0.0.1',
        'test-agent',
      );

      expect(result).toBeDefined();
      expect(result.accessToken).toBe('mock.candidate.jwt.token');
      expect(result.user.id).toBe('usr_cand_2');
      expect(result.profile.headline).toBe('Full Stack Engineer');
      expect(result.profile.skills).toContain('TypeScript');
      expect(prisma.platformSession.create).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CANDIDATE_LOGIN',
          actorId: 'usr_cand_2',
        }),
      );
    });

    it('should reject non-existent user with generic Invalid credentials error', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: rawPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject invalid password with generic Invalid credentials error', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_3',
        email: 'jane@example.com',
        passwordHash,
        role: UserRole.CANDIDATE,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'jane@example.com',
          password: 'WrongPassword!',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject role mismatch (recruiter or admin attempting candidate login) with Invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_recruiter_1',
        email: 'recruiter@clyptus.org',
        passwordHash,
        role: UserRole.RECRUITER,
        isActive: true,
      });

      await expect(
        service.login({
          email: 'recruiter@clyptus.org',
          password: rawPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject inactive candidate account with generic Invalid credentials', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_4',
        email: 'deactivated@example.com',
        passwordHash,
        role: UserRole.CANDIDATE,
        isActive: false,
      });

      await expect(
        service.login({
          email: 'deactivated@example.com',
          password: rawPassword,
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should auto-create candidate profile on login if missing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_5',
        email: 'noprofile@example.com',
        passwordHash,
        role: UserRole.CANDIDATE,
        isActive: true,
        candidateProfile: null,
      });

      prisma.candidateProfile.create.mockResolvedValue({
        id: 'prof_created_5',
        userId: 'usr_cand_5',
        phone: null,
        headline: null,
        bio: null,
        location: null,
        experienceYears: null,
        currentCompany: null,
        skills: [],
      });

      const result = await service.login({
        email: 'noprofile@example.com',
        password: rawPassword,
      });

      expect(result.profile.id).toBe('prof_created_5');
      expect(prisma.candidateProfile.create).toHaveBeenCalledWith({
        data: { userId: 'usr_cand_5' },
      });
    });
  });

  describe('getMe', () => {
    it('should return authenticated candidate profile and identity data', async () => {
      const mockActor: AuthenticatedUser = {
        userId: 'usr_cand_1',
        sessionId: 'sess_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.CANDIDATE,
        permissions: [],
      };

      prisma.user.findUnique.mockResolvedValue({
        id: 'usr_cand_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.CANDIDATE,
        isEmailVerified: false,
        createdAt: new Date('2026-01-01'),
        candidateProfile: {
          id: 'prof_cand_1',
          phone: '1234567890',
          headline: 'Lead Developer',
          bio: 'Bio text',
          location: 'Remote',
          experienceYears: 5,
          currentCompany: 'Awesome Inc',
          skills: ['Node.js'],
          education: [],
          experience: [],
          resumeFileName: 'resume.pdf',
          resumeUploadedAt: new Date('2026-01-02'),
        },
      });

      const result = await service.getMe(mockActor);

      expect(result).toBeDefined();
      expect(result.id).toBe('usr_cand_1');
      expect(result.role).toBe(UserRole.CANDIDATE);
      expect(result.profile?.headline).toBe('Lead Developer');
      expect(result.profile?.resumeFileName).toBe('resume.pdf');
    });

    it('should throw UnauthorizedException if user not found or role is not CANDIDATE', async () => {
      const mockActor: AuthenticatedUser = {
        userId: 'usr_unknown',
        sessionId: 'sess_1',
        email: 'unknown@example.com',
        firstName: 'U',
        lastName: 'N',
        role: UserRole.CANDIDATE,
        permissions: [],
      };

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getMe(mockActor)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should revoke active session in platformSession and record audit log', async () => {
      const mockActor: AuthenticatedUser = {
        userId: 'usr_cand_1',
        sessionId: 'sess_active_1',
        email: 'applicant@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: UserRole.CANDIDATE,
        permissions: [],
      };

      const result = await service.logout(mockActor, '127.0.0.1', 'test-agent');

      expect(result).toEqual({ message: 'Logged out successfully' });
      expect(prisma.platformSession.updateMany).toHaveBeenCalledWith({
        where: { id: 'sess_active_1', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CANDIDATE_LOGOUT',
          actorId: 'usr_cand_1',
          entityId: 'sess_active_1',
        }),
      );
    });
  });
});
