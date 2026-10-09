// ============================================================
// Clyptus Job Portal - Public Module
// Public Organisation Applications & Plans Service
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { CloudStorageService } from '../../integrations/storage/storage.service';
import { CreateOrganisationApplicationDto } from './dto/create-organisation-application.dto';
import { UploadApplicationDocumentDto } from './dto/upload-application-document.dto';
import {
  OrgApplicationStatus,
  ApplicationPaymentStatus,
  ApplicationReviewAction,
} from '@prisma/client';

export interface UploadedFileObject {
  fieldname?: string;
  originalname: string;
  encoding?: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

export interface PublicPlanView {
  id: string;
  name: string;
  code: string;
  description: string | null;
  tokenAmount: number;
  priceCents: number;
  currency: string;
  billingCycle: string;
  features: any;
}

export interface ApplicationSubmissionResult {
  applicationNumber: number;
  applicationId: string;
  status: OrgApplicationStatus;
  paymentStatus: ApplicationPaymentStatus;
  continuationToken: string;
  expiresIn: string;
  message: string;
}

export interface DocumentUploadResult {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: Date;
}

export interface ContinuationTokenPayload {
  purpose: 'org_application_continuation';
  applicationId: string;
  ownerEmail: string;
}

@Injectable()
export class PublicOrganisationApplicationService {
  private readonly logger = new Logger(PublicOrganisationApplicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: CloudStorageService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Retrieves active organisation plans formatted for safe unauthenticated exposure.
   */
  async getActivePlans(): Promise<PublicPlanView[]> {
    const plans = await this.prisma.tokenPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });

    return plans.map((plan) => ({
      id: plan.id,
      name: plan.name,
      code: plan.code,
      description: plan.description,
      tokenAmount: plan.tokenAmount,
      priceCents: plan.priceCents,
      currency: plan.currency,
      billingCycle: plan.billingCycle,
      features: plan.features ?? [],
    }));
  }

  /**
   * Submits a new OrganisationApplication.
   * Performs uniqueness checks against existing organisations and pending applications.
   * Generates a signed continuation token for document uploads.
   */
  async submitApplication(dto: CreateOrganisationApplicationDto): Promise<ApplicationSubmissionResult> {
    const normalizedSlug = dto.slug.toLowerCase().trim();
    const normalizedOwnerEmail = dto.ownerEmail.toLowerCase().trim();
    const normalizedContactEmail = dto.contactEmail.toLowerCase().trim();
    const normalizedDomain = dto.domain ? dto.domain.toLowerCase().trim() : null;

    // 1. Verify selected plan exists and is active
    const selectedPlan = await this.prisma.tokenPlan.findUnique({
      where: { id: dto.selectedPlanId },
    });
    if (!selectedPlan) {
      throw new BadRequestException(`Selected plan with ID '${dto.selectedPlanId}' does not exist`);
    }
    if (!selectedPlan.isActive) {
      throw new BadRequestException('Selected plan is currently inactive and cannot be selected');
    }

    // 2. Duplicate Check: Check against existing active/verified Organisations
    const existingOrgSlug = await this.prisma.organisation.findUnique({
      where: { slug: normalizedSlug },
    });
    if (existingOrgSlug) {
      throw new ConflictException(`Organisation slug '${dto.slug}' is already taken`);
    }

    if (normalizedDomain) {
      const existingOrgDomain = await this.prisma.organisation.findUnique({
        where: { domain: normalizedDomain },
      });
      if (existingOrgDomain) {
        throw new ConflictException(`Domain '${dto.domain}' is already registered to an existing organisation`);
      }
    }

    // 3. Duplicate Check: Check against existing pending/in-review Applications
    const pendingStatuses: OrgApplicationStatus[] = [
      OrgApplicationStatus.PENDING_REVIEW,
      OrgApplicationStatus.MORE_INFO_REQUESTED,
    ];

    const duplicatePendingSlug = await this.prisma.organisationApplication.findFirst({
      where: {
        slug: normalizedSlug,
        status: { in: pendingStatuses },
      },
    });
    if (duplicatePendingSlug) {
      throw new ConflictException(
        `An application for organisation slug '${dto.slug}' is already pending review`,
      );
    }

    if (normalizedDomain) {
      const duplicatePendingDomain = await this.prisma.organisationApplication.findFirst({
        where: {
          domain: normalizedDomain,
          status: { in: pendingStatuses },
        },
      });
      if (duplicatePendingDomain) {
        throw new ConflictException(
          `An application for domain '${dto.domain}' is already pending review`,
        );
      }
    }

    const duplicatePendingEmail = await this.prisma.organisationApplication.findFirst({
      where: {
        ownerEmail: normalizedOwnerEmail,
        status: { in: pendingStatuses },
      },
    });
    if (duplicatePendingEmail) {
      throw new ConflictException(
        `An application associated with owner email '${dto.ownerEmail}' is already currently pending review`,
      );
    }

    // 4. Create OrganisationApplication in transactional block
    const application = await this.prisma.$transaction(async (tx) => {
      const createdApp = await tx.organisationApplication.create({
        data: {
          name: dto.name.trim(),
          slug: normalizedSlug,
          domain: normalizedDomain,
          contactEmail: normalizedContactEmail,
          contactPhone: dto.contactPhone?.trim() || null,
          industry: dto.industry?.trim() || null,
          companySize: dto.companySize?.trim() || null,
          website: dto.website?.trim() || null,
          address: dto.address?.trim() || null,

          ownerFirstName: dto.ownerFirstName.trim(),
          ownerLastName: dto.ownerLastName.trim(),
          ownerEmail: normalizedOwnerEmail,
          ownerPhone: dto.ownerPhone?.trim() || null,
          ownerDesignation: dto.ownerDesignation?.trim() || null,

          selectedPlanId: selectedPlan.id,
          paymentMethod: dto.paymentMethod || null,
          paymentReference: dto.paymentReference?.trim() || null,
          paymentStatus: ApplicationPaymentStatus.PENDING,
          status: OrgApplicationStatus.PENDING_REVIEW,
        },
      });

      // Record initial review history record
      await tx.applicationReviewHistory.create({
        data: {
          applicationId: createdApp.id,
          actorRole: 'APPLICANT',
          action: ApplicationReviewAction.SUBMITTED,
          notes: 'Application submitted by external applicant',
          metadata: {
            applicantName: `${dto.ownerFirstName} ${dto.ownerLastName}`.trim(),
            applicantEmail: normalizedOwnerEmail,
            selectedPlanCode: selectedPlan.code,
          },
        },
      });

      return createdApp;
    });

    this.logger.log(
      `New OrganisationApplication created: ID=${application.id}, AppNumber=${application.applicationNumber}`,
    );

    // 5. Generate secure continuation token (HMAC-signed JWT with 48-hour expiration)
    const secret =
      this.configService.get<string>('jwt.secret') ||
      this.configService.get<string>('JWT_SECRET');

    const continuationToken = this.jwtService.sign(
      {
        purpose: 'org_application_continuation',
        applicationId: application.id,
        ownerEmail: application.ownerEmail,
      },
      {
        secret,
        expiresIn: '48h',
      },
    );

    return {
      applicationNumber: application.applicationNumber,
      applicationId: application.id,
      status: application.status,
      paymentStatus: application.paymentStatus,
      continuationToken,
      expiresIn: '48h',
      message:
        'Organisation application received successfully. Please upload supporting verification documents.',
    };
  }

  /**
   * Verifies the applicant's continuation authorization token for an application ID.
   */
  verifyContinuationToken(applicationId: string, tokenHeader?: string): ContinuationTokenPayload {
    if (!tokenHeader || typeof tokenHeader !== 'string') {
      throw new UnauthorizedException('Continuation token is required to upload application documents');
    }

    let token = tokenHeader.trim();
    if (token.toLowerCase().startsWith('bearer ')) {
      token = token.slice(7).trim();
    }

    try {
      const secret =
        this.configService.get<string>('jwt.secret') ||
        this.configService.get<string>('JWT_SECRET');

      const payload = this.jwtService.verify<ContinuationTokenPayload>(token, { secret });

      if (payload.purpose !== 'org_application_continuation') {
        throw new UnauthorizedException('Invalid token purpose');
      }

      if (payload.applicationId !== applicationId) {
        throw new UnauthorizedException('Token does not match the requested application');
      }

      return payload;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired application continuation token');
    }
  }

  /**
   * Uploads and attaches a verification document to an OrganisationApplication.
   * Ensures atomic storage cleanup if database persistence fails.
   */
  async uploadDocument(
    applicationId: string,
    dto: UploadApplicationDocumentDto,
    file: UploadedFileObject,
    authHeader?: string,
  ): Promise<DocumentUploadResult> {
    // 1. Authorize continuation token
    this.verifyContinuationToken(applicationId, authHeader);

    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('A document file is required');
    }

    // 2. Verify application exists and is in editable state
    const application = await this.prisma.organisationApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException(`Organisation application '${applicationId}' not found`);
    }

    if (
      application.status !== OrgApplicationStatus.PENDING_REVIEW &&
      application.status !== OrgApplicationStatus.MORE_INFO_REQUESTED
    ) {
      throw new BadRequestException(
        `Documents cannot be added to an application in status '${application.status}'`,
      );
    }

    // 3. Generate document UUID beforehand for storage key
    const documentId = crypto.randomUUID();

    // 4. Store file through CloudStorageService (which validates magic bytes, size, extension, sanitizes filename)
    let storedResult: { storageKey: string; fileName: string; fileSize: number; mimeType: string };
    try {
      storedResult = await this.storageService.storeApplicationDocument({
        applicationId,
        documentId,
        originalFileName: file.originalname,
        buffer: file.buffer,
        clientMimeType: file.mimetype,
      });
    } catch (err: any) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.error(`Storage error during document upload for App ${applicationId}: ${err.message}`, err.stack);
      throw new BadRequestException(err.message || 'File validation or storage failed');
    }

    // 5. Create ApplicationDocument record in PostgreSQL with atomic compensation on failure
    try {
      const docRecord = await this.prisma.applicationDocument.create({
        data: {
          id: documentId,
          applicationId,
          type: dto.type,
          fileName: storedResult.fileName,
          fileSize: storedResult.fileSize,
          mimeType: storedResult.mimeType,
          storageKey: storedResult.storageKey,
          metadata: {
            originalUploadedName: file.originalname,
          },
        },
      });

      return {
        id: docRecord.id,
        type: docRecord.type,
        fileName: docRecord.fileName,
        fileSize: docRecord.fileSize,
        mimeType: docRecord.mimeType,
        createdAt: docRecord.createdAt,
      };
    } catch (dbError: any) {
      // Cleanup stored object if database creation fails to avoid orphaned files
      this.logger.error(`Database record creation failed for document ${documentId}. Cleaning up stored file.`, dbError.stack);
      await this.storageService.deletePrivateObject(storedResult.storageKey);
      throw new BadRequestException('Failed to record document in application database');
    }
  }
}
