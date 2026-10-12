// ============================================================
// Clyptus Job Portal - Candidate Portal
// Service: Candidate Application Management
// Connects portal candidate profiles to ATS organisation pipelines.
// ============================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ApplicationStage, JobStatus, OrganisationStatus, Prisma, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateCandidateApplicationDto } from './candidate-applications.dto';

export interface FormattedCandidateApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  companyName: string;
  companyLogo: string;
  location: string;
  status: ApplicationStage;
  appliedAt: string;
  resume: {
    id: string;
    originalFileName: string;
    status: string;
  } | null;
  history?: Array<{
    id: string;
    fromStage: ApplicationStage | null;
    toStage: ApplicationStage;
    createdAt: string;
  }>;
}

@Injectable()
export class CandidateApplicationsService {
  private readonly logger = new Logger(CandidateApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Submits a candidate application to an eligible published job.
   * Bridges CandidateProfile to ATS Candidate record inside the hiring organisation.
   * All mutations run in an atomic, idempotent prisma.$transaction.
   */
  async create(
    actor: AuthenticatedUser,
    dto: CreateCandidateApplicationDto,
  ): Promise<FormattedCandidateApplication> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate credentials required');
    }

    // 1. Verify job exists and is published
    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
    });

    if (!job || job.status !== JobStatus.PUBLISHED) {
      throw new NotFoundException('The requested job is not available for applications');
    }

    const org = await this.prisma.organisation.findFirst({
      where: { id: job.organisationId, status: OrganisationStatus.ACTIVE },
      select: { id: true },
    });

    if (!org) {
      throw new NotFoundException('The requested job is not available for applications');
    }

    if (job.deadline && job.deadline < new Date()) {
      throw new BadRequestException('The application deadline for this job has passed');
    }

    // 2. Load candidate User and CandidateProfile
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { candidateProfile: true },
    });

    if (!user || user.role !== UserRole.CANDIDATE) {
      throw new NotFoundException('Candidate account record not found');
    }

    const profile = user.candidateProfile;
    const normalizedEmail = user.email.toLowerCase().trim();

    try {
      // 3. Atomically bridge candidate and create application in a single transaction
      const { application } = await this.prisma.$transaction(async (tx: any) => {
        // Find existing ATS candidate within the hiring organisation by email
        let atsCandidate = await tx.candidate.findUnique({
          where: {
            organisationId_email: {
              organisationId: job.organisationId,
              email: normalizedEmail,
            },
          },
        });

        if (!atsCandidate) {
          // Create new ATS candidate with all required recruiter pipeline fields
          atsCandidate = await tx.candidate.create({
            data: {
              organisationId: job.organisationId,
              userId: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: normalizedEmail,
              phone: profile?.phone ?? null,
              headline: profile?.headline ?? null,
              location: profile?.location ?? null,
              experienceYears: profile?.experienceYears != null ? profile.experienceYears : null,
              currentCompany: profile?.currentCompany ?? null,
              skills: profile?.skills ?? [],
              resumeText: profile?.resumeText ?? null,
              resumeUrl: profile?.resumeStorageKey ?? null,
              source: 'CANDIDATE_PORTAL',
              createdById: user.id,
            },
          });
        } else {
          // TODO: In production, linking an unverified portal account to a recruiter-created ATS candidate
          // by email should require verified email ownership to prevent unverified email squatting.
          // Note: When linking to an existing candidate by email, NEVER overwrite recruiter-entered fields.
          // Only fill empty fields to preserve recruiter data integrity.
          const updateData: Prisma.CandidateUpdateInput = {
            user: { connect: { id: user.id } },
          };

          if (!atsCandidate.firstName && user.firstName) updateData.firstName = user.firstName;
          if (!atsCandidate.lastName && user.lastName) updateData.lastName = user.lastName;
          if (!atsCandidate.headline && profile?.headline) updateData.headline = profile.headline;
          if (!atsCandidate.location && profile?.location) updateData.location = profile.location;
          if (atsCandidate.experienceYears == null && profile?.experienceYears != null) {
            updateData.experienceYears = profile.experienceYears;
          }
          if (!atsCandidate.currentCompany && profile?.currentCompany) {
            updateData.currentCompany = profile.currentCompany;
          }
          if ((!atsCandidate.skills || atsCandidate.skills.length === 0) && profile?.skills?.length) {
            updateData.skills = profile.skills;
          }
          if (!atsCandidate.phone && profile?.phone) updateData.phone = profile.phone;
          if (!atsCandidate.resumeText && profile?.resumeText) updateData.resumeText = profile.resumeText;
          if (!atsCandidate.resumeUrl && profile?.resumeStorageKey) updateData.resumeUrl = profile.resumeStorageKey;

          atsCandidate = await tx.candidate.update({
            where: { id: atsCandidate.id },
            data: updateData,
          });
        }

        // Check for existing duplicate application
        const existingApp = await tx.application.findUnique({
          where: {
            jobId_candidateId: {
              jobId: job.id,
              candidateId: atsCandidate.id,
            },
          },
        });

        if (existingApp) {
          throw new ConflictException('You have already submitted an application for this position');
        }

        // Create Application and initial history atomically
        const createdApp = await tx.application.create({
          data: {
            organisationId: job.organisationId,
            jobId: job.id,
            candidateId: atsCandidate.id,
            stage: ApplicationStage.APPLIED,
            source: 'CANDIDATE_PORTAL',
            createdById: user.id,
            history: {
              create: {
                organisationId: job.organisationId,
                fromStage: null,
                toStage: ApplicationStage.APPLIED,
                actorId: user.id,
                reason: 'Submitted via Clyptus Candidate Portal',
              },
            },
          },
        });

        return { application: createdApp, candidateId: atsCandidate.id };
      });

      // 4. Record audit event
      await this.auditService.record({
        actorId: user.id,
        actorRole: user.role,
        action: 'CANDIDATE_APPLICATION_SUBMIT',
        entityType: 'APPLICATION',
        entityId: application.id,
        metadata: {
          jobId: job.id,
          jobTitle: job.title,
          organisationId: job.organisationId,
        },
      });

      const org = await this.prisma.organisation.findUnique({
        where: { id: job.organisationId },
        select: { name: true },
      });

      return {
        id: application.id,
        jobId: job.id,
        jobTitle: job.title,
        companyName: org?.name || 'Hiring Partner',
        companyLogo: '',
        location: job.location || 'Remote',
        status: application.stage,
        appliedAt: application.createdAt.toISOString(),
        resume: profile?.resumeFileName
          ? {
              id: profile.id,
              originalFileName: profile.resumeFileName,
              status: 'PARSED',
            }
          : null,
      };
    } catch (err: any) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.application.findFirst({
          where: {
            jobId: job.id,
            candidate: {
              userId: user.id,
            },
          },
          include: { job: true },
        });

        if (existing) {
          throw new ConflictException(
            'You have already submitted an application for this position',
          );
        }
        if (existing) {
          const org = await this.prisma.organisation.findUnique({
            where: { id: job.organisationId },
            select: { name: true },
          });

          return {
            id: existing.id,
            jobId: existing.jobId,
            jobTitle: job.title,
            companyName: org?.name || 'Hiring Partner',
            companyLogo: '',
            location: job.location || 'Remote',
            status: existing.stage,
            appliedAt: existing.createdAt.toISOString(),
            resume: profile?.resumeFileName
              ? {
                  id: profile.id,
                  originalFileName: profile.resumeFileName,
                  status: 'PARSED',
                }
              : null,
          };
        }

        throw new ConflictException(
          'A conflict occurred while submitting your application. Please check your applications list.',
        );
      }
      throw err;
    }
  }

  /**
   * Retrieves all applications submitted by the authenticated candidate.
   * Scoped strictly by candidate.userId == actor.userId.
   */
  async list(actor: AuthenticatedUser): Promise<FormattedCandidateApplication[]> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate credentials required');
    }

    const applications = await this.prisma.application.findMany({
      where: {
        candidate: {
          userId: actor.userId,
        },
      },
      include: {
        job: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!applications.length) return [];

    const orgIds = [...new Set(applications.map((a) => a.organisationId))];
    const orgs = await this.prisma.organisation.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true },
    });
    const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

    // Fetch candidate resume info
    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true, resumeFileName: true },
    });

    return applications.map((app) => ({
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
      companyName: orgMap.get(app.organisationId) || 'Hiring Partner',
      companyLogo: '',
      location: app.job.location || 'Remote',
      status: app.stage,
      appliedAt: app.createdAt.toISOString(),
      resume: profile?.resumeFileName
        ? {
            id: profile.id,
            originalFileName: profile.resumeFileName,
            status: 'PARSED',
          }
        : null,
    }));
  }

  /**
   * Retrieves a single application detail.
   * Scoped strictly by candidate.userId == actor.userId.
   */
  async get(actor: AuthenticatedUser, id: string): Promise<FormattedCandidateApplication> {
    if (!actor?.userId || actor.role !== UserRole.CANDIDATE) {
      throw new UnauthorizedException('Valid candidate credentials required');
    }

    const app = await this.prisma.application.findFirst({
      where: {
        id,
        candidate: {
          userId: actor.userId,
        },
      },
      include: {
        job: true,
        history: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!app) {
      throw new NotFoundException('Application not found');
    }

    const org = await this.prisma.organisation.findUnique({
      where: { id: app.organisationId },
      select: { name: true },
    });

    const profile = await this.prisma.candidateProfile.findUnique({
      where: { userId: actor.userId },
      select: { id: true, resumeFileName: true },
    });

    return {
      id: app.id,
      jobId: app.jobId,
      jobTitle: app.job.title,
      companyName: org?.name || 'Hiring Partner',
      companyLogo: '',
      location: app.job.location || 'Remote',
      status: app.stage,
      appliedAt: app.createdAt.toISOString(),
      resume: profile?.resumeFileName
        ? {
            id: profile.id,
            originalFileName: profile.resumeFileName,
            status: 'PARSED',
          }
        : null,
      history: app.history.map((h) => ({
        id: h.id,
        fromStage: h.fromStage,
        toStage: h.toStage,
        createdAt: h.createdAt.toISOString(),
      })),
    };
  }
}