import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay from 'razorpay';
import { DomainException } from '../errors/domain.exception';
import type { AppConfig } from '../../config/configuration';

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
}

export interface RazorpayPayment {
  id: string;
  status: 'created' | 'authorized' | 'captured' | 'refunded' | 'failed';
  amount: number; // paise
  method: string;
  order_id: string;
}

export interface RazorpayRefund {
  id: string;
  amount: number;
  status: string;
  notes?: Record<string, string>;
}

// Key the caller places in refund.notes so pre-check dedupe can find prior
// attempts. All callers that create refunds MUST set this — otherwise a
// retry after a network flake will double-refund.
export const REFUND_IDEMPOTENCY_KEY_FIELD = 'idempotency_key' as const;

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private client: Razorpay | null = null;
  private keySecret: string | null = null;

  constructor(private readonly config: ConfigService<AppConfig, true>) {}

  keyId(): string {
    return this.config.get('RAZORPAY_KEY_ID', { infer: true });
  }

  async createOrder(amountPaise: number, receipt: string): Promise<RazorpayOrder> {
    try {
      const order = await this.getClient().orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        payment_capture: true,
      });
      return { id: order.id, amount: Number(order.amount), currency: order.currency };
    } catch (err) {
      this.logger.error({ err, receipt }, 'razorpay orders.create failed');
      throw new DomainException('PAYMENT_PROVIDER_ERROR');
    }
  }

  async fetchPayment(paymentId: string): Promise<RazorpayPayment> {
    try {
      const p = await this.getClient().payments.fetch(paymentId);
      return {
        id: p.id,
        status: p.status as RazorpayPayment['status'],
        amount: Number(p.amount),
        method: String(p.method ?? 'UPI'),
        order_id: String(p.order_id ?? ''),
      };
    } catch (err) {
      this.logger.error({ err, paymentId }, 'razorpay payments.fetch failed');
      throw new DomainException('PAYMENT_PROVIDER_ERROR');
    }
  }

  async createRefund(paymentId: string, amountPaise: number, notes?: Record<string, string>): Promise<RazorpayRefund> {
    try {
      const refund = await this.getClient().payments.refund(paymentId, { amount: amountPaise, notes });
      return {
        id: refund.id,
        amount: Number(refund.amount),
        status: String(refund.status),
        notes: (refund.notes ?? undefined) as Record<string, string> | undefined,
      };
    } catch (err) {
      this.logger.error({ err, paymentId, amountPaise }, 'razorpay payments.refund failed');
      throw new DomainException('PAYMENT_PROVIDER_ERROR');
    }
  }

  // Lists refunds for a Razorpay payment. Used by cancel/refund flows to
  // dedupe: on retry after a network flake, we look for a refund whose
  // notes.idempotency_key matches our deterministic marker (e.g.
  // "cancel:<booking_id>") and reuse it instead of creating a duplicate.
  async listRefunds(paymentId: string): Promise<RazorpayRefund[]> {
    try {
      const res = await this.getClient().payments.fetchMultipleRefund(paymentId);
      const items = (res as { items?: unknown[] }).items ?? [];
      return items.map((it) => {
        const r = it as { id: string; amount: number | string; status: string; notes?: Record<string, string> };
        return {
          id: r.id,
          amount: Number(r.amount),
          status: String(r.status),
          notes: r.notes ?? undefined,
        };
      });
    } catch (err) {
      this.logger.error({ err, paymentId }, 'razorpay payments.fetchMultipleRefund failed');
      throw new DomainException('PAYMENT_PROVIDER_ERROR');
    }
  }

  // Find-or-create a refund keyed by a deterministic idempotency marker
  // (stored on refund.notes.idempotency_key). Safe to retry: repeated calls
  // with the same key return the same refund. Callers MUST pass a
  // deterministic key — session id, booking id, or refund_request id.
  async findOrCreateRefund(
    paymentId: string,
    amountPaise: number,
    idempotencyKey: string,
    extraNotes: Record<string, string> = {},
  ): Promise<{ refund: RazorpayRefund; reused: boolean }> {
    const existing = await this.listRefunds(paymentId);
    const match = existing.find(
      (r) => r.notes?.[REFUND_IDEMPOTENCY_KEY_FIELD] === idempotencyKey,
    );
    if (match) {
      this.logger.log({ paymentId, refund_id: match.id, idempotencyKey }, 'reusing existing refund by idempotency key');
      return { refund: match, reused: true };
    }
    const refund = await this.createRefund(paymentId, amountPaise, {
      ...extraNotes,
      [REFUND_IDEMPOTENCY_KEY_FIELD]: idempotencyKey,
    });
    return { refund, reused: false };
  }

  // HMAC-SHA256(order_id + '|' + payment_id, key_secret) per Razorpay checkout spec.
  // timing-safe compare so signature-verification isn't a side-channel.
  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const expected = createHmac('sha256', this.getKeySecret())
      .update(`${orderId}|${paymentId}`)
      .digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  // Webhook signature — HMAC over the raw request body against RAZORPAY_WEBHOOK_SECRET.
  // Slice F wires the webhook endpoint; the helper lives here so it's next to the
  // other Razorpay crypto primitives.
  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    const secret = this.config.get('RAZORPAY_WEBHOOK_SECRET', { infer: true });
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(signature, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private getClient(): Razorpay {
    if (this.client) return this.client;
    const key_id = this.keyId();
    const key_secret = this.getKeySecret();
    this.client = new Razorpay({ key_id, key_secret });
    return this.client;
  }

  private getKeySecret(): string {
    if (this.keySecret) return this.keySecret;
    const secret = this.config.get('RAZORPAY_KEY_SECRET', { infer: true });
    this.keySecret = secret;
    return secret;
  }
}
