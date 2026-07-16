import { Body, Controller, Headers, HttpCode, Logger, Post, Req } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { RazorpayService } from '../../shared/razorpay/razorpay.service';
import { DomainException } from '../../shared/errors/domain.exception';
import { RazorpayWebhookHandlerService } from './razorpay-handler.service';

// POST /webhooks/razorpay — Part 3.6 §3.
// Signature verification against RAW body, then idempotent handler dispatch.
// Always 200 for known outcomes (spec §11); only 400 for signature failure.
@Controller('webhooks')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly razorpay: RazorpayService,
    private readonly handler: RazorpayWebhookHandlerService,
  ) {}

  @Post('razorpay')
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string | undefined,
    @Body() body: Record<string, unknown>,
  ) {
    const raw = req.rawBody?.toString('utf8');
    if (!raw || !signature || !this.razorpay.verifyWebhookSignature(raw, signature)) {
      // 400 tells Razorpay "permanent failure — stop retrying".
      throw new DomainException('WEBHOOK_SIGNATURE_INVALID');
    }

    // Idempotency: (provider, event_id) UNIQUE. If we've already seen this
    // event and PROCESSED it, don't re-run the handler.
    const eventId = extractEventId(body);
    const eventType = String(body?.event ?? 'unknown');

    const prior = await this.prisma.webhookReceipt.findFirst({
      where: { provider: 'razorpay', eventId },
      select: { id: true, status: true },
    });
    if (prior && prior.status === 'PROCESSED') return null;

    // Fresh row (or resume after prior FAILED). Store the raw envelope for forensics.
    const receiptId = prior?.id ?? (await this.createReceipt(eventId, eventType, body, signature));

    try {
      const outcome = await this.handler.dispatch(body as unknown as Parameters<typeof this.handler.dispatch>[0]);
      await this.prisma.webhookReceipt.update({
        where: { id: receiptId },
        data: { status: outcome, processedAt: new Date(), error: null },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.prisma.webhookReceipt.update({
        where: { id: receiptId },
        data: { status: 'FAILED', error: msg.slice(0, 4000), processedAt: new Date() },
      });
      this.logger.error({ err, event_id: eventId, event_type: eventType }, 'razorpay webhook handler failed');
      // Re-throw → 500 → Razorpay retries. Next attempt will resume via `prior`.
      throw err;
    }

    return null;
  }

  private async createReceipt(
    eventId: string,
    eventType: string,
    body: Record<string, unknown>,
    signature: string,
  ): Promise<string> {
    try {
      const row = await this.prisma.webhookReceipt.create({
        data: {
          provider: 'razorpay',
          eventId,
          eventType,
          rawBody: body as Prisma.InputJsonValue,
          signature,
          status: 'RECEIVED',
        },
        select: { id: true },
      });
      return row.id;
    } catch (err) {
      // Race with a concurrent Razorpay retry — the UNIQUE index caught the second insert.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const existing = await this.prisma.webhookReceipt.findFirst({
          where: { provider: 'razorpay', eventId },
          select: { id: true },
        });
        if (existing) return existing.id;
      }
      throw err;
    }
  }
}

// Razorpay puts the event id on the envelope in newer webhook versions; older
// payloads only have created_at + event type. Synthesize a deterministic id
// when missing so the UNIQUE constraint still de-dupes retries.
function extractEventId(body: Record<string, unknown>): string {
  const id = body?.id;
  if (typeof id === 'string' && id.length > 0) return id;
  const event = String(body?.event ?? 'unknown');
  const createdAt = String(body?.created_at ?? '0');
  // Include payment/refund id when present to keep the synthetic id specific.
  const payload = body?.payload as Record<string, { entity?: { id?: string } }> | undefined;
  const inner = payload?.payment?.entity?.id ?? payload?.refund?.entity?.id ?? 'none';
  return `synth:${event}:${createdAt}:${inner}`;
}

export const __internals = { extractEventId };
