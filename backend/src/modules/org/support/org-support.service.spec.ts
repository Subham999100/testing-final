// ============================================================
// ORGANISATION PORTAL
// Service Test: OrgSupportService
// Full tenant isolation & permission verification
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { OrgSupportService } from './org-support.service';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { NotFoundException } from '@nestjs/common';
import {
  SupportTicketStatus,
  SupportTicketPriority,
  SupportTicketCategory,
  UserRole,
} from '@prisma/client';
import { OrgContext } from '../common/org-context';

describe('OrgSupportService', () => {
  let service: OrgSupportService;
  let prisma: any;
  let auditService: any;

  const mockOrgAContext: OrgContext = {
    userId: 'usr-acme-super',
    organisationId: 'org-acme-id',
    organisationName: 'Acme Corporation',
    role: UserRole.ORGANISATION_SUPER_ADMIN,
    permissions: ['support.read', 'support.create', 'support.reply'] as any,
    email: 'superadmin@acme.com',
    firstName: 'Acme',
    lastName: 'Super',
    ip: '127.0.0.1',
    userAgent: 'JestTest',
  };

  const mockOrgBContext: OrgContext = {
    userId: 'usr-wayne-admin',
    organisationId: 'org-wayne-id',
    organisationName: 'Wayne Enterprises',
    role: UserRole.ORGANISATION_ADMIN,
    permissions: ['support.read', 'support.create', 'support.reply'] as any,
    email: 'admin@wayne.com',
    firstName: 'Bruce',
    lastName: 'Wayne',
    ip: '127.0.0.1',
    userAgent: 'JestTest',
  };

  const sampleTicketA = {
    id: 'tkt-acme-1',
    ticketNumber: 1001,
    subject: 'Cannot invite recruiter',
    description: 'Recruiter limit error when inviting team member.',
    status: SupportTicketStatus.OPEN,
    priority: SupportTicketPriority.HIGH,
    category: SupportTicketCategory.RECRUITER,
    organisationId: 'org-acme-id',
    createdByUserId: 'usr-acme-super',
    assignedToUserId: null,
    resolutionNotes: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-10-01T10:00:00Z'),
    updatedAt: new Date('2026-10-01T10:00:00Z'),
    createdByUser: {
      id: 'usr-acme-super',
      email: 'superadmin@acme.com',
      firstName: 'Acme',
      lastName: 'Super',
      role: UserRole.ORGANISATION_SUPER_ADMIN,
    },
    assignedToUser: null,
    _count: { messages: 1 },
    messages: [
      {
        id: 'msg-pub-1',
        ticketId: 'tkt-acme-1',
        authorId: 'usr-acme-super',
        body: 'Initial problem description.',
        isInternal: false,
        createdAt: new Date('2026-10-01T10:00:00Z'),
        author: {
          id: 'usr-acme-super',
          email: 'superadmin@acme.com',
          firstName: 'Acme',
          lastName: 'Super',
          role: UserRole.ORGANISATION_SUPER_ADMIN,
        },
      },
      {
        id: 'msg-internal-staff',
        ticketId: 'tkt-acme-1',
        authorId: 'usr-platform-staff',
        body: 'Private staff note: check tenant recruiter limits table.',
        isInternal: true,
        createdAt: new Date('2026-10-01T10:15:00Z'),
        author: {
          id: 'usr-platform-staff',
          email: 'staff@clyptus.platform',
          firstName: 'Platform',
          lastName: 'Staff',
          role: UserRole.PLATFORM_ADMIN,
        },
      },
    ],
  };

  const sampleTicketB = {
    id: 'tkt-wayne-1',
    ticketNumber: 1002,
    subject: 'Billing discrepancy',
    description: 'Tokens not credited after invoice settlement.',
    status: SupportTicketStatus.IN_PROGRESS,
    priority: SupportTicketPriority.URGENT,
    category: SupportTicketCategory.PAYMENT,
    organisationId: 'org-wayne-id',
    createdByUserId: 'usr-wayne-admin',
    assignedToUserId: null,
    resolutionNotes: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-10-02T10:00:00Z'),
    updatedAt: new Date('2026-10-02T10:00:00Z'),
    createdByUser: {
      id: 'usr-wayne-admin',
      email: 'admin@wayne.com',
      firstName: 'Bruce',
      lastName: 'Wayne',
      role: UserRole.ORGANISATION_ADMIN,
    },
    assignedToUser: null,
    _count: { messages: 1 },
    messages: [],
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        findMany: jest.fn().mockImplementation(({ where }) => {
          if (where.organisationId === 'org-acme-id') return Promise.resolve([sampleTicketA]);
          if (where.organisationId === 'org-wayne-id') return Promise.resolve([sampleTicketB]);
          return Promise.resolve([]);
        }),
        findUnique: jest.fn().mockImplementation(({ where, include }) => {
          if (where.id === 'tkt-acme-1') {
            // When querying with messages filter where isInternal: false
            const filteredMessages = (sampleTicketA.messages || []).filter(
              (m) => !include?.messages?.where?.isInternal || m.isInternal === false,
            );
            return Promise.resolve({
              ...sampleTicketA,
              messages: include?.messages?.where?.isInternal === false
                ? (sampleTicketA.messages || []).filter((m) => !m.isInternal)
                : sampleTicketA.messages,
            });
          }
          if (where.id === 'tkt-wayne-1') return Promise.resolve(sampleTicketB);
          return Promise.resolve(null);
        }),
        count: jest.fn().mockImplementation(({ where }) => {
          if (where.organisationId === 'org-acme-id') return Promise.resolve(1);
          if (where.organisationId === 'org-wayne-id') return Promise.resolve(1);
          return Promise.resolve(0);
        }),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tkt-new-id',
            ticketNumber: 1003,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
            createdByUser: {
              id: data.createdByUserId,
              email: 'user@org.com',
              firstName: 'Test',
              lastName: 'User',
              role: UserRole.ORGANISATION_ADMIN,
            },
          }),
        ),
        update: jest.fn().mockResolvedValue(sampleTicketA),
      },
      supportMessage: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'msg-new-id',
            ...data,
            createdAt: new Date(),
            author: {
              id: data.authorId,
              email: 'reply@org.com',
              firstName: 'Test',
              lastName: 'User',
              role: UserRole.ORGANISATION_ADMIN,
            },
          }),
        ),
      },
      $transaction: jest.fn().mockImplementation((promises) => Promise.all(promises)),
    };

    auditService = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrgSupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<OrgSupportService>(OrgSupportService);
  });

  describe('Tenant Scoping & Listing', () => {
    it('Organisation Super Admin can list own organisation tickets only', async () => {
      const res = await service.listTickets(mockOrgAContext, { page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('tkt-acme-1');
      expect(res.summary.open).toBe(1);

      const findManyCall = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(findManyCall.where.organisationId).toBe('org-acme-id');
    });

    it('Organisation Admin can list own organisation tickets only', async () => {
      const res = await service.listTickets(mockOrgBContext, { page: 1, limit: 10 });
      expect(res.data).toHaveLength(1);
      expect(res.data[0].id).toBe('tkt-wayne-1');

      const findManyCall = prisma.supportTicket.findMany.mock.calls[0][0];
      expect(findManyCall.where.organisationId).toBe('org-wayne-id');
    });
  });

  describe('Ticket Creation', () => {
    it('creates ticket with organisationId and createdByUserId derived exclusively from OrgContext', async () => {
      const res = await service.createTicket(mockOrgAContext, {
        subject: 'Cannot invite recruiter',
        description: 'Limit error',
        priority: SupportTicketPriority.HIGH,
        category: SupportTicketCategory.RECRUITER,
      });

      expect(res.id).toBeDefined();
      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organisationId: 'org-acme-id',
            createdByUserId: 'usr-acme-super',
            status: SupportTicketStatus.OPEN,
          }),
        }),
      );

      expect(auditService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'ORG_SUPPORT_TICKET_CREATED',
          actorId: mockOrgAContext.userId,
          organisationId: mockOrgAContext.organisationId,
        }),
      );
    });
  });

  describe('CRITICAL TENANT ISOLATION: Cross-Tenant Access Strict Rejection', () => {
    it('Organisation A can view own ticket A', async () => {
      const ticket = await service.getTicket(mockOrgAContext, 'tkt-acme-1');
      expect(ticket.id).toBe('tkt-acme-1');
    });

    it('Organisation A CANNOT view Organisation B ticket B (throws 404)', async () => {
      await expect(
        service.getTicket(mockOrgAContext, 'tkt-wayne-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Organisation B can view own ticket B', async () => {
      const ticket = await service.getTicket(mockOrgBContext, 'tkt-wayne-1');
      expect(ticket.id).toBe('tkt-wayne-1');
    });

    it('Organisation B CANNOT view Organisation A ticket A (throws 404)', async () => {
      await expect(
        service.getTicket(mockOrgBContext, 'tkt-acme-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('Organisation A can post message to own ticket A', async () => {
      const msg = await service.addMessage(mockOrgAContext, 'tkt-acme-1', {
        body: 'Following up on recruiter limit.',
      });
      expect(msg.body).toBe('Following up on recruiter limit.');
      expect(prisma.supportMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isInternal: false,
            authorId: mockOrgAContext.userId,
          }),
        }),
      );
    });

    it('Organisation A CANNOT post message to Organisation B ticket B (throws 404)', async () => {
      await expect(
        service.addMessage(mockOrgAContext, 'tkt-wayne-1', {
          body: 'Malicious attempt to reply to another tenant ticket.',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('Organisation B CANNOT post message to Organisation A ticket A (throws 404)', async () => {
      await expect(
        service.addMessage(mockOrgBContext, 'tkt-acme-1', {
          body: 'Malicious attempt to reply to another tenant ticket.',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Internal Staff Notes Masking', () => {
    it('strictly hides platform internal staff notes from organisation view', async () => {
      const ticket = await service.getTicket(mockOrgAContext, 'tkt-acme-1');
      expect(ticket.messages).toHaveLength(1);
      expect(ticket.messages[0].body).toBe('Initial problem description.');
      // Verify internal note is excluded
      const internalNote = ticket.messages.find((m: any) => m.body.includes('Private staff note'));
      expect(internalNote).toBeUndefined();
    });
  });
});
