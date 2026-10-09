// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service: Platform Organisation Verification & Review
// Handles application queue, detail oversight, document retrieval,
// requesting information, rejections, and approvals.
//
// Milestone 4 Constraint:
// Approval transitions status to APPROVED only.
// Never provisions Organisation, User, token balance, or invitations here.
// ============================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { QueryOrganisationApplicationsDto } from './dto/query-organisation-applications.dto';
import { RequestApplicationInfoDto } from './dto/request-application-info.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import {
  OrgApplicationStatus,
  ApplicationReviewAction,
} from '@prisma/client';
import { PlatformOrganisationService } from './platform-organisation.service';
import { ProvisionApplicationDto } from './dto/provision-application.dto';


@Injectable()
export class PlatformOrganisationVerificationService {
  private readonly logger = new Logger(PlatformOrganisationVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly storageService: CloudStorageService,
    private readonly platformOrgService: PlatformOrganisationService,
  ) {}

  /**
   * 1. GET /api/v1/platform/organisation-applications
   * Returns a paginated list of applications for the review queue.
   * Newest first by default. Does not return document content or storage keys.
   */
  async findAll(query: QueryOrganisationApplicationsDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { ownerEmail: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
        { ownerFirstName: { contains: query.search, mode: 'insensitive' } },
        { ownerLastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : 'desc';
    const orderBy: any = {};
    orderBy[sortField] = sortOrder;

    const [total, items] = await Promise.all([
      this.prisma.organisationApplication.count({ where }),
      this.prisma.organisationApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          selectedPlan: {
            select: {
              id: true,
              name: true,
              code: true,
              tokenAmount: true,
              priceCents: true,
              currency: true,
              billingCycle: true,
            },
          },
          reviewedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          _count: {
            select: { documents: true, reviewHistory: true },
          },
        },
      }),
    ]);

    const formattedItems = items.map((app) => ({
      applicationId: app.id,
      applicationNumber: app.applicationNumber,
      name: app.name,
      slug: app.slug,
      domain: app.domain,
      contactEmail: app.contactEmail,
      contactPhone: app.contactPhone,
      industry: app.industry,
      companySize: app.companySize,
      ownerName: `${app.ownerFirstName} ${app.ownerLastName}`.trim(),
      ownerEmail: app.ownerEmail,
      ownerPhone: app.ownerPhone,
      ownerDesignation: app.ownerDesignation,
      selectedPlan: app.selectedPlan
        ? {
            id: app.selectedPlan.id,
            name: app.selectedPlan.name,
            code: app.selectedPlan.code,
            tokenAmount: app.selectedPlan.tokenAmount,
            priceCents: app.selectedPlan.priceCents,
            currency: app.selectedPlan.currency,
            billingCycle: app.selectedPlan.billingCycle,
          }
        : null,
      paymentMethod: app.paymentMethod,
      paymentReference: app.paymentReference,
      paymentStatus: app.paymentStatus,
      status: app.status,
      documentsCount: app._count.documents,
      reviewHistoryCount: app._count.reviewHistory,
      reviewedAt: app.reviewedAt,
      reviewedBy: app.reviewedByUser
        ? {
            id: app.reviewedByUser.id,
            name: `${app.reviewedByUser.firstName} ${app.reviewedByUser.lastName}`.trim(),
            email: app.reviewedByUser.email,
          }
        : null,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    }));

    return {
      data: formattedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 2. GET /api/v1/platform/organisation-applications/:id
   * Returns comprehensive application detail for inspection.
   * Excludes storage keys and internal paths.
   */
  async findOne(id: string) {
    const app = await this.prisma.organisationApplication.findUnique({
      where: { id },
      include: {
        selectedPlan: true,
        reviewedByUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        documents: {
          select: {
            id: true,
            type: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            metadata: true,
            createdAt: true,
            updatedAt: true,
            // storageKey is strictly EXCLUDED
          },
          orderBy: { createdAt: 'asc' },
        },
        reviewHistory: {
          select: {
            id: true,
            action: true,
            actorRole: true,
            notes: true,
            metadata: true,
            createdAt: true,
            actor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!app) {
      throw new NotFoundException(`Organisation application with ID '${id}' not found`);
    }

    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      organisation: {
        name: app.name,
        slug: app.slug,
        domain: app.domain,
        contactEmail: app.contactEmail,
        contactPhone: app.contactPhone,
        industry: app.industry,
        companySize: app.companySize,
        website: app.website,
        address: app.address,
      },
      owner: {
        firstName: app.ownerFirstName,
        lastName: app.ownerLastName,
        email: app.ownerEmail,
        phone: app.ownerPhone,
        designation: app.ownerDesignation,
      },
      plan: app.selectedPlan
        ? {
            id: app.selectedPlan.id,
            name: app.selectedPlan.name,
            code: app.selectedPlan.code,
            description: app.selectedPlan.description,
            tokenAmount: app.selectedPlan.tokenAmount,
            priceCents: app.selectedPlan.priceCents,
            currency: app.selectedPlan.currency,
            billingCycle: app.selectedPlan.billingCycle,
            features: app.selectedPlan.features,
            isActive: app.selectedPlan.isActive,
          }
        : null,
      payment: {
        method: app.paymentMethod,
        reference: app.paymentReference,
        status: app.paymentStatus,
      },
      application: {
        status: app.status,
        rejectionReason: app.rejectionReason,
        requestedInfoNotes: app.requestedInfoNotes,
        applicantResponseNotes: app.applicantResponseNotes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        reviewedAt: app.reviewedAt,
        reviewedBy: app.reviewedByUser
          ? {
              id: app.reviewedByUser.id,
              name: `${app.reviewedByUser.firstName} ${app.reviewedByUser.lastName}`.trim(),
              email: app.reviewedByUser.email,
              role: app.reviewedByUser.role,
            }
          : null,
        createdOrganisationId: app.createdOrganisationId,
      },
      documents: (app.documents || []).map((d) => ({
        id: d.id,
        type: d.type,
        fileName: d.fileName,
        fileSize: d.fileSize,
        mimeType: d.mimeType,
        metadata: d.metadata,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
      reviewHistory: app.reviewHistory.map((h) => ({
        id: h.id,
        action: h.action,
        actorRole: h.actorRole,
        notes: h.notes,
        metadata: h.metadata,
        createdAt: h.createdAt,
        actor: h.actor
          ? {
              id: h.actor.id,
              name: `${h.actor.firstName} ${h.actor.lastName}`.trim(),
              email: h.actor.email,
            }
          : null,
      })),
    };
  }

  /**
   * 3. GET /api/v1/platform/organisation-applications/:applicationId/documents/:documentId
   * Retrieves and returns private document binary safely with authorization checks.
   */
  async retrieveDocument(applicationId: string, documentId: string) {
    const document = await this.prisma.applicationDocument.findFirst({
      where: {
        id: documentId,
        applicationId,
      },
    });

    if (!document) {
      throw new NotFoundException(
        `Document '${documentId}' not found for application '${applicationId}'`,
      );
    }

    // Retrieve private object buffer from storage
    const storageResult = await this.storageService.retrievePrivateObject(document.storageKey);

    return {
      buffer: storageResult.buffer,
      contentType: document.mimeType || storageResult.contentType,
      fileName: document.fileName,
      contentLength: storageResult.contentLength,
    };
  }

  /**
   * 4. POST /api/v1/platform/organisation-applications/:id/request-information
   * Transitions status from PENDING_REVIEW to MORE_INFO_REQUESTED.
   * Concurrency-safe: conditional atomic update where status = PENDING_REVIEW.
   */
  async requestInformation(
    id: string,
    dto: RequestApplicationInfoDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const application = await this.prisma.organisationApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Organisation application with ID '${id}' not found`);
    }

    if (application.status !== OrgApplicationStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Cannot request information on application in status '${application.status}'. Only applications in PENDING_REVIEW can transition to MORE_INFO_REQUESTED.`,
      );
    }

    const now = new Date();

    // Atomic conditional transaction to guarantee concurrency safety
    const updated = await this.prisma.$transaction(async (tx) => {
      // Conditional update ensures only one concurrent request succeeds
      const updateResult = await tx.organisationApplication.updateMany({
        where: {
          id,
          status: OrgApplicationStatus.PENDING_REVIEW,
        },
        data: {
          status: OrgApplicationStatus.MORE_INFO_REQUESTED,
          requestedInfoNotes: dto.notes.trim(),
          reviewedByUserId: actor.userId,
          reviewedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Application status was changed concurrently by another administrator. Please refresh.',
        );
      }

      await tx.applicationReviewHistory.create({
        data: {
          applicationId: id,
          actorId: actor.userId,
          actorRole: actor.role,
          action: ApplicationReviewAction.INFO_REQUESTED,
          notes: dto.notes.trim(),
          metadata: {
            adminEmail: actor.email,
            previousStatus: OrgApplicationStatus.PENDING_REVIEW,
          },
        },
      });

      return tx.organisationApplication.findUnique({ where: { id } });
    });

    // Record central platform audit log
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_APPLICATION_INFO_REQUESTED',
      entityType: 'ORGANISATION_APPLICATION',
      entityId: id,
      metadata: {
        applicationNumber: application.applicationNumber,
        organisationName: application.name,
        notes: dto.notes.trim(),
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Info requested on App ${id} by Admin ${actor.userId}`);

    return {
      id: updated!.id,
      applicationNumber: updated!.applicationNumber,
      status: updated!.status,
      requestedInfoNotes: updated!.requestedInfoNotes,
      reviewedAt: updated!.reviewedAt,
      message: 'More information successfully requested from applicant.',
    };
  }

  /**
   * 5. POST /api/v1/platform/organisation-applications/:id/reject
   * Transitions status to REJECTED.
   * Concurrency-safe: conditional atomic update where status IN (PENDING_REVIEW, MORE_INFO_REQUESTED).
   */
  async reject(
    id: string,
    dto: RejectApplicationDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const application = await this.prisma.organisationApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Organisation application with ID '${id}' not found`);
    }

    if (
      application.status !== OrgApplicationStatus.PENDING_REVIEW &&
      application.status !== OrgApplicationStatus.MORE_INFO_REQUESTED
    ) {
      throw new BadRequestException(
        `Cannot reject application in status '${application.status}'. Only reviewable applications can be rejected.`,
      );
    }

    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const updateResult = await tx.organisationApplication.updateMany({
        where: {
          id,
          status: { in: [OrgApplicationStatus.PENDING_REVIEW, OrgApplicationStatus.MORE_INFO_REQUESTED] },
        },
        data: {
          status: OrgApplicationStatus.REJECTED,
          rejectionReason: dto.reason.trim(),
          reviewedByUserId: actor.userId,
          reviewedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Application status was changed concurrently by another administrator. Please refresh.',
        );
      }

      await tx.applicationReviewHistory.create({
        data: {
          applicationId: id,
          actorId: actor.userId,
          actorRole: actor.role,
          action: ApplicationReviewAction.REJECTED,
          notes: dto.reason.trim(),
          metadata: {
            adminEmail: actor.email,
            previousStatus: application.status,
          },
        },
      });

      return tx.organisationApplication.findUnique({ where: { id } });
    });

    // Record central platform audit log
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_APPLICATION_REJECTED',
      entityType: 'ORGANISATION_APPLICATION',
      entityId: id,
      metadata: {
        applicationNumber: application.applicationNumber,
        organisationName: application.name,
        rejectionReason: dto.reason.trim(),
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(`App ${id} rejected by Admin ${actor.userId}: ${dto.reason.trim()}`);

    return {
      id: updated!.id,
      applicationNumber: updated!.applicationNumber,
      status: updated!.status,
      rejectionReason: updated!.rejectionReason,
      reviewedAt: updated!.reviewedAt,
      message: 'Organisation application rejected.',
    };
  }

  /**
   * 6. POST /api/v1/platform/organisation-applications/:id/approve
   * Milestone 5: Atomically approves the application AND provisions the Organisation,
   * Metadata, Token Balance, Allocation Limits, Token Transaction (if tokens > 0),
   * Super Admin User, OrgMemberProfile, links createdOrganisationId, records review history,
   * and records central platform audit logs.
   *
   * Entire operation is owned by ONE database transaction inside PlatformOrganisationService.
   * Safe against retries (Idempotent).
   */
  async approve(
    id: string,
    dtoOrActor?: ProvisionApplicationDto | AuthenticatedUser,
    actorOrIp?: AuthenticatedUser | string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    let dto: ProvisionApplicationDto | undefined;
    let actor: AuthenticatedUser;
    let ip: string | undefined = ipAddress;
    let ua: string | undefined = userAgent;

    if (dtoOrActor && 'userId' in dtoOrActor) {
      actor = dtoOrActor as AuthenticatedUser;
      ip = actorOrIp as string | undefined;
      ua = ipAddress;
      dto = undefined;
    } else {
      dto = dtoOrActor as ProvisionApplicationDto | undefined;
      actor = actorOrIp as AuthenticatedUser;
    }

    return this.platformOrgService.provisionApprovedApplication(id, dto, actor, ip, ua);
  }
}


