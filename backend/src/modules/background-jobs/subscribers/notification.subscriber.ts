import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { NotificationCategory, NotificationChannel, NotificationStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { NotificationService } from '../../notification/notification.service';
import { SubscriberRegistry } from './subscriber.registry';
import type { OutboxEventRecord, OutboxSubscriber } from './subscriber.types';

// Event → (category, channels, recipient predicate, template) mapping per
// Part 3.4 §18. Channels are the maximum set — user prefs whittle them
// down at insert time, transactional locked-on categories bypass opt-out.
interface Mapping {
  category: NotificationCategory;
  channels: NotificationChannel[];
  title: (p: Payload) => string;
  body: (p: Payload) => string;
  resourceType: string;
  resourceId: (p: Payload, event: OutboxEventRecord) => string;
}

type Payload = Record<string, unknown>;

const MAPPINGS: Record<string, Mapping> = {
  BookingConfirmed: {
    category: NotificationCategory.BOOKING_CONFIRMATION,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    title: () => 'Booking confirmed',
    body: (p) => `Your booking ${str(p.reference_code)} is confirmed for ${str(p.booking_date)} at ${str(p.start_time)}.`,
    resourceType: 'Booking',
    resourceId: (p) => str(p.booking_id),
  },
  BookingCancelled: {
    category: NotificationCategory.BOOKING_CANCELLATION,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.IN_APP],
    title: () => 'Booking cancelled',
    body: (p) => `Booking ${str(p.reference_code)} was cancelled.`,
    resourceType: 'Booking',
    resourceId: (p) => str(p.booking_id),
  },
  BookingCancelledByPartner: {
    category: NotificationCategory.BOOKING_CANCELLATION,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.IN_APP],
    title: () => 'Booking cancelled by venue',
    body: (p) => `The venue cancelled booking ${str(p.reference_code)}. Your refund is being processed.`,
    resourceType: 'Booking',
    resourceId: (p) => str(p.booking_id),
  },
  PaymentSucceeded: {
    category: NotificationCategory.PAYMENT_SUCCESS,
    channels: [NotificationChannel.PUSH, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    title: () => 'Payment received',
    body: (p) => `We received your payment of ₹${paiseToRupees(p.amount_paise)}. Receipt: ${str(p.reference_code)}.`,
    resourceType: 'Payment',
    resourceId: (p) => str(p.payment_id),
  },
  PaymentFailed: {
    category: NotificationCategory.PAYMENT_FAILURE,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.EMAIL, NotificationChannel.IN_APP],
    title: () => 'Payment failed',
    body: () => 'Your payment could not be completed. Please try again.',
    resourceType: 'Payment',
    resourceId: (p, e) => str(p.payment_id) || e.aggregateId,
  },
  RefundInitiated: {
    category: NotificationCategory.REFUND_PROCESSED,
    channels: [NotificationChannel.PUSH, NotificationChannel.SMS, NotificationChannel.IN_APP],
    title: () => 'Refund initiated',
    body: (p) => `Refund of ₹${paiseToRupees(p.amount_paise)} initiated. It typically takes 5–7 business days.`,
    resourceType: 'Payment',
    resourceId: (p) => str(p.payment_id),
  },
  BookingCheckedIn: {
    category: NotificationCategory.CHECK_IN_REMINDER,
    channels: [NotificationChannel.IN_APP],
    title: () => 'Checked in',
    body: (p) => `You've been checked in for booking ${str(p.reference_code)}.`,
    resourceType: 'Booking',
    resourceId: (p, e) => str(p.booking_id) || e.aggregateId,
  },
  BookingCompleted: {
    category: NotificationCategory.REVIEW_REQUEST,
    channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
    title: () => 'How was your game?',
    body: (p) => `Rate your booking at ${str(p.venue_name) || 'the venue'}.`,
    resourceType: 'Booking',
    resourceId: (p, e) => str(p.booking_id) || e.aggregateId,
  },
};

// Which (category, channel) pairs cannot be opted out. Match Part 3.5 §4.
const LOCKED_ON: Array<[NotificationCategory, NotificationChannel]> = [
  [NotificationCategory.BOOKING_CONFIRMATION, NotificationChannel.PUSH],
  [NotificationCategory.PAYMENT_SUCCESS, NotificationChannel.EMAIL],
  [NotificationCategory.REFUND_PROCESSED, NotificationChannel.SMS],
];

const CHANNEL_TO_PREF_KEY: Record<NotificationChannel, string | null> = {
  [NotificationChannel.PUSH]: 'push',
  [NotificationChannel.SMS]: 'sms',
  [NotificationChannel.EMAIL]: 'email',
  [NotificationChannel.IN_APP]: 'in_app',
  [NotificationChannel.WHATSAPP]: null, // deferred
};

// Fans a business event into channel-specific notification rows.
// Idempotency: keyed by (identity_id, category, related_resource, channel, outbox_event_id in data).
@Injectable()
export class NotificationSubscriber implements OutboxSubscriber, OnModuleInit {
  readonly name = 'NotificationCreator';
  private readonly logger = new Logger(NotificationSubscriber.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly registry: SubscriberRegistry,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  matches(event: OutboxEventRecord): boolean {
    return event.eventType in MAPPINGS;
  }

  async handle(event: OutboxEventRecord): Promise<void> {
    const mapping = MAPPINGS[event.eventType];
    if (!mapping) return;

    const payload = event.payload;
    // Recipient identity — for most events it's the booking's identity_id.
    // If we can't figure out the recipient, skip cleanly rather than crash.
    const identityId = str(payload.identity_id) || (await this.resolveIdentityId(event));
    if (!identityId) {
      this.logger.warn(`[NotificationCreator] no recipient for event ${event.eventType} id=${event.id}`);
      return;
    }

    // Guard against stale events whose recipient identity has since been deleted —
    // FK violation on notifications.identity_id would otherwise send the outbox
    // row into the retry loop until it hits FAILED (attempts >= 10).
    const identityExists = await this.prisma.identity.findUnique({
      where: { id: identityId },
      select: { id: true },
    });
    if (!identityExists) {
      this.logger.warn(`[NotificationCreator] identity ${identityId} no longer exists; skipping event ${event.id}`);
      return;
    }

    // Idempotency: skip if we've already created notifications for this event.
    const already = await this.prisma.$queryRaw<Array<{ n: bigint }>>(Prisma.sql`
      SELECT COUNT(*) AS n FROM notifications
       WHERE data ->> 'outbox_event_id' = ${event.id}
    `);
    if ((already[0]?.n ?? 0n) > 0n) return;

    const prefs = await this.notifications.getPreferencesForIdentity(identityId);
    const allowedChannels = mapping.channels.filter((ch) => channelAllowed(mapping.category, ch, prefs));

    const rows = allowedChannels.map((ch) => ({
      identityId,
      channel: ch,
      category: mapping.category,
      title: mapping.title(payload),
      body: mapping.body(payload),
      data: {
        outbox_event_id: event.id,
        event_type: event.eventType,
        route: routeFor(mapping.resourceType, mapping.resourceId(payload, event)),
      } as Prisma.InputJsonValue,
      relatedResourceType: mapping.resourceType,
      relatedResourceId: mapping.resourceId(payload, event) || null,
      status: NotificationStatus.PENDING,
    }));

    if (rows.length === 0) return;
    await this.prisma.notification.createMany({ data: rows });
    this.logger.log(
      `[NotificationCreator] event=${event.eventType} identity=${identityId} channels=[${allowedChannels.join(',')}]`,
    );
  }

  // For events like BookingCheckedIn where identity_id isn't in the payload,
  // look it up from the aggregate.
  private async resolveIdentityId(event: OutboxEventRecord): Promise<string | null> {
    if (event.aggregateType === 'Booking') {
      const b = await this.prisma.booking.findUnique({
        where: { id: event.aggregateId },
        select: { identityId: true },
      });
      return b?.identityId ?? null;
    }
    if (event.aggregateType === 'BookingSession') {
      const s = await this.prisma.bookingSession.findUnique({
        where: { id: event.aggregateId },
        select: { identityId: true },
      });
      return s?.identityId ?? null;
    }
    if (event.aggregateType === 'Payment') {
      const p = await this.prisma.payment.findUnique({
        where: { id: event.aggregateId },
        select: { booking: { select: { identityId: true } } },
      });
      return p?.booking?.identityId ?? null;
    }
    return null;
  }
}

function channelAllowed(
  category: NotificationCategory,
  channel: NotificationChannel,
  prefs: Record<string, Record<string, boolean>>,
): boolean {
  if (LOCKED_ON.some(([c, ch]) => c === category && ch === channel)) return true;
  const prefKey = CHANNEL_TO_PREF_KEY[channel];
  if (!prefKey) return false;
  return prefs[category]?.[prefKey] === true;
}

function routeFor(resourceType: string, resourceId: string | null): string | null {
  if (!resourceId) return null;
  if (resourceType === 'Booking') return `/bookings/${resourceId}`;
  if (resourceType === 'Payment') return `/payments/${resourceId}`;
  return null;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function paiseToRupees(v: unknown): string {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return '0';
  return (n / 100).toFixed(2);
}

// Exported for the self-check.
export const __internals = { MAPPINGS, LOCKED_ON, channelAllowed, CHANNEL_TO_PREF_KEY };
