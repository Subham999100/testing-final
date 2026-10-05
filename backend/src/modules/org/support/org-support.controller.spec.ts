// ============================================================
// ORGANISATION PORTAL
// Controller Test: OrgSupportController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { OrgSupportController } from './org-support.controller';
import { OrgSupportService } from './org-support.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { OrgGuard, OrgContext } from '../common/org-context';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory, UserRole } from '@prisma/client';

describe('OrgSupportController', () => {
  let controller: OrgSupportController;
  let service: jest.Mocked<OrgSupportService>;

  const mockCtx: OrgContext = {
    userId: 'usr-org-1',
    organisationId: 'org-1',
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_SUPER_ADMIN,
    permissions: ['support.read', 'support.create', 'support.reply'] as any,
    email: 'admin@acme.com',
    firstName: 'John',
    lastName: 'Doe',
    ip: '127.0.0.1',
    userAgent: 'JestTest',
  };

  const sampleTicket = {
    id: 'tkt-1',
    ticketNumber: 1001,
    subject: 'Issue with job publish',
    description: 'Cannot publish job',
    status: SupportTicketStatus.OPEN,
    priority: SupportTicketPriority.HIGH,
    category: SupportTicketCategory.JOB,
    resolutionNotes: null,
    resolvedAt: null,
    closedAt: null,
    createdByUser: { id: 'usr-org-1', email: 'admin@acme.com', firstName: 'John', lastName: 'Doe', role: UserRole.ORGANISATION_SUPER_ADMIN },
    assignedToUser: null,
    messageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      listTickets: jest.fn().mockResolvedValue({
        data: [sampleTicket],
        meta: { total: 1, page: 1, limit: 15, totalPages: 1 },
        summary: { open: 1, inProgress: 0, resolved: 0 },
      }),
      getTicket: jest.fn().mockResolvedValue({
        ...sampleTicket,
        messages: [],
      }),
      createTicket: jest.fn().mockResolvedValue(sampleTicket),
      addMessage: jest.fn().mockResolvedValue({
        id: 'msg-1',
        ticketId: 'tkt-1',
        authorId: 'usr-org-1',
        body: 'Reply text',
        createdAt: new Date(),
        author: sampleTicket.createdByUser,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgSupportController],
      providers: [{ provide: OrgSupportService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrgSupportController>(OrgSupportController);
    service = module.get(OrgSupportService);
  });

  it('should list tickets for authenticated organisation', async () => {
    const res = await controller.listTickets(mockCtx, { page: 1 });
    expect(res.data).toHaveLength(1);
    expect(service.listTickets).toHaveBeenCalledWith(mockCtx, { page: 1 });
  });

  it('should get single ticket', async () => {
    const res = await controller.getTicket(mockCtx, 'tkt-1');
    expect(res.id).toBe('tkt-1');
    expect(service.getTicket).toHaveBeenCalledWith(mockCtx, 'tkt-1');
  });

  it('should create ticket', async () => {
    const dto = {
      subject: 'Issue with job publish',
      description: 'Cannot publish job',
      priority: SupportTicketPriority.HIGH,
      category: SupportTicketCategory.JOB,
    };
    const res = await controller.createTicket(mockCtx, dto);
    expect(res.id).toBe('tkt-1');
    expect(service.createTicket).toHaveBeenCalledWith(mockCtx, dto);
  });

  it('should add message', async () => {
    const dto = { body: 'Reply text' };
    const res = await controller.addMessage(mockCtx, 'tkt-1', dto);
    expect(res.id).toBe('msg-1');
    expect(service.addMessage).toHaveBeenCalledWith(mockCtx, 'tkt-1', dto);
  });
});
