// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: PlatformAuthController
// ============================================================

import { Test, TestingModule } from '@nestjs/testing';
import { PlatformAuthController } from './platform-auth.controller';
import { PlatformAuthService, LoginResult } from './platform-auth.service';
import { PlatformLoginDto } from './dto/platform-login.dto';
import { RateLimiterGuard } from '../../../common/guards/rate-limiter.guard';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/interfaces/authenticated-user.interface';

describe('PlatformAuthController', () => {
  let controller: PlatformAuthController;
  let authService: jest.Mocked<PlatformAuthService>;

  const mockLoginResult: LoginResult = {
    accessToken: 'mock.jwt.access.token',
    user: {
      id: 'usr_super_1',
      email: 'superadmin@clyptus.com',
      firstName: 'Platform',
      lastName: 'Super',
      role: UserRole.PLATFORM_SUPER_ADMIN,
      permissions: ['*'],
      department: 'Executive',
    },
    sessionId: 'sess_123',
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockActor: AuthenticatedUser = {
    userId: 'usr_super_1',
    email: 'superadmin@clyptus.com',
    firstName: 'Platform',
    lastName: 'Super',
    role: UserRole.PLATFORM_SUPER_ADMIN,
    permissions: ['*'],
    sessionId: 'sess_123',
  };

  beforeEach(async () => {
    const mockAuthService = {
      login: jest.fn().mockResolvedValue(mockLoginResult),
      logout: jest.fn().mockResolvedValue({ message: 'Logged out successfully' }),
      getMe: jest.fn().mockResolvedValue({
        id: 'usr_super_1',
        email: 'superadmin@clyptus.com',
        firstName: 'Platform',
        lastName: 'Super',
        role: UserRole.PLATFORM_SUPER_ADMIN,
        permissions: ['*'],
        department: 'Executive',
        notes: null,
        createdAt: new Date(),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlatformAuthController],
      providers: [
        {
          provide: PlatformAuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(RateLimiterGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PlatformAuthController>(PlatformAuthController);
    authService = module.get(PlatformAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate user and return access token with session', async () => {
      const dto: PlatformLoginDto = {
        email: 'superadmin@clyptus.com',
        password: 'ValidPassword123!',
      };

      const mockReq: any = {
        headers: { 'user-agent': 'Jest-Test-Agent' },
        ip: '127.0.0.1',
      };

      const result = await controller.login(dto, mockReq);

      expect(authService.login).toHaveBeenCalledWith(dto, '127.0.0.1', 'Jest-Test-Agent');
      expect(result).toEqual(mockLoginResult);
      expect(result.accessToken).toBe('mock.jwt.access.token');
    });
  });

  describe('logout', () => {
    it('should revoke the active session server-side', async () => {
      const mockReq: any = {
        headers: { 'user-agent': 'Jest-Test-Agent' },
        ip: '127.0.0.1',
      };

      const result = await controller.logout(mockActor, mockReq);

      expect(authService.logout).toHaveBeenCalledWith(mockActor, '127.0.0.1', 'Jest-Test-Agent');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getMe', () => {
    it('should return profile and assigned permissions for current authenticated user', async () => {
      const result = await controller.getMe(mockActor);

      expect(authService.getMe).toHaveBeenCalledWith(mockActor);
      expect(result.id).toBe('usr_super_1');
      expect(result.role).toBe(UserRole.PLATFORM_SUPER_ADMIN);
      expect(result.permissions).toEqual(['*']);
    });
  });
});
