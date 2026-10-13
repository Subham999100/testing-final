// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Profile Management
// Scoped strictly to the authenticated candidate's own identity.
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import { CandidateScoringService } from './candidate-scoring.service';
import { UpdateCandidateProfileDto } from './dto';
import { splitFullName, joinFullName } from '../../../common/utils/name.util';

export function toTitleCase(str: string): string {
  if (!str) return '';
  return str
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      if (/^[A-Z0-9&/.-]+$/.test(word) && word.length <= 4) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

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
  phoneCountryCode: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  isFresher: boolean;
  photoUrl: string | null;
  coverUrl: string | null;
  openToWork: boolean;
  fromResumeSections: string[];
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  experienceMonths: number;
  currentJobTitle: string | null;
  currentCompany: string | null;
  currentSalary: number | null;
  expectedSalary: number | null;
  noticePeriod: string | null;
  preferredLocations: string[];
  preferredJobTypes: string[];
  preferredWorkModes: string[];
  skills: string[];
  bio: string | null;
  education: any;
  experience: any;
  projects: any;
  certifications: any;
  languages: string[];
  socialLinks: any;
  resume: {
    hasResume: boolean;
    fileName: string | null;
    fileSize: number | null;
    mimeType: string | null;
    uploadedAt: Date | null;
  };
  onboardingStatus: string;
  onboardingStep: number;
  videoInterviewStatus: string;
  completionScore: number;
  completionBreakdown: any;
  visibleToRecruiters: boolean;
  blockedOrganisations: string[];
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CandidateProfileService {
  private readonly logger = new Logger(CandidateProfileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scoringService: CandidateScoringService,
    private readonly cloudStorage: CloudStorageService,
  ) {}

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
    if (dto.phone !== undefined) updateData.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.headline !== undefined) updateData.headline = dto.headline ? dto.headline.replace(/\s+/g, ' ').trim() : null;
    if (dto.location !== undefined) updateData.location = dto.location ? toTitleCase(dto.location) : null;
    if (dto.openToWork !== undefined) updateData.openToWork = Boolean(dto.openToWork);
    if (dto.coverUrl !== undefined) updateData.coverUrl = dto.coverUrl;
    if (dto.experienceYears !== undefined) updateData.experienceYears = dto.experienceYears;
    if (dto.currentCompany !== undefined) updateData.currentCompany = dto.currentCompany;
    if (dto.skills !== undefined) {
      updateData.skills = [...new Set(dto.skills.map((s) => s.trim()).filter(Boolean))];
    }
    if (dto.bio !== undefined) updateData.bio = dto.bio;
    if (dto.education !== undefined) updateData.education = dto.education;
    if (dto.experience !== undefined) updateData.experience = dto.experience;
    if (dto.phoneCountryCode !== undefined) updateData.phoneCountryCode = dto.phoneCountryCode;
    if (dto.isFresher !== undefined) updateData.isFresher = Boolean(dto.isFresher);
    if (dto.currentJobTitle !== undefined) updateData.currentJobTitle = dto.currentJobTitle;
    if (dto.experienceMonths !== undefined) updateData.experienceMonths = dto.experienceMonths;
    if (dto.currentSalary !== undefined) updateData.currentSalary = dto.currentSalary ? BigInt(dto.currentSalary) : null;
    if (dto.expectedSalary !== undefined) updateData.expectedSalary = dto.expectedSalary ? BigInt(dto.expectedSalary) : null;
    if (dto.noticePeriod !== undefined) updateData.noticePeriod = dto.noticePeriod;
    if (dto.preferredLocations !== undefined) updateData.preferredLocations = dto.preferredLocations;
    if (dto.preferredJobTypes !== undefined) updateData.preferredJobTypes = dto.preferredJobTypes;
    if (dto.preferredWorkModes !== undefined) updateData.preferredWorkModes = dto.preferredWorkModes;
    if (dto.projects !== undefined) updateData.projects = dto.projects;
    if (dto.certifications !== undefined) updateData.certifications = dto.certifications;
    if (dto.languages !== undefined) updateData.languages = dto.languages;

    // Validate socialLinks URLs (LinkedIn/GitHub domains)
    if (dto.socialLinks !== undefined) {
      const sanitized: Record<string, string> = {};
      if (dto.socialLinks.linkedin) {
        const li = dto.socialLinks.linkedin.trim();
        if (li && !/linkedin\.com/i.test(li)) {
          throw new BadRequestException('LinkedIn URL must contain linkedin.com');
        }
        sanitized.linkedin = li ? (li.startsWith('http') ? li : `https://${li}`) : '';
      }
      if (dto.socialLinks.github) {
        const gh = dto.socialLinks.github.trim();
        if (gh && !/github\.com/i.test(gh)) {
          throw new BadRequestException('GitHub URL must contain github.com');
        }
        sanitized.github = gh ? (gh.startsWith('http') ? gh : `https://${gh}`) : '';
      }
      if (dto.socialLinks.portfolio) {
        const pf = dto.socialLinks.portfolio.trim();
        sanitized.portfolio = pf ? (pf.startsWith('http') ? pf : `https://${pf}`) : '';
      }
      updateData.socialLinks = sanitized;
    }

    if (dto.visibleToRecruiters !== undefined) {
      updateData.visibleToRecruiters = Boolean(dto.visibleToRecruiters);
    }
    if (dto.blockedOrganisations !== undefined) {
      updateData.blockedOrganisations = Array.isArray(dto.blockedOrganisations)
        ? [...new Set(dto.blockedOrganisations.map((o) => o.trim()).filter(Boolean))]
        : [];
    }

    // Clear auto-filled section flags when candidate modifies that section
    const existingFromResume = profile.fromResumeSections || [];
    const modifiedSections: string[] = [];
    if (dto.education !== undefined) modifiedSections.push('education');
    if (dto.experience !== undefined) modifiedSections.push('experience');
    if (dto.skills !== undefined) modifiedSections.push('skills');
    if (dto.projects !== undefined) modifiedSections.push('projects');
    if (dto.certifications !== undefined) modifiedSections.push('certifications');
    if (dto.languages !== undefined) modifiedSections.push('languages');
    if (dto.socialLinks !== undefined) modifiedSections.push('socialLinks');
    if (dto.bio !== undefined) modifiedSections.push('bio');
    if (dto.phone !== undefined) modifiedSections.push('phone');
    if (dto.headline !== undefined) modifiedSections.push('headline');
    if (dto.location !== undefined) modifiedSections.push('location');
    if (dto.preferredLocations !== undefined || dto.expectedSalary !== undefined || dto.noticePeriod !== undefined) {
      modifiedSections.push('jobPreferences');
    }
    if (modifiedSections.length > 0) {
      updateData.fromResumeSections = existingFromResume.filter(
        (s) => !modifiedSections.includes(s),
      );
    }

    let updatedUser = user;
    let newFirstName = dto.firstName;
    let newLastName = dto.lastName;
    if (dto.fullName) {
      const split = splitFullName(dto.fullName);
      newFirstName = split.firstName;
      newLastName = split.lastName || '';
    }

    if (newFirstName !== undefined) newFirstName = toTitleCase(newFirstName);
    if (newLastName !== undefined) newLastName = toTitleCase(newLastName);

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

    const scoreResult = this.scoringService.calculateScore({
      user: updatedUser,
      profile: { ...profile, ...updateData },
    });
    updateData.completionScore = scoreResult.score;
    updateData.completionBreakdown = scoreResult.breakdown as any;

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
    const scoreResult = this.scoringService.calculateScore({ user, profile });
    return {
      id: profile.id,
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName || '',
      fullName: joinFullName(user.firstName, user.lastName),
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      phone: profile.phone,
      phoneCountryCode: profile.phoneCountryCode || '+91',
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      isFresher: !!profile.isFresher,
      photoUrl: profile.photoUrl,
      coverUrl: profile.coverUrl ?? null,
      openToWork: profile.openToWork ?? false,
      fromResumeSections: profile.fromResumeSections || [],
      headline: profile.headline,
      location: profile.location,
      experienceYears: profile.experienceYears,
      experienceMonths: profile.experienceMonths || 0,
      currentJobTitle: profile.currentJobTitle,
      currentCompany: profile.currentCompany,
      currentSalary: profile.currentSalary ? Number(profile.currentSalary) : null,
      expectedSalary: profile.expectedSalary ? Number(profile.expectedSalary) : null,
      noticePeriod: profile.noticePeriod,
      preferredLocations: profile.preferredLocations || [],
      preferredJobTypes: profile.preferredJobTypes || [],
      preferredWorkModes: profile.preferredWorkModes || [],
      skills: profile.skills || [],
      bio: profile.bio,
      education: profile.education ?? [],
      experience: profile.experience ?? [],
      projects: profile.projects ?? [],
      certifications: profile.certifications ?? [],
      languages: profile.languages || [],
      socialLinks: profile.socialLinks || {},
      resume: {
        hasResume: !!profile.resumeStorageKey,
        fileName: profile.resumeFileName,
        fileSize: profile.resumeFileSize,
        mimeType: profile.resumeMimeType,
        uploadedAt: profile.resumeUploadedAt,
      },
      onboardingStatus: profile.onboardingStatus,
      onboardingStep: profile.onboardingStep,
      videoInterviewStatus: profile.videoInterviewStatus,
      completionScore: scoreResult.score,
      completionBreakdown: scoreResult.breakdown,
      visibleToRecruiters: profile.visibleToRecruiters ?? false,
      blockedOrganisations: profile.blockedOrganisations ?? [],
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  /**
   * Upload candidate profile photo
   */
  async uploadPhoto(
    actor: AuthenticatedUser,
    file: { originalname?: string; buffer: Buffer; mimetype: string },
  ): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty photo is required');
    }

    const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.buffer.length > MAX_PHOTO_SIZE) {
      throw new BadRequestException('Photo size exceeds 5 MB limit');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const mime = (file.mimetype || '').toLowerCase();
    if (!allowedMimes.includes(mime)) {
      throw new BadRequestException('Only JPG, PNG and WEBP image formats are supported');
    }

    // Validate magic bytes
    const buf = file.buffer;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf.length >= 12 &&
      buf.toString('ascii', 8, 12) === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Corrupted or invalid image binary payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    const safeUserId = actor.userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${Date.now()}-avatar.webp`;
    const uploadResult = await this.cloudStorage.uploadFile({
      fileName: filename,
      buffer: file.buffer,
      mimeType: file.mimetype,
      folder: `photos/candidates/${safeUserId}`,
    });

    // Store base64 data URL for instant zero-latency loading and persistence
    const photoBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        photoStorageKey: uploadResult.key,
        photoUrl: photoBase64,
      },
    });

    const scoreResult = this.scoringService.calculateScore({ user, profile: updatedProfile });
    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return this.formatProfileResponse(user, updatedProfile);
  }

  /**
   * Delete candidate profile photo
   */
  async deletePhoto(actor: AuthenticatedUser): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    const profile = user.candidateProfile;
    if (profile?.photoStorageKey) {
      await this.cloudStorage.deletePrivateObject(profile.photoStorageKey).catch(() => {});
    }

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        photoStorageKey: null,
        photoUrl: null,
      },
    });

    const scoreResult = this.scoringService.calculateScore({ user, profile: updatedProfile });
    await this.prisma.candidateProfile.update({
      where: { id: updatedProfile.id },
      data: {
        completionScore: scoreResult.score,
        completionBreakdown: scoreResult.breakdown as any,
      },
    });

    return this.formatProfileResponse(user, updatedProfile);
  }

  /**
   * Upload candidate profile cover banner (4:1 aspect)
   */
  async uploadCover(
    actor: AuthenticatedUser,
    file: { originalname?: string; buffer: Buffer; mimetype: string },
  ): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('A non-empty cover image is required');
    }

    const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.buffer.length > MAX_COVER_SIZE) {
      throw new BadRequestException('Cover image size exceeds 5 MB limit');
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const mime = (file.mimetype || '').toLowerCase();
    if (!allowedMimes.includes(mime)) {
      throw new BadRequestException('Only JPG, PNG and WEBP image formats are supported');
    }

    // Validate magic bytes
    const buf = file.buffer;
    const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
    const isWebp =
      buf[0] === 0x52 &&
      buf[1] === 0x49 &&
      buf[2] === 0x46 &&
      buf[3] === 0x46 &&
      buf.length >= 12 &&
      buf.toString('ascii', 8, 12) === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      throw new BadRequestException('Corrupted or invalid image binary payload');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    const safeUserId = actor.userId.replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${Date.now()}-cover.webp`;
    const uploadResult = await this.cloudStorage.uploadFile({
      fileName: filename,
      buffer: file.buffer,
      mimeType: file.mimetype,
      folder: `covers/candidates/${safeUserId}`,
    });

    const coverBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        coverStorageKey: uploadResult.key,
        coverUrl: coverBase64,
      },
    });

    return this.formatProfileResponse(user, updatedProfile);
  }

  /**
   * Delete candidate profile cover banner
   */
  async deleteCover(actor: AuthenticatedUser): Promise<CandidateProfileResponse> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate authentication required');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });
    if (!user) throw new NotFoundException('Candidate not found');

    const profile = user.candidateProfile;
    if (profile?.coverStorageKey) {
      await this.cloudStorage.deletePrivateObject(profile.coverStorageKey).catch(() => {});
    }

    const updatedProfile = await this.prisma.candidateProfile.update({
      where: { userId: actor.userId },
      data: {
        coverStorageKey: null,
        coverUrl: null,
      },
    });

    return this.formatProfileResponse(user, updatedProfile);
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
