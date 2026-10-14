// ============================================================
// Clyptus Job Portal - Global Talent Search Service
// Phase C: Global Talent Pool Discovery, Bridge, Masking & Unlocks
// ============================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Candidate, Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { TOKEN_COSTS } from '../common/org-workflows';
import { CandidatesService } from '../hiring/candidates.service';
import { GlobalSearchDto } from './global-talent-search.dto';

export interface MaskedGlobalCandidateResult {
  userId: string;
  candidateId: string | null;
  isInPool: boolean;
  isUnlocked: boolean;
  firstName: string;
  lastName: string;
  headline: string | null;
  location: string | null;
  experienceYears: number | null;
  currentCompany: string | null;
  skills: string[];
  bio: string | null;
  education: any;
  experience: any;
  email?: string;
  phone?: string | null;
  resumeUrl?: string | null;
  resumeText?: string | null;
}

export interface GlobalSearchResponse {
  items: MaskedGlobalCandidateResult[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class GlobalTalentSearchService {
  private readonly logger = new Logger(GlobalTalentSearchService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
    private readonly candidatesService: CandidatesService,
  ) {}

  /**
   * Enforces configurable daily global search rate limits.
   * 0 (default) = unlimited. Setting a positive integer enforces it.
   */
  private async checkDailySearchLimit(ctx: OrgContext) {
    const limit = this.config.get<number>('globalSearch.dailyLimit') ?? 0;
    if (limit > 0) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const count = await this.prisma.auditLog.count({
        where: {
          actorId: ctx.userId,
          action: 'GLOBAL_TALENT_SEARCH',
          createdAt: { gte: startOfDay },
        },
      });
      if (count >= limit) {
        throw new ForbiddenException(
          `Daily global search limit of ${limit} searches exceeded. Please try again tomorrow.`,
        );
      }
    }
  }

  /**
   * Enforces configurable daily candidate unlock rate limits.
   * 0 (default) = unlimited. Setting a positive integer enforces it.
   */
  private async checkDailyUnlockLimit(ctx: OrgContext) {
    const limit = this.config.get<number>('globalSearch.unlockDailyLimit') ?? 0;
    if (limit > 0) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const count = await this.prisma.auditLog.count({
        where: {
          actorId: ctx.userId,
          action: 'GLOBAL_CANDIDATE_UNLOCKED',
          createdAt: { gte: startOfDay },
        },
      });
      if (count >= limit) {
        throw new ForbiddenException(
          `Daily global candidate unlock limit of ${limit} unlocks exceeded. Please try again tomorrow.`,
        );
      }
    }
  }

  /**
   * Global Talent Search across opted-in candidate profiles.
   * Server-side masking enforced: contact and resume data NEVER selected for locked rows.
   */
  async search(ctx: OrgContext, dto: GlobalSearchDto): Promise<GlobalSearchResponse> {
    await this.checkDailySearchLimit(ctx);

    // Hard cap page size at 25 per request (clamp values > 25)
    const rawLimit = dto.limit !== undefined ? Number(dto.limit) : 20;
    const limit = Math.min(25, Math.max(1, rawLimit));
    const page = Math.max(1, dto.page !== undefined ? Number(dto.page) : 1);
    const skip = (page - 1) * limit;

    // Build scoped query:
    // 1. Only visibleToRecruiters = true
    // 2. Candidate has NOT blocked the caller's organisationId
    const where: Prisma.CandidateProfileWhereInput = {
      visibleToRecruiters: true,
      NOT: {
        blockedOrganisations: {
          has: ctx.organisationId,
        },
      },
    };

    if (dto.minExperience != null || dto.maxExperience != null) {
      where.experienceYears = {
        ...(dto.minExperience != null ? { gte: dto.minExperience } : {}),
        ...(dto.maxExperience != null ? { lte: dto.maxExperience } : {}),
      };
    }

    if (dto.location?.trim()) {
      where.location = {
        contains: dto.location.trim(),
        mode: 'insensitive',
      };
    }

    if (dto.skills && dto.skills.length > 0) {
      const cleanSkills = dto.skills.map((s) => s.trim().toLowerCase()).filter(Boolean);
      if (cleanSkills.length > 0) {
        where.skills = {
          hasSome: cleanSkills,
        };
      }
    }

    if (dto.keyword?.trim()) {
      const kw = dto.keyword.trim();
      where.searchableText = {
        contains: kw,
        mode: 'insensitive',
      };
    }

    const [total, profiles] = await Promise.all([
      this.prisma.candidateProfile.count({ where }),
      this.prisma.candidateProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    // Inspect caller org's talent pool for these candidates
    const userIds = profiles.map((p) => p.userId);
    const orgCandidates = await this.prisma.candidate.findMany({
      where: {
        organisationId: ctx.organisationId,
        userId: { in: userIds },
      },
      select: {
        id: true,
        userId: true,
        applications: { select: { id: true } },
      },
    });

    const orgCandidateMap = new Map(
      orgCandidates.map((c) => [c.userId!, c]),
    );

    const candidateIds = orgCandidates.map((c) => c.id);
    const unlockedSet = await this.candidatesService.unlockedSet(candidateIds);

    const items: MaskedGlobalCandidateResult[] = profiles.map((profile) => {
      const orgCandidate = orgCandidateMap.get(profile.userId);
      const isInPool = !!orgCandidate;
      const hasApplication = orgCandidate ? orgCandidate.applications.length > 0 : false;
      const isUnlocked = hasApplication || (orgCandidate ? unlockedSet.has(orgCandidate.id) : false);

      if (isUnlocked) {
        // Full unmasked projection for already unlocked / applicant candidates
        return {
          userId: profile.userId,
          candidateId: orgCandidate?.id ?? null,
          isInPool,
          isUnlocked: true,
          firstName: profile.user.firstName,
          lastName: profile.user.lastName,
          email: profile.user.email,
          phone: profile.phone,
          headline: profile.headline,
          location: profile.location,
          experienceYears: profile.experienceYears,
          currentCompany: profile.currentCompany,
          skills: profile.skills,
          bio: profile.bio,
          education: profile.education,
          experience: profile.experience,
          resumeUrl: (profile.resumeStorageKey && orgCandidate)
            ? `/api/v1/org/recruiter/candidates/${orgCandidate.id}/resume/download`
            : null,
          resumeText: profile.resumeText,
        };
      } else {
        // Server-side masked projection: contact & resume omitted, lastName masked
        const lastInitial = profile.user.lastName
          ? `${profile.user.lastName[0]}.`
          : '';
        return {
          userId: profile.userId,
          candidateId: orgCandidate?.id ?? null,
          isInPool,
          isUnlocked: false,
          firstName: profile.user.firstName,
          lastName: lastInitial,
          headline: profile.headline,
          location: profile.location,
          experienceYears: profile.experienceYears,
          currentCompany: profile.currentCompany,
          skills: profile.skills,
          bio: profile.bio,
          education: profile.education,
          experience: profile.experience,
        };
      }
    });

    // Audit-log search: record recruiter, org, filters, result count, timestamp.
    // NEVER log candidate contact data.
    await this.events.audit(ctx, 'GLOBAL_TALENT_SEARCH', 'GLOBAL_TALENT_POOL', ctx.organisationId, {
      recruiterId: ctx.userId,
      organisationId: ctx.organisationId,
      filters: {
        keyword: dto.keyword,
        skills: dto.skills,
        minExperience: dto.minExperience,
        maxExperience: dto.maxExperience,
        location: dto.location,
      },
      resultCount: total,
      timestamp: new Date().toISOString(),
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * Idempotent candidate bridge helper.
   * Gets or creates a local ATS candidate row linked to the candidate userId.
   * Reused by save, tag, note, email on global search results.
   */
  async getOrCreateCandidateBridge(
    organisationId: string,
    userId: string,
    actorUserId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<Candidate> {
    const db = tx ?? this.prisma;

    // 1. Check if candidate already bridged by userId
    const existing = await db.candidate.findFirst({
      where: { organisationId, userId },
    });
    if (existing) return existing;

    // 2. Fetch user & profile to bridge
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { candidateProfile: true },
    });
    if (!user) throw new NotFoundException('Candidate user not found');

    // 3. Check if existing candidate row exists by email (link if found)
    const existingByEmail = await db.candidate.findFirst({
      where: { organisationId, email: user.email },
    });
    if (existingByEmail) {
      return await db.candidate.update({
        where: { id: existingByEmail.id },
        data: { userId },
      });
    }

    // 4. Create new SOURCED candidate row
    const profile = user.candidateProfile;
    try {
      return await db.candidate.create({
        data: {
          organisationId,
          userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: profile?.phone ?? null,
          headline: profile?.headline ?? null,
          location: profile?.location ?? null,
          experienceYears: profile?.experienceYears ?? null,
          currentCompany: profile?.currentCompany ?? null,
          skills: profile?.skills ?? [],
          resumeText: profile?.resumeText ?? null,
          resumeUrl: profile?.resumeStorageKey ?? null,
          source: 'SOURCED',
          createdById: actorUserId ?? userId,
        },
      });
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Concurrency collision: another request created the candidate bridge. Re-read.
        const collisionCandidate = await db.candidate.findFirst({
          where: { organisationId, userId },
        });
        if (collisionCandidate) return collisionCandidate;
      }
      throw err;
    }
  }

  /**
   * Unlocks a global talent candidate:
   * 1. If candidate applied to the caller's org: free (0 tokens).
   * 2. If sourced: charges 2 tokens and creates bridge in ONE transaction.
   * 3. Charges once only; idempotent.
   */
  async unlock(ctx: OrgContext, targetUserId: string) {
    await this.checkDailyUnlockLimit(ctx);

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: targetUserId },
      include: { user: true },
    });

    if (
      !profile ||
      !profile.visibleToRecruiters ||
      profile.blockedOrganisations.includes(ctx.organisationId)
    ) {
      throw new NotFoundException('Candidate not found or unavailable');
    }

    // Check if candidate is already an applicant to caller's org
    const hasApplication = await this.prisma.application.count({
      where: {
        organisationId: ctx.organisationId,
        candidate: { userId: targetUserId },
      },
    });

    if (hasApplication > 0) {
      // Inbound applicants are free to view
      const bridge = await this.getOrCreateCandidateBridge(
        ctx.organisationId,
        targetUserId,
        ctx.userId,
      );
      await this.events.audit(
        ctx,
        'GLOBAL_CANDIDATE_UNLOCKED',
        'CANDIDATE',
        bridge.id,
        {
          recruiterId: ctx.userId,
          organisationId: ctx.organisationId,
          candidateUserId: targetUserId,
          charged: false,
          reason: 'APPLICANT_FREE',
        },
      );
      return {
        unlocked: true,
        charged: false,
        candidate: {
          id: bridge.id,
          userId: targetUserId,
          firstName: profile.user.firstName,
          lastName: profile.user.lastName,
          email: profile.user.email,
          phone: profile.phone,
          resumeUrl: profile.resumeStorageKey
            ? `/api/v1/org/recruiter/candidates/${bridge.id}/resume/download`
            : null,
          resumeText: profile.resumeText,
          headline: profile.headline,
          location: profile.location,
          skills: profile.skills,
        },
      };
    }

    // Sourced candidate: check if already unlocked
    const existingBridge = await this.prisma.candidate.findFirst({
      where: { organisationId: ctx.organisationId, userId: targetUserId },
    });

    if (existingBridge) {
      const isAlreadyUnlocked = await this.candidatesService.isUnlocked(
        ctx,
        existingBridge.id,
      );
      if (isAlreadyUnlocked) {
        return {
          unlocked: true,
          charged: false,
          candidate: {
            id: existingBridge.id,
            userId: targetUserId,
            firstName: profile.user.firstName,
            lastName: profile.user.lastName,
            email: profile.user.email,
            phone: profile.phone,
            resumeUrl: profile.resumeStorageKey
              ? `/api/v1/org/recruiter/candidates/${existingBridge.id}/resume/download`
              : null,
            resumeText: profile.resumeText,
            headline: profile.headline,
            location: profile.location,
            skills: profile.skills,
          },
        };
      }
    }

    // Must bridge AND charge 2 tokens in ONE transaction
    let bridgeResult: Candidate;
    let chargeResult: { charged: boolean };

    try {
      const txResult = await this.prisma.$transaction(async (tx) => {
        // 1. Get or create candidate bridge inside transaction
        const bridge = await this.getOrCreateCandidateBridge(
          ctx.organisationId,
          targetUserId,
          ctx.userId,
          tx,
        );

        // 2. Charge 2 tokens inside the same transaction
        const charge = await this.tokens.consume(
          {
            organisationId: ctx.organisationId,
            userId: ctx.userId,
            role: ctx.role,
          },
          {
            feature: 'RESUME_VIEW',
            amount: TOKEN_COSTS.RESUME_VIEW,
            idempotencyKey: `resume:${bridge.id}`,
            referenceId: bridge.id,
            reason: `Unlocked global candidate ${profile.user.firstName} ${profile.user.lastName}`,
          },
          tx,
        );

        return { bridge, charge };
      });

      bridgeResult = txResult.bridge;
      chargeResult = txResult.charge;
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Concurrency retry: another concurrent request created the bridge
        const resolvedBridge = await this.getOrCreateCandidateBridge(
          ctx.organisationId,
          targetUserId,
          ctx.userId,
        );
        const resolvedUnlocked = await this.candidatesService.isUnlocked(
          ctx,
          resolvedBridge.id,
        );
        if (resolvedUnlocked) {
          return {
            unlocked: true,
            charged: false,
            candidate: {
              id: resolvedBridge.id,
              userId: targetUserId,
              firstName: profile.user.firstName,
              lastName: profile.user.lastName,
              email: profile.user.email,
              phone: profile.phone,
              resumeUrl: profile.resumeStorageKey
                ? `/api/v1/org/recruiter/candidates/${resolvedBridge.id}/resume/download`
                : null,
              resumeText: profile.resumeText,
              headline: profile.headline,
              location: profile.location,
              skills: profile.skills,
            },
          };
        }
      }
      throw err;
    }

    // Audit log unlock
    await this.events.audit(
      ctx,
      'GLOBAL_CANDIDATE_UNLOCKED',
      'CANDIDATE',
      bridgeResult.id,
      {
        recruiterId: ctx.userId,
        organisationId: ctx.organisationId,
        candidateUserId: targetUserId,
        charged: chargeResult.charged,
        tokenAmount: chargeResult.charged ? TOKEN_COSTS.RESUME_VIEW : 0,
      },
    );

    return {
      unlocked: true,
      charged: chargeResult.charged,
      candidate: {
        id: bridgeResult.id,
        userId: targetUserId,
        firstName: profile.user.firstName,
        lastName: profile.user.lastName,
        email: profile.user.email,
        phone: profile.phone,
        resumeUrl: profile.resumeStorageKey
          ? `/api/v1/org/recruiter/candidates/${bridgeResult.id}/resume/download`
          : null,
        resumeText: profile.resumeText,
        headline: profile.headline,
        location: profile.location,
        skills: profile.skills,
      },
    };
  }
}
