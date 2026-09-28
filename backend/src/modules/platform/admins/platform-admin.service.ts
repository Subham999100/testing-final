// ============================================================
// PLATFORM SUPER ADMIN
// Purpose:
// Handles creation and lifecycle management of Platform Admins.
//
// Security:
// Only PLATFORM_SUPER_ADMIN can execute these operations.
// Platform Admins can NEVER create or promote Platform Super Admins.
//
// Integration:
// Shared auth system verifies credentials created here.
// ============================================================

import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { CreatePlatformAdminDto } from './dto/create-platform-admin.dto';
import { UpdatePlatformAdminDto } from './dto/update-platform-admin.dto';
import { QueryPlatformAdminDto } from './dto/query-platform-admin.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole } from '@prisma/client';

@Injectable()
export class PlatformAdminService {
  private readonly logger = new Logger(PlatformAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Lists all Platform Admins with department, active status, and permissions.
   */
  async findAll(query: QueryPlatformAdminDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));
    const skip = (page - 1) * limit;

    const where: any = {
      role: { in: [UserRole.PLATFORM_ADMIN, UserRole.PLATFORM_SUPER_ADMIN] },
    };

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    if (query.department) {
      where.platformAdminProfile = {
        department: query.department,
      };
    }

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: 'insensitive' } },
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          isEmailVerified: true,
          createdAt: true,
          updatedAt: true,
          platformAdminProfile: {
            select: {
              department: true,
              permissions: true,
              notes: true,
              isActive: true,
            },
          },
        },
      }),
    ]);

    return {
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Retrieves single admin profile.
   */
  async findOne(id: string) {
    const admin = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        platformAdminProfile: true,
      },
    });

    if (!admin || (admin.role !== UserRole.PLATFORM_ADMIN && admin.role !== UserRole.PLATFORM_SUPER_ADMIN)) {
      throw new NotFoundException(`Platform Admin with ID ${id} not found`);
    }

    return admin;
  }

  /**
   * Creates a new Platform Admin account.
   * STRICT SECURITY: Only PLATFORM_SUPER_ADMIN can call this.
   */
  async create(dto: CreatePlatformAdminDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    if (actor.role !== UserRole.PLATFORM_SUPER_ADMIN) {
      throw new ForbiddenException('CRITICAL: Only Platform Super Admin can create Platform Admins');
    }

    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException(`User with email '${dto.email}' already exists`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(dto.password, salt);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: UserRole.PLATFORM_ADMIN, // Explicitly fixed to PLATFORM_ADMIN
        isActive: true,
        isEmailVerified: true,
        platformAdminProfile: {
          create: {
            department: dto.department || 'Operations',
            permissions: dto.permissions || [],
            notes: dto.notes,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        platformAdminProfile: true,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PLATFORM_ADMIN_CREATED',
      entityType: 'PLATFORM_ADMIN',
      entityId: user.id,
      metadata: { email: user.email, department: dto.department, permissions: dto.permissions },
      ipAddress,
      userAgent,
    });

    return user;
  }

  /**
   * Updates an existing Platform Admin.
   */
  async update(id: string, dto: UpdatePlatformAdminDto, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    if (actor.role !== UserRole.PLATFORM_SUPER_ADMIN) {
      throw new ForbiddenException('CRITICAL: Only Platform Super Admin can modify Platform Admins');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id },
      include: { platformAdminProfile: true },
    });

    if (!existing || existing.role !== UserRole.PLATFORM_ADMIN) {
      throw new NotFoundException(`Platform Admin with ID ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        isActive: dto.isActive !== undefined ? dto.isActive : existing.isActive,
        platformAdminProfile: {
          update: {
            department: dto.department !== undefined ? dto.department : existing.platformAdminProfile?.department,
            permissions: dto.permissions !== undefined ? dto.permissions : existing.platformAdminProfile?.permissions,
            notes: dto.notes !== undefined ? dto.notes : existing.platformAdminProfile?.notes,
            isActive: dto.isActive !== undefined ? dto.isActive : existing.platformAdminProfile?.isActive,
          },
        },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        platformAdminProfile: true,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'PLATFORM_ADMIN_UPDATED',
      entityType: 'PLATFORM_ADMIN',
      entityId: id,
      metadata: { updatedFields: Object.keys(dto) },
      ipAddress,
      userAgent,
    });

    return updated;
  }

  /**
   * Activates/Deactivates a Platform Admin.
   */
  async toggleStatus(id: string, isActive: boolean, actor: AuthenticatedUser, ipAddress?: string, userAgent?: string) {
    if (actor.role !== UserRole.PLATFORM_SUPER_ADMIN) {
      throw new ForbiddenException('CRITICAL: Only Platform Super Admin can toggle Platform Admin status');
    }

    const existing = await this.prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== UserRole.PLATFORM_ADMIN) {
      throw new NotFoundException(`Platform Admin with ID ${id} not found`);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        isActive,
        platformAdminProfile: {
          update: { isActive },
        },
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        role: true,
      },
    });

    await this.auditService.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: isActive ? 'PLATFORM_ADMIN_ACTIVATED' : 'PLATFORM_ADMIN_DEACTIVATED',
      entityType: 'PLATFORM_ADMIN',
      entityId: id,
      metadata: { targetEmail: existing.email, newStatus: isActive },
      ipAddress,
      userAgent,
    });

    return updated;
  }
}
