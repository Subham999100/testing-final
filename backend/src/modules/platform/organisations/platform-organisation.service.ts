// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Handles platform-level organisation management (creation, oversight,
// activation, suspension, and metadata updates).
//
// Security:
// Only authenticated platform administrators with appropriate permissions
// can execute these operations. Never trust client-provided actor identity.
//
// Integration:
// Organisation module will consume organisation status changes generated here.
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreateOrganisationDto } from './dto/create-organisation.dto';
import { UpdateOrganisationDto } from './dto/update-organisation.dto';
import { SuspendOrganisationDto } from './dto/suspend-organisation.dto';
import { QueryOrganisationDto } from './dto/query-organisation.dto';
import { TransferSuperAdminDto } from './dto/transfer-super-admin.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import {
  Prisma,
  OrganisationStatus,
  TokenTransactionType,
  UserRole,
  OrgApplicationStatus,
  ApplicationPaymentStatus,
  ApplicationReviewAction,
} from '@prisma/client';
import { ALL_ORG_PERMISSIONS } from '../../org/common/org-permissions';

export interface ProvisionOrganisationCoreParams {
  name: string;
  slug: string;
  domain?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  tier?: string;
  recruiterLimit?: number;
  industry?: string | null;
  companySize?: string | null;
  website?: string | null;
  address?: string | null;
  billingDetails?: any;
  initialTokens?: number;
  tokenTransactionReason?: string;
  tokenTransactionMetadata?: Record<string, any>;
  superAdminFirstName: string;
  superAdminLastName: string;
  superAdminEmail: string;
  superAdminPasswordHash: string;
  actorUserId: string;
}

@Injectable()
export class PlatformOrganisationService {
  private readonly logger = new Logger(PlatformOrganisationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Retrieves a paginated, filterable list of all platform organisations.
   */
  async findAll(query: QueryOrganisationDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.tier) {
      where.tier = query.tier;
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { domain: { contains: query.search, mode: 'insensitive' } },
        { contactEmail: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || 'createdAt';
    orderBy[sortField] = query.sortOrder === 'asc' ? 'asc' : 'desc';

    const [total, items] = await Promise.all([
      this.prisma.organisation.count({ where }),
      this.prisma.organisation.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          metadata: true,
          tokenBalance: true,
          _count: {
            select: { users: true },
          },
        },
      }),
    ]);

    const orgIds = items.map((org) => org.id);
    const [recruiterCounts, superAdminUsers] = await Promise.all([
      orgIds.length > 0
        ? this.prisma.user.groupBy({
            by: ['organisationId'],
            where: {
              organisationId: { in: orgIds },
              role: UserRole.RECRUITER,
              isActive: true,
            },
            _count: { id: true },
          })
        : [],
      orgIds.length > 0
        ? this.prisma.user.findMany({
            where: {
              organisationId: { in: orgIds },
              role: UserRole.ORGANISATION_SUPER_ADMIN,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              isActive: true,
              createdAt: true,
              organisationId: true,
            },
          })
        : [],
    ]);

    const recruiterCountMap = new Map(
      recruiterCounts
        .filter((rc) => rc.organisationId !== null)
        .map((rc) => [rc.organisationId as string, rc._count.id]),
    );

    const superAdminMap = new Map(
      superAdminUsers
        .filter((u) => u.organisationId !== null)
        .map((u) => [
          u.organisationId as string,
          {
            id: u.id,
            email: u.email,
            name: `${u.firstName} ${u.lastName}`.trim(),
            role: u.role,
            isActive: u.isActive,
            status: u.isActive ? 'ACTIVE' : 'INACTIVE',
            createdAt: u.createdAt,
          },
        ]),
    );

    const transformedItems = items.map((org) => {
      const limit = org.recruiterLimit ?? 25;
      const recruitersUsed = recruiterCountMap.get(org.id) || 0;
      const recruitersAvailable = Math.max(0, limit - recruitersUsed);

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        contactEmail: org.contactEmail,
        contactPhone: org.contactPhone,
        status: org.status,
        suspensionReason: org.suspensionReason,
        suspendedAt: org.suspendedAt,
        tier: org.tier,
        recruiterLimit: limit,
        maxRecruiters: limit,
        recruitersUsed,
        recruitersAvailable,
        superAdmin: superAdminMap.get(org.id) || null,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        membersCount: org._count.users,
        tokenBalance: org.tokenBalance?.balance || 0,
        allocatedTokens: org.tokenBalance?.allocatedTokens || 0,
        consumedTokens: org.tokenBalance?.consumedTokens || 0,
        industry: org.metadata?.industry || null,
        companySize: org.metadata?.companySize || null,
        website: org.metadata?.website || null,
      };
    });

    return {
      data: transformedItems,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single organisation details including balance, metadata, and activity.
   */
  async findOne(id: string) {
    const org = await this.prisma.organisation.findUnique({
      where: { id },
      include: {
        metadata: true,
        tokenBalance: true,
        allocationLimit: true,
        _count: {
          select: { users: true, tokenTransactions: true },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    // Fetch recent activity audit logs
    const recentActivity = await this.prisma.auditLog.findMany({
      where: { organisationId: id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        action: true,
        entityType: true,
        actorRole: true,
        createdAt: true,
      },
    });

    // Fetch Super Admin for organisation access oversight
    const superAdminUser = await this.prisma.user.findFirst({
      where: {
        organisationId: id,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    const recruitersUsed = await this.prisma.user.count({
      where: {
        organisationId: id,
        role: UserRole.RECRUITER,
        isActive: true,
      },
    });
    const recruiterLimit = org.recruiterLimit ?? 25;
    const recruitersAvailable = Math.max(0, recruiterLimit - recruitersUsed);

    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      domain: org.domain,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      status: org.status,
      suspensionReason: org.suspensionReason,
      suspendedAt: org.suspendedAt,
      tier: org.tier,
      recruiterLimit,
      maxRecruiters: recruiterLimit,
      recruitersUsed,
      recruitersAvailable,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
      membersCount: org._count.users,
      totalTransactions: org._count.tokenTransactions,
      metadata: org.metadata,
      // Flattened to numbers, same shape as findAll (the UI renders these directly).
      tokenBalance: org.tokenBalance?.balance || 0,
      allocatedTokens: org.tokenBalance?.allocatedTokens || 0,
      consumedTokens: org.tokenBalance?.consumedTokens || 0,
      allocationLimit: org.allocationLimit,
      superAdmin: superAdminUser
        ? {
            id: superAdminUser.id,
            name: `${superAdminUser.firstName} ${superAdminUser.lastName}`.trim(),
            email: superAdminUser.email,
            role: superAdminUser.role,
            isActive: superAdminUser.isActive,
            status: superAdminUser.isActive ? 'ACTIVE' : 'INACTIVE',
            createdAt: superAdminUser.createdAt,
          }
        : null,
      recentActivity,
    };
  }

  /**
   * Resets the password for the Organisation Super Admin of the specified organisation.
   * Generates a new secure temporary password, hashes it, replaces the existing password hash,
   * revokes existing sessions, records an audit log (without credentials), and returns the temporary password once.
   */
  async resetSuperAdminPassword(
    organisationId: string,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException(`Organisation with ID ${organisationId} not found`);
    }

    // Scoped strictly to the target organisation and ORGANISATION_SUPER_ADMIN role
    const superAdmins = await this.prisma.user.findMany({
      where: {
        organisationId,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
      },
    });

    if (superAdmins.length === 0) {
      throw new NotFoundException(
        `No Organisation Super Admin found for organisation '${org.name}'`,
      );
    }

    if (superAdmins.length > 1) {
      throw new ConflictException(
        `Multiple Organisation Super Admins found for organisation '${org.name}'. Please contact system administrator.`,
      );
    }

    const superAdmin = superAdmins[0];

    // Generate new secure temporary password
    const temporaryPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    // Update the password hash in the database and enforce password change on next login
    await this.prisma.user.update({
      where: { id: superAdmin.id },
      data: { passwordHash, mustChangePassword: true },
    });

    // Revoke any existing active sessions so previous logins are invalidated
    await this.prisma.platformSession.updateMany({
      where: { userId: superAdmin.id, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Record immutable audit log - NEVER log the password or hash
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_SUPER_ADMIN_PASSWORD_RESET',
      entityType: 'USER',
      entityId: superAdmin.id,
      organisationId,
      metadata: {
        organisationName: org.name,
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        targetRole: superAdmin.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      superAdmin: {
        id: superAdmin.id,
        name: `${superAdmin.firstName} ${superAdmin.lastName}`.trim(),
        email: superAdmin.email,
        role: superAdmin.role,
      },
      temporaryPassword,
    };
  }

  /**
   * Transfers Organisation Super Admin credentials for the specified organisation.
   * Changes the login credentials (email and password) of the EXISTING Organisation Super Admin user
   * while keeping the exact same user ID, organisation, role, and all organisation-owned data.
   * Invalidates old sessions, sets mustChangePassword = true, records audit log, and returns safe data.
   */
  async transferSuperAdminCredentials(
    organisationId: string,
    dto: TransferSuperAdminDto,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.newPassword !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const org = await this.prisma.organisation.findUnique({
      where: { id: organisationId },
    });
    if (!org) {
      throw new NotFoundException(`Organisation with ID ${organisationId} not found`);
    }

    // Locate the existing Organisation Super Admin
    const superAdmins = await this.prisma.user.findMany({
      where: {
        organisationId,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
      },
    });

    if (superAdmins.length === 0) {
      throw new NotFoundException(
        `No Organisation Super Admin found for organisation '${org.name}'`,
      );
    }

    if (superAdmins.length > 1) {
      throw new ConflictException(
        `Multiple Organisation Super Admins found for organisation '${org.name}'. Please contact system administrator.`,
      );
    }

    const superAdmin = superAdmins[0];
    const normalizedNewEmail = dto.newEmail.trim().toLowerCase();

    // Verify new email uniqueness against other users
    const existingWithEmail = await this.prisma.user.findUnique({
      where: { email: normalizedNewEmail },
    });
    if (existingWithEmail && existingWithEmail.id !== superAdmin.id) {
      throw new ConflictException(`Email '${dto.newEmail}' is already registered to another user`);
    }

    // Hash the new password securely using bcrypt
    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    // Update existing user credentials and revoke sessions in transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: superAdmin.id },
        data: {
          email: normalizedNewEmail,
          passwordHash,
          mustChangePassword: true,
        },
      });

      // Revoke any existing active sessions for this user so old session token is invalidated
      await tx.platformSession.updateMany({
        where: { userId: superAdmin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    });

    // Record immutable audit log - NEVER log the password or hash
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_SUPER_ADMIN_CREDENTIALS_TRANSFERRED',
      entityType: 'USER',
      entityId: superAdmin.id,
      organisationId,
      metadata: {
        organisationName: org.name,
        superAdminId: superAdmin.id,
        oldEmail: superAdmin.email,
        newEmail: normalizedNewEmail,
        targetRole: superAdmin.role,
      },
      ipAddress,
      userAgent,
    });

    return {
      message: 'Organisation Super Admin credentials updated successfully',
      data: {
        userId: superAdmin.id,
        email: normalizedNewEmail,
        organisationId: org.id,
        role: superAdmin.role,
        mustChangePassword: true,
      },
    };
  }

  /**
   * Generates a cryptographically secure temporary password.
   * Format: 3 uppercase + 3 lowercase + 3 digits + 3 symbols = 12 chars min.
   */
  private generateTemporaryPassword(): string {
    const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lower = 'abcdefghjkmnpqrstuvwxyz';
    const digits = '23456789';
    const symbols = '!@#$%&';
    const pick = (pool: string, n: number) =>
      Array.from({ length: n }, () => pool[crypto.randomInt(pool.length)]).join('');
    const raw = pick(upper, 3) + pick(lower, 3) + pick(digits, 3) + pick(symbols, 3);
    // Fisher-Yates shuffle
    const arr = raw.split('');
    for (let i = arr.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
  }

  /**
   * Reusable transactional core for provisioning an organisation and its
   * associated ledger, limits, Super Admin user, and OrgMemberProfile.
   * MUST be executed inside an existing Prisma TransactionClient.
   * Ensures ONE DATABASE TRANSACTION owns the complete provisioning operation.
   */
  async provisionOrganisationCore(
    tx: Prisma.TransactionClient,
    params: ProvisionOrganisationCoreParams,
  ) {
    const initialTokens = params.initialTokens ?? 0;

    const org = await tx.organisation.create({
      data: {
        name: params.name,
        slug: params.slug,
        domain: params.domain || null,
        contactEmail: params.contactEmail,
        contactPhone: params.contactPhone || null,
        status: OrganisationStatus.ACTIVE,
        tier: params.tier || 'STANDARD',
        recruiterLimit: params.recruiterLimit ?? 25,
        metadata: {
          create: {
            industry: params.industry || null,
            companySize: params.companySize || null,
            website: params.website || null,
            address: params.address || null,
            billingDetails: params.billingDetails ?? undefined,
          },
        },
        tokenBalance: {
          create: {
            balance: initialTokens,
            allocatedTokens: initialTokens,
            consumedTokens: 0,
            reservedTokens: 0,
          },
        },
        allocationLimit: {
          create: {
            monthlyMaxAllocation: 25000,
            singleTxLimit: 10000,
          },
        },
      },
      include: {
        metadata: true,
        tokenBalance: true,
      },
    });

    // Record initial allocation ledger entry if tokens provided
    let tokenTransaction = null;
    if (initialTokens > 0) {
      tokenTransaction = await tx.tokenTransaction.create({
        data: {
          organisationId: org.id,
          actorId: params.actorUserId,
          type: TokenTransactionType.ALLOCATION,
          amount: initialTokens,
          balanceBefore: 0,
          balanceAfter: initialTokens,
          reason: params.tokenTransactionReason || 'Initial platform allocation upon organisation creation',
          metadata: params.tokenTransactionMetadata || { createdByPlatformSuperAdmin: true },
        },
      });
    }

    // Create the initial Organisation Super Admin user with mustChangePassword: true
    const superAdmin = await tx.user.create({
      data: {
        email: params.superAdminEmail.toLowerCase().trim(),
        passwordHash: params.superAdminPasswordHash,
        firstName: params.superAdminFirstName,
        lastName: params.superAdminLastName,
        role: UserRole.ORGANISATION_SUPER_ADMIN,
        organisationId: org.id,
        isActive: true,
        isEmailVerified: true,
        mustChangePassword: true,
        orgMemberProfile: {
          create: {
            organisationId: org.id,
            // Full permission set — ORGANISATION_SUPER_ADMIN ceiling
            permissions: [...ALL_ORG_PERMISSIONS],
            invitedById: params.actorUserId,
          },
        },
      },
    });

    return { org, superAdmin, tokenTransaction };
  }

  /**
   * Creates a new organisation at platform level with initial ledger balances
   * and the initial Organisation Super Admin account in a single transaction.
   * Reuses provisionOrganisationCore.
   */
  async create(dto: CreateOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    // ── pre-flight uniqueness checks ────────────────────────────
    const existingSlug = await this.prisma.organisation.findUnique({
      where: { slug: dto.slug },
    });
    if (existingSlug) {
      throw new ConflictException(`Organisation with slug '${dto.slug}' already exists`);
    }

    if (dto.domain) {
      const existingDomain = await this.prisma.organisation.findUnique({
        where: { domain: dto.domain },
      });
      if (existingDomain) {
        throw new ConflictException(`Organisation with domain '${dto.domain}' already exists`);
      }
    }

    // Check super admin email uniqueness BEFORE opening the transaction
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.superAdminEmail.toLowerCase().trim() },
    });
    if (existingUser) {
      throw new ConflictException(
        `A user with email '${dto.superAdminEmail}' already exists. Use a different email for the Organisation Super Admin.`,
      );
    }

    // Validate manual initial password matches confirmation
    if (dto.superAdminPassword !== dto.superAdminPasswordConfirmation) {
      throw new BadRequestException('Initial password and confirmation password do not match');
    }

    const initialTokens = dto.initialTokenAllocation || 0;

    // Hash the manually entered initial password BEFORE the transaction
    const passwordHash = await bcrypt.hash(dto.superAdminPassword, 12);

    // Parse superAdminName into first/last (split on first space)
    const nameParts = dto.superAdminName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '-';
    const superAdminEmail = dto.superAdminEmail.toLowerCase().trim();

    // ── atomic transaction ──────────────────────────────────────
    const { org, superAdmin } = await this.prisma.$transaction(async (tx) => {
      return this.provisionOrganisationCore(tx, {
        name: dto.name,
        slug: dto.slug,
        domain: dto.domain || null,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone || null,
        tier: dto.tier || 'STANDARD',
        recruiterLimit: dto.recruiterLimit ?? dto.maxRecruiters ?? 25,
        industry: dto.industry || null,
        companySize: dto.companySize || null,
        website: dto.website || null,
        initialTokens,
        tokenTransactionReason: 'Initial platform allocation upon organisation creation',
        tokenTransactionMetadata: { createdByPlatformSuperAdmin: true },
        superAdminFirstName: firstName,
        superAdminLastName: lastName,
        superAdminEmail,
        superAdminPasswordHash: passwordHash,
        actorUserId: actor.userId,
      });
    });

    // ── audit log (NO password data) ────────────────────────────
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_CREATED',
      entityType: 'ORGANISATION',
      entityId: org.id,
      organisationId: org.id,
      metadata: {
        name: org.name,
        slug: org.slug,
        initialTokens,
        superAdminId: superAdmin.id,
        superAdminEmail,
        // ⚠️  Never log the password or hash
      },
      ipAddress,
      userAgent,
    });

    // ── response (NO password returned) ─────────────────────────
    return {
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        contactEmail: org.contactEmail,
        status: org.status,
        tier: org.tier,
        tokenBalance: org.tokenBalance?.balance ?? 0,
        createdAt: org.createdAt,
      },
      superAdmin: {
        id: superAdmin.id,
        name: `${superAdmin.firstName} ${superAdmin.lastName}`.trim(),
        email: superAdmin.email,
        role: superAdmin.role,
      },
    };
  }

  /**
   * Provisions an approved OrganisationApplication atomically.
   * Creates Organisation, Metadata, TokenBalance, AllocationLimit,
   * TokenTransaction (if tokens > 0), Super Admin User, OrgMemberProfile,
   * links createdOrganisationId, updates application status to APPROVED,
   * records review history, and emits audit logs in a single transaction.
   *
   * Idempotent: If application is already provisioned, returns existing organisation safely.
   */
  async provisionApprovedApplication(
    applicationId: string,
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const application = await this.prisma.organisationApplication.findUnique({
      where: { id: applicationId },
      include: {
        selectedPlan: true,
        createdOrganisation: {
          include: {
            tokenBalance: true,
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Organisation application with ID '${applicationId}' not found`);
    }

    // ── Idempotency Check ──────────────────────────────────────
    if (application.createdOrganisationId) {
      const existingOrg =
        application.createdOrganisation ||
        (await this.prisma.organisation.findUnique({
          where: { id: application.createdOrganisationId },
          include: { tokenBalance: true },
        }));

      const existingSuperAdmin = await this.prisma.user.findFirst({
        where: {
          organisationId: application.createdOrganisationId,
          role: UserRole.ORGANISATION_SUPER_ADMIN,
        },
      });

      return {
        id: application.id,
        applicationNumber: application.applicationNumber,
        status: application.status,
        reviewedAt: application.reviewedAt,
        createdOrganisationId: application.createdOrganisationId,
        isAlreadyProvisioned: true,
        message: 'Organisation application is already provisioned.',
        organisation: existingOrg
          ? {
              id: existingOrg.id,
              name: existingOrg.name,
              slug: existingOrg.slug,
              domain: existingOrg.domain,
              contactEmail: existingOrg.contactEmail,
              status: existingOrg.status,
              tier: existingOrg.tier,
              tokenBalance: existingOrg.tokenBalance?.balance ?? 0,
              createdAt: existingOrg.createdAt,
            }
          : null,
        superAdmin: existingSuperAdmin
          ? {
              id: existingSuperAdmin.id,
              name: `${existingSuperAdmin.firstName} ${existingSuperAdmin.lastName}`.trim(),
              email: existingSuperAdmin.email,
              role: existingSuperAdmin.role,
            }
          : null,
      };
    }

    // ── Status Validation ──────────────────────────────────────
    if (application.status === OrgApplicationStatus.REJECTED) {
      throw new BadRequestException('Cannot approve or provision an application that has been rejected.');
    }

    if (
      application.status !== OrgApplicationStatus.PENDING_REVIEW &&
      application.status !== OrgApplicationStatus.MORE_INFO_REQUESTED &&
      application.status !== OrgApplicationStatus.APPROVED
    ) {
      throw new BadRequestException(
        `Cannot approve application in status '${application.status}'. Only reviewable applications can be approved.`,
      );
    }

    // ── Pre-flight Uniqueness Checks ───────────────────────────
    const existingSlug = await this.prisma.organisation.findUnique({
      where: { slug: application.slug },
    });
    if (existingSlug && existingSlug.id !== application.createdOrganisationId) {
      throw new ConflictException(
        `An organisation with slug '${application.slug}' already exists. Cannot provision duplicate organisation.`,
      );
    }

    if (application.domain) {
      const existingDomain = await this.prisma.organisation.findUnique({
        where: { domain: application.domain },
      });
      if (existingDomain && existingDomain.id !== application.createdOrganisationId) {
        throw new ConflictException(
          `An organisation with domain '${application.domain}' already exists. Cannot provision duplicate domain.`,
        );
      }
    }

    const superAdminEmail = application.ownerEmail.toLowerCase().trim();
    const existingUser = await this.prisma.user.findUnique({
      where: { email: superAdminEmail },
    });
    if (existingUser) {
      throw new ConflictException(
        `A user with email '${application.ownerEmail}' already exists. Cannot create Organisation Super Admin account.`,
      );
    }

    // ── Authoritative Plan / Token Resolution ───────────────────
    let initialTokens = 0;
    let planName = 'Default';
    let planCode = 'NONE';

    if (application.selectedPlanId) {
      const plan = await this.prisma.tokenPlan.findUnique({
        where: { id: application.selectedPlanId },
      });
      if (!plan) {
        throw new BadRequestException(
          `Selected plan with ID '${application.selectedPlanId}' was not found.`,
        );
      }
      if (!plan.isActive) {
        throw new BadRequestException(
          `Selected plan '${plan.name}' is inactive.`,
        );
      }
      planName = plan.name;
      planCode = plan.code;

      // Business Rule:
      // Payment proof screenshot or paymentReference is NOT automatic payment verification.
      // Free plans (priceCents === 0) or explicitly VERIFIED payments allocate tokens.
      // Unverified paid plans (paymentStatus !== VERIFIED) allocate 0 initial tokens.
      if (plan.priceCents === 0 || application.paymentStatus === ApplicationPaymentStatus.VERIFIED) {
        initialTokens = plan.tokenAmount;
      } else {
        initialTokens = 0;
      }
    }

    // ── Generate Cryptographic Temporary Password ───────────────
    const tempPassword = this.generateTemporaryPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const now = new Date();

    // ── Single Atomic Database Transaction ──────────────────────
    const { org, superAdmin, updatedApp } = await this.prisma.$transaction(async (tx) => {
      // 1. Optimistic Concurrency Lock: update status where createdOrganisationId is null
      const updateResult = await tx.organisationApplication.updateMany({
        where: {
          id: application.id,
          createdOrganisationId: null,
          status: {
            in: [
              OrgApplicationStatus.PENDING_REVIEW,
              OrgApplicationStatus.MORE_INFO_REQUESTED,
              OrgApplicationStatus.APPROVED,
            ],
          },
        },
        data: {
          status: OrgApplicationStatus.APPROVED,
          reviewedByUserId: actor.userId,
          reviewedAt: now,
        },
      });

      if (updateResult.count === 0) {
        throw new ConflictException(
          'Application was already provisioned or modified concurrently by another administrator.',
        );
      }

      // 2. Provision core models using reusable transactional core
      const { org, superAdmin } = await this.provisionOrganisationCore(tx, {
        name: application.name,
        slug: application.slug,
        domain: application.domain,
        contactEmail: application.contactEmail,
        contactPhone: application.contactPhone,
        tier: 'STANDARD',
        recruiterLimit: 25,
        industry: application.industry,
        companySize: application.companySize,
        website: application.website,
        address: application.address,
        billingDetails: {
          ownerDesignation: application.ownerDesignation || null,
          ownerPhone: application.ownerPhone || null,
          paymentMethod: application.paymentMethod || null,
          paymentReference: application.paymentReference || null,
          paymentStatus: application.paymentStatus,
        },
        initialTokens,
        tokenTransactionReason: `Initial platform allocation upon application approval (Plan: ${planName})`,
        tokenTransactionMetadata: {
          planId: application.selectedPlanId,
          planCode,
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
        },
        superAdminFirstName: application.ownerFirstName,
        superAdminLastName: application.ownerLastName,
        superAdminEmail,
        superAdminPasswordHash: passwordHash,
        actorUserId: actor.userId,
      });

      // 3. Link application to newly created organisation
      const updatedApp = await tx.organisationApplication.update({
        where: { id: application.id },
        data: { createdOrganisationId: org.id },
      });

      // 4. Record ApplicationReviewHistory
      await tx.applicationReviewHistory.create({
        data: {
          applicationId: application.id,
          actorId: actor.userId,
          actorRole: actor.role,
          action: ApplicationReviewAction.APPROVED,
          notes: 'Application approved and organisation provisioned.',
          metadata: {
            organisationId: org.id,
            organisationSlug: org.slug,
            planId: application.selectedPlanId,
            initialTokens,
            adminEmail: actor.email,
            previousStatus: application.status,
          },
        },
      });

      return { org, superAdmin, updatedApp };
    });

    // ── Audit Logs (outside transaction) ────────────────────────
    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_CREATED',
      entityType: 'ORGANISATION',
      entityId: org.id,
      organisationId: org.id,
      metadata: {
        name: org.name,
        slug: org.slug,
        initialTokens,
        superAdminId: superAdmin.id,
        superAdminEmail: superAdmin.email,
        applicationId: application.id,
      },
      ipAddress,
      userAgent,
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_APPLICATION_APPROVED',
      entityType: 'ORGANISATION_APPLICATION',
      entityId: application.id,
      metadata: {
        applicationNumber: application.applicationNumber,
        organisationName: application.name,
        createdOrganisationId: org.id,
      },
      ipAddress,
      userAgent,
    });

    this.logger.log(
      `App ${application.id} approved & Org ${org.id} (${org.slug}) provisioned by Admin ${actor.userId}`,
    );

    // ── Response (Strictly NO password or token secrets returned) ─
    return {
      id: updatedApp.id,
      applicationNumber: updatedApp.applicationNumber,
      status: updatedApp.status,
      reviewedAt: updatedApp.reviewedAt,
      createdOrganisationId: org.id,
      message: 'Organisation application approved and provisioned successfully.',
      organisation: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        domain: org.domain,
        contactEmail: org.contactEmail,
        status: org.status,
        tier: org.tier,
        tokenBalance: org.tokenBalance?.balance ?? initialTokens,
        createdAt: org.createdAt,
      },
      superAdmin: {
        id: superAdmin.id,
        name: `${superAdmin.firstName} ${superAdmin.lastName}`.trim(),
        email: superAdmin.email,
        role: superAdmin.role,
      },
    };
  }

  /**
   * Updates organisation details and metadata.
   */
  async update(id: string, dto: UpdateOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({
      where: { id },
      include: { metadata: true },
    });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    const newRecruiterLimit = dto.recruiterLimit ?? dto.maxRecruiters;
    const limitChanged = newRecruiterLimit !== undefined && newRecruiterLimit !== existing.recruiterLimit;

    const updated = await this.prisma.organisation.update({
      where: { id },
      data: {
        name: dto.name,
        domain: dto.domain,
        contactEmail: dto.contactEmail,
        contactPhone: dto.contactPhone,
        tier: dto.tier,
        recruiterLimit: newRecruiterLimit,
        metadata: {
          upsert: {
            create: {
              industry: dto.industry,
              companySize: dto.companySize,
              website: dto.website,
            },
            update: {
              industry: dto.industry,
              companySize: dto.companySize,
              website: dto.website,
            },
          },
        },
      },
      include: { metadata: true },
    });

    if (limitChanged) {
      await this.auditService.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'RECRUITER_LIMIT_UPDATED',
        entityType: 'ORGANISATION',
        entityId: id,
        organisationId: id,
        metadata: {
          previousLimit: existing.recruiterLimit,
          newLimit: newRecruiterLimit,
        },
        ipAddress,
        userAgent,
      });
    }

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_UPDATED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: { updatedFields: Object.keys(dto) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Suspends an organisation.
   * Destructive operation: enforces mandatory reason, records actor, timestamp, and audit trail.
   */
  async suspend(id: string, dto: SuspendOrganisationDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    if (existing.status === OrganisationStatus.SUSPENDED) {
      throw new BadRequestException('Organisation is already suspended');
    }

    const suspended = await this.prisma.organisation.update({
      where: { id },
      data: {
        status: OrganisationStatus.SUSPENDED,
        suspensionReason: dto.reason,
        suspendedAt: new Date(),
        suspendedById: actor.userId,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_SUSPENDED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: {
        organisationName: existing.name,
        reason: dto.reason,
        previousStatus: existing.status,
      },
      ipAddress,
      userAgent,
    });

    return suspended;
  }

  /**
   * Activates a suspended organisation.
   */
  async activate(id: string, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    if (existing.status === OrganisationStatus.ACTIVE) {
      throw new BadRequestException('Organisation is already active');
    }

    const activated = await this.prisma.organisation.update({
      where: { id },
      data: {
        status: OrganisationStatus.ACTIVE,
        suspensionReason: null,
        suspendedAt: null,
        suspendedById: null,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_ACTIVATED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: {
        organisationName: existing.name,
        previousStatus: existing.status,
      },
      ipAddress,
      userAgent,
    });

    return activated;
  }

  /**
   * Archives/Deletes an organisation where permitted.
   */
  async remove(id: string, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    const existing = await this.prisma.organisation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Organisation with ID ${id} not found`);
    }

    const archived = await this.prisma.organisation.update({
      where: { id },
      data: { status: OrganisationStatus.ARCHIVED },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'ORGANISATION_ARCHIVED',
      entityType: 'ORGANISATION',
      entityId: id,
      organisationId: id,
      metadata: { organisationName: existing.name },
      ipAddress,
      userAgent,
    });

    return archived;
  }
}
