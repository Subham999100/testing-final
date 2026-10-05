// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service Test: PlatformSupportService
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformSupportService } from './platform-support.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  UserRole,
} from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformSupportService', () => {
  let service: PlatformSupportService;
  let prisma: any;
  let auditService: any;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_admin_id',
    email: 'superadmin@clyptus.platform',
    firstName: 'Platform',
    lastName: 'SuperAdmin',
    role: UserRole.PLATFORM_SUPER_ADMIN,
  };

  const sampleTicket = {
    id: 'tkt-123-uuid',
    ticketNumber: 1024,
    subject: 'Unable to publish job',
    description: 'We are receiving a network error when publishing a new position.',
    status: SupportTicketStatus.OPEN,
    priority: SupportTicketPriority.HIGH,
    category: SupportTicketCategory.JOB,
    organisationId: 'org-abc-uuid',
    createdByUserId: 'usr_super_admin_id',
    assignedToUserId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    organisation: {
      id: 'org-abc-uuid',
      name: 'Acme Corp',
      slug: 'acme-corp',
      tier: 'ENTERPRISE',
      contactEmail: 'contact@acme.com',
    },
    createdByUser: {
      id: 'usr_super_admin_id',
      email: 'superadmin@clyptus.platform',
      firstName: 'Platform',
      lastName: 'SuperAdmin',
      role: UserRole.PLATFORM_SUPER_ADMIN,
    },
    assignedToUser: null,
    _count: { messages: 2 },
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        findMany: jest.fn().mockResolvedValue([sampleTicket]),
        findUnique: jest.fn().mockResolvedValue(sampleTicket),
        count: jest.fn().mockResolvedValue(1),
        create: jest.fn().mockResolvedValue(sampleTicket),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...sampleTicket,
          ...data,
          updatedAt: new Date(),
        })),
      },
      supportMessage: {
        create: jest.fn().mockResolvedValue({
          id: 'msg-456-uuid',
          ticketId: sampleTicket.id,
          authorId: mockActor.userId,
          body: 'We are investigating this issue.',
          isInternal: false,
          createdAt: new Date(),
          author: sampleTicket.createdByUser,
        }),
      },
      organisation: {
        findUnique: jest.fn().mockResolvedValue(sampleTicket.organisation),
      },
      user: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'admin-uuid') {
            return Promise.resolve({ id: 'admin-uuid', role: UserRole.PLATFORM_ADMIN });
          }
          if (where.id === 'recruiter-uuid') {
            return Promise.resolve({ id: 'recruiter-uuid', role: UserRole.RECRUITER });
          }
          return Promise.resolve(null);
        }),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlatformSupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<PlatformSupportService>(PlatformSupportService);
  });

  describe('findAll', () => {
    it('should return paginated tickets and summary metrics', async () => {
      prisma.supportTicket.count
        .mockResolvedValueOnce(1) // total
        .mockResolvedValueOnce(1) // openCount
        .mockResolvedValueOnce(0) // inProgressCount
        .mockResolvedValueOnce(1) // urgentCount
        .mockResolvedValueOnce(0); // resolvedCount

      const result = await service.findAll({
        page: 1,
        limit: 10,
        status: SupportTicketStatus.OPEN,
        priority: SupportTicketPriority.HIGH,
      });

      expect(result.data).toHaveLength(1);
      expect(result.data[0].ticketNumber).toBe(1024);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.summary.open).toBe(1);
      expect(result.summary.inProgress).toBe(0);
      expect(prisma.supportTicket.findMany).toHaveBeenCalled();
    });

    it('should support search by numeric ticketNumber and text', async () => {
      await service.findAll({ search: '1024' });
      const callArgs = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(callArgs.where.OR).toBeDefined();
    });

    it('should filter unassigned tickets when requested', async () => {
      await service.findAll({ assignedToUserId: 'unassigned' });
      const callArgs = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(callArgs.where.assignedToUserId).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return ticket with messages', async () => {
      const result = await service.findOne(sampleTicket.id);
      expect(result.id).toBe(sampleTicket.id);
      expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: sampleTicket.id } }),
      );
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      prisma.supportTicket.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a support ticket and record audit log', async () => {
      const result = await service.create(
        {
          subject: 'Issue with candidates',
          description: 'Cannot view profile',
          organisationId: 'org-abc-uuid',
          priority: SupportTicketPriority.URGENT,
          category: SupportTicketCategory.APPLICATION,
        },
        mockActor,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toBeDefined();
      expect(prisma.supportTicket.create).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_CREATED',
          entityType: 'SupportTicket',
          actorId: mockActor.userId,
        }),
      );
    });

    it('should reject non-existent organisation', async () => {
      prisma.organisation.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.create(
          {
            subject: 'Test',
            description: 'Test',
            organisationId: 'invalid-org',
          },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject non-platform administrator as assignee', async () => {
      await expect(
        service.create(
          {
            subject: 'Test',
            description: 'Test',
            assignedToUserId: 'recruiter-uuid',
          },
          mockActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('addMessage', () => {
    it('should add message to ticket and record audit log', async () => {
      const msg = await service.addMessage(
        sampleTicket.id,
        { body: 'We are investigating this issue.', isInternal: false },
        mockActor,
        '127.0.0.1',
      );

      expect(msg).toBeDefined();
      expect(prisma.supportMessage.create).toHaveBeenCalled();
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_REPLIED',
          entityId: sampleTicket.id,
        }),
      );
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      prisma.supportTicket.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.addMessage('missing-id', { body: 'Reply' }, mockActor),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update status to RESOLVED and set resolvedAt', async () => {
      const result = await service.updateStatus(
        sampleTicket.id,
        { status: SupportTicketStatus.RESOLVED, resolutionNotes: 'Fixed issue with job configuration' },
        mockActor,
      );

      expect(result).toBeDefined();
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleTicket.id },
          data: expect.objectContaining({
            status: SupportTicketStatus.RESOLVED,
            resolvedAt: expect.any(Date),
            resolutionNotes: 'Fixed issue with job configuration',
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_RESOLVED',
        }),
      );
    });
  });

  describe('assignTicket', () => {
    it('should assign platform admin and update status to IN_PROGRESS', async () => {
      const result = await service.assignTicket(
        sampleTicket.id,
        { assignedToUserId: 'admin-uuid' },
        mockActor,
      );

      expect(result).toBeDefined();
      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleTicket.id },
          data: expect.objectContaining({
            assignedToUserId: 'admin-uuid',
            status: SupportTicketStatus.IN_PROGRESS,
          }),
        }),
      );
      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUPPORT_TICKET_ASSIGNED',
        }),
      );
    });
  });
});
