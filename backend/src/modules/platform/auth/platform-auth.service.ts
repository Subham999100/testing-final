// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Service: Platform Authentication & Session Management
// ============================================================

import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { AuditService } from '../../audit/audit.service';
import { PlatformSecurityService } from '../security/platform-security.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';
import { UserRole, SecuritySeverity } from '@prisma/client';

export interface LoginResult {
  accessToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    permissions: string[];
    department?: string | null;
  };
  sessionId: string;
  expiresAt: string;
}

@Injectable()
export class PlatformAuthService {
  private readonly logger = new Logger(PlatformAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly securityService: PlatformSecurityService,
  ) {}

  /**
   * Authenticates a Platform Admin or Super Admin, issues a JWT,
   * and creates an authoritative PlatformSession record.
   */
  async login(
    dto: PlatformLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResult> {
    const normalizedEmail = dto.email.toLowerCase().trim();

    // 1. Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { platformAdminProfile: true },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for nonexistent user: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Restrict login strictly to platform roles
    if (
      user.role !== UserRole.PLATFORM_SUPER_ADMIN &&
      user.role !== UserRole.PLATFORM_ADMIN
    ) {
      this.logger.warn(
        `Non-platform user role [${user.role}] attempted platform login: ${normalizedEmail}`,
      );
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Verify user active status
    if (!user.isActive) {
      this.logger.warn(`Deactivated user attempted login: ${normalizedEmail}`);
      throw new UnauthorizedException('Account has been deactivated');
    }

    // 4. Verify platform admin profile active status for delegated admins
    if (user.role === UserRole.PLATFORM_ADMIN) {
      if (!user.platformAdminProfile || !user.platformAdminProfile.isActive) {
        this.logger.warn(
          `Platform admin with inactive profile attempted login: ${normalizedEmail}`,
        );
        throw new UnauthorizedException('Admin profile has been deactivated');
      }
    }

    // 5. Verify password hash using bcrypt
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      // Record failed login security event for intrusion detection
      await this.securityService.recordSecurityEvent({
        eventType: 'FAILED_ADMIN_LOGIN',
        severity: SecuritySeverity.MEDIUM,
        actorId: user.id,
        ipAddress,
        userAgent,
        details: { email: normalizedEmail },
      });

      this.logger.warn(`Invalid password provided for: ${normalizedEmail}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // 6. Resolve permissions
    let permissions: string[] = [];
    if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
      permissions = ['*'];
    } else if (user.role === UserRole.PLATFORM_ADMIN) {
      permissions = user.platformAdminProfile?.permissions || [];
    }

    // 7. Calculate session expiration (default: 24h)
    const expiresIn = this.configService.get<string>('jwt.expiresIn') || '1d';
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const sessionId = crypto.randomUUID();

    // 8. Sign JWT with minimal claims
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    };

    const accessToken = this.jwtService.sign(payload);

    // 9. Compute SHA-256 hash of token for safe DB storage
    const tokenHash = crypto.createHash('sha256').update(accessToken).digest('hex');

    // 10. Persist authoritative PlatformSession in database
    await this.prisma.platformSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash,
        ipAddress: ipAddress || null,
        userAgent: userAgent ? userAgent.substring(0, 500) : null,
        expiresAt,
      },
    });

    // 11. Record immutable audit log
    await this.auditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: 'PLATFORM_LOGIN',
      entityType: 'PLATFORM_SESSION',
      entityId: sessionId,
      metadata: { email: user.email, department: user.platformAdminProfile?.department },
      ipAddress,
      userAgent,
    });

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
        department: user.platformAdminProfile?.department || null,
      },
      sessionId,
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Revokes the caller's active session, immediately invalidating the JWT.
   */
  async logout(
    actor: AuthenticatedUser,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{ message: string }> {
    if (actor.sessionId) {
      await this.prisma.platformSession.updateMany({
        where: { id: actor.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await this.auditService.record({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'PLATFORM_LOGOUT',
        entityType: 'PLATFORM_SESSION',
        entityId: actor.sessionId,
        ipAddress,
        userAgent,
      });
    }

    return { message: 'Logged out successfully' };
  }

  /**
   * Returns current authenticated user context and profile.
   */
  async getMe(actor: AuthenticatedUser) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
      include: { platformAdminProfile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User account not found');
    }

    let permissions: string[] = [];
    if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
      permissions = ['*'];
    } else if (user.role === UserRole.PLATFORM_ADMIN) {
      permissions = user.platformAdminProfile?.permissions || [];
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      permissions,
      department: user.platformAdminProfile?.department || null,
      notes: user.platformAdminProfile?.notes || null,
      createdAt: user.createdAt,
    };
  }
}
