// ============================================================
// Clyptus Job Portal - Platform Super Admin
// JWT Authentication Guard - Verifies Cryptographic Identity
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { AuthenticatedUser } from '../interfaces/authenticated-user.interface';
import { UserRole } from '@prisma/client';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['Authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      throw new UnauthorizedException('Authentication token is missing');
    }

    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization token format');
    }

    try {
      const secret =
        this.configService.get<string>('jwt.secret') ||
        this.configService.get<string>('JWT_SECRET');

      if (!secret) {
        throw new UnauthorizedException('JWT configuration error');
      }

      const payload = this.jwtService.verify(token, { secret });
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

      // Fetch session and associated user + admin profile in a single indexed query
      const session = await this.prisma.platformSession.findUnique({
        where: { tokenHash },
        include: {
          user: {
            include: { platformAdminProfile: true },
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session invalid or does not exist');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Session has been revoked');
      }

      if (session.expiresAt && session.expiresAt <= new Date()) {
        throw new UnauthorizedException('Session has expired');
      }

      const user = session.user;
      if (!user) {
        throw new UnauthorizedException('User does not exist');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account has been deactivated');
      }

      // Enforce active PlatformAdminProfile for PLATFORM_ADMIN
      if (user.role === UserRole.PLATFORM_ADMIN) {
        if (!user.platformAdminProfile || !user.platformAdminProfile.isActive) {
          throw new UnauthorizedException('Platform admin profile has been deactivated');
        }
      }

      // Strictly resolve permissions
      let permissions: string[] = [];
      if (user.role === UserRole.PLATFORM_SUPER_ADMIN) {
        permissions = ['*'];
      } else if (user.role === UserRole.PLATFORM_ADMIN) {
        permissions = user.platformAdminProfile?.permissions || [];
      }

      // Attach strongly-typed identity with sessionId to request
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        sessionId: session.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions,
        organisationId: user.organisationId,
      };

      request.user = authenticatedUser;
      return true;
    } catch (err) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication token');
    }
  }
}

