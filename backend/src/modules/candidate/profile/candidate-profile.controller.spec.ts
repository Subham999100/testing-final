// ============================================================
// Clyptus Job Portal - Candidate Portal
// Unit Test: CandidateProfileController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { CandidateProfileController } from './candidate-profile.controller';
import {
  CandidateProfileResponse,
  CandidateProfileService,
} from './candidate-profile.service';

describe('CandidateProfileController', () => {
  let controller: CandidateProfileController;
  let service: jest.Mocked<CandidateProfileService>;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_cand_1',
    sessionId: 'sess_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    role: UserRole.CANDIDATE,
    permissions: [],
  };

  const mockProfileResponse: CandidateProfileResponse = {
    id: 'prof_cand_1',
    userId: 'usr_cand_1',
    email: 'hema.candidate@example.com',
    firstName: 'Hema',
    lastName: 'Candidate',
    fullName: 'Hema Candidate',
    role: UserRole.CANDIDATE,
    isEmailVerified: false,
    phone: '+919876543210',
    phoneCountryCode: '+91',
    dateOfBirth: null,
    gender: null,
    isFresher: false,
    photoUrl: null,
    coverUrl: null,
    openToWork: false,
    fromResumeSections: [],
    headline: 'Senior Full Stack Engineer',
    location: 'Hyderabad',
    experienceYears: 4,
    experienceMonths: 0,
    currentJobTitle: 'Senior Full Stack Engineer',
    currentCompany: 'Tech Corp',
    currentSalary: null,
    expectedSalary: null,
    noticePeriod: null,
    preferredLocations: [],
    preferredJobTypes: [],
    preferredWorkModes: [],
    skills: ['TypeScript', 'NestJS'],
    bio: 'Experienced developer',
    education: [],
    experience: [],
    projects: [],
    certifications: [],
    languages: [],
    socialLinks: {},
    resume: {
      hasResume: true,
      fileName: 'resume.pdf',
      fileSize: 1024,
      mimeType: 'application/pdf',
      uploadedAt: new Date(),
    },
    onboardingStatus: 'IN_PROGRESS',
    onboardingStep: 1,
    videoInterviewStatus: 'NOT_STARTED',
    completionScore: 50,
    completionBreakdown: {},
    visibleToRecruiters: false,
    blockedOrganisations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      getProfile: jest.fn().mockResolvedValue(mockProfileResponse),
      updateProfile: jest.fn().mockResolvedValue(mockProfileResponse),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CandidateProfileController],
      providers: [
        {
          provide: CandidateProfileService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CandidateProfileController>(CandidateProfileController);
    service = module.get(CandidateProfileService);
  });

  it('should delegate getProfile to CandidateProfileService', async () => {
    const result = await controller.getProfile(mockActor);
    expect(result).toEqual(mockProfileResponse);
    expect(service.getProfile).toHaveBeenCalledWith(mockActor);
  });

  it('should delegate updateProfile to CandidateProfileService', async () => {
    const dto = { headline: 'Staff Engineer' };
    const result = await controller.updateProfile(mockActor, dto);
    expect(result).toEqual(mockProfileResponse);
    expect(service.updateProfile).toHaveBeenCalledWith(mockActor, dto);
  });
});
