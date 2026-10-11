
// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateAuthController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { CandidateAuthController } from './candidate-auth.controller';
import {
  CandidateAuthResult,
  CandidateAuthService,
  CandidateMeResult,
} from './candidate-auth.service';
import { CandidateLoginDto, CandidateRegisterDto } from './dto';

describe('CandidateAuthController', () => {
  let controller: CandidateAuthController;
  let authService: jest.Mocked<CandidateAuthService>;

  const mockAuthResult: CandidateAuthResult = {
    accessToken: 'mock.candidate.jwt.access.token',
    user: {
      id: 'usr_cand_1',
      email: 'applicant@clyptus.com',
      firstName: 'Jane',
      lastName: 'Applicant',
      role: UserRole.CANDIDATE,
      isEmailVerified: false,
    },
    profile: {
      id: 'prof_cand_1',
      phone: '+1234567890',
      headline: 'Software Engineer',
      bio: 'Ready to build',
      location: 'Remote',
      experienceYears: 3,
      currentCompany: 'Tech Corp',
      skills: ['TypeScript', 'Node.js'],
    },
    sessionId: 'sess_candidate_1',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockMeResult: CandidateMeResult = {
    id: 'usr_cand_1',
    email: 'applicant@clyptus.com',
    firstName: 'Jane',
    lastName: 'Applicant',
    role: UserRole.CANDIDATE,
    isEmailVerified: false,
    createdAt: new Date(),
    profile: {
      id: 'prof_cand_1',
      phone: '+1234567890',
      headline: 'Software Engineer',
      bio: 'Ready to build',
      location: 'Remote',
      experienceYears: 3,
      currentCompany: 'Tech Corp',
      skills: ['TypeScript', 'Node.js'],
      education: [],
      experience: [],
      resumeFileName: 'resume.pdf',
      resumeUploadedAt: new Date(),
    },
  };

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    email: 'applicant@clyptus.com',
    firstName: 'Jane',
    lastName: 'Applicant',
    role: UserRole.CANDIDATE,
    permissions: [],
    sessionId: 'sess_candidate_1',
  };

  const mockRequest = {
    headers: {
      'x-forwarded-for': '127.0.0.1',
      'user-agent': 'JestTestRunner/1.0',
    },
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
  } as unknown as Request;

  beforeEach(async () => {
    const mockService = {
      register: jest.fn().mockResolvedValue(mockAuthResult),
      login: jest.fn().mockResolvedValue(mockAuthResult),
      getMe: jest.fn().mockResolvedValue(mockMeResult),
      logout: jest.fn().mockResolvedValue({
        message: 'Logged out successfully',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateAuthController],
      providers: [
        {
          provide: CandidateAuthService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CandidateAuthController>(
      CandidateAuthController,
    );
    authService = module.get(CandidateAuthService);
  });

  describe('register', () => {
    it('should delegate candidate registration to candidate auth service', async () => {
      const dto: CandidateRegisterDto = {
        email: 'applicant@clyptus.com',
        password: 'ValidPassword123!',
        firstName: 'Jane',
        lastName: 'Applicant',
        phone: '+1234567890',
      };

      const result = await controller.register(dto, mockRequest);

      expect(result).toEqual(mockAuthResult);
      expect(authService.register).toHaveBeenCalledWith(
        dto,
        '127.0.0.1',
        'JestTestRunner/1.0',
      );
    });
  });

  describe('login', () => {
    it('should delegate candidate login to candidate auth service', async () => {
      const dto: CandidateLoginDto = {
        email: 'applicant@clyptus.com',
        password: 'ValidPassword123!',
      };

      const result = await controller.login(dto, mockRequest);

      expect(result).toEqual(mockAuthResult);
      expect(authService.login).toHaveBeenCalledWith(
        dto,
        '127.0.0.1',
        'JestTestRunner/1.0',
      );
    });
  });

  describe('me', () => {
    it('should retrieve current authenticated candidate profile and identity', async () => {
      const result = await controller.me(mockActor);

      expect(result).toEqual(mockMeResult);
      expect(authService.getMe).toHaveBeenCalledWith(mockActor);
    });
  });

  describe('logout', () => {
    it('should delegate logout to candidate auth service', async () => {
      const result = await controller.logout(mockActor, mockRequest);

      expect(result).toEqual({
        message: 'Logged out successfully',
      });
      expect(authService.logout).toHaveBeenCalledWith(
        mockActor,
        '127.0.0.1',
        'JestTestRunner/1.0',
      );
    });
  });
});
