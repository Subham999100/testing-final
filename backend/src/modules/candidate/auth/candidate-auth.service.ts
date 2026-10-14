// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Authentication & Session Management
// ============================================================

import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CandidateLoginDto, CandidateRegisterDto } from './dto';

const DUMMY_HASH = bcrypt.hashSync('timing-equaliser-not-a-password', 10);

function durationToMs(value: string | undefined): number {
  const m = /^(\d+)\s*([smhd])$/.exec((value || '').trim());
  if (!m) return 24 * 60 * 60 * 1000;
  const unit = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[m[2] as 's' | 'm' | 'h' | 'd'];
  return Number(m[1]) * unit;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface CandidateAuthResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isEmailVerified: boolean;
  };
  profile: {
    id: string;
    phone: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    experienceYears: number | null;
    currentCompany: string | null;
    skills: string[];
  };
  sessionId: string;
  expiresAt: string;
}

export interface CandidateMeResult {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isEmailVerified: boolean;
  createdAt: Date;
  profile: {
    id: string;
    phone: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    experienceYears: number | null;
    currentCompany: string | null;
    skills: string[];
    education: any;
    experience: any;
    resumeFileName: string | null;
    resumeUploadedAt: Date | null;
    visibleToRecruiters: boolean;
    blockedOrganisations: string[];
  } | null;
}

@Injectable()
export class CandidateAuthService {
  private readonly logger = new Logger(CandidateAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Registers a new candidate user and their candidate profile atomically.
   * Email verification is left false by design during this phase.
   */
  async register(
    dto: CandidateRegisterDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CandidateAuthResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // Check if an existing User already exists with this email
    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      this.logger.warn(`Registration rejected: email ${normalizedEmail} already exists`);
      throw new ConflictException('An account with this email address already exists');
    }

    // Hash candidate password with standard bcrypt work factor
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Create User and CandidateProfile atomically in a Prisma transaction
    const { user, profile } = await this.prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: dto.firstName.trim(),
          lastName: dto.lastName.trim(),
          role: UserRole.CANDIDATE,
          isEmailVerified: false,
          isActive: true,
          organisationId: null,
        },
      });

      const createdProfile = await tx.candidateProfile.create({
        data: {
          userId: createdUser.id,
          phone: dto.phone?.trim() || null,
          visibleToRecruiters: dto.visibleToRecruiters === true,
          searchableText: `${createdUser.firstName} ${createdUser.lastName}`,
        },
      });

      return { user: createdUser, profile: createdProfile };
    });

    // Establish session & JWT credentials
    const sessionId = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);
    const tokenHash = hashToken(accessToken);
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '1d';
    const expiresAt = new Date(Date.now() + durationToMs(expiresIn));

    await this.prisma.platformSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
        expiresAt,
      },
    });

    // Record audit event
    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'CANDIDATE_REGISTER',
      entityType: 'CANDIDATE_PROFILE',
      entityId: profile.id,
      metadata: { email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      profile: {
        id: profile.id,
        phone: profile.phone,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        experienceYears: profile.experienceYears,
        currentCompany: profile.currentCompany,
        skills: profile.skills,
      },
      sessionId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Authenticates candidate credentials and issues an active session token.
   */
  async login(
    dto: CandidateLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<CandidateAuthResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { candidateProfile: true },
    });

    if (!user) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.logger.warn(`Failed candidate login: nonexistent email ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.role !== UserRole.CANDIDATE) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.logger.warn(
        `Role mismatch candidate login attempt: ${normalizedEmail} has role ${user.role}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      await bcrypt.compare(dto.password, DUMMY_HASH);
      this.logger.warn(`Inactive candidate login attempt: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      this.logger.warn(`Invalid password for candidate login: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Ensure candidate profile exists
    let profile = user.candidateProfile;
    if (!profile) {
      profile = await this.prisma.candidateProfile.create({
        data: {
          userId: user.id,
        },
      });
    }

    const sessionId = crypto.randomUUID();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);
    const tokenHash = hashToken(accessToken);
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '1d';
    const expiresAt = new Date(Date.now() + durationToMs(expiresIn));

    await this.prisma.platformSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
        expiresAt,
      },
    });

    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'CANDIDATE_LOGIN',
      entityType: 'PLATFORM_SESSION',
      entityId: sessionId,
      metadata: { email: user.email },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      profile: {
        id: profile.id,
        phone: profile.phone,
        headline: profile.headline,
        bio: profile.bio,
        location: profile.location,
        experienceYears: profile.experienceYears,
        currentCompany: profile.currentCompany,
        skills: profile.skills,
      },
      sessionId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Retrieves the authenticated candidate's own identity and profile data.
   */
  async getMe(actor: AuthenticatedUser): Promise<CandidateMeResult> {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Candidate account not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      profile: user.candidateProfile
        ? {
            id: user.candidateProfile.id,
            phone: user.candidateProfile.phone,
            headline: user.candidateProfile.headline,
            bio: user.candidateProfile.bio,
            location: user.candidateProfile.location,
            experienceYears: user.candidateProfile.experienceYears,
            currentCompany: user.candidateProfile.currentCompany,
            skills: user.candidateProfile.skills,
            education: user.candidateProfile.education,
            experience: user.candidateProfile.experience,
            resumeFileName: user.candidateProfile.resumeFileName,
            resumeUploadedAt: user.candidateProfile.resumeUploadedAt,
            visibleToRecruiters: user.candidateProfile.visibleToRecruiters,
            blockedOrganisations: user.candidateProfile.blockedOrganisations,
          }
        : null,
    };
  }

  /**
   * Revokes the active candidate session so the token cannot be reused.
   */
  async logout(
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    if (actor.sessionId) {
      await this.prisma.platformSession.updateMany({
        where: { id: actor.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'CANDIDATE_LOGOUT',
        entityType: 'PLATFORM_SESSION',
        entityId: actor.sessionId,
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Logged out successfully' };
  }
}
