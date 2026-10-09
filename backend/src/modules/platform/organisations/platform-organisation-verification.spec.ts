import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../../integrations/email/email.service';
import { CloudStorageService } from '../../../integrations/storage/storage.service';
import { PlatformOrganisationVerificationService } from './platform-organisation-verification.service';
import { PlatformOrganisationVerificationController } from './platform-organisation-verification.controller';
import { PlatformOrganisationService } from './platform-organisation.service';
import { QueryOrganisationApplicationsDto } from './dto/query-organisation-applications.dto';
import { RequestApplicationInfoDto } from './dto/request-application-info.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import {
  OrgApplicationStatus,
  ApplicationPaymentStatus,
  ApplicationReviewAction,
  UserRole,
} from '@prisma/client';

describe('Platform Organisation Verification, Review & Provisioning (Milestones 4 & 5)', () => {
  let service: PlatformOrganisationVerificationService;
  let controller: PlatformOrganisationVerificationController;
  let prisma: any;
  let auditService: any;
  let storageService: any;

  const mockAdminActor: AuthenticatedUser = {
    userId: 'admin-usr-101',
    sessionId: 'sess-101',
    email: 'admin@clyptus.platform',
    firstName: 'Alex',
    lastName: 'Vance',
    role: UserRole.PLATFORM_ADMIN,
    permissions: ['platform.organisations.read', 'platform.organisations.update'],
  };

  const mockSuperAdminActor: AuthenticatedUser = {
    userId: 'super-admin-usr-001',
    sessionId: 'sess-001',
    email: 'superadmin@clyptus.platform',
    firstName: 'Gordon',
    lastName: 'Freeman',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    permissions: ['*'],
  };

  const sampleApplicationId = 'a5682c3f-7e89-42b1-9bb4-b7c123456789';

  const mockApplication = {
    id: sampleApplicationId,
    applicationNumber: 1042,
    name: 'Nexus Corp',
    slug: 'nexus-corp',
    domain: 'nexuscorp.com',
    contactEmail: 'contact@nexuscorp.com',
    contactPhone: '+1-555-0199',
    industry: 'Engineering',
    companySize: '200-500',
    website: 'https://nexuscorp.com',
    address: '450 Innovation Ave',
    ownerFirstName: 'John',
    ownerLastName: 'Smith',
    ownerEmail: 'john@nexuscorp.com',
    ownerPhone: '+1-555-0188',
    ownerDesignation: 'CTO',
    selectedPlanId: 'plan-uuid-1',
    selectedPlan: {
      id: 'plan-uuid-1',
      name: 'Enterprise Plan',
      code: 'ENTERPRISE',
      description: 'Full features',
      tokenAmount: 20000,
      priceCents: 199900,
      currency: 'USD',
      billingCycle: 'MONTHLY',
      features: ['Unlimited jobs'],
      isActive: true,
    },
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'WIRE-99238',
    paymentStatus: ApplicationPaymentStatus.PENDING,
    status: OrgApplicationStatus.PENDING_REVIEW,
    rejectionReason: null,
    requestedInfoNotes: null,
    applicantResponseNotes: null,
    reviewedByUserId: null,
    reviewedByUser: null,
    reviewedAt: null,
    createdOrganisationId: null,
    createdAt: new Date('2026-10-06T10:00:00Z'),
    updatedAt: new Date('2026-10-06T10:00:00Z'),
    documents: [
      {
        id: 'doc-1',
        type: 'REGISTRATION_CERTIFICATE',
        fileName: 'nexus_inc_cert.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
        storageKey: 'applications/a5682c3f-7e89-42b1-9bb4-b7c123456789/doc-1',
        metadata: {},
        createdAt: new Date('2026-10-06T10:05:00Z'),
        updatedAt: new Date('2026-10-06T10:05:00Z'),
      },
    ],
    reviewHistory: [
      {
        id: 'rev-1',
        action: ApplicationReviewAction.SUBMITTED,
        actorRole: 'APPLICANT',
        notes: 'Submitted',
        metadata: {},
        createdAt: new Date('2026-10-06T10:00:00Z'),
        actor: null,
      },
    ],
    _count: {
      documents: 1,
      reviewHistory: 1,
    },
  };

  beforeEach(async () => {
    prisma = {
      organisationApplication: {
        count: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      applicationDocument: {
        findFirst: jest.fn(),
      },
      applicationReviewHistory: {
        create: jest.fn(),
      },
      organisation: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      tokenPlan: {
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      tokenBalance: {
        create: jest.fn(),
      },
      tokenAllocationLimit: {
        create: jest.fn(),
      },
      tokenTransaction: {
        create: jest.fn(),
      },
      orgInvitation: {
        upsert: jest.fn().mockResolvedValue({ id: 'inv_1' }),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      platformSession: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue({}),
    };

    storageService = {
      retrievePrivateObject: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformOrganisationVerificationController],
      providers: [
        PlatformOrganisationVerificationService,
        PlatformOrganisationService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
        { provide: CloudStorageService, useValue: storageService },
        { provide: EmailService, useValue: { sendMail: jest.fn().mockResolvedValue(true) } },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    service = module.get<PlatformOrganisationVerificationService>(
      PlatformOrganisationVerificationService,
    );
    controller = module.get<PlatformOrganisationVerificationController>(
      PlatformOrganisationVerificationController,
    );
  });

  describe('1. Queue Listing (GET /api/v1/platform/organisation-applications)', () => {
    it('should list applications with pagination and exclude storage keys or raw file contents', async () => {
      prisma.organisationApplication.count.mockResolvedValue(1);
      prisma.organisationApplication.findMany.mockResolvedValue([mockApplication]);

      const query: QueryOrganisationApplicationsDto = {
        page: 1,
        limit: 10,
        status: OrgApplicationStatus.PENDING_REVIEW,
      };

      const result = await controller.findAll(query);

      expect(prisma.organisationApplication.findMany).toHaveBeenCalledWith({
        where: { status: OrgApplicationStatus.PENDING_REVIEW },
        skip: 0,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });

      expect(result.data).toHaveLength(1);
      const item = result.data[0];
      expect(item.applicationId).toBe(mockApplication.id);
      expect(item.applicationNumber).toBe(1042);
      expect(item.name).toBe('Nexus Corp');
      expect(item.status).toBe(OrgApplicationStatus.PENDING_REVIEW);
      expect(item.documentsCount).toBe(1);

      // Verify no storageKey or raw file leak in queue response
      expect(item).not.toHaveProperty('storageKey');
      expect(item).not.toHaveProperty('documents');
    });

    it('should correctly support status filtering', async () => {
      prisma.organisationApplication.count.mockResolvedValue(0);
      prisma.organisationApplication.findMany.mockResolvedValue([]);

      await service.findAll({ status: OrgApplicationStatus.APPROVED });

      expect(prisma.organisationApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: OrgApplicationStatus.APPROVED },
        }),
      );
    });
  });

  describe('2. Application Detail (GET /api/v1/platform/organisation-applications/:id)', () => {
    it('should return full application detail with document metadata but strictly exclude storageKey', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue(mockApplication);

      const detail = await controller.findOne(sampleApplicationId);

      expect(detail.id).toBe(sampleApplicationId);
      expect(detail.organisation.name).toBe('Nexus Corp');
      expect(detail.owner.email).toBe('john@nexuscorp.com');
      expect(detail.plan?.code).toBe('ENTERPRISE');
      expect(detail.payment.reference).toBe('WIRE-99238');
      expect(detail.application.status).toBe(OrgApplicationStatus.PENDING_REVIEW);

      // Verify documents array
      expect(detail.documents).toHaveLength(1);
      const doc = detail.documents[0];
      expect(doc.id).toBe('doc-1');
      expect(doc.fileName).toBe('nexus_inc_cert.pdf');
      expect(doc.fileSize).toBe(204800);
      expect(doc.mimeType).toBe('application/pdf');

      // CRITICAL: Verify storageKey is strictly NOT returned
      expect(doc).not.toHaveProperty('storageKey');
    });

    it('should throw NotFoundException for non-existent application', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue(null);

      await expect(controller.findOne('00000000-0000-0000-0000-000000000000')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('3. Secure Document Retrieval', () => {
    it('should retrieve document using StorageService with proper headers and content verification', async () => {
      prisma.applicationDocument.findFirst.mockResolvedValue({
        id: 'doc-1',
        applicationId: sampleApplicationId,
        fileName: 'nexus_inc_cert.pdf',
        mimeType: 'application/pdf',
        storageKey: 'applications/a5682c3f-7e89-42b1-9bb4-b7c123456789/doc-1',
      });

      const fileBuffer = Buffer.from('%PDF-1.4 test document content');
      storageService.retrievePrivateObject.mockResolvedValue({
        buffer: fileBuffer,
        contentType: 'application/pdf',
        contentLength: fileBuffer.length,
      });

      const mockRes: any = {
        setHeader: jest.fn(),
        send: jest.fn(),
      };

      await controller.retrieveDocument(sampleApplicationId, 'doc-1', mockRes);

      expect(prisma.applicationDocument.findFirst).toHaveBeenCalledWith({
        where: { id: 'doc-1', applicationId: sampleApplicationId },
      });
      expect(storageService.retrievePrivateObject).toHaveBeenCalledWith(
        'applications/a5682c3f-7e89-42b1-9bb4-b7c123456789/doc-1',
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'inline; filename="nexus_inc_cert.pdf"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(fileBuffer);
    });

    it('should reject retrieval if document does not belong to the given application', async () => {
      prisma.applicationDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.retrieveDocument(sampleApplicationId, 'foreign-doc-999'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4. Request More Information (POST .../request-information)', () => {
    const infoDto: RequestApplicationInfoDto = {
      notes: 'Please provide an updated tax ID certificate with clear seal.',
    };

    it('should transition status from PENDING_REVIEW to MORE_INFO_REQUESTED and record review history & audit log', async () => {
      prisma.organisationApplication.findUnique
        .mockResolvedValueOnce(mockApplication) // check
        .mockResolvedValueOnce({
          ...mockApplication,
          status: OrgApplicationStatus.MORE_INFO_REQUESTED,
          requestedInfoNotes: infoDto.notes,
          reviewedAt: new Date(),
        }); // find after update

      prisma.organisationApplication.updateMany.mockResolvedValue({ count: 1 });

      const mockReq: any = { ip: '127.0.0.1', headers: {} };
      const res = await controller.requestInformation(
        sampleApplicationId,
        infoDto,
        mockAdminActor,
        mockReq,
      );

      expect(res.status).toBe(OrgApplicationStatus.MORE_INFO_REQUESTED);
      expect(res.requestedInfoNotes).toBe(infoDto.notes);

      // Verify ApplicationReviewHistory was inserted
      expect(prisma.applicationReviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: sampleApplicationId,
          actorId: mockAdminActor.userId,
          actorRole: mockAdminActor.role,
          action: ApplicationReviewAction.INFO_REQUESTED,
          notes: infoDto.notes,
        }),
      });

      // Verify central AuditLog was recorded
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: mockAdminActor.userId,
          action: 'ORGANISATION_APPLICATION_INFO_REQUESTED',
          entityType: 'ORGANISATION_APPLICATION',
          entityId: sampleApplicationId,
        }),
      );
    });

    it('should reject request-info if application is not in PENDING_REVIEW', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: OrgApplicationStatus.APPROVED,
      });

      await expect(
        service.requestInformation(sampleApplicationId, infoDto, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('5. Reject Application (POST .../reject)', () => {
    const rejectDto: RejectApplicationDto = {
      reason: 'The authorization letter could not be authenticated with the issuing registry.',
    };

    it('should transition reviewable application to REJECTED and record review history', async () => {
      prisma.organisationApplication.findUnique
        .mockResolvedValueOnce(mockApplication)
        .mockResolvedValueOnce({
          ...mockApplication,
          status: OrgApplicationStatus.REJECTED,
          rejectionReason: rejectDto.reason,
          reviewedAt: new Date(),
        });

      prisma.organisationApplication.updateMany.mockResolvedValue({ count: 1 });

      const mockReq: any = { ip: '127.0.0.1', headers: {} };
      const res = await controller.reject(
        sampleApplicationId,
        rejectDto,
        mockAdminActor,
        mockReq,
      );

      expect(res.status).toBe(OrgApplicationStatus.REJECTED);
      expect(res.rejectionReason).toBe(rejectDto.reason);

      expect(prisma.applicationReviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: sampleApplicationId,
          actorId: mockAdminActor.userId,
          action: ApplicationReviewAction.REJECTED,
          notes: rejectDto.reason,
        }),
      });

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANISATION_APPLICATION_REJECTED',
          entityId: sampleApplicationId,
        }),
      );
    });

    it('should reject rejection if application is already approved or rejected', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: OrgApplicationStatus.REJECTED,
      });

      await expect(
        service.reject(sampleApplicationId, rejectDto, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('6. Approve Application & Atomic Provisioning (Milestone 5)', () => {
    const verifiedApp = {
      ...mockApplication,
      paymentStatus: ApplicationPaymentStatus.VERIFIED,
      selectedPlanId: 'plan-uuid-1',
    };

    const mockCreatedOrg = {
      id: 'org-created-1',
      name: 'Nexus Corp',
      slug: 'nexus-corp',
      domain: 'nexuscorp.com',
      contactEmail: 'contact@nexuscorp.com',
      contactPhone: '+1-555-0199',
      status: 'ACTIVE',
      tier: 'STANDARD',
      recruiterLimit: 25,
      createdAt: new Date('2026-10-06T12:00:00Z'),
      tokenBalance: { balance: 20000 },
    };

    const mockCreatedUser = {
      id: 'usr-owner-1',
      email: 'john@nexuscorp.com',
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.ORGANISATION_SUPER_ADMIN,
    };

    beforeEach(() => {
      prisma.organisationApplication.findUnique.mockResolvedValue(verifiedApp);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.tokenPlan.findUnique.mockResolvedValue(mockApplication.selectedPlan);
      prisma.organisationApplication.updateMany.mockResolvedValue({ count: 1 });
      prisma.organisation.create.mockResolvedValue(mockCreatedOrg);
      prisma.user.create.mockResolvedValue(mockCreatedUser);
      prisma.tokenTransaction.create.mockResolvedValue({ id: 'tx-new-1' });
      prisma.organisationApplication.update.mockResolvedValue({
        ...verifiedApp,
        status: OrgApplicationStatus.APPROVED,
        createdOrganisationId: 'org-created-1',
        reviewedAt: new Date(),
      });
    });

    it('should atomically approve application and provision Organisation, Metadata, TokenBalance, Limits, User, Profile, and link createdOrganisationId', async () => {
      const mockReq: any = { ip: '127.0.0.1', headers: { 'user-agent': 'JestTest' } };
      const res = await controller.approve(sampleApplicationId, mockAdminActor, mockReq);

      expect(res.status).toBe(OrgApplicationStatus.APPROVED);
      expect(res.createdOrganisationId).toBe('org-created-1');
      expect(res.organisation).toBeDefined();
      expect(res.organisation.name).toBe('Nexus Corp');
      expect(res.superAdmin).toBeDefined();
      expect(res.superAdmin.email).toBe('john@nexuscorp.com');

      // 1. Organisation created with metadata, tokenBalance, allocationLimit
      expect(prisma.organisation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Nexus Corp',
          slug: 'nexus-corp',
          domain: 'nexuscorp.com',
          contactEmail: 'contact@nexuscorp.com',
          status: 'ACTIVE',
          tier: 'STANDARD',
          recruiterLimit: 25,
          metadata: {
            create: expect.objectContaining({
              industry: 'Engineering',
              companySize: '200-500',
              website: 'https://nexuscorp.com',
              address: '450 Innovation Ave',
            }),
          },
          tokenBalance: {
            create: expect.objectContaining({
              balance: 20000,
              allocatedTokens: 20000,
            }),
          },
          allocationLimit: {
            create: expect.objectContaining({
              monthlyMaxAllocation: 25000,
              singleTxLimit: 10000,
            }),
          },
        }),
        include: { metadata: true, tokenBalance: true },
      });

      // 2. Token transaction created
      expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organisationId: 'org-created-1',
          actorId: mockAdminActor.userId,
          amount: 20000,
          balanceBefore: 0,
          balanceAfter: 20000,
        }),
      });

      // 3. User created with ORGANISATION_SUPER_ADMIN, mustChangePassword: true, OrgMemberProfile
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'john@nexuscorp.com',
          firstName: 'John',
          lastName: 'Smith',
          role: UserRole.ORGANISATION_SUPER_ADMIN,
          organisationId: 'org-created-1',
          isActive: true,
          isEmailVerified: true,
          mustChangePassword: true,
          orgMemberProfile: {
            create: expect.objectContaining({
              organisationId: 'org-created-1',
              invitedById: mockAdminActor.userId,
            }),
          },
        }),
      });

      // 4. OrganisationApplication linked with createdOrganisationId
      expect(prisma.organisationApplication.update).toHaveBeenCalledWith({
        where: { id: sampleApplicationId },
        data: { createdOrganisationId: 'org-created-1' },
      });

      // 5. Review history created
      expect(prisma.applicationReviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: sampleApplicationId,
          actorId: mockAdminActor.userId,
          action: ApplicationReviewAction.APPROVED,
        }),
      });

      // 6. Central Audit Logs recorded
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANISATION_CREATED',
          entityId: 'org-created-1',
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORGANISATION_APPLICATION_APPROVED',
          entityId: sampleApplicationId,
        }),
      );
    });

    it('should NOT silently allocate paid tokens when paymentStatus is PENDING (enforcing payment verification business rule)', async () => {
      // paymentStatus is PENDING on a paid plan ($199.90)
      prisma.organisationApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        paymentStatus: ApplicationPaymentStatus.PENDING,
      });

      const res = await service.approve(sampleApplicationId, mockAdminActor);

      expect(res.status).toBe(OrgApplicationStatus.APPROVED);
      // initialTokens should be 0 because payment was not verified
      expect(prisma.organisation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenBalance: {
            create: expect.objectContaining({
              balance: 0,
              allocatedTokens: 0,
            }),
          },
        }),
        include: { metadata: true, tokenBalance: true },
      });
      // No token transaction created when tokens === 0
      expect(prisma.tokenTransaction.create).not.toHaveBeenCalled();
    });

    it('should allocate tokens for free plans (priceCents === 0) even when paymentStatus is PENDING', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        paymentStatus: ApplicationPaymentStatus.PENDING,
      });
      prisma.tokenPlan.findUnique.mockResolvedValue({
        ...mockApplication.selectedPlan,
        priceCents: 0,
        tokenAmount: 500,
      });

      await service.approve(sampleApplicationId, mockAdminActor);

      expect(prisma.organisation.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tokenBalance: {
            create: expect.objectContaining({
              balance: 500,
              allocatedTokens: 500,
            }),
          },
        }),
        include: { metadata: true, tokenBalance: true },
      });
      expect(prisma.tokenTransaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          amount: 500,
        }),
      });
    });

    it('should safely and idempotently return existing organisation when called repeatedly on already provisioned application', async () => {
      const alreadyProvisionedApp = {
        ...mockApplication,
        status: OrgApplicationStatus.APPROVED,
        createdOrganisationId: 'org-created-1',
        createdOrganisation: mockCreatedOrg,
      };
      prisma.organisationApplication.findUnique.mockResolvedValue(alreadyProvisionedApp);
      prisma.user.findFirst.mockResolvedValue(mockCreatedUser);

      const res = await service.approve(sampleApplicationId, mockAdminActor);

      expect(res.createdOrganisationId).toBe('org-created-1');
      expect(res.isAlreadyProvisioned).toBe(true);
      expect(res.organisation.name).toBe('Nexus Corp');
      // Must NOT create duplicate organisation or user
      expect(prisma.organisation.create).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(prisma.tokenTransaction.create).not.toHaveBeenCalled();
    });

    it('should reject approval if application is in REJECTED state', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue({
        ...mockApplication,
        status: OrgApplicationStatus.REJECTED,
      });

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approval if application does not exist', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.approve('non-existent-id', mockAdminActor),
      ).rejects.toThrow(NotFoundException);
    });

    it('should reject approval if selectedPlanId does not exist in database', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(null);

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approval if selectedPlan is inactive', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue({
        ...mockApplication.selectedPlan,
        isActive: false,
      });

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject approval if organisation slug already exists (duplicate collision)', async () => {
      prisma.organisation.findUnique.mockResolvedValueOnce({
        id: 'existing-different-org',
        slug: 'nexus-corp',
      });

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject approval if organisation domain already exists (duplicate collision)', async () => {
      prisma.organisation.findUnique
        .mockResolvedValueOnce(null) // slug check ok
        .mockResolvedValueOnce({
          id: 'existing-different-org-2',
          domain: 'nexuscorp.com',
        }); // domain conflict

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject approval if owner user email already exists (duplicate collision)', async () => {
      prisma.user.findUnique.mockResolvedValueOnce({
        id: 'existing-usr',
        email: 'john@nexuscorp.com',
      });

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should rollback completely if any database operation fails during transaction (simulated atomic rollback)', async () => {
      // Simulate database failure during user creation
      prisma.user.create.mockRejectedValueOnce(
        new Error('Database unique constraint violation on user table'),
      );

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow('Database unique constraint violation on user table');

      // Audit logs must NOT be recorded on failure
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('should never expose password, passwordHash, temporary credentials, or document storageKey in response', async () => {
      const res = await service.approve(sampleApplicationId, mockAdminActor);

      expect((res as any).password).toBeUndefined();
      expect((res as any).passwordHash).toBeUndefined();
      expect((res as any).tempPassword).toBeUndefined();
      expect((res as any).storageKey).toBeUndefined();
      expect((res.superAdmin as any).password).toBeUndefined();
      expect((res.superAdmin as any).passwordHash).toBeUndefined();
    });
  });

  describe('7. Concurrency & Race Condition Protection', () => {
    it('should throw ConflictException if two administrators attempt simultaneous approval (optimistic concurrency lock)', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue(mockApplication);
      prisma.tokenPlan.findUnique.mockResolvedValue(mockApplication.selectedPlan);

      // Simulate first admin succeeded (count: 1), second admin update returns count: 0 (matched 0 rows)
      prisma.organisationApplication.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.approve(sampleApplicationId, mockAdminActor),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException if two administrators attempt simultaneous info request', async () => {
      prisma.organisationApplication.findUnique.mockResolvedValue(mockApplication);
      prisma.organisationApplication.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.requestInformation(
          sampleApplicationId,
          { notes: 'Concurrent test notes' },
          mockAdminActor,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });
});
