// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: PlatformSupportController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformSupportController } from './platform-support.controller';
import { PlatformSupportService } from './platform-support.service';
import { SupportTicketStatus, SupportTicketPriority, SupportTicketCategory, UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';

describe('PlatformSupportController', () => {
  let controller: PlatformSupportController;
  let service: jest.Mocked<PlatformSupportService>;

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_1',
    email: 'superadmin@clyptus.platform',
    firstName: 'Super',
    lastName: 'Admin',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    permissions: ['*'],
  };

  const mockReq = {
    headers: { 'user-agent': 'JestTest' },
    ip: '127.0.0.1',
  } as unknown as Request;

  const mockTicket = {
    id: 'tkt-1',
    ticketNumber: 1001,
    subject: 'Cannot login',
    description: 'Login fails with 500',
    status: SupportTicketStatus.OPEN,
    priority: SupportTicketPriority.HIGH,
    category: SupportTicketCategory.AUTHENTICATION,
    organisationId: 'org-1',
    createdByUserId: 'usr_super_1',
    assignedToUserId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockService = {
      findAll: jest.fn().mockResolvedValue({
        data: [mockTicket],
        meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
        summary: { open: 1, inProgress: 0, urgent: 0, resolved: 0 },
      }),
      findOne: jest.fn().mockResolvedValue({
        ...mockTicket,
        messages: [],
      }),
      create: jest.fn().mockResolvedValue(mockTicket),
      addMessage: jest.fn().mockResolvedValue({
        id: 'msg-1',
        ticketId: 'tkt-1',
        body: 'Investigating',
        isInternal: false,
        createdAt: new Date(),
      }),
      update: jest.fn().mockResolvedValue(mockTicket),
      updateStatus: jest.fn().mockResolvedValue({
        ...mockTicket,
        status: SupportTicketStatus.RESOLVED,
      }),
      assignTicket: jest.fn().mockResolvedValue({
        ...mockTicket,
        assignedToUserId: 'usr_super_1',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformSupportController],
      providers: [{ provide: PlatformSupportService, useValue: mockService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlatformSupportController>(PlatformSupportController);
    service = module.get(PlatformSupportService);
  });

  it('should find all tickets', async () => {
    const result = await controller.findAll({ page: 1, limit: 20 });
    expect(result.data).toHaveLength(1);
    expect(service.findAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
  });

  it('should find single ticket by id', async () => {
    const result = await controller.findOne('tkt-1');
    expect(result.id).toBe('tkt-1');
    expect(service.findOne).toHaveBeenCalledWith('tkt-1');
  });

  it('should create ticket', async () => {
    const dto = { subject: 'Test', description: 'Test ticket' };
    const result = await controller.create(dto, mockActor, mockReq);
    expect(result).toBeDefined();
    expect(service.create).toHaveBeenCalledWith(dto, mockActor, '127.0.0.1', 'JestTest');
  });

  it('should add message', async () => {
    const dto = { body: 'Investigating' };
    const result = await controller.addMessage('tkt-1', dto, mockActor, mockReq);
    expect(result).toBeDefined();
    expect(service.addMessage).toHaveBeenCalledWith('tkt-1', dto, mockActor, '127.0.0.1', 'JestTest');
  });

  it('should update status', async () => {
    const dto = { status: SupportTicketStatus.RESOLVED };
    const result = await controller.updateStatus('tkt-1', dto, mockActor, mockReq);
    expect(result.status).toBe(SupportTicketStatus.RESOLVED);
    expect(service.updateStatus).toHaveBeenCalledWith('tkt-1', dto, mockActor, '127.0.0.1', 'JestTest');
  });

  it('should assign ticket', async () => {
    const dto = { assignedToUserId: 'usr_super_1' };
    const result = await controller.assignTicket('tkt-1', dto, mockActor, mockReq);
    expect(result.assignedToUserId).toBe('usr_super_1');
    expect(service.assignTicket).toHaveBeenCalledWith('tkt-1', dto, mockActor, '127.0.0.1', 'JestTest');
  });
});
