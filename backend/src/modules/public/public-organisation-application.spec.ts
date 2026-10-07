import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { CloudStorageService } from '../../integrations/storage/storage.service';
import { PublicOrganisationApplicationService, UploadedFileObject } from './public-organisation-application.service';
import { PublicOrganisationApplicationController } from './public-organisation-application.controller';
import { CreateOrganisationApplicationDto } from './dto/create-organisation-application.dto';
import { UploadApplicationDocumentDto } from './dto/upload-application-document.dto';
import {
  OrgApplicationStatus,
  ApplicationPaymentStatus,
  ApplicationDocumentType,
} from '@prisma/client';

describe('Public Organisation Application API (Milestone 3)', () => {
  let service: PublicOrganisationApplicationService;
  let controller: PublicOrganisationApplicationController;
  let prisma: any;
  let storageService: any;
  let jwtService: any;

  const mockPlan = {
    id: 'b819f71c-3b95-46eb-81cf-50798cf0c091',
    name: 'Growth Tier',
    code: 'GROWTH',
    description: 'Mid-sized recruiting plan',
    tokenAmount: 5000,
    priceCents: 49900,
    currency: 'USD',
    billingCycle: 'MONTHLY',
    features: ['Recruiter Seats: 10', 'AI Matching'],
    isActive: true,
    sortOrder: 1,
  };

  const mockInactivePlan = {
    ...mockPlan,
    id: 'a111f71c-3b95-46eb-81cf-50798cf0c099',
    name: 'Legacy Tier',
    code: 'LEGACY',
    isActive: false,
  };

  const validDto: CreateOrganisationApplicationDto = {
    name: 'Apex Global Technologies',
    slug: 'apex-global',
    domain: 'apexglobal.com',
    contactEmail: 'contact@apexglobal.com',
    contactPhone: '+1-555-1234567',
    industry: 'Software',
    companySize: '50-200',
    website: 'https://apexglobal.com',
    address: '100 Tech Way, Suite 400',
    ownerFirstName: 'Jane',
    ownerLastName: 'Doe',
    ownerEmail: 'jane.doe@apexglobal.com',
    ownerPhone: '+1-555-9876543',
    ownerDesignation: 'VP of People',
    selectedPlanId: mockPlan.id,
    paymentMethod: 'BANK_TRANSFER',
    paymentReference: 'WIRE-TX-998811',
  };

  beforeEach(async () => {
    prisma = {
      tokenPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
      },
      organisation: {
        findUnique: jest.fn(),
      },
      organisationApplication: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      applicationReviewHistory: {
        create: jest.fn(),
      },
      applicationDocument: {
        create: jest.fn(),
      },
      user: {
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => cb(prisma)),
    };

    storageService = {
      storeApplicationDocument: jest.fn(),
      deletePrivateObject: jest.fn(),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock.jwt.continuation.token'),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicOrganisationApplicationController],
      providers: [
        PublicOrganisationApplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudStorageService, useValue: storageService },
        { provide: JwtService, useValue: jwtService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, def?: any) => {
              if (key === 'jwt.secret' || key === 'JWT_SECRET') return 'test-jwt-secret-at-least-32-chars-long';
              return def;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<PublicOrganisationApplicationService>(PublicOrganisationApplicationService);
    controller = module.get<PublicOrganisationApplicationController>(PublicOrganisationApplicationController);
  });

  describe('1 & 2. Get Public Plans API', () => {
    it('1. should return active plans with only safe public fields in sort order', async () => {
      prisma.tokenPlan.findMany.mockResolvedValue([mockPlan]);

      const plans = await controller.getPlans();
      expect(prisma.tokenPlan.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      });
      expect(plans).toHaveLength(1);
      expect(plans[0]).toEqual({
        id: mockPlan.id,
        name: mockPlan.name,
        code: mockPlan.code,
        description: mockPlan.description,
        tokenAmount: mockPlan.tokenAmount,
        priceCents: mockPlan.priceCents,
        currency: mockPlan.currency,
        billingCycle: mockPlan.billingCycle,
        features: mockPlan.features,
      });
      // Ensure no admin-only internals leaked
      expect(plans[0]).not.toHaveProperty('createdAt');
      expect(plans[0]).not.toHaveProperty('updatedAt');
    });

    it('2. inactive plans must not be exposed by the query', async () => {
      prisma.tokenPlan.findMany.mockImplementation(async (query: any) => {
        if (query.where?.isActive === true) return [mockPlan];
        return [mockPlan, mockInactivePlan];
      });

      const plans = await service.getActivePlans();
      expect(plans).toHaveLength(1);
      expect(plans.some((p) => p.code === 'LEGACY')).toBe(false);
    });
  });

  describe('3 - 12. Submit Organisation Application', () => {
    it('3. should create an OrganisationApplication and return application number and continuation token', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.organisationApplication.findFirst.mockResolvedValue(null);

      const createdRecord = {
        id: '9b8417c4-0613-4bf5-b46f-c1f1737be001',
        applicationNumber: 1001,
        ...validDto,
        status: OrgApplicationStatus.PENDING_REVIEW,
        paymentStatus: ApplicationPaymentStatus.PENDING,
      };
      prisma.organisationApplication.create.mockResolvedValue(createdRecord);
      prisma.applicationReviewHistory.create.mockResolvedValue({});

      const result = await controller.createApplication(validDto);

      expect(result.applicationNumber).toBe(1001);
      expect(result.applicationId).toBe(createdRecord.id);
      expect(result.status).toBe(OrgApplicationStatus.PENDING_REVIEW);
      expect(result.paymentStatus).toBe(ApplicationPaymentStatus.PENDING);
      expect(result.continuationToken).toBe('mock.jwt.continuation.token');
      expect(result.expiresIn).toBe('48h');
      expect(result.message).toBeDefined();

      // Ensure review history was created
      expect(prisma.applicationReviewHistory.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          applicationId: createdRecord.id,
          actorRole: 'APPLICANT',
          action: 'SUBMITTED',
        }),
      });
    });

    it('6. should reject if selected plan does not exist', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(null);

      await expect(service.submitApplication(validDto)).rejects.toThrow(BadRequestException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/does not exist/);
    });

    it('7. should reject if selected plan is inactive', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockInactivePlan);

      await expect(service.submitApplication(validDto)).rejects.toThrow(BadRequestException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/currently inactive/);
    });

    it('8a. should reject duplicate submission if slug matches existing active organisation', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue({ id: 'org-1', slug: 'apex-global' });

      await expect(service.submitApplication(validDto)).rejects.toThrow(ConflictException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/already taken/);
    });

    it('8b. should reject duplicate submission if domain matches existing active organisation', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockImplementation(async (query: any) => {
        if (query.where?.slug) return null;
        if (query.where?.domain) return { id: 'org-1', domain: 'apexglobal.com' };
        return null;
      });

      await expect(service.submitApplication(validDto)).rejects.toThrow(ConflictException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/domain .* is already registered/i);
    });

    it('8c. should reject duplicate submission if another application with same slug is pending review', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.organisationApplication.findFirst.mockImplementation(async (query: any) => {
        if (query.where?.slug) return { id: 'app-999', slug: 'apex-global' };
        return null;
      });

      await expect(service.submitApplication(validDto)).rejects.toThrow(ConflictException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/already pending review/i);
    });

    it('8d. should reject duplicate submission if owner email already has a pending application', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.organisationApplication.findFirst.mockImplementation(async (query: any) => {
        if (query.where?.ownerEmail) return { id: 'app-999', ownerEmail: 'jane.doe@apexglobal.com' };
        return null;
      });

      await expect(service.submitApplication(validDto)).rejects.toThrow(ConflictException);
      await expect(service.submitApplication(validDto)).rejects.toThrow(/owner email .* is already currently pending/i);
    });

    it('9 & 10. application must start with status PENDING_REVIEW and payment status PENDING', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.organisationApplication.findFirst.mockResolvedValue(null);

      let createdData: any;
      prisma.organisationApplication.create.mockImplementation((args: any) => {
        createdData = args.data;
        return {
          id: 'app-id-1',
          applicationNumber: 101,
          ...args.data,
        };
      });

      await service.submitApplication(validDto);

      expect(createdData.status).toBe(OrgApplicationStatus.PENDING_REVIEW);
      expect(createdData.paymentStatus).toBe(ApplicationPaymentStatus.PENDING);
    });

    it('11 & 12. submitting application must NOT create an Organisation or User in database', async () => {
      prisma.tokenPlan.findUnique.mockResolvedValue(mockPlan);
      prisma.organisation.findUnique.mockResolvedValue(null);
      prisma.organisationApplication.findFirst.mockResolvedValue(null);
      prisma.organisationApplication.create.mockResolvedValue({
        id: 'app-id-1',
        applicationNumber: 101,
        ...validDto,
        status: OrgApplicationStatus.PENDING_REVIEW,
        paymentStatus: ApplicationPaymentStatus.PENDING,
      });

      await service.submitApplication(validDto);

      // Verify no organisation or user creation was attempted
      expect(prisma.organisation.create).toBeUndefined();
      expect(prisma.user.create).toBeUndefined();
    });
  });

  describe('13 - 17. Document Upload & Security', () => {
    const appId = '9b8417c4-0613-4bf5-b46f-c1f1737be001';
    const validPdfBuffer = Buffer.from('%PDF-1.4\nTest Document Content\n%%EOF');
    const validFile: UploadedFileObject = {
      originalname: 'tax_certificate.pdf',
      mimetype: 'application/pdf',
      size: validPdfBuffer.length,
      buffer: validPdfBuffer,
    };
    const uploadDto: UploadApplicationDocumentDto = {
      type: ApplicationDocumentType.TAX_ID,
    };

    it('13. should upload valid document with valid continuation token', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: appId,
        ownerEmail: 'jane.doe@apexglobal.com',
      });

      prisma.organisationApplication.findUnique.mockResolvedValue({
        id: appId,
        status: OrgApplicationStatus.PENDING_REVIEW,
      });

      storageService.storeApplicationDocument.mockResolvedValue({
        storageKey: `applications/${appId}/doc-1`,
        fileName: 'tax_certificate.pdf',
        fileSize: validPdfBuffer.length,
        mimeType: 'application/pdf',
      });

      prisma.applicationDocument.create.mockResolvedValue({
        id: 'doc-1',
        applicationId: appId,
        type: ApplicationDocumentType.TAX_ID,
        fileName: 'tax_certificate.pdf',
        fileSize: validPdfBuffer.length,
        mimeType: 'application/pdf',
        storageKey: `applications/${appId}/doc-1`,
        createdAt: new Date(),
      });

      const res = await controller.uploadDocument(
        appId,
        uploadDto,
        validFile,
        'Bearer valid.jwt.token',
      );

      expect(res.id).toBe('doc-1');
      expect(res.type).toBe(ApplicationDocumentType.TAX_ID);
      expect(res.fileName).toBe('tax_certificate.pdf');
      expect(storageService.storeApplicationDocument).toHaveBeenCalled();
      // Ensure raw storageKey is never leaked in the response
      expect(res).not.toHaveProperty('storageKey');
    });

    it('14. should reject upload with missing file or buffer', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: appId,
        ownerEmail: 'jane.doe@apexglobal.com',
      });

      await expect(
        service.uploadDocument(appId, uploadDto, null as any, 'Bearer valid.jwt.token'),
      ).rejects.toThrow(BadRequestException);
    });

    it('15. storageService rejection (invalid type or oversized) propagates as BadRequestException', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: appId,
        ownerEmail: 'jane.doe@apexglobal.com',
      });

      prisma.organisationApplication.findUnique.mockResolvedValue({
        id: appId,
        status: OrgApplicationStatus.PENDING_REVIEW,
      });

      storageService.storeApplicationDocument.mockRejectedValue(
        new BadRequestException('File size exceeds maximum allowed limit'),
      );

      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.jwt.token'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.jwt.token'),
      ).rejects.toThrow(/exceeds maximum allowed limit/);
    });

    it('16. if database creation fails, stored private file must be cleaned up to prevent orphans', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: appId,
        ownerEmail: 'jane.doe@apexglobal.com',
      });

      prisma.organisationApplication.findUnique.mockResolvedValue({
        id: appId,
        status: OrgApplicationStatus.PENDING_REVIEW,
      });

      const fakeKey = `applications/${appId}/doc-failed-uuid`;
      storageService.storeApplicationDocument.mockResolvedValue({
        storageKey: fakeKey,
        fileName: 'tax_certificate.pdf',
        fileSize: validPdfBuffer.length,
        mimeType: 'application/pdf',
      });

      prisma.applicationDocument.create.mockRejectedValue(new Error('PostgreSQL connection drop'));

      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.jwt.token'),
      ).rejects.toThrow(BadRequestException);

      // Verify compensational cleanup was executed
      expect(storageService.deletePrivateObject).toHaveBeenCalledWith(fakeKey);
    });

    it('17a. should reject document upload when continuation token is missing', async () => {
      await expect(
        service.uploadDocument(appId, uploadDto, validFile, undefined),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('17b. should reject document upload when token belongs to another application', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: 'different-app-uuid-999',
        ownerEmail: 'other@example.com',
      });

      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.token.for.another.app'),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.token.for.another.app'),
      ).rejects.toThrow(/does not match/i);
    });

    it('17c. should reject upload when application is already approved or rejected', async () => {
      jwtService.verify.mockReturnValue({
        purpose: 'org_application_continuation',
        applicationId: appId,
        ownerEmail: 'jane.doe@apexglobal.com',
      });

      prisma.organisationApplication.findUnique.mockResolvedValue({
        id: appId,
        status: OrgApplicationStatus.APPROVED,
      });

      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.token'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.uploadDocument(appId, uploadDto, validFile, 'Bearer valid.token'),
      ).rejects.toThrow(/cannot be added to an application in status/i);
    });
  });
});
