// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Profile Management
// Scoped strictly to the authenticated candidate's own identity.
// ============================================================

import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { UpdateCandidateProfileDto } from './dto';

export interface CandidateProfileResponse {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  isEmailVerified: boolean;
  phone: string | null;
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  skills: string[];
  bio: string | null;
  education: any;
  experience: any;
  resume: {
    hasResume: boolean;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    uploadedAt: Date | null;
  };
  visibleToRecruiters: boolean;
  blockedOrganisations: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CandidateProfileService {
  private readonly logger = new Logger(CandidateProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves the authenticated candidate's profile.
   * Scoped strictly to actor.userId to prevent cross-candidate access.
   */
  async getProfile(actor: AuthenticatedUser): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new NotFoundException('Candidate account not found');
    }

    // Auto-initialize profile if not present
    let profile = user.candidateProfile;
    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    return this.formatProfileResponse(user, profile);
  }

  /**
   * Updates allowed candidate profile fields.
   * Scoped strictly to actor.userId.
   */
  async updateProfile(
    actor: AuthenticatedUser,
    dto: UpdateCandidateProfileDto,
  ): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new NotFoundException('Candidate account not found');
    }

    // Ensure profile exists
    let profile = user.candidateProfile;
    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    // Build safe update data (never allow changing userId, resume keys, or security fields)
    const updateData: any = {};
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.headline !== undefined) updateData.headline = dto.headline;
    if (dto.location !== undefined) updateData.location = dto.location;
    if (dto.experienceYears !== undefined) updateData.experienceYears = dto.experienceYears;
    if (dto.currentCompany !== undefined) updateData.currentCompany = dto.currentCompany;
    if (dto.skills !== undefined) {
      updateData.skills = [...new Set(dto.skills.map((s) => s.trim()).filter(Boolean))];
    }
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.education !== undefined) updateData.education = dto.education;
    if (dto.experience !== undefined) updateData.experience = dto.experience;
    if (dto.visibleToRecruiters !== undefined) {
      updateData.visibleToRecruiters = Boolean(dto.visibleToRecruiters);
    }
    if (dto.blockedOrganisations !== undefined) {
      updateData.blockedOrganisations = Array.isArray(dto.blockedOrganisations)
        ? [...new Set(dto.blockedOrganisations.map((o) => o.trim()).filter(Boolean))]
        : [];
    }

    let updatedUser = user;
    let newFirstName = dto.firstName;
    let newLastName = dto.lastName;
    if (dto.fullName) {
      const parts = dto.fullName.trim().split(/\s+/);
      newFirstName = parts[0];
      newLastName = parts.slice(1).join(' ') || newFirstName;
    }

    if (newFirstName !== undefined || newLastName !== undefined) {
      updatedUser = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          firstName: newFirstName ? newFirstName.trim() : user.firstName,
          lastName: newLastName ? newLastName.trim() : user.lastName,
        },
        include: { candidateProfile: true },
      });
    }

    // Keep searchableText synchronized
    const effFirstName = newFirstName !== undefined ? newFirstName.trim() : user.firstName;
    const effLastName = newLastName !== undefined ? newLastName.trim() : user.lastName;
    const effHeadline = dto.headline !== undefined ? dto.headline : profile.headline;
    const effLocation = dto.location !== undefined ? dto.location : profile.location;
    const effCompany = dto.currentCompany !== undefined ? dto.currentCompany : profile.currentCompany;
    const effSkills = dto.skills !== undefined ? updateData.skills : (profile.skills || []);
    const effBio = dto.bio !== undefined ? dto.bio : profile.bio;
    const effResumeText = profile.resumeText;

    updateData.searchableText = [
      effFirstName,
      effLastName,
      effHeadline,
      effLocation,
      effCompany,
      ...(effSkills || []),
      effBio,
      effResumeText,
    ].filter(Boolean).join(' ').trim();

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { id: profile.id },
      data: updateData,
    });

    // Synchronize updates across any existing ATS Candidate records linked to this candidate
    // POLICY NOTE:
    // 1. Sync is strictly limited to candidate-owned profile fields: headline, skills, location, experienceYears, currentCompany, resume fields, phone, name.
    // 2. Recruiter-owned data (notes, tags, status, folders, assigned recruiter, stage) is NEVER touched.
    // 3. For recruiter-sourced records (source !== 'CANDIDATE_PORTAL'), existing non-empty recruiter-entered fields are preserved and never overwritten.
    // 4. For portal-originated records (source === 'CANDIDATE_PORTAL'), self-reported candidate updates take effect.
    try {
      const linkedCandidates = await this.prisma.candidate.findMany({
        where: { userId: actor.userId },
      });

      for (const atsCandidate of linkedCandidates) {
        const atsUpdateData: any = {};
        const isRecruiterSourced = atsCandidate.source !== 'CANDIDATE_PORTAL';

        if (newFirstName && (!isRecruiterSourced || !atsCandidate.firstName)) {
          atsUpdateData.firstName = newFirstName.trim();
        }
        if (newLastName && (!isRecruiterSourced || !atsCandidate.lastName)) {
          atsUpdateData.lastName = newLastName.trim();
        }
        if (dto.phone !== undefined && (!isRecruiterSourced || !atsCandidate.phone)) {
          atsUpdateData.phone = dto.phone;
        }
        if (dto.headline !== undefined && (!isRecruiterSourced || !atsCandidate.headline)) {
          atsUpdateData.headline = dto.headline;
        }
        if (dto.location !== undefined && (!isRecruiterSourced || !atsCandidate.location)) {
          atsUpdateData.location = dto.location;
        }
        if (dto.experienceYears !== undefined && (!isRecruiterSourced || atsCandidate.experienceYears == null)) {
          atsUpdateData.experienceYears = dto.experienceYears;
        }
        if (dto.currentCompany !== undefined && (!isRecruiterSourced || !atsCandidate.currentCompany)) {
          atsUpdateData.currentCompany = dto.currentCompany;
        }
        if (dto.skills !== undefined && (!isRecruiterSourced || !atsCandidate.skills || atsCandidate.skills.length === 0)) {
          atsUpdateData.skills = updateData.skills;
        }
        if (updatedProfile.resumeStorageKey && (!isRecruiterSourced || !atsCandidate.resumeUrl)) {
          atsUpdateData.resumeUrl = updatedProfile.resumeStorageKey;
        }
        if (updatedProfile.resumeText && (!isRecruiterSourced || !atsCandidate.resumeText)) {
          atsUpdateData.resumeText = updatedProfile.resumeText;
        }

        if (Object.keys(atsUpdateData).length > 0) {
          await this.prisma.candidate.update({
            where: { id: atsCandidate.id },
            data: atsUpdateData,
          });
        }
      }
    } catch (syncErr: any) {
      this.logger.warn(`Failed to sync linked ATS candidate records: ${syncErr.message}`);
    }

    this.logger.log(`Updated candidate profile for user: ${actor.userId}`);
    return this.formatProfileResponse(updatedUser, updatedProfile);
  }

  private formatProfileResponse(user: any, profile: any): CandidateProfileResponse {
    return {
      id: profile.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      phone: profile.phone,
      headline: profile.headline,
      location: profile.location,
      experienceYears: profile.experienceYears,
      currentCompany: profile.currentCompany,
      skills: profile.skills || [],
      bio: profile.bio,
      education: profile.education ?? [],
      experience: profile.experience ?? [],
      resume: {
        hasResume: !!profile.resumeStorageKey,
        fileName: profile.resumeFileName,
        fileSize: profile.resumeFileSize,
        mimeType: profile.resumeMimeType,
        uploadedAt: profile.resumeUploadedAt,
      },
      visibleToRecruiters: profile.visibleToRecruiters ?? false,
      blockedOrganisations: profile.blockedOrganisations ?? [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Returns active hiring organisations by name only (for candidate blocked-organisations picker).
   * Strictly lists organisations by name and id; never exposes any candidates' data.
   */
  async getActiveOrganisations(): Promise<{ id: string; name: string }[]> {
    return this.prisma.organisation.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }
}
