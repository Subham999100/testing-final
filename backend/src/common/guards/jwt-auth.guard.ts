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
      const secret = this.configService.get<string>('JWT_SECRET', 'super-secret-jwt-key-replace-in-production-min-32-chars-long');
      const payload = this.jwtService.verify(token, { secret });

      // Fetch user from DB to ensure account is active and role has not been revoked
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub || payload.userId },
        include: { platformAdminProfile: true },
      });

      if (!user) {
        throw new UnauthorizedException('User session invalid or user does not exist');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('User account has been deactivated');
      }

      // Attach strongly-typed identity to request
      const authenticatedUser: AuthenticatedUser = {
        userId: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissions: user.platformAdminProfile?.permissions || (user.role === UserRole.PLATFORM_SUPER_ADMIN ? ['*'] : []),
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
