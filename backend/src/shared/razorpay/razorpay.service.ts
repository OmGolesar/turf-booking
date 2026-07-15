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
}

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
      return { id: refund.id, amount: Number(refund.amount), status: String(refund.status) };
    } catch (err) {
      this.logger.error({ err, paymentId, amountPaise }, 'razorpay payments.refund failed');
      throw new DomainException('PAYMENT_PROVIDER_ERROR');
    }
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
