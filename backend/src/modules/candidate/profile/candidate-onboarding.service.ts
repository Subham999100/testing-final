// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Onboarding Service
// Idempotent 5-step wizard management and server-side state of truth
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OnboardingStatus, UserRole, VideoInterviewStatus } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { CandidateScoringService } from './candidate-scoring.service';
import {
  OnboardingStep1Dto,
  OnboardingStep2Dto,
  OnboardingStep3Dto,
  OnboardingStep4Dto,
  OnboardingStep5Dto,
} from './dto';
import { splitFullName, joinFullName } from '../../../common/utils/name.util';

export interface OnboardingStatusResponse {
  onboardingStatus: OnboardingStatus;
  onboardingStep: number;
  videoInterviewStatus: VideoInterviewStatus;
  completionScore: number;
  completionBreakdown: any;
  isComplete: boolean;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string | null;
    fullName?: string;
    isEmailVerified: boolean;
  };
  profile: any;
}

@Injectable()
export class CandidateOnboardingService {
  private readonly logger = new Logger(CandidateOnboardingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: CandidateScoringService,
  ) {}

  /**
   * Retrieves or initializes candidate onboarding state.
   */
  async getStatus(actor: AuthenticatedUser): Promise<OnboardingStatusResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new NotFoundException('Candidate account not found');
    }

    let profile = user.candidateProfile;
    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: {
          userId: user.id,
          onboardingStatus: OnboardingStatus.IN_PROGRESS,
          onboardingStep: 1,
        },
      });
    }

    // Compute fresh score
    const scoreResult = this.scoringService.calculateScore({
      user,
      profile,
    });

    return {
      onboardingStatus: profile.onboardingStatus,
      onboardingStep: profile.onboardingStep,
      videoInterviewStatus: profile.videoInterviewStatus,
      completionScore: scoreResult.score,
      completionBreakdown: scoreResult.breakdown,
      isComplete: profile.onboardingStatus === OnboardingStatus.COMPLETE,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: joinFullName(user.firstName, user.lastName),
        isEmailVerified: user.isEmailVerified,
      },
      profile: {
        ...profile,
        currentSalary: profile.currentSalary ? Number(profile.currentSalary) : null,
        expectedSalary: profile.expectedSalary ? Number(profile.expectedSalary) : null,
      },
    };
  }

  /**
   * Step 1: Basic Details
   */
  async saveStep1(actor: AuthenticatedUser, dto: OnboardingStep1Dto) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const effectiveFullName = dto.fullName?.trim() || `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
    if (!effectiveFullName) {
      throw new BadRequestException('Full name is required');
    }
    const { firstName, lastName } = splitFullName(effectiveFullName);

    return this.prisma.$transaction(async (tx) => {
      // Update User firstName & lastName
      const updatedUser = await tx.user.update({
        where: { id: actor.userId },
        data: {
          firstName,
          lastName: lastName || null,
        },
      });

      // Update CandidateProfile basic details
      const dob = dto.dateOfBirth ? new Date(dto.dateOfBirth) : null;
      if (dob && isNaN(dob.getTime())) {
        throw new BadRequestException('Invalid date of birth format');
      }

      // Check 18+ if DOB provided
      if (dob) {
        const ageDifMs = Date.now() - dob.getTime();
        const ageDate = new Date(ageDifMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        if (age < 18) {
          throw new BadRequestException('Candidate must be at least 18 years of age');
        }
      }

      const existingProfile = await tx.candidateProfile.findUnique({
        where: { userId: actor.userId },
      });

      const nextStep = Math.max(2, existingProfile?.onboardingStep || 1);

      const profile = await tx.candidateProfile.upsert({
        where: { userId: actor.userId },
        create: {
          userId: actor.userId,
          phone: dto.phone.trim(),
          phoneCountryCode: dto.phoneCountryCode || '+91',
          location: dto.location.trim(),
          dateOfBirth: dob,
          isFresher: dto.isFresher,
          gender: dto.gender || null,
          onboardingStatus: OnboardingStatus.IN_PROGRESS,
          onboardingStep: nextStep,
        },
        update: {
          phone: dto.phone.trim(),
          phoneCountryCode: dto.phoneCountryCode || '+91',
          location: dto.location.trim(),
          dateOfBirth: dob,
          isFresher: dto.isFresher,
          gender: dto.gender || null,
          onboardingStatus:
            existingProfile?.onboardingStatus === OnboardingStatus.COMPLETE
              ? OnboardingStatus.COMPLETE
              : OnboardingStatus.IN_PROGRESS,
          onboardingStep:
            existingProfile?.onboardingStatus === OnboardingStatus.COMPLETE
              ? existingProfile.onboardingStep
              : nextStep,
        },
      });

      const scoreResult = this.scoringService.calculateScore({
        user: updatedUser,
        profile,
      });

      await tx.candidateProfile.update({
        where: { id: profile.id },
        data: {
          completionScore: scoreResult.score,
          completionBreakdown: scoreResult.breakdown as any,
        },
      });

      return {
        success: true,
        step: nextStep,
        score: scoreResult.score,
        breakdown: scoreResult.breakdown,
      };
    });
  }

  /**
   * Step 2: Education
   */
  async saveStep2(actor: AuthenticatedUser, dto: OnboardingStep2Dto) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    const educationList = dto.education || [];

    // Validate years logic
    for (const edu of educationList) {
      if (edu.startYear && edu.endYear && edu.endYear < edu.startYear) {
        throw new BadRequestException(
          `End year (${edu.endYear}) cannot be earlier than start year (${edu.startYear}) for ${edu.degree || 'education record'}`,
        );
      }
    }

    const existingProfile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });
    const nextStep = Math.max(3, existingProfile?.onboardingStep || 2);

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        education: educationList as any,
        onboardingStep:
          existingProfile?.onboardingStatus === OnboardingStatus.COMPLETE
            ? existingProfile.onboardingStep
            : nextStep,
      },
    });

    const scoreResult = this.scoringService.calculateScore({
      user,
      profile: updatedProfile,
    });

    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return {
      success: true,
      step: nextStep,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
    };
  }

  /**
   * Step 3: Professional Details
   */
  async saveStep3(actor: AuthenticatedUser, dto: OnboardingStep3Dto) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    // Deduplicate and trim skills
    const normalizedSkills = Array.from(
      new Set(
        (dto.skills || [])
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      ),
    );

    const existingProfile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
    });
    const nextStep = Math.max(4, existingProfile?.onboardingStep || 3);

    const curSal = dto.currentSalary ? BigInt(Math.round(Number(dto.currentSalary))) : null;
    const expSal = dto.expectedSalary ? BigInt(Math.round(Number(dto.expectedSalary))) : null;

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        headline: dto.headline.trim(),
        skills: normalizedSkills,
        currentJobTitle: dto.currentJobTitle?.trim() || null,
        currentCompany: dto.currentCompany?.trim() || null,
        experienceYears: dto.experienceYears != null ? dto.experienceYears : null,
        experienceMonths: dto.experienceMonths != null ? dto.experienceMonths : 0,
        currentSalary: curSal,
        expectedSalary: expSal,
        noticePeriod: dto.noticePeriod?.trim() || null,
        projects: (dto.projects as any) || undefined,
        preferredLocations: dto.preferredLocations || [],
        preferredJobTypes: dto.preferredJobTypes || [],
        preferredWorkModes: dto.preferredWorkModes || [],
        gender: dto.gender || undefined,
        onboardingStep:
          existingProfile?.onboardingStatus === OnboardingStatus.COMPLETE
            ? existingProfile.onboardingStep
            : nextStep,
      },
    });

    const scoreResult = this.scoringService.calculateScore({
      user,
      profile: updatedProfile,
    });

    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return {
      success: true,
      step: nextStep,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
    };
  }

  /**
   * Step 4: Resume Step Confirmation
   */
  async saveStep4(actor: AuthenticatedUser, dto: OnboardingStep4Dto) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user || !user.candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    if (!user.candidateProfile.resumeStorageKey) {
      throw new BadRequestException(
        'Resume is mandatory. Please upload your resume document before proceeding.',
      );
    }

    const nextStep = 5;
    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        onboardingStep: nextStep,
      },
    });

    const scoreResult = this.scoringService.calculateScore({
      user,
      profile: updatedProfile,
    });

    return {
      success: true,
      step: nextStep,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
    };
  }

  /**
   * Step 5: Video Interview or Final Completion
   */
  async saveStep5(actor: AuthenticatedUser, dto: OnboardingStep5Dto) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user || !user.candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const videoStatus =
      dto.action === 'START'
        ? VideoInterviewStatus.IN_PROGRESS
        : VideoInterviewStatus.SKIPPED;

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        videoInterviewStatus: videoStatus,
        onboardingStatus: OnboardingStatus.COMPLETE,
        onboardingStep: 5,
      },
    });

    const scoreResult = this.scoringService.calculateScore({
      user,
      profile: updatedProfile,
    });

    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return {
      success: true,
      onboardingStatus: OnboardingStatus.COMPLETE,
      score: scoreResult.score,
      breakdown: scoreResult.breakdown,
    };
  }

  /**
   * Skip onboarding (redirects to /candidate/profile, marks status COMPLETE)
   */
  async skipOnboarding(actor: AuthenticatedUser) {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user || !user.candidateProfile) {
      throw new NotFoundException('Candidate profile not found');
    }

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        onboardingStatus: OnboardingStatus.COMPLETE,
        videoInterviewStatus: VideoInterviewStatus.SKIPPED,
      },
    });

    const scoreResult = this.scoringService.calculateScore({
      user,
      profile: updatedProfile,
    });

    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return {
      success: true,
      onboardingStatus: OnboardingStatus.COMPLETE,
      score: scoreResult.score,
    };
  }
}
