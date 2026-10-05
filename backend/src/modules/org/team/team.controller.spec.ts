// ============================================================
// Clyptus Job Portal - Organisation Admin & Super Admin Tests
// Controller Test: OrgMembersController (Capabilities & Endpoints)
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { OrgMembersController } from './team.controller';
import { TeamService } from './team.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { OrgGuard } from '../common/org-context';
import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { OrgContext } from '../common/org-context';
import { ALL_ORG_PERMISSIONS, ROLE_DEFAULTS } from '../common/org-permissions';

describe('OrgMembersController (Capabilities & Endpoints)', () => {
  let controller: OrgMembersController;
  let teamService: any;

  const testOrgId = 'org-uuid-111';

  const superAdminCtx: OrgContext = {
    userId: 'user-super-admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_SUPER_ADMIN,
    permissions: [...ALL_ORG_PERMISSIONS],
    email: 'super@acme.com',
    firstName: 'Alice',
    lastName: 'Super',
  };

  const orgAdminCtx: OrgContext = {
    userId: 'user-org-admin',
    organisationId: testOrgId,
    organisationName: 'Acme Corp',
    role: UserRole.ORGANISATION_ADMIN,
    permissions: [...ROLE_DEFAULTS.ORGANISATION_ADMIN],
    email: 'admin@acme.com',
    firstName: 'Bob',
    lastName: 'Admin',
  };

  beforeEach(async () => {
    teamService = {
      listMembers: jest.fn(),
      getMember: jest.fn(),
      updatePermissions: jest.fn(),
      updateMemberRole: jest.fn(),
      suspend: jest.fn(),
      reactivate: jest.fn(),
      remove: jest.fn(),
      permissionCatalog: jest.fn(),
      listInvitations: jest.fn(),
      createInvitation: jest.fn(),
      resendInvitation: jest.fn(),
      cancelInvitation: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrgMembersController],
      providers: [{ provide: TeamService, useValue: teamService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(OrgGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrgMembersController>(OrgMembersController);
  });

  describe('superAdminCapabilities', () => {
    it('returns full administrative capabilities for Organisation Super Admin', () => {
      const caps = controller.superAdminCapabilities(superAdminCtx);

      expect(caps.role).toBe(UserRole.ORGANISATION_SUPER_ADMIN);
      expect(caps.fullOrgAccess).toBe(true);
      expect(caps.canPurchaseTokens).toBe(true);
      expect(caps.canManageBilling).toBe(true);
      expect(caps.canManageOrgAdmins).toBe(true);
      expect(caps.canManageRecruiters).toBe(true);
      expect(caps.canManageSecurity).toBe(true);
    });
  });

  describe('adminCapabilities', () => {
    it('returns restricted operational capabilities for Organisation Admin', () => {
      const caps = controller.adminCapabilities(orgAdminCtx);

      expect(caps.role).toBe(UserRole.ORGANISATION_ADMIN);
      expect(caps.fullOrgAccess).toBe(false);
      expect(caps.canPurchaseTokens).toBe(false);
      expect(caps.canManageBilling).toBe(false);
      expect(caps.canManageOrgAdmins).toBe(false);
      expect(caps.canManageRecruiters).toBe(true);
    });
  });

  describe('Cross-Tenant Protection (:orgId validation)', () => {
    it('rejects getSuperAdminData if path orgId does not match authenticated context', () => {
      expect(() => controller.getSuperAdminData(superAdminCtx, 'other-org-id')).toThrow(ForbiddenException);
    });

    it('returns super admin data when path orgId matches authenticated context', () => {
      const res = controller.getSuperAdminData(superAdminCtx, testOrgId);
      expect(res.fullOrgAccess).toBe(true);
      expect(res.canCreateOrgAdmins).toBe(true);
    });

    it('rejects getAdminData if path orgId does not match authenticated context', () => {
      expect(() => controller.getAdminData(orgAdminCtx, 'other-org-id')).toThrow(ForbiddenException);
    });

    it('returns admin data when path orgId matches authenticated context', () => {
      const res = controller.getAdminData(orgAdminCtx, testOrgId);
      expect(res.canManageRecruiters).toBe(true);
      expect(res.canPurchaseTokens).toBe(false);
    });
  });

  describe('updateRole endpoint', () => {
    it('delegates to teamService.updateMemberRole', async () => {
      teamService.updateMemberRole.mockResolvedValue({ id: 'target-1', role: UserRole.ORGANISATION_ADMIN });

      const res = await controller.updateRole(superAdminCtx, 'target-1', { role: 'ORGANISATION_ADMIN' });

      expect(teamService.updateMemberRole).toHaveBeenCalledWith(superAdminCtx, 'target-1', UserRole.ORGANISATION_ADMIN);
      expect(res.role).toBe(UserRole.ORGANISATION_ADMIN);
    });
  });
});
