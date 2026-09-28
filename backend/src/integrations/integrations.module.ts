// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Global Integrations Module
// ============================================================

import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis/redis.service';
import { BullMQService } from './bullmq/bullmq.service';
import { CloudStorageService } from './storage/storage.service';
import { PaymentGatewayService } from './payments/payment-gateway.service';
import { EmailService } from './email/email.service';
import { OpenSearchService } from './opensearch/opensearch.service';
import { GeminiAiService } from './ai/gemini.service';
import { ObservabilityService } from './observability/observability.service';

@Global()
@Module({
  providers: [
    RedisService,
    BullMQService,
    CloudStorageService,
    PaymentGatewayService,
    EmailService,
    OpenSearchService,
    GeminiAiService,
    ObservabilityService,
  ],
  exports: [
    RedisService,
    BullMQService,
    CloudStorageService,
    PaymentGatewayService,
    EmailService,
    OpenSearchService,
    GeminiAiService,
    ObservabilityService,
  ],
})
export class IntegrationsModule {}
