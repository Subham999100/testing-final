// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Unit Test: RateLimiterGuard (Brute-Force & Flood Protection)
// ============================================================

import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimiterGuard } from './rate-limiter.guard';

describe('RateLimiterGuard', () => {
  let guard: RateLimiterGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RateLimiterGuard(reflector);
    guard.reset();
  });

  const createMockContext = (ip = '192.168.1.100', path = '/api/v1/platform/auth/login') => {
    const headers: Record<string, string> = {};
    const responseHeaders: Record<string, any> = {};

    const request = {
      ip,
      path,
      headers,
    };

    const response = {
      setHeader: jest.fn((key: string, val: any) => {
        responseHeaders[key] = val;
      }),
    };

    const context = {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;

    return { context, response };
  };

  it('should allow requests within the rate limit', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ points: 3, duration: 60 });
    const { context } = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw 429 Too Many Requests when points limit is exceeded', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ points: 2, duration: 60 });
    const { context, response } = createMockContext();

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);

    try {
      guard.canActivate(context);
      fail('Expected HttpException 429');
    } catch (err: any) {
      expect(err).toBeInstanceOf(HttpException);
      expect(err.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      expect(response.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    }
  });

  it('should track different IPs independently', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({ points: 1, duration: 60 });
    const clientA = createMockContext('10.0.0.1');
    const clientB = createMockContext('10.0.0.2');

    expect(guard.canActivate(clientA.context)).toBe(true);
    expect(() => guard.canActivate(clientA.context)).toThrow(HttpException);

    // Client B should still be allowed
    expect(guard.canActivate(clientB.context)).toBe(true);
  });
});
