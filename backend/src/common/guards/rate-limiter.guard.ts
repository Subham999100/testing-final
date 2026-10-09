// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Rate Limiter Guard - In-Memory Slotted Brute-Force & Flood Protection
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const RATE_LIMIT_KEY = 'rate_limit_options';

export interface RateLimitOptions {
  points: number; // Maximum allowed requests
  duration: number; // Time window in seconds
}

export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

interface ClientRateEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly clients = new Map<string, ClientRateEntry>();
  private lastCleanup = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    ) || { points: 5, duration: 60 }; // Default: 5 requests per 60 seconds

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const forwarded = request.headers['x-forwarded-for'];
    const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : request.ip) || '127.0.0.1';
    const key = `${ip}:${request.path || request.url}`;

    const now = Date.now();

    // Routine memory cleanup every 5 minutes
    if (now - this.lastCleanup > 300000) {
      this.cleanup(now);
    }

    let entry = this.clients.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + options.duration * 1000,
      };
      this.clients.set(key, entry);
      return true;
    }

    entry.count++;

    if (entry.count > options.points) {
      const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Retry-After', retryAfterSeconds);
      }
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: `Too many requests. Please try again after ${retryAfterSeconds} seconds.`,
          error: 'Too Many Requests',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private cleanup(now: number) {
    this.lastCleanup = now;
    for (const [key, entry] of this.clients.entries()) {
      if (now > entry.resetAt) {
        this.clients.delete(key);
      }
    }
  }

  // Exposed for automated testing
  reset() {
    this.clients.clear();
  }
}
