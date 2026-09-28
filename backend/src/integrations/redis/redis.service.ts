// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Integration: Redis Cache & Distributed State Service
//
// TODO(INTEGRATION): Connect this service to production Redis cluster
// once infrastructure configuration is deployed.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ICacheService {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: any, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

@Injectable()
export class RedisService implements ICacheService {
  private readonly logger = new Logger(RedisService.name);
  private memoryFallback = new Map<string, { value: any; expiresAt?: number }>();

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.logger.log(`Initialized Redis Service interface [Target: ${redisUrl || 'In-Memory Fallback'}]`);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.memoryFallback.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryFallback.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryFallback.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.memoryFallback.delete(key);
  }
}
