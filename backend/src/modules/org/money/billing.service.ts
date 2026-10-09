// ============================================================
// ORGANISATION PORTAL — Token purchases via Razorpay
// 1. Server creates the order; price & token amount come from the
//    platform-owned TokenPlan, never from the client.
// 2. Browser runs Razorpay Checkout.
// 3. Tokens are credited ONLY by the webhook after its HMAC-SHA256
//    signature is verified. A client-side "success" only refetches.
// ============================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { PrismaService } from '../../../database/prisma.service';
import { OrgContext } from '../common/org-context';
import { OrgEventsService } from '../common/org-events.service';
import { OrgTokenService } from '../common/org-token.service';
import { pageResult, paging } from '../common/org-helpers';

interface RazorpayWebhookBody {
  event?: string;
  payload?: {
    payment?: { entity?: { id?: string; order_id?: string; amount?: number; currency?: string; error_description?: string } };
  };
}

const configured = (v?: string) => !!v && !/placeholder/i.test(v);

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: OrgEventsService,
    private readonly tokens: OrgTokenService,
  ) {}

  plans() {
    return this.prisma.tokenPlan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, code: true, description: true, tokenAmount: true, priceCents: true, currency: true, billingCycle: true, features: true },
    });
  }

  async createOrder(ctx: OrgContext, planId: string) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!configured(keyId) || !configured(keySecret)) {
      throw new ServiceUnavailableException('Online payments are not configured yet. Ask the platform team to add Razorpay keys.');
    }
    const plan = await this.prisma.tokenPlan.findFirst({ where: { id: planId, isActive: true } });
    if (!plan) throw new NotFoundException('Plan not found');
    if (plan.priceCents <= 0) throw new BadRequestException('This plan cannot be purchased online');

    const receipt = `org_${Date.now().toString(36)}`;
    let order: { id: string; amount: number; currency: string };
    try {
      const res = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
        },
        body: JSON.stringify({
          amount: plan.priceCents,
          currency: plan.currency,
          receipt,
          notes: { organisationId: ctx.organisationId, planId: plan.id },
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`Razorpay responded ${res.status}`);
      order = (await res.json()) as typeof order;
    } catch (err) {
      this.logger.error(`Razorpay order creation failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException('Could not start the payment. Please try again shortly.');
    }

    const payment = await this.prisma.orgPayment.create({
      data: {
        organisationId: ctx.organisationId,
        planId: plan.id,
        planName: plan.name,
        tokens: plan.tokenAmount,
        amount: plan.priceCents,
        currency: plan.currency,
        razorpayOrderId: order.id,
        createdById: ctx.userId,
      },
    });
    await this.events.audit(ctx, 'TOKEN_PURCHASE_STARTED', 'ORG_PAYMENT', payment.id, { planId: plan.id, amount: plan.priceCents });
    return {
      paymentId: payment.id,
      orderId: order.id,
      amount: plan.priceCents,
      currency: plan.currency,
      keyId,
      organisationName: ctx.organisationName,
      email: ctx.email,
      name: `${ctx.firstName} ${ctx.lastName}`,
      planName: plan.name,
    };
  }

  async list(ctx: OrgContext, q: { page?: number; limit?: number; status?: string }) {
    const { page, limit, skip } = paging(q);
    const where: Prisma.OrgPaymentWhereInput = { organisationId: ctx.organisationId };
    if (q.status && ['CREATED', 'PAID', 'FAILED'].includes(q.status)) where.status = q.status as PaymentStatus;
    const [total, rows] = await Promise.all([
      this.prisma.orgPayment.count({ where }),
      this.prisma.orgPayment.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return pageResult(rows, total, page, limit);
  }

  async get(ctx: OrgContext, id: string) {
    const p = await this.prisma.orgPayment.findFirst({ where: { id, organisationId: ctx.organisationId } });
    if (!p) throw new NotFoundException('Payment not found');
    const org = await this.prisma.organisation.findUnique({
      where: { id: ctx.organisationId },
      select: { name: true, contactEmail: true, metadata: { select: { address: true } } },
    });
    return { ...p, billedTo: { name: org.name, email: org.contactEmail, address: org.metadata?.address ?? null } };
  }

  // ---------------- webhook ----------------

  verifySignature(rawBody: Buffer | undefined, signature: string | undefined): boolean {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!configured(secret)) throw new ServiceUnavailableException('Webhook secret not configured');
    if (!rawBody || !signature) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature, 'utf8');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined, body: RazorpayWebhookBody, ip?: string) {
    if (!this.verifySignature(rawBody, signature)) {
      await this.prisma.securityEvent.create({
        data: { eventType: 'INVALID_PAYMENT_WEBHOOK', severity: 'HIGH', ipAddress: ip, details: { event: body?.event ?? null } },
      });
      throw new BadRequestException('Invalid signature');
    }
    const entity = body?.payload?.payment?.entity;
    if (!entity?.order_id) return { received: true };
    const payment = await this.prisma.orgPayment.findUnique({ where: { razorpayOrderId: entity.order_id } });
    if (!payment) return { received: true };

    if (body.event === 'payment.failed') {
      await this.prisma.orgPayment.updateMany({
        where: { id: payment.id, status: 'CREATED' },
        data: { status: 'FAILED', failureReason: entity.error_description?.slice(0, 300) ?? 'Payment failed', razorpayPaymentId: entity.id },
      });
      this.events.emit(payment.organisationId, 'payment.updated', { paymentId: payment.id });
      return { received: true };
    }
    if (body.event !== 'payment.captured' && body.event !== 'order.paid') return { received: true };
    if (payment.status === 'PAID') return { received: true, duplicate: true };

    if (entity.amount !== payment.amount || entity.currency !== payment.currency) {
      await this.prisma.orgPayment.update({ where: { id: payment.id }, data: { status: 'FAILED', failureReason: 'Amount mismatch — flagged for review' } });
      await this.prisma.securityEvent.create({
        data: { eventType: 'PAYMENT_AMOUNT_MISMATCH', severity: 'CRITICAL', ipAddress: ip, details: { paymentId: payment.id, expected: payment.amount, received: entity.amount } },
      });
      return { received: true };
    }

    const now = new Date();
    const invoiceNumber = `INV-${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}-${payment.id.slice(0, 8).toUpperCase()}`;
    const credited = await this.prisma.$transaction(
      async (tx) => {
        const flipped = await tx.orgPayment.updateMany({
          where: { id: payment.id, status: { in: ['CREATED', 'FAILED'] } },
          data: { status: 'PAID', razorpayPaymentId: entity.id, paidAt: now, invoiceNumber, failureReason: null },
        });
        if (!flipped.count) return null;
        return this.tokens.credit(
          tx,
          payment.organisationId,
          payment.tokens,
          `razorpay:${entity.id}`,
          payment.id,
          `Purchased ${payment.planName}`,
        );
      },
      { maxWait: 15000, timeout: 20000 },
    );
    if (credited?.credited) {
      this.events.emit(payment.organisationId, 'token.balance_changed', { balance: credited.balanceAfter });
      this.events.emit(payment.organisationId, 'payment.updated', { paymentId: payment.id });
      await this.events.notify(payment.organisationId, [payment.createdById], {
        type: 'payment',
        title: `Payment received — ${payment.tokens} tokens added`,
        link: '/org/billing',
      });
    }
    return { received: true };
  }
}
