// ============================================================
// Clyptus Job Portal - Platform Super Admin
// Integration: Payment Gateway Interface (Razorpay & Stripe)
//
// TODO(INTEGRATION): Connect with Razorpay and Stripe SDKs
// when Organisation Billing / Checkout module is connected.
// Platform Super Admin oversees plan configurations and ledger
// transactions generated from these gateways.
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CreateOrderDto {
  amountCents: number;
  currency: string;
  organisationId: string;
  planId: string;
  gateway: 'RAZORPAY' | 'STRIPE';
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  gatewayTransactionId: string;
  amountPaid: number;
  currency: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);

  constructor(private readonly configService: ConfigService) {
    const razorpayKey = this.configService.get<string>('RAZORPAY_KEY_ID');
    const stripeKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    this.logger.log(
      `Payment Gateway Interface ready [Razorpay Key: ${razorpayKey ? 'Configured' : 'Pending'}, Stripe: ${stripeKey ? 'Configured' : 'Pending'}]`,
    );
  }

  async createCheckoutSession(dto: CreateOrderDto) {
    this.logger.log(
      `[TODO: PAYMENT CREATE] Initiated ${dto.gateway} checkout for Org: ${dto.organisationId}, Amount: ${dto.amountCents} ${dto.currency}`,
    );
    return {
      orderId: `order_${dto.gateway.toLowerCase()}_${Date.now()}`,
      gateway: dto.gateway,
      amountCents: dto.amountCents,
      currency: dto.currency,
      status: 'CREATED',
    };
  }

  async verifyWebhookSignature(gateway: 'RAZORPAY' | 'STRIPE', payload: any, signature: string): Promise<boolean> {
    this.logger.log(`[TODO: WEBHOOK VERIFY] Validating ${gateway} webhook signature: ${signature ? 'Present' : 'Missing'}`);
    return true;
  }
}
